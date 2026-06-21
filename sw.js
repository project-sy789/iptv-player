// 📺 IPTV Player — Service Worker
// Cache strategy: Network-first with cache fallback + auto-update notification
const CACHE = 'iptv-player-v1';
const ASSETS = [
  '/iptv-player/',
  '/iptv-player/index.html',
  '/iptv-player/manifest.json',
  '/iptv-player/icons/icon-192.png',
  '/iptv-player/icons/icon-512.png',
  '/iptv-player/icons/icon-maskable.png',
  '/iptv-player/icons/apple-touch-icon.png'
];

// ── Install: pre-cache core assets ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting(); // activate immediately
});

// ── Activate: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all pages
});

// ── Fetch: network-first, fallback to cache ──
self.addEventListener('fetch', e => {
  // Only handle same-origin + CDN assets
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('jsdelivr.net') ||
                url.hostname.includes('gstatic.com') ||
                url.hostname.includes('iptv-org.github.io');

  if (!isLocal && !isCDN) return; // skip external resources

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)) // offline → cache
  );
});

// ── Update detection: notify clients when new version available ──
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
