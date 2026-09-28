-- =====================================================================
-- BDIH Maintenance Intelligence Platform: Supabase schema
-- Paste the whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run again (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Users (profiles linked to Supabase Auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  email text not null,
  role text not null check (role in (
    'Property & Facilities Officer','Property & Facilities Manager','Property Director',
    'System Administrator','Technician','Viewer')),
  active boolean not null default true,
  must_change boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.bdih_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.bdih_can_edit() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.bdih_role() in (
    'Property & Facilities Officer','Property & Facilities Manager','Property Director','Technician'), false)
$$;

-- Sign-in by username: returns the email Supabase Auth needs.
create or replace function public.bdih_login_email(p_username text) returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles where lower(username) = lower(p_username) and active limit 1
$$;
grant execute on function public.bdih_login_email(text) to anon, authenticated;

create or replace function public.bdih_password_changed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change = false where id = auth.uid()
$$;
grant execute on function public.bdih_password_changed() to authenticated;

-- One-time: turn an Auth user into the first System Administrator.
create or replace function public.bdih_bootstrap_admin(p_email text, p_username text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if exists (select 1 from public.profiles where role = 'System Administrator') then
    raise exception 'A System Administrator already exists. Add further users from the platform.';
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'No Auth user with email %. Create it first under Authentication > Users.', p_email; end if;
  insert into public.profiles (id, username, name, email, role, active, must_change)
  values (uid, lower(p_username), p_name, p_email, 'System Administrator', true, false);
  return 'System Administrator created: ' || p_username;
end $$;
revoke execute on function public.bdih_bootstrap_admin(text, text, text) from public, anon, authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (public.bdih_role() is not null);
-- Profiles are written only by the admin-users Edge Function (service role).

-- ---------- Records (id + JSON document; never deleted) ----------
do $$
declare t text;
begin
  foreach t in array array['assets','contractors','work_orders','requests','checks','pw_requests'] loop
    execute format('create table if not exists public.%I (
      id text primary key,
      data jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      created_by uuid default auth.uid(),
      updated_by uuid default auth.uid())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

create or replace function public.bdih_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); new.created_at := old.created_at; new.created_by := old.created_by; return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['assets','contractors','work_orders','requests','checks','pw_requests'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.bdih_touch()', t || '_touch', t);
  end loop;
end $$;

-- Staff records: everyone signed in can read; officers, manager, director, technicians can write; admin and viewer read only.
do $$
declare t text;
begin
  foreach t in array array['assets','contractors','work_orders','requests','checks'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.bdih_role() is not null)', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.bdih_can_edit())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.bdih_can_edit()) with check (public.bdih_can_edit())', t || '_update', t);
  end loop;
end $$;

-- Public fault reports from the sign-in page (no account needed).
drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert on public.requests for insert to anon
  with check (data->>'status' = 'Submitted' and coalesce((data->>'escalated')::boolean, false) = false);

-- Forgot-password requests: anyone can submit; only the System Administrator reads and closes them.
drop policy if exists pw_insert on public.pw_requests;
drop policy if exists pw_read on public.pw_requests;
drop policy if exists pw_update on public.pw_requests;
create policy pw_insert on public.pw_requests for insert to anon, authenticated with check (data->>'status' = 'Open');
create policy pw_read on public.pw_requests for select to authenticated using (public.bdih_role() = 'System Administrator');
create policy pw_update on public.pw_requests for update to authenticated using (public.bdih_role() = 'System Administrator');

-- ---------- Audit trail (append-only) ----------
create table if not exists public.audit_log (
  id text primary key,
  data jsonb not null,
  actor uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
revoke update, delete, truncate on public.audit_log from anon, authenticated;
drop policy if exists audit_insert on public.audit_log;
drop policy if exists audit_read on public.audit_log;
create policy audit_insert on public.audit_log for insert to anon, authenticated with check (true);
create policy audit_read on public.audit_log for select to authenticated
  using (public.bdih_role() in ('Property & Facilities Manager','Property Director','System Administrator'));

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists checks_created_idx on public.checks (created_at desc);

-- ---------- Evidence files (private bucket) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 10485760)
on conflict (id) do nothing;

drop policy if exists evidence_read on storage.objects;
drop policy if exists evidence_insert on storage.objects;
drop policy if exists evidence_update on storage.objects;
create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.bdih_role() is not null);
create policy evidence_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'evidence');
create policy evidence_update on storage.objects for update to authenticated
  using (bucket_id = 'evidence' and public.bdih_can_edit());

-- =====================================================================
-- FIRST ADMIN (run once, after creating the user in Authentication > Users):
--   select public.bdih_bootstrap_admin('your.email@bih.co.bw', 'sysadmin', 'Your Full Name');
-- =====================================================================
