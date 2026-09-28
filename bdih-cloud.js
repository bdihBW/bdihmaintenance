// BDIH Maintenance Intelligence Platform: Supabase adapter.
// Local-first: every change is saved in the browser, then pushed to Supabase when online.
// Records are stored as (id, data jsonb). Records are never deleted.
(function () {
  const C = window.BDIH_CONFIG || {};
  const enabled = !!(C.enabled && C.supabaseUrl && C.supabaseAnonKey);
  let sb = null;
  const ready = !enabled ? Promise.resolve(null) : window.__bdihSbReady || (window.__bdihSbReady = import('https://esm.sh/@supabase/supabase-js@2.45.4').then(m => (window.__bdihSb = window.__bdihSb || m.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bdih-mip-auth' } }))));
  ready.then(x => { sb = x; });
  const T = { assets: 'assets', contractors: 'contractors', wos: 'work_orders', requests: 'requests', checks: 'checks', pwRequests: 'pw_requests' };
  const HKEY = 'bdih-cloud-sent', PKEY = 'bdih-cloud-profile';
  const getH = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || {}; } catch (e) { return {}; } };
  const setH = h => { try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (e) {} };
  const hash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; };
  const rows = (db, k) => k === 'checks' ? Object.entries(db.checks || {}).map(([id, data]) => ({ id, data })) : (db[k] || []).filter(x => x && x.id).map(x => ({ id: x.id, data: x }));
  const mapP = p => ({ id: p.id, name: p.name, username: p.username, email: p.email, role: p.role, active: p.active, mustChange: p.must_change });
  const need = async () => { sb = await ready; if (!sb) throw new Error('Cloud database is not configured'); return sb; };
  const isNet = e => /Failed to fetch|NetworkError|Load failed|network/i.test((e && e.message) || String(e));
  const friendly = e => {
    const m = (e && e.message) || String(e);
    if (/bdih_login_email|does not exist|schema cache|relation .* does not exist/i.test(m)) return 'The database is not set up yet. Run supabase/schema.sql in the Supabase SQL editor.';
    if (/row-level security|permission denied/i.test(m)) return 'Your role is not allowed to make this change.';
    if (isNet(e)) return 'No connection to the server.';
    return m;
  };

  async function profile() {
    const s = await need();
    const { data: sd } = await s.auth.getSession(); const ses = sd.session; if (!ses) return null;
    try {
      const { data, error } = await s.from('profiles').select('*').eq('id', ses.user.id).maybeSingle();
      if (error) throw error;
      if (!data || !data.active) { await s.auth.signOut(); localStorage.removeItem(PKEY); return null; }
      const p = mapP(data); localStorage.setItem(PKEY, JSON.stringify(p)); return p;
    } catch (e) {
      if (isNet(e)) { try { const c = JSON.parse(localStorage.getItem(PKEY)); if (c && c.id === ses.user.id) return c; } catch (x) {} }
      throw e;
    }
  }
  async function signIn(username, password) {
    const s = await need();
    const { data: email, error: e1 } = await s.rpc('bdih_login_email', { p_username: String(username || '').trim().toLowerCase() });
    if (e1) throw new Error(friendly(e1));
    if (!email) throw new Error('The username or password is incorrect.');
    const { error } = await s.auth.signInWithPassword({ email, password });
    if (error) throw new Error(isNet(error) ? friendly(error) : 'The username or password is incorrect.');
    const p = await profile(); if (!p) throw new Error('This account is deactivated. Contact the System Administrator.');
    return p;
  }
  async function signOut() { const s = await need(); localStorage.removeItem(PKEY); await s.auth.signOut(); }
  async function changePassword(pw) {
    const s = await need(); const { error } = await s.auth.updateUser({ password: pw }); if (error) throw new Error(friendly(error));
    await s.rpc('bdih_password_changed');
  }

  async function pull(base) {
    const s = await need(); const db = { ...base }; const h = getH();
    for (const [k, t] of Object.entries(T)) {
      const { data, error } = await s.from(t).select('id,data').order('created_at', { ascending: false }).limit(50000);
      if (error) throw error;
      h[t] = {}; data.forEach(r => { h[t][r.id] = hash(JSON.stringify(r.data)); });
      if (k === 'checks') { db.checks = {}; data.forEach(r => { db.checks[r.id] = r.data; }); } else db[k] = data.map(r => r.data);
    }
    const { data: us, error: ue } = await s.from('profiles').select('*').order('name'); if (ue) throw ue;
    db.users = (us || []).map(mapP);
    const { data: au } = await s.from('audit_log').select('id,data').order('created_at', { ascending: false }).limit(5000);
    const sent = new Set(h.audit || []); (au || []).forEach(r => sent.add(r.id)); h.audit = [...sent].slice(-8000);
    const unsent = (base.audit || []).filter(a => a.id && !sent.has(a.id));
    db.audit = unsent.concat((au || []).map(r => ({ id: r.id, ...r.data })));
    setH(h); db.lastPull = new Date().toISOString();
    return db;
  }

  const safe = n => String(n || 'file').replace(/[^\w.\-]+/g, '_').slice(-80);
  async function putBlob(s, id, blob, name, type, anon) {
    const path = 'ev/' + (anon ? 'public/' : '') + id + '-' + safe(name);
    const { error } = await s.storage.from('evidence').upload(path, blob, { contentType: type || 'application/octet-stream', upsert: !anon });
    if (error && !/already exists|Duplicate/i.test(error.message)) {
      if (/Bucket not found/i.test(error.message)) throw new Error('File storage is not set up. Run supabase/storage.sql in the Supabase SQL editor.');
      throw error;
    }
    const { error: e2 } = await s.from('evidence_files').insert({ id: path, name: name || 'file', type: type || '', size: blob.size || 0 });
    if (e2 && e2.code !== '23505' && !/does not exist|schema cache/i.test(e2.message)) console.warn('evidence_files:', e2.message);
    return path;
  }
  // Upload a file straight to the database (used when online). Returns the evidence entry.
  async function uploadFile(file, anon) {
    const s = await need(); const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const path = await putBlob(s, id, file, file.name, file.type, anon);
    return { id: 'sb:' + path, name: file.name, type: file.type, size: file.size, cloud: true };
  }
  async function uploadLocalFiles(db, anon) {
    const s = await need(); const lists = [], uploaded = [];
    const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const k in o) { if (k === 'evidence' && Array.isArray(o[k])) lists.push(o[k]); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } };
    ['assets', 'contractors', 'wos', 'requests'].forEach(k => walk(db[k])); walk(db.checks);
    for (const arr of lists) for (const f of arr) {
      if (!f || !f.id || String(f.id).startsWith('sb:')) continue;
      const lf = window.BDIHStore.getFile(f.id); if (!lf) continue;
      const blob = await (await fetch(lf.data)).blob();
      const path = await putBlob(s, f.id, blob, lf.name, lf.type, anon);
      uploaded.push(f.id); f.id = 'sb:' + path; f.cloud = true;
    }
    return uploaded;
  }

  async function push(db0, anon) {
    const s = await need(); const db = JSON.parse(JSON.stringify(db0)); const h = getH(); const renamed = [];
    const uploaded = await uploadLocalFiles(db, anon);
    for (const [k, t] of Object.entries(T)) {
      if (anon && !['requests', 'pwRequests'].includes(k)) continue;
      const known = h[t] || (h[t] = {});
      for (const r of rows(db, k)) {
        const hv = hash(JSON.stringify(r.data)); if (known[r.id] === hv) continue;
        if (known[r.id] === undefined) {
          let id = r.id, data = r.data, tries = 0;
          for (;;) {
            const { error } = await s.from(t).insert({ id, data });
            if (!error) break;
            if (error.code === '23505' && anon) break;
            if (error.code === '23505' && k === 'checks') { const { error: e2 } = await s.from(t).update({ data }).eq('id', id); if (e2) throw e2; break; }
            if (error.code === '23505' && tries++ < 3) { id = r.id + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(); data = { ...data, id }; continue; }
            throw error;
          }
          if (id !== r.id) { renamed.push([r.id, id]); const it = (db[k] || []).find(x => x.id === r.id); if (it) it.id = id; }
          known[id] = hash(JSON.stringify(data));
        } else if (!anon) {
          const { error } = await s.from(t).update({ data: r.data }).eq('id', r.id); if (error) throw error;
          known[r.id] = hv;
        }
      }
    }
    const sent = new Set(h.audit || []); const newA = (db.audit || []).filter(a => a.id && !sent.has(a.id));
    if (newA.length) {
      const { error } = await s.from('audit_log').insert(newA.map(a => { const { id, ...data } = a; return { id, data }; }));
      if (error && error.code !== '23505') throw error;
      newA.forEach(a => sent.add(a.id)); h.audit = [...sent].slice(-8000);
    }
    setH(h);
    return { db, renamed, uploaded };
  }

  async function fileUrl(id) {
    const s = await need(); const { data, error } = await s.storage.from('evidence').createSignedUrl(String(id).slice(3), 3600);
    if (error) throw error; return data.signedUrl;
  }
  async function admin(action, p) {
    const s = await need();
    const M = {
      create: ['bdih_admin_create_user', { p_name: p.name, p_username: p.username, p_email: p.email, p_role: p.role }],
      update: ['bdih_admin_update_user', { p_id: p.id, p_name: p.name, p_username: p.username, p_email: p.email, p_role: p.role }],
      reset: ['bdih_admin_reset_password', { p_id: p.id }],
      setPassword: ['bdih_admin_set_password', { p_id: p.id, p_password: p.password, p_must_change: !!p.mustChange }],
      setActive: ['bdih_admin_set_active', { p_id: p.id, p_active: !!p.active }]
    };
    const [fn, args] = M[action]; const { data, error } = await s.rpc(fn, args);
    if (error) {
      const m = error.message || String(error);
      if (/Could not find the function/i.test(m) || (/function public\.bdih_admin/i.test(m) && /does not exist/i.test(m))) throw new Error(action === 'setPassword' ? 'Setting passwords is not set up yet. Run supabase/admin-set-password.sql in the Supabase SQL editor, then reload.' : 'User management is not set up. Run supabase/admin-users.sql in the Supabase SQL editor.');
      throw new Error('Database: ' + m);
    }
    return { temp: data, ok: true };
  }

  window.BDIHCloud = { enabled, ready, uploadFile, signIn, signOut, profile, pull, push, changePassword, admin, fileUrl, friendly };
})();
