/* Service Worker: App offline verfügbar machen.
   Strategie: erst Netz (damit Updates sofort ankommen), bei fehlender Verbindung aus dem Cache. */
const CACHE = 'todo-manager-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/config.js',
  './js/util.js',
  './js/store.js',
  './js/sync.js',
  './js/app.js',
  './vendor/vue.global.prod.js',
  './fonts/ibm-plex-sans-400.woff2',
  './fonts/ibm-plex-sans-500.woff2',
  './fonts/ibm-plex-sans-600.woff2',
  './fonts/ibm-plex-mono-400.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase & Co. laufen direkt
  event.respondWith((async () => {
    try {
      const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        const key = req.mode === 'navigate' ? './index.html' : req.url.split('?')[0];
        caches.open(CACHE).then(c => c.put(key, copy));
      }
      return res;
    } catch (err) {
      const cache = await caches.open(CACHE);
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
