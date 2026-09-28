-- =====================================================================
-- BDIH Maintenance Platform: user management without an Edge Function
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run again.
-- Only a signed-in, active System Administrator can call these functions.
-- =====================================================================

create or replace function public.bdih_require_admin() returns text
language plpgsql stable security definer set search_path = public as $$
declare n text;
begin
  select name into n from public.profiles where id = auth.uid() and active and role = 'System Administrator';
  if n is null then raise exception 'Only the System Administrator can manage users'; end if;
  return n;
end $$;

create or replace function public.bdih_audit_admin(p_action text, p_ref text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log (id, data, actor)
  values ('A-' || gen_random_uuid(), jsonb_build_object(
    'at', to_char(now() at time zone 'Africa/Gaborone', 'YYYY-MM-DD"T"HH24:MI'),
    'by', (select name from public.profiles where id = auth.uid()),
    'role', 'System Administrator', 'action', p_action, 'ref', p_ref, 'detail', p_detail), auth.uid())
$$;

create or replace function public.bdih_valid_role(p_role text) returns boolean
language sql immutable as $$
  select p_role in ('Property & Facilities Officer','Property & Facilities Manager','Property Director',
                    'System Administrator','Technician','Viewer')
$$;

-- Create user: returns the temporary password
create or replace function public.bdih_admin_create_user(p_name text, p_username text, p_email text, p_role text)
returns text language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid();
        pw text := 'Bdih-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
begin
  perform public.bdih_require_admin();
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_username), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'Name, username and email are required'; end if;
  if not public.bdih_valid_role(p_role) then raise exception 'Invalid role'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(trim(p_username))) then raise exception 'That username is taken'; end if;
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then raise exception 'That email already has an account'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(trim(p_email)),
    extensions.crypt(pw, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', lower(trim(p_email)), 'email_verified', true),
    'email', now(), now(), now());

  insert into public.profiles (id, username, name, email, role, active, must_change)
  values (uid, lower(trim(p_username)), trim(p_name), lower(trim(p_email)), p_role, true, true);

  perform public.bdih_audit_admin('Added user', lower(trim(p_username)), p_role || ' · ' || lower(trim(p_email)));
  return pw;
end $$;

-- Update name / username / email / role
create or replace function public.bdih_admin_update_user(p_id uuid, p_name text, p_username text, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.bdih_require_admin();
  if not public.bdih_valid_role(p_role) then raise exception 'Invalid role'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)) and id <> p_id) then raise exception 'That username is taken'; end if;
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email)) and id <> p_id) then raise exception 'That email already has an account'; end if;
  update auth.users set email = lower(trim(p_email)), updated_at = now() where id = p_id;
  update auth.identities set identity_data = identity_data || jsonb_build_object('email', lower(trim(p_email))) where user_id = p_id and provider = 'email';
  update public.profiles set name = trim(p_name), username = lower(trim(p_username)), email = lower(trim(p_email)), role = p_role where id = p_id;
  perform public.bdih_audit_admin('Updated user', lower(trim(p_username)), p_role || ' · ' || lower(trim(p_email)));
end $$;

-- Reset password: returns the temporary password
create or replace function public.bdih_admin_reset_password(p_id uuid)
returns text language plpgsql security definer set search_path = public, auth, extensions as $$
declare pw text := 'Bdih-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8); u text;
begin
  perform public.bdih_require_admin();
  update auth.users set encrypted_password = extensions.crypt(pw, extensions.gen_salt('bf')), updated_at = now() where id = p_id;
  update public.profiles set must_change = true where id = p_id returning username into u;
  if u is null then raise exception 'User not found'; end if;
  perform public.bdih_audit_admin('Reset user password', u, 'Temporary password issued; change required at next sign-in');
  return pw;
end $$;

-- Set a password chosen by the administrator (min 8 characters)
create or replace function public.bdih_admin_set_password(p_id uuid, p_password text, p_must_change boolean default false)
returns void language plpgsql security definer set search_path = public, auth, extensions as $
declare u text;
begin
  perform public.bdih_require_admin();
  if p_password is null or length(p_password) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_id;
  update public.profiles set must_change = coalesce(p_must_change, false) where id = p_id returning username into u;
  if u is null then raise exception 'User not found'; end if;
  perform public.bdih_audit_admin('Set user password', u, case when p_must_change then 'Password set by administrator; change required at next sign-in' else 'Password set by administrator' end);
end $;
revoke execute on function public.bdih_admin_set_password(uuid, text, boolean) from public, anon;
grant execute on function public.bdih_admin_set_password(uuid, text, boolean) to authenticated;

-- Deactivate / reactivate (never deletes)
create or replace function public.bdih_admin_set_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
declare u text;
begin
  perform public.bdih_require_admin();
  if p_id = auth.uid() and not p_active then raise exception 'You cannot deactivate your own account'; end if;
  update auth.users set banned_until = case when p_active then null else now() + interval '100 years' end, updated_at = now() where id = p_id;
  update public.profiles set active = p_active where id = p_id returning username into u;
  if u is null then raise exception 'User not found'; end if;
  perform public.bdih_audit_admin('Changed user status', u, case when p_active then 'Reactivated' else 'Deactivated' end);
end $$;

revoke execute on function public.bdih_admin_create_user(text, text, text, text) from public, anon;
revoke execute on function public.bdih_admin_update_user(uuid, text, text, text, text) from public, anon;
revoke execute on function public.bdih_admin_reset_password(uuid) from public, anon;
revoke execute on function public.bdih_admin_set_active(uuid, boolean) from public, anon;
grant execute on function public.bdih_admin_create_user(text, text, text, text) to authenticated;
grant execute on function public.bdih_admin_update_user(uuid, text, text, text, text) to authenticated;
grant execute on function public.bdih_admin_reset_password(uuid) to authenticated;
grant execute on function public.bdih_admin_set_active(uuid, boolean) to authenticated;


-- =====================================================================
-- SQL EDITOR ONLY: add users and reset passwords directly in the database.
-- These cannot be called from the app or the internet (execute revoked).
-- =====================================================================

create or replace function public.bdih_sql_add_user(p_email text, p_username text, p_name text, p_role text, p_password text default 'Bdih@Temp2026!')
returns text language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid;
begin
  if not public.bdih_valid_role(p_role) then raise exception 'Invalid role: %', p_role; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(trim(p_email)),
      extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', lower(trim(p_email)), 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, updated_at = now() where id = uid;
  end if;
  insert into public.profiles (id, username, name, email, role, active, must_change)
  values (uid, lower(trim(p_username)), trim(p_name), lower(trim(p_email)), p_role, true, true)
  on conflict (id) do update set username = excluded.username, name = excluded.name, email = excluded.email,
    role = excluded.role, active = true, must_change = true;
  insert into public.audit_log (id, data) values ('A-' || gen_random_uuid(), jsonb_build_object(
    'at', to_char(now() at time zone 'Africa/Gaborone', 'YYYY-MM-DD"T"HH24:MI'), 'by', 'Database administrator (SQL)',
    'role', 'System Administrator', 'action', 'Added user', 'ref', lower(trim(p_username)), 'detail', p_role || ' · ' || lower(trim(p_email))));
  return 'Ready: ' || lower(trim(p_username)) || ' / ' || p_password || ' (must change at first sign-in)';
end $$;

create or replace function public.bdih_sql_reset_password(p_username text, p_password text default 'Bdih@Temp2026!')
returns text language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid;
begin
  select id into uid from public.profiles where lower(username) = lower(trim(p_username));
  if uid is null then raise exception 'No user with username %', p_username; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, updated_at = now() where id = uid;
  update public.profiles set must_change = true, active = true where id = uid;
  insert into public.audit_log (id, data) values ('A-' || gen_random_uuid(), jsonb_build_object(
    'at', to_char(now() at time zone 'Africa/Gaborone', 'YYYY-MM-DD"T"HH24:MI'), 'by', 'Database administrator (SQL)',
    'role', 'System Administrator', 'action', 'Reset user password', 'ref', lower(trim(p_username)), 'detail', 'Temporary password set in SQL editor'));
  return 'Password reset for ' || lower(trim(p_username)) || ': ' || p_password || ' (must change at first sign-in)';
end $$;

revoke execute on function public.bdih_sql_add_user(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.bdih_sql_reset_password(text, text) from public, anon, authenticated;

-- Examples:
--   select public.bdih_sql_add_user('name.surname@bih.co.bw', 'name.surname', 'Name Surname', 'Property & Facilities Officer');
--   select public.bdih_sql_reset_password('kgakgamatso.letsweletse', 'MyNewTemp#2026');
