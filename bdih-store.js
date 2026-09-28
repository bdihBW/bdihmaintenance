// BDIH Maintenance Intelligence Platform — local persistence + seed. Depends on bdih-data.js (window.BDIH).
(function () {
  const CLOUD = !!(window.BDIH_CONFIG && window.BDIH_CONFIG.enabled);
  const KEY = CLOUD ? 'bdih-mip-cloud-db' : 'bdih-mip-v2-db', FKEY = 'bdih-mip-v2-file-';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const monday = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
  const RANGE = { start: '2026-04-01', end: '2031-03-31' }; // FY2026-27 to FY2030-31

  const LONG = { 'AHU': 'Air Handling Unit (AHU)', 'FCU': 'Fan Coil Unit (FCU)', 'DX Ceiling Cassette AC Unit': 'Direct Expansion (DX) Ceiling Cassette AC Unit', 'BMS': 'Building Management System (BMS)', 'RMU': 'Ring Main Unit (RMU)', 'Main LV Switchgear': 'Main Low Voltage (LV) Switchgear', 'UPS': 'Uninterruptible Power Supply (UPS)' };

  // Daily/weekly check schedule, transcribed from the Wholistic Maintenance Calendar
  const CHECKS = [
    ['gen', 'Automatic Standby Diesel Generator', 'Electrical', 'BDIH-E-11', 'Predictive & Preventive', 'daily'],
    ['ahu', 'Air Handling Unit (AHU)', 'Mechanical', 'BDIH-M-01', 'Proactive, Predictive & Preventive', 'daily'],
    ['exf', 'Extract fans & CO detector', 'Mechanical', 'BDIH-M-07', 'Preventive & Predictive', 'daily'],
    ['fp', 'Fire pumps', 'Mechanical', 'BDIH-M-12', 'Preventive', 'daily'],
    ['pp', 'Primary pump', 'Mechanical', 'BDIH-M-19', 'Predictive & Reactive', 'daily'],
    ['sp', 'Secondary pump', 'Mechanical', 'BDIH-M-20', 'Predictive & Reactive', 'daily'],
    ['rac', 'Run-around coil pump', 'Mechanical', 'BDIH-M-21', 'Predictive & Reactive', 'daily'],
    ['sol', 'Sololift toilet lifting station pump', 'Mechanical', 'BDIH-M-22', 'Predictive & Reactive', 'daily'],
    ['bms', 'Building Management System (BMS) monitoring', 'Mechanical', 'BDIH-M-33', 'Predictive & Reactive', 'daily'],
    ['ups', 'Uninterruptible Power Supply (UPS)', 'Electrical', 'BDIH-E-06', 'Predictive & Preventive', 'daily'],
    ['lgt', 'Lighting (spot bulb replacement)', 'Electrical', 'BDIH-E-07', 'Predictive & Preventive', 'daily'],
    ['fd', 'Fire detection & voice evacuation panel', 'Electrical', 'BDIH-E-09', 'Predictive & Preventive', 'daily'],
    ['ech', 'Energy centre housekeeping', 'Housekeeping', '', 'Preventive', 'mwf'],
    ['phh', 'Pump house housekeeping', 'Housekeeping', '', 'Preventive', 'mwf'],
    ['fpr', 'Fire plant room housekeeping', 'Housekeeping', '', 'Preventive', 'mon'],
    ['genh', 'Generator room housekeeping', 'Housekeeping', 'BDIH-E-11', 'Preventive', 'mon'],
    ['db', 'Distribution boards', 'Electrical', 'BDIH-E-05', 'Predictive & Preventive', 'daily'],
    ['ahum', 'AHU monthly schedule check', 'Mechanical', 'BDIH-M-01', 'Proactive, Predictive & Preventive', 'tuefri'],
    ['bmsm', 'BMS monthly schedule check', 'Mechanical', 'BDIH-M-33', 'Predictive & Reactive', 'tuefri'],
    ['csp', 'Condensate sump pumps housekeeping', 'Housekeeping', 'BDIH-M-06', 'Preventive & Predictive', 'tuefri']
  ].map(([k, label, cat, asset, strategy, days]) => ({ k, label, cat, asset, strategy, days }));
  const itemsFor = s => {
    const dow = parse(s).getDay(); if (dow === 0 || dow === 6) return [];
    return CHECKS.filter(c => c.days === 'daily' || (c.days === 'mwf' && [1, 3, 5].includes(dow)) || (c.days === 'mon' && dow === 1) || (c.days === 'tuefri' && dow >= 2));
  };

  const USERS = [
    { id: 'u1', name: 'Property & Facilities Officer 1', role: 'Property & Facilities Officer', pin: '1111' },
    { id: 'u2', name: 'Property & Facilities Officer 2', role: 'Property & Facilities Officer', pin: '2222' },
    { id: 'u3', name: 'Property & Facilities Manager', role: 'Property & Facilities Manager', pin: '3333' },
    { id: 'u4', name: 'System Administrator', role: 'System Administrator', pin: '4444' }
  ];
  const CONTRACTORS = [
    ['Intramech', 'HVAC · chillers', 'Via PWS'], ['AF Sandilands', 'Pumps', ''], ['Mod Control', 'Pumps · controls', ''], ['Atbro Systems', 'BMS', ''],
    ['Sharps Electrical', 'Fire detection', ''], ['Thembezulu (Pty) Ltd', 'Pumps', ''], ['Climate Control', 'HVAC', ''], ['Miracle Control', 'Control panels', ''],
    ['Multiwates', 'Wastewater', ''], ['AquaPro Water Treatment', 'Water treatment', ''], ['Algebraic Engineering', 'UPS', ''], ['SE', 'Electrical · lighting', '']
  ].map(([name, scope, notes], i) => ({ id: 'c' + (i + 1), name, scope, notes, contact: '', email: '', phone: '', active: true }));
  // Historical orders from the maintenance history sheets
  const WOS = [
    ['BDIH-M-05', 'Civil sump pump service', 'Preventive', 'Mod Control', '2024-07-15', 5586, 'Paid', 'Closed'],
    ['BDIH-M-33', 'BMS service', 'Preventive', 'Atbro Systems', '2024-08-15', 62791.20, 'Paid', 'Closed'],
    ['BDIH-E-09', 'Fire detection & voice evacuation service', 'Preventive', 'Sharps Electrical', '2024-07-20', 57285.23, 'Paid', 'Closed'],
    ['BDIH-M-27', 'Chiller call-out: flow switches replaced (R)', 'Corrective', 'Intramech', '2024-02-15', 33377.25, 'Paid', 'Closed'],
    ['BDIH-E-06', 'UPS service', 'Preventive', 'Algebraic Engineering', '2025-02-27', 0, 'Paid', 'Closed'],
    ['BDIH-M-28', 'Water testing & chemical dosing', 'Preventive', 'AquaPro Water Treatment', '2025-03-15', 0, 'Paid', 'Closed'],
    ['BDIH-M-27', 'Chiller 2 repair; Chiller 3 compressor rigging (R)', 'Corrective', 'Intramech', '2025-06-15', 129442.60, 'Paid', 'Closed'],
    ['BDIH-M-09', 'Domestic booster pump service', 'Preventive', 'Climate Control', '2025-11-15', 25292.04, 'Paid', 'Closed'],
    ['BDIH-M-16', 'Janitor sump: two Bar 3 pumps replaced', 'Corrective', 'Thembezulu (Pty) Ltd', '2026-01-20', 37900, 'Paid', 'Closed'],
    ['BDIH-M-25', 'Gorman Rupp pumps service & overhaul', 'Preventive', 'AF Sandilands', '2026-02-15', 99307.68, 'Paid', 'Closed'],
    ['BDIH-M-11', 'Fan coil unit service', 'Preventive', 'Climate Control', '2026-05-15', 8755.20, 'Paid', 'Closed'],
    ['BDIH-E-11', 'Generator batteries replaced', 'Corrective', 'In-house', '2026-05-04', 0, 'Not required', 'Closed'],
    ['BDIH-M-16', 'Janitor sump: two Bar 1 pumps replaced', 'Corrective', 'Mod Control', '2026-06-15', 36936, 'Paid', 'Closed'],
    ['BDIH-M-25', 'Gorman Rupp control panel repair & upgrade', 'Corrective', 'Miracle Control', '2026-06-20', 14991, 'Invoiced', 'Completed'],
    ['BDIH-M-25', 'Muncher repair and servicing', 'Corrective', 'Multiwates', '2026-06-25', 7410, 'PO issued', 'In progress'],
    ['BDIH-M-27', 'Chiller 2 repair works', 'Corrective', 'Intramech', '2026-07-10', 0, 'PO issued', 'Scheduled'],
    ['BDIH-E-07', 'Emergency staircase lights replacement', 'Emergency', 'SE', '2026-08-20', 328973.59, 'Quotations (1 of 3)', 'On hold'],
    ['BDIH-M-22', 'Sololift units replacement (3 of 4)', 'Corrective', '', '2026-09-01', 0, 'Requisition pending', 'Open']
  ].map(([asset, title, type, contractor, date, amount, procurement, status], i) => ({
    id: 'WO-' + (2401 + i), asset, title, type, contractor, awardDate: date, serviceDate: status === 'Closed' || status === 'Completed' ? date : '', amount, procurement, status,
    priority: type === 'Emergency' ? 'Critical' : type === 'Corrective' ? 'High' : 'Routine', po: amount && procurement !== 'Requisition pending' && !procurement.startsWith('Quot') ? 'PO-' + date.slice(0, 4) + '-' + (310 + i) : '',
    desc: '', raisedBy: 'Imported from history sheet', raisedAt: date + 'T08:00', evidence: [], updates: [], request: ''
  }));
  const REQS = [
    ['Aircon not cooling in office 2.14', 'Bar 3, level 2', 'HVAC', 'High', 'Tenant, Bar 3', 'Submitted', '', false, -1],
    ['Water leak under basin, ground-floor toilets', 'Bar 1, ground floor', 'Plumbing', 'Medium', 'Reception', 'In progress', 'u1', false, -3],
    ['Emergency light flickering in stairwell B', 'Bar 1, stairwell B', 'Electrical', 'Critical', 'Security', 'Escalated', 'u2', true, -6]
  ].map(([title, loc, cat, urg, by, status, assigned, esc, off], i) => ({ id: 'MR-' + (1001 + i), title, loc, cat, urgency: urg, reporter: by, contact: '', desc: '', status, assigned, escalated: esc, at: off, wo: '', evidence: [], history: [] }));

  function seed() {
    if (CLOUD) return { v: 2, cloud: true, assets: [], contractors: [], wos: [], requests: [], checks: {}, users: [], audit: [], outbox: [], pwRequests: [], monthly: {} };
    const D = window.BDIH; const today = iso(new Date());
    const assets = D.assets.map(a => ({ ...a, name: LONG[a.name] || a.name, retired: false, retiredAt: '', retiredReason: '', installed: '', warranty: '', evidence: [] }));
    REQS.forEach(r => { r.at = addDays(today, r.at) + 'T09:15'; r.history = [{ at: r.at, by: r.reporter, text: 'Request submitted' }]; });
    const checks = {}; let seedN = 0;
    for (let s = addDays(today, -21); s < today; s = addDays(s, 1)) itemsFor(s).forEach((c, j) => {
      seedN = (seedN * 31 + j + 7) % 101; if (seedN < 9) return; // leave gaps so missing checks show in the audit
      const res = c.k === 'sol' ? 'Fault' : c.k === 'lgt' && seedN % 3 === 0 ? 'Attention' : 'OK';
      const by = seedN % 2 ? USERS[0] : USERS[1];
      checks[s + '|' + c.k] = { result: res, type: c.strategy.split(/[,&]/)[0].trim(), note: res === 'Fault' ? '3 of 4 units not operating' : res === 'Attention' ? 'Two bulbs replaced' : '', reading: '', by: by.name, byId: by.id, at: s + 'T' + pad(7 + (j % 4)) + ':' + pad((j * 7) % 60) };
    });
    return { v: 2, assets, contractors: CONTRACTORS, wos: WOS, requests: REQS, checks, users: USERS, audit: [{ at: new Date().toISOString(), by: 'System', role: 'System', action: 'Imported', ref: 'Rev 0 spreadsheets', detail: assets.length + ' assets, ' + WOS.length + ' historical orders' }] };
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 2) return s; } catch (e) {} const s = seed(); save(s); return s; }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; } }
  function putFile(file) {
    return new Promise((res, rej) => {
      if (file.size > 3 * 1024 * 1024) return rej(new Error('File is over 3 MB'));
      const r = new FileReader(); r.onload = () => { const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        try { localStorage.setItem(FKEY + id, JSON.stringify({ name: file.name, type: file.type, size: file.size, data: r.result })); res({ id, name: file.name, type: file.type, size: file.size }); } catch (e) { rej(new Error('Browser storage is full')); } };
      r.onerror = () => rej(r.error); r.readAsDataURL(file);
    });
  }
  function getFile(id) { try { return JSON.parse(localStorage.getItem(FKEY + id)); } catch (e) { return null; } }
  function reset() { localStorage.removeItem(KEY); return load(); }
  window.BDIHStore = { CLOUD, FKEY, load, save, reset, putFile, getFile, itemsFor, CHECKS, iso, parse, addDays, monday, RANGE };
})();
