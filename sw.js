// 📺 IPTV Player — Service Worker v15
// v15: v2.8.5 theater controls fit fix
const CACHE = 'iptv-player-v15';
const ASSETS = [
  '/iptv-player/',
  '/iptv-player/manifest.json',
  '/iptv-player/icons/icon-192.png',
  '/iptv-player/icons/icon-512.png',
  '/iptv-player/icons/icon-maskable.png',
  '/iptv-player/icons/apple-touch-icon.png'
];

// ── Install: pre-cache static assets only (NOT index.html — it updates frequently) ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: ALWAYS network for HTML, cache-first for static assets ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  // HTML: always go to network (no cache)
  if (isLocal && (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/iptv-player/') || url.pathname === '/iptv-player/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Static local assets: cache-first
  if (isLocal) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // CDN scripts: network-first, cache fallback
  const isCDN = url.hostname.includes('jsdelivr.net') ||
                url.hostname.includes('gstatic.com') ||
                url.hostname.includes('iptv-org.github.io');

  if (isCDN) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  }
});

// ── Update detection ──
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
