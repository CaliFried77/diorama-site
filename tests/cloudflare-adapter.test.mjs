import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../cloudflare/worker.mjs';
import { fetchAndParseFeedCloudflare } from '../cloudflare/rss-fetch.mjs';

const rssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><item>
<title><![CDATA[Cloudflare test haberi]]></title>
<link>https://example.org/story</link>
<pubDate>Sun, 15 Nov 2026 10:00:00 GMT</pubDate>
<description><![CDATA[Özet metni]]></description>
</item></channel></rss>`;

test('Cloudflare RSS transport parses valid HTTPS feeds and requests manual redirects', async () => {
  let requestedUrl = '';
  let requestedOptions;
  const items = await fetchAndParseFeedCloudflare('https://feeds.example.org/rss.xml', {
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return new Response(rssFixture, {
        status: 200,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      });
    },
  });

  assert.equal(requestedUrl, 'https://feeds.example.org/rss.xml');
  assert.equal(requestedOptions.redirect, 'manual');
  assert.equal(requestedOptions.method, 'GET');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Cloudflare test haberi');
  assert.equal(items[0].link, 'https://example.org/story');
});

test('Cloudflare RSS transport rejects unsafe redirect targets before requesting them', async () => {
  let calls = 0;
  await assert.rejects(() => fetchAndParseFeedCloudflare('https://feeds.example.org/rss.xml', {
    fetchImpl: async () => {
      calls += 1;
      return new Response('', {
        status: 302,
        headers: { Location: 'https://127.0.0.1/private.xml' },
      });
    },
  }), /güvenli bir HTTPS adresine gitmiyor/);
  assert.equal(calls, 1);
});

test('Cloudflare RSS transport rejects non-HTTPS initial URLs and oversized responses', async () => {
  let calls = 0;
  await assert.rejects(() => fetchAndParseFeedCloudflare('http://feeds.example.org/rss.xml', {
    fetchImpl: async () => { calls += 1; return new Response(rssFixture); },
  }), /yalnızca herkese açık HTTPS/i);
  assert.equal(calls, 0);

  await assert.rejects(() => fetchAndParseFeedCloudflare('https://feeds.example.org/rss.xml', {
    maxBytes: 8,
    fetchImpl: async () => new Response('this response is too large', {
      headers: { 'Content-Length': '26', 'Content-Type': 'application/rss+xml' },
    }),
  }), /boyut sınırını aşıyor/);
});

test('Cloudflare RSS transport applies a request timeout', async () => {
  await assert.rejects(() => fetchAndParseFeedCloudflare('https://feeds.example.org/rss.xml', {
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  }), /zaman aşımına uğradı/);
});

test('Cloudflare Worker enforces the news API rate limit and adds security headers', async () => {
  const keys = [];
  const response = await worker.fetch(
    new Request('https://diorama-test.workers.dev/api/news', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '203.0.113.10' },
    }),
    {
      NEWS_RATE_LIMITER: { limit: async ({ key }) => { keys.push(key); return { success: true }; } },
    },
    { waitUntil() {} },
  );

  assert.equal(response.status, 405);
  assert.deepEqual(keys, ['203.0.113.10']);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
  assert.equal(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'");
});

test('Cloudflare Worker rejects custom RSS cross-origin requests and rate-limit violations', async () => {
  const forbidden = await worker.fetch(
    new Request('https://diorama-test.workers.dev/api/custom-news', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.11',
      },
      body: JSON.stringify({ url: 'https://feeds.example.org/rss.xml' }),
    }),
    {
      CUSTOM_NEWS_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
  );
  assert.equal(forbidden.status, 403);

  const limited = await worker.fetch(
    new Request('https://diorama-test.workers.dev/api/news?category=gundem', {
      headers: { 'CF-Connecting-IP': '203.0.113.12' },
    }),
    {
      NEWS_RATE_LIMITER: { limit: async () => ({ success: false }) },
    },
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
});

test('Cloudflare Worker fails closed when a rate-limit binding is missing and routes static assets', async () => {
  const missingBinding = await worker.fetch(
    new Request('https://diorama-test.workers.dev/api/news?category=gundem', {
      headers: { 'CF-Connecting-IP': '203.0.113.13' },
    }),
    {},
  );
  assert.equal(missingBinding.status, 503);

  let assetRequested = false;
  const assetResponse = await worker.fetch(
    new Request('https://diorama-test.workers.dev/'),
    { ASSETS: { fetch: async () => { assetRequested = true; return new Response('static app'); } } },
  );
  assert.equal(assetRequested, true);
  assert.equal(await assetResponse.text(), 'static app');
});

test('Wrangler config keeps API routes in the Worker and static assets in dist', async () => {
  const config = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
  assert.match(config, /main = "cloudflare\/worker\.mjs"/);
  assert.match(config, /directory = "\.\/dist"/);
  assert.match(config, /run_worker_first = \["\/api\/\*"\]/);
  assert.match(config, /global_fetch_strictly_public/);
  assert.match(config, /NEWS_RATE_LIMITER/);
  assert.match(config, /CUSTOM_NEWS_RATE_LIMITER/);
});
