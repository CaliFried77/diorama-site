/* Generated during build: cache key and app-shell paths are content-derived. */
const CACHE_PREFIX = 'living-pixel-diorama-shell-';
const CACHE_NAME = __CACHE_NAME__;
const APP_SHELL = __APP_SHELL_JSON__;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Bypass the browser's HTTP cache during installation so the new worker
    // never seeds its versioned shell with files from the previous release.
    const freshRequests = APP_SHELL.map((path) => new Request(new URL(path, self.location.origin), { cache: 'reload' }));
    await cache.addAll(freshRequests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation is network-first, with the cached app entry as an offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request))
          || (await caches.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  // Static resources are network-first and cached for offline fallback.
  // Revalidation prevents a previous worker from serving an old module graph
  // alongside a newly deployed HTML entrypoint during an update.
  if (/\.(?:css|js|html|svg|png|ico|webmanifest|woff2?|md|txt)$/.test(url.pathname) || url.pathname.endsWith('/LICENSE') || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
