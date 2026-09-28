-- Run once in the Supabase SQL editor to let the System Administrator type a new password for a user.
-- Needs supabase/admin-users.sql to have been run first.
create extension if not exists pgcrypto with schema extensions;

-- Set a password chosen by the administrator (min 8 characters)
create or replace function public.bdih_admin_set_password(p_id uuid, p_password text, p_must_change boolean default false)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare u text;
begin
  perform public.bdih_require_admin();
  if p_password is null or length(p_password) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_id;
  update public.profiles set must_change = coalesce(p_must_change, false) where id = p_id returning username into u;
  if u is null then raise exception 'User not found'; end if;
  perform public.bdih_audit_admin('Set user password', u, case when p_must_change then 'Password set by administrator; change required at next sign-in' else 'Password set by administrator' end);
end $$;
revoke execute on function public.bdih_admin_set_password(uuid, text, boolean) from public, anon;
grant execute on function public.bdih_admin_set_password(uuid, text, boolean) to authenticated;

-- Refresh the API so the new function is visible immediately
notify pgrst, 'reload schema';
