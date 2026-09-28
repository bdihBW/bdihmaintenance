// BDIH Maintenance Platform — offline app shell. Caches the platform files so it opens without a connection.
const CACHE = 'bdih-mip-v5';
const SHELL = ['BDIH Maintenance Platform v2.dc.html', 'index.html', 'support.js', 'bdih-config.js', 'bdih-data.js', 'bdih-store.js', 'bdih-cloud.js', 'assets/bdih-logo.jpg', 'assets/bih-campus.jpg', 'assets/bih-aerial.png', 'assets/bih-courtyard.png', '_ds/organic-2fe26819-548a-47be-a420-9a49debe3a30/styles.css', '_ds/organic-2fe26819-548a-47be-a420-9a49debe3a30/_ds_bundle.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('.supabase.co')) return;
  e.respondWith(fetch(e.request).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
