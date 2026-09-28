-- =====================================================================
-- Director view-only + add Mathiba Makolo
-- Run in Supabase > SQL Editor (after schema.sql and admin-users.sql).
-- =====================================================================

-- 1. Property Director becomes view-only (same as System Administrator for records)
create or replace function public.bdih_can_edit() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.bdih_role() in (
    'Property & Facilities Officer','Property & Facilities Manager','Technician'), false)
$$;

-- 2. Department / job title columns (safe if they already exist)
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists job_title text;

-- 3. Add the Director (temporary password Bdih@Temp2026!, must change at first sign-in)
select public.bdih_sql_add_user('mathiba.makolo@bih.co.bw', 'mathiba.makolo', 'Mathiba Makolo', 'Property Director');
update public.profiles set department = 'Property & Facilities', job_title = 'Director - Property & Facilities'
where username = 'mathiba.makolo';

-- Check
select username, name, role, job_title, active from public.profiles order by role, name;
