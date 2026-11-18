import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { parseRssXml, normalizePublicFeedUrl } from '../server/rss-parser.mjs';
import { createNewsHandler } from '../server/news-handler.mjs';
import { createCustomNewsHandler, isSameOriginRequest } from '../server/custom-news-handler.mjs';

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

test('RSS 2.0 parser extracts title, link, date and safe plain-text summary', () => {
  const [item] = parseRssXml(rssFixture);
  assert.deepEqual(item, {
    title: 'Test haber & bilgi',
    link: 'https://example.org/story?utm_source=feed',
    publishedAt: 'Sun, 15 Nov 2026 10:00:00 GMT',
    description: 'Özet metni',
  });
});

test('Atom parser supports namespaced fields and alternate links', () => {
  const [item] = parseRssXml(atomFixture);
  assert.equal(item.title, 'Atom haberi');
  assert.equal(item.link, 'https://example.org/atom-story');
  assert.equal(item.publishedAt, '2026-11-15T10:30:00Z');
  assert.equal(item.description, 'Atom özeti');
});

test('RSS parser strips HTML tags encoded as XML entities in feed descriptions', () => {
  const encodedHtml = `<rss><channel><item>
<title>Başlık</title><link>https://example.org/encoded-html</link>
<description>&lt;span&gt;TÜBİTAK açıklaması&lt;/span&gt; &lt;div&gt;Ek bilgi&lt;/div&gt;</description>
</item></channel></rss>`;
  const [item] = parseRssXml(encodedHtml);
  assert.equal(item.description, 'TÜBİTAK açıklaması Ek bilgi');
});

test('RSS parser decodes XML entities only once and preserves double-escaped literal markup', () => {
  const doubleEscaped = `<rss><channel><item>
<title>Entity testi</title><link>https://example.org/entities</link>
<description>&amp;lt;b&amp;gt;literal metin&amp;lt;/b&amp;gt; &amp;amp; devam</description>
</item></channel></rss>`;
  const [item] = parseRssXml(doubleEscaped);
  assert.equal(item.description, '&lt;b&gt;literal metin&lt;/b&gt; &amp; devam');
});

test('RSS parser enforces UTF-8 byte-size and article-count limits', () => {
  assert.throws(() => parseRssXml('x'.repeat(1_000_001)), /boyutu aşıyor/);
  const oversizedUtf8 = 'ş'.repeat(600_000);
  assert.throws(() => parseRssXml(oversizedUtf8), /boyutu aşıyor/);
  const many = `<rss><channel><item><title>Haber 0</title><link>https://example.org/0</link></item><item><title>Haber 1</title><link>https://example.org/1</link></item><item><title>Haber 2</title><link>https://example.org/2</link></item><item><title>Haber 3</title><link>https://example.org/3</link></item><item><title>Haber 4</title><link>https://example.org/4</link></item><item><title>Haber 5</title><link>https://example.org/5</link></item><item><title>Haber 6</title><link>https://example.org/6</link></item><item><title>Haber 7</title><link>https://example.org/7</link></item><item><title>Haber 8</title><link>https://example.org/8</link></item><item><title>Haber 9</title><link>https://example.org/9</link></item><item><title>Haber 10</title><link>https://example.org/10</link></item><item><title>Haber 11</title><link>https://example.org/11</link></item><item><title>Haber 12</title><link>https://example.org/12</link></item><item><title>Haber 13</title><link>https://example.org/13</link></item><item><title>Haber 14</title><link>https://example.org/14</link></item><item><title>Haber 15</title><link>https://example.org/15</link></item><item><title>Haber 16</title><link>https://example.org/16</link></item><item><title>Haber 17</title><link>https://example.org/17</link></item><item><title>Haber 18</title><link>https://example.org/18</link></item><item><title>Haber 19</title><link>https://example.org/19</link></item></channel></rss>`;
  assert.equal(parseRssXml(many).length, 12);
  assert.equal(parseRssXml(many, { limit: 2 }).length, 2);
});

test('RSS parser handles a large sequence of unterminated item tags in linear time', () => {
  const malformed = `<rss><channel>${'<item>'.repeat(80_000)}</channel></rss>`;
  const startedAt = performance.now();
  assert.throws(() => parseRssXml(malformed), /RSS veya Atom öğesi bulunamadı/);
  assert.ok(performance.now() - startedAt < 1_500, 'malformed feed scanning should remain bounded');
});

test('custom RSS URLs accept public HTTPS hostnames and reject unsafe destinations', () => {
  assert.equal(normalizePublicFeedUrl('https://example.org/feed.xml')?.href, 'https://example.org/feed.xml');
  assert.equal(normalizePublicFeedUrl('https://example.org/feed.xml#section')?.hash, '');
  for (const value of [
    'http://example.org/rss',
    'https://localhost/rss',
    'https://news.local/rss',
    'https://feed.internal/rss',
    'https://feeds.example.test/rss',
    'https://127.0.0.1/rss',
    'https://192.168.1.1/rss',
    'https://[::1]/rss',
    'https://2130706433/rss',
    'https://user:pass@example.org/rss',
    'https://example.org:8443/rss',
    'file:///etc/passwd',
  ]) {
    assert.equal(normalizePublicFeedUrl(value), null, value);
  }
});

test('built-in news API returns selected allowlisted sources and structured partial failures', async () => {
  const handler = createNewsHandler({
    fetchFeed: async (source) => {
      if (source.id === 'bbc-turkce') {
        return [{ title: 'BBC Haber', link: 'https://bbc.example/story', publishedAt: '2026-11-15T09:00:00Z', description: 'Özet' }];
      }
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
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=30');
});

test('built-in API rejects arbitrary source IDs, invalid categories and non-GET methods', async () => {
  const handler = createNewsHandler({ fetchFeed: async () => [] });
  const badSource = await handler(new Request('https://diorama.example/api/news?category=gundem&sources=../../etc/passwd'));
  assert.equal(badSource.status, 400);
  const badCategory = await handler(new Request('https://diorama.example/api/news?category=unknown'));
  assert.equal(badCategory.status, 400);
  const wrongMethod = await handler(new Request('https://diorama.example/api/news?category=gundem', { method: 'POST' }));
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('Allow'), 'GET');
});

test('built-in API never caches empty/error results or forced refreshes', async () => {
  const handler = createNewsHandler({ fetchFeed: async () => { throw new Error('unavailable'); } });
  const empty = await handler(new Request('https://diorama.example/api/news?category=bilim'));
  assert.equal(empty.headers.get('Cache-Control'), 'no-store');
  assert.equal((await empty.json()).status, 'error');

  const refreshed = await createNewsHandler({
    fetchFeed: async () => [{ title: 'Yeni', link: 'https://example.org/new' }],
  })(new Request('https://diorama.example/api/news?category=bilim&refresh=1'));
  assert.equal(refreshed.headers.get('Cache-Control'), 'no-store');
});

test('custom feed handler validates public HTTPS URLs before invoking its fetcher', async () => {
  let calls = 0;
  const handler = createCustomNewsHandler({
    fetchFeed: async () => {
      calls += 1;
      return parseRssXml(rssFixture);
    },
  });

  const invalid = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST',
    headers: { Origin: 'https://diorama.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://localhost/rss' }),
  }));
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);

  const valid = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST',
    headers: { Origin: 'https://diorama.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.org/feed.xml' }),
  }));
  const payload = await valid.json();
  assert.equal(valid.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.items[0].title, 'Test haber & bilgi');
  assert.equal(valid.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(calls, 1);
});

test('custom feed endpoint returns safe errors and enforces method, content type and body size', async () => {
  const handler = createCustomNewsHandler({ fetchFeed: async () => { throw new Error('Feed unreachable'); } });

  const unavailable = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST',
    headers: { Origin: 'https://diorama.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.org/feed.xml' }),
  }));
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).status, 'error');

  const wrongMethod = await handler(new Request('https://diorama.example/api/custom-news', { method: 'GET' }));
  assert.equal(wrongMethod.status, 405);

  const wrongType = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST',
    headers: { Origin: 'https://diorama.example', 'Content-Type': 'text/plain' },
    body: '{"url":"https://example.org/feed.xml"}',
  }));
  assert.equal(wrongType.status, 415);

  const oversizedBody = ' '.repeat(4097);
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(oversizedBody)); controller.close(); },
  });
  const oversized = await handler(new Request('https://diorama.example/api/custom-news', {
    method: 'POST',
    headers: { Origin: 'https://diorama.example', 'Content-Type': 'application/json' },
    body: stream,
    duplex: 'half',
  }));
  assert.equal(oversized.status, 413);
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

test('custom RSS API rejects requests without browser origin metadata', async () => {
  let fetchCalls = 0;
  const handler = createCustomNewsHandler({ fetchFeed: async () => { fetchCalls += 1; return parseRssXml(rssFixture); } });
  const response = await handler(new Request('https://diorama.test/api/custom-news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.org/feed.xml' }),
  }));
  assert.equal(response.status, 403);
  assert.equal(fetchCalls, 0);
});

test('custom RSS API rejects cross-origin browser requests', () => {
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', {
    method: 'POST',
    headers: { origin: 'https://diorama.test' },
  })), true);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', {
    method: 'POST',
    headers: { origin: 'https://attacker.test' },
  })), false);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'cross-site' },
  })), false);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' },
  })), true);
  assert.equal(isSameOriginRequest(new Request('https://diorama.test/api/custom-news', { method: 'POST' })), false);
});
