/* Offline shell for the static Diorama application.
 * The app shell (HTML, CSS and local ES modules) remains available offline after
 * one successful online visit. News and weather remain live network services.
 */
const CACHE_PREFIX = 'living-pixel-diorama-shell-';
const CACHE_NAME = `${CACHE_PREFIX}1.6.3`;
const APP_SHELL = [
  './',
  './index.html',
  './css/base.css',
  './css/utilities.css',
  './css/responsive.css',
  './css/news.css',
  './css/widgets.css',
  './config/habitat-catalog.js',
  './config/news-feeds.js',
  './js/main.js',
  './js/storage.js',
  './js/services.js',
  './js/scene-state.js',
  './js/01-core-ui.js',
  './js/02-news.js',
  './js/news-utils.js',
  './js/03-weather.js',
  './js/04-focus-audio.js',
  './js/focus-timer-state.js',
  './js/05-workspace.js',
  './js/06-data-manager.js',
  './js/07-habitat-state.js',
  './js/08-creatures.js',
  './js/09-scenery.js',
  './js/10-glass-renderer.js',
  './js/performance-monitor.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
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

  // Keep navigation fresh while preserving the last successful shell offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone());
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

  // Static app files are cache-first; a successful network response refreshes cache.
  if (/\.(?:css|js|html)$/.test(url.pathname) || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const update = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => null);
      if (cached) {
        event.waitUntil(update);
        return cached;
      }
      return (await update) || Response.error();
    })());
  }
});
