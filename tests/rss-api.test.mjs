import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRssXml, isPublicIpv4, normalizePublicFeedUrl, fetchRssXml } from '../netlify/lib/rss-core.mjs';
import newsFunction, { createNewsHandler, config as newsConfig } from '../netlify/functions/news.mjs';
import customFunction, { createCustomNewsHandler, isSameOriginRequest, config as customConfig } from '../netlify/functions/custom-news.mjs';

const rssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><item>
<title><![CDATA[Test <b>haber</b> &amp; bilgi]]></title>
<link>https://example.org/story?utm_source=feed</link>
<pubDate>Sun, 15 Nov 2026 10:00:00 GMT</pubDate>
<description><![CDATA[<p>Özet <strong>metni</strong></p>]]></description>
</item></channel></rss>`;

const atomFixture = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
<title>Atom haberi</title><link rel="alternate" href="https://example.org/atom-story"/>
<updated>2026-11-15T10:30:00Z</updated><summary>Atom özeti</summary>
</entry></feed>`;

test('RSS 2.0 XML parser extracts title, link, date and safe plain-text summary', () => {
  const [item] = parseRssXml(rssFixture);
  assert.deepEqual(item, {
    title: 'Test haber & bilgi',
    link: 'https://example.org/story?utm_source=feed',
    publishedAt: 'Sun, 15 Nov 2026 10:00:00 GMT',
    description: 'Özet metni',
  });
});

test('Atom parser supports namespaced feed fields and self-closing alternate links', () => {
  const [item] = parseRssXml(atomFixture);
  assert.equal(item.title, 'Atom haberi');
  assert.equal(item.link, 'https://example.org/atom-story');
  assert.equal(item.publishedAt, '2026-11-15T10:30:00Z');
  assert.equal(item.description, 'Atom özeti');
});

test('RSS parser enforces feed-size and item limits', () => {
  assert.throws(() => parseRssXml('x'.repeat(1_000_001)), /boyutu aşıyor/);
  const many = `<rss><channel>${Array.from({ length: 20 }, (_, i) => `<item><title>Haber ${i}</title><link>https://example.org/${i}</link></item>`).join('')}</channel></rss>`;
  assert.equal(parseRssXml(many).length, 12);
});

test('public IPv4 policy rejects loopback, private, link-local, shared and reserved networks', () => {
  for (const ip of ['0.0.0.1', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.1.2', '172.16.0.1', '192.0.2.1', '192.168.1.1', '198.18.0.1', '203.0.113.1', '224.0.0.1']) {
    assert.equal(isPublicIpv4(ip), false, ip);
  }
  assert.equal(isPublicIpv4('1.1.1.1'), true);
  assert.equal(isPublicIpv4('8.8.8.8'), true);
});

test('custom feed URLs require public HTTPS hostnames on the default secure port', () => {
  assert.equal(normalizePublicFeedUrl('https://example.org/feed.xml')?.href, 'https://example.org/feed.xml');
  for (const bad of [
    'http://example.org/rss', 'https://localhost/rss', 'https://127.0.0.1/rss',
    'https://192.168.1.1/rss', 'https://user:pass@example.org/rss',
    'https://example.org:8443/rss', 'https://router.local/rss', 'file:///etc/passwd',
  ]) assert.equal(normalizePublicFeedUrl(bad), null, bad);
});

test('RSS fetch pins DNS to a public IPv4 and revalidates redirected hosts', async () => {
  const calls = [];
  const xml = await fetchRssXml('https://example.org/feed.xml', {
    resolvePublicIpv4: async (host) => {
      calls.push(`dns:${host}`);
      return '93.184.216.34';
    },
    requestHttps: async (url, ip, options) => {
      calls.push(`https:${url.hostname}:${ip}:${options.timeoutMs}`);
      if (url.hostname === 'example.org') return { status: 302, location: 'https://feeds.example.net/rss', body: '' };
      return { status: 200, location: '', body: rssFixture };
    },
  });
  assert.equal(xml, rssFixture);
  assert.deepEqual(calls, [
    'dns:example.org', 'https:example.org:93.184.216.34:9000',
    'dns:feeds.example.net', 'https:feeds.example.net:93.184.216.34:9000',
  ]);
});

test('RSS fetch rejects private DNS answers before making an HTTPS request', async () => {
  let requested = false;
  await assert.rejects(() => fetchRssXml('https://example.org/feed', {
    resolvePublicIpv4: async () => '127.0.0.1',
    requestHttps: async () => { requested = true; return { status: 200, body: rssFixture }; },
  }), /özel veya ayrılmış/);
  assert.equal(requested, false);
});

test('RSS fetch refuses redirects to private or local networks before following them', async () => {
  let requestCount = 0;
  await assert.rejects(() => fetchRssXml('https://example.org/feed', {
    resolvePublicIpv4: async (host) => host === 'example.org' ? '93.184.216.34' : '10.0.0.8',
    requestHttps: async () => {
      requestCount += 1;
      return { status: 302, location: 'https://feed-internal.example.net/admin', body: '' };
    },
  }), /özel veya ayrılmış/);
  assert.equal(requestCount, 1);
});

test('built-in news API returns selected allowlisted sources and structured partial failures', async () => {
  const handler = createNewsHandler({
    fetchFeed: async (source) => {
      if (source.id === 'bbc-turkce') return [{ title: 'BBC Haber', link: 'https://bbc.example/story', publishedAt: '2026-11-15T09:00:00Z', description: 'Özet' }];
      throw new Error('RSS kaynağı zaman aşımına uğradı.');
    },
  });
  const response = await handler(new Request('https://diorama.example/api/news?category=gundem&sources=bbc-turkce,trt-haber'));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, 'partial');
  assert.equal(payload.sourceCount, 2);
  assert.equal(payload.successCount, 1);
  assert.equal(payload.results[0].sourceId, 'bbc-turkce');
  assert.equal(payload.results[0].items[0].title, 'BBC Haber');
  assert.equal(payload.results[1].errorCode, 'timeout');
  assert.match(response.headers.get('Netlify-CDN-Cache-Control'), /durable/);
});

test('built-in API rejects arbitrary source IDs and invalid categories', async () => {
  const handler = createNewsHandler({ fetchFeed: async () => [] });
  const badSource = await handler(new Request('https://diorama.example/api/news?category=gundem&sources=../../etc/passwd'));
  assert.equal(badSource.status, 400);
  const badCategory = await handler(new Request('https://diorama.example/api/news?category=unknown'));
  assert.equal(badCategory.status, 400);
});

test('built-in API supports forced refresh without shared or browser caching', async () => {
  const handler = createNewsHandler({ fetchFeed: async () => [{ title: 'Yeni', link: 'https://example.org/new' }] });
  const response = await handler(new Request('https://diorama.example/api/news?category=bilim&refresh=1'));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('custom feed API validates public HTTPS URLs before invoking its fetcher', async () => {
  let calls = 0;
  const handler = createCustomNewsHandler({ fetchFeed: async () => { calls += 1; return parseRssXml(rssFixture); } });
  const invalid = await handler(new Request('https://diorama.example/api/custom-news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'http://localhost/rss' }) }));
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);
  const valid = await handler(new Request('https://diorama.example/api/custom-news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.org/feed.xml' }) }));
  const payload = await valid.json();
  assert.equal(valid.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.items[0].title, 'Test haber & bilgi');
  assert.equal(valid.headers.get('Cache-Control'), 'private, no-store');
});

test('custom feed API returns a safe error for unavailable or malformed feeds', async () => {
  const handler = createCustomNewsHandler({ fetchFeed: async () => { throw new Error('Feed unreachable'); } });
  const response = await handler(new Request('https://diorama.example/api/custom-news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.org/feed.xml' }) }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).status, 'error');
});

test('Netlify routes, methods and IP rate limits are explicit', () => {
  assert.equal(newsConfig.path, '/api/news');
  assert.equal(newsConfig.method, 'GET');
  assert.equal(newsConfig.rateLimit.aggregateBy, 'ip');
  assert.equal(customConfig.path, '/api/custom-news');
  assert.equal(customConfig.rateLimit.windowLimit, 40);
  assert.equal(typeof newsFunction, 'function');
  assert.equal(typeof customFunction, 'function');
});


test('custom feed endpoint enforces an actual streamed body limit and JSON content type', async () => {
  let calls = 0;
  const handler = createCustomNewsHandler({ fetchFeed: async () => { calls += 1; return parseRssXml(rssFixture); } });
  const wrongType = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"url":"https://example.org/feed.xml"}',
  }));
  assert.equal(wrongType.status, 415);

  const oversizedBody = ' '.repeat(4097);
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(oversizedBody)); controller.close(); },
  });
  const oversized = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  }));
  assert.equal(oversized.status, 413);
  assert.equal(calls, 0);
});

test('custom feed URL is sent only in the POST body, never in the query string', async () => {
  const frontend = await readFile(new URL('../js/02-news.js', import.meta.url), 'utf8');
  const start = frontend.indexOf('async function fetchOneSource');
  const end = frontend.indexOf('\nfunction persistFreshSource', start);
  assert.ok(start >= 0 && end > start);
  const implementation = frontend.slice(start, end);
  assert.match(implementation, /method:\s*'POST'/);
  assert.match(implementation, /body:\s*JSON\.stringify\(\{\s*url:\s*source\.rss\s*\}\)/);
  assert.doesNotMatch(implementation, /searchParams\.set\(['"]url['"]/);
});


test('custom RSS proxy rejects cross-origin browser requests and accepts same-origin requests', () => {
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', { method: 'POST', headers: { origin: 'https://diorama.test' } })), true);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', { method: 'POST', headers: { origin: 'https://attacker.test' } })), false);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })), false);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', { method: 'POST' })), true);
});
