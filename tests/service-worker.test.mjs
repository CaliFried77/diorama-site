import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');

function loadWorker() {
  const listeners = new Map();
  const cacheItems = new Map();
  const deleted = [];
  let added = [];
  let skipped = false;
  let claimed = false;
  const cache = {
    async addAll(paths) { added = [...paths].map((path) => path.url || path); paths.forEach((path) => cacheItems.set(path.url || new URL(path, 'https://diorama.test/').href, { cached: path.url || path })); },
    async put(key, value) { cacheItems.set(typeof key === 'string' ? key : key.url, value); },
    async match(key) { return cacheItems.get(typeof key === 'string' ? new URL(key, 'https://diorama.test/').href : key.url) ?? null; },
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ['living-pixel-diorama-shell-old', 'living-pixel-diorama-shell-1.3.0', 'living-pixel-diorama-shell-1.4.0', 'living-pixel-diorama-shell-1.4.1', 'living-pixel-diorama-shell-1.5.0']; },
    async delete(key) { deleted.push(key); return true; },
    async match(key) { return cache.match(key); },
  };
  const self = {
    location: { origin: 'https://diorama.test' },
    clients: { async claim() { claimed = true; } },
    addEventListener(type, callback) { listeners.set(type, callback); },
    async skipWaiting() { skipped = true; },
  };
  const context = { self, caches, URL, Request, Response: { error: () => ({ error: true }) }, fetch: async () => { throw new Error('offline'); } };
  vm.runInNewContext(source, context, { filename: 'sw.js' });
  return { listeners, cacheItems, deleted, get added() { return added; }, get skipped() { return skipped; }, get claimed() { return claimed; }, caches, context };
}

test('service worker installs all local app-shell assets and claims the page', async () => {
  const worker = loadWorker();
  let installPromise;
  worker.listeners.get('install')({ waitUntil(promise) { installPromise = promise; } });
  await installPromise;
  assert.ok(worker.added.some((path) => path.endsWith('/css/utilities.css')));
  assert.ok(worker.added.some((path) => path.endsWith('/css/news.css')));
  assert.ok(worker.added.some((path) => path.endsWith('/css/widgets.css')));
  assert.ok(worker.added.some((path) => path.endsWith('/js/10-glass-renderer.js')));
  assert.ok(worker.added.some((path) => path.endsWith('/js/focus-timer-state.js')));
  assert.ok(worker.added.some((path) => path.endsWith('/js/performance-monitor.js')));
  assert.ok(worker.added.some((path) => path.endsWith('/config/news-feeds.js')));
  assert.ok(worker.added.some((path) => path.endsWith('/config/habitat-catalog.js')));
  assert.ok(worker.added.some((path) => path.endsWith('/manifest.webmanifest')));
  assert.ok(worker.added.some((path) => path.endsWith('/icons/diorama-192.png')));
  assert.ok(worker.added.some((path) => path.endsWith('/fonts/inter-regular.woff2')));
  assert.ok(worker.added.some((path) => path.endsWith('/fonts/pixelify-sans-variable.woff2')));
  assert.ok(worker.added.some((path) => path.endsWith('/LICENSE')));
  assert.ok(worker.added.some((path) => path.endsWith('/THIRD_PARTY_NOTICES.md')));
  assert.ok(worker.added.some((path) => path.endsWith('/licenses/fonts/Inter-OFL.txt')));
  assert.ok(worker.added.every((path) => path.startsWith('https://diorama.test/')));
  assert.match(source, /cache:\s*'reload'/);
  assert.match(source, /living-pixel-diorama-shell-2\.0\.0-dev\.1-[a-f0-9]{16}/);
  assert.ok(worker.skipped);

  let activatePromise;
  worker.listeners.get('activate')({ waitUntil(promise) { activatePromise = promise; } });
  await activatePromise;
  assert.deepEqual(worker.deleted, ['living-pixel-diorama-shell-old', 'living-pixel-diorama-shell-1.3.0', 'living-pixel-diorama-shell-1.4.0', 'living-pixel-diorama-shell-1.4.1', 'living-pixel-diorama-shell-1.5.0']);
  assert.ok(worker.claimed);
});

test('offline navigation falls back to the cached app shell', async () => {
  const worker = loadWorker();
  // Mimic a previously installed app shell.
  const cachedIndex = { marker: 'cached index' };
  worker.cacheItems.set('https://diorama.test/index.html', cachedIndex);
  const event = {
    request: { method: 'GET', mode: 'navigate', url: 'https://diorama.test/' },
    respondWith(promise) { this.responsePromise = promise; },
  };
  worker.listeners.get('fetch')(event);
  const response = await event.responsePromise;
  assert.equal(response.marker, 'cached index');
});

test('external API requests are not intercepted by the local app shell', () => {
  const worker = loadWorker();
  const event = {
    request: { method: 'GET', mode: 'cors', url: 'https://api.open-meteo.com/v1/forecast' },
    respondWith() { throw new Error('External request should not be intercepted'); },
  };
  assert.doesNotThrow(() => worker.listeners.get('fetch')(event));
});

test('same-origin RSS API calls are never added to the static app-shell cache', async () => {
  assert.doesNotMatch(source, /api\/news/);
  assert.doesNotMatch(source, /api\/custom-news/);
});


test('static resources prefer revalidated network responses and use cache only offline', async () => {
  const worker = loadWorker();
  let fetchOptions;
  worker.context.fetch = async (request, options) => {
    fetchOptions = options;
    return { ok: true, marker: 'fresh response', clone() { return this; } };
  };
  const event = {
    request: { method: 'GET', mode: 'cors', url: 'https://diorama.test/js/main.js' },
    respondWith(promise) { this.responsePromise = promise; },
  };
  worker.cacheItems.set('https://diorama.test/js/main.js', { marker: 'stale cached response' });
  worker.listeners.get('fetch')(event);
  const response = await event.responsePromise;
  assert.equal(response.marker, 'fresh response');
  assert.equal(fetchOptions.cache, 'no-cache');
  assert.equal(worker.cacheItems.get('https://diorama.test/js/main.js').marker, 'fresh response');
});
