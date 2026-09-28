// Supabase Edge Function: admin-users
// Lets the System Administrator create users, edit them, reset passwords and (de)activate accounts.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name "admin-users" > paste this file.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const ROLES = ['Property & Facilities Officer', 'Property & Facilities Manager', 'Property Director', 'System Administrator', 'Technician', 'Viewer'];
const tempPw = () => 'Bdih-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const { data: me } = await admin.from('profiles').select('name, role, active').eq('id', user.id).single();
  if (!me || !me.active || me.role !== 'System Administrator') return json({ error: 'Only the System Administrator can manage users' }, 403);

  const b = await req.json();
  const audit = (action: string, ref: string, detail: string) => admin.from('audit_log').insert({
    id: 'A-' + crypto.randomUUID(), actor: user.id,
    data: { at: new Date().toISOString().slice(0, 16), by: me.name, role: me.role, action, ref, detail }
  });

  try {
    if (b.action === 'create') {
      if (!b.name || !b.username || !b.email || !ROLES.includes(b.role)) return json({ error: 'Name, username, email and a valid role are required' }, 400);
      const { data: clash } = await admin.from('profiles').select('id').ilike('username', b.username).maybeSingle();
      if (clash) return json({ error: 'That username is taken' }, 400);
      const pw = tempPw();
      const { data, error } = await admin.auth.admin.createUser({ email: b.email, password: pw, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      const { error: e2 } = await admin.from('profiles').insert({ id: data.user.id, username: b.username.toLowerCase(), name: b.name, email: b.email, role: b.role, active: true, must_change: true });
      if (e2) { await admin.auth.admin.deleteUser(data.user.id); return json({ error: e2.message }, 400); }
      await audit('Added user', b.username, b.role + ' · ' + b.email);
      return json({ id: data.user.id, temp: pw });
    }
    if (b.action === 'update') {
      if (!ROLES.includes(b.role)) return json({ error: 'Invalid role' }, 400);
      const { data: clash } = await admin.from('profiles').select('id').ilike('username', b.username).neq('id', b.id).maybeSingle();
      if (clash) return json({ error: 'That username is taken' }, 400);
      const { data: cur } = await admin.from('profiles').select('email').eq('id', b.id).single();
      if (cur && cur.email !== b.email) { const { error } = await admin.auth.admin.updateUserById(b.id, { email: b.email, email_confirm: true }); if (error) return json({ error: error.message }, 400); }
      const { error } = await admin.from('profiles').update({ name: b.name, username: b.username.toLowerCase(), email: b.email, role: b.role }).eq('id', b.id);
      if (error) return json({ error: error.message }, 400);
      await audit('Updated user', b.username, b.role + ' · ' + b.email);
      return json({ ok: true });
    }
    if (b.action === 'reset') {
      const pw = tempPw();
      const { error } = await admin.auth.admin.updateUserById(b.id, { password: pw }); if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ must_change: true }).eq('id', b.id);
      await audit('Reset user password', b.username || b.id, 'Temporary password issued; change required at next sign-in');
      return json({ temp: pw });
    }
    if (b.action === 'setActive') {
      if (b.id === user.id && !b.active) return json({ error: 'You cannot deactivate your own account' }, 400);
      const { error } = await admin.auth.admin.updateUserById(b.id, { ban_duration: b.active ? 'none' : '876000h' }); if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ active: !!b.active }).eq('id', b.id);
      await audit('Changed user status', b.username || b.id, b.active ? 'Reactivated' : 'Deactivated');
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
