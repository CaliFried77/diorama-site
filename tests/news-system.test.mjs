import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalArticleUrl,
  createArticleId,
  filterNewsArticles,
  mergeNewsArticles,
  normalizeCustomSources,
  normalizeNewsArticles,
  normalizeNewsPreferences,
  normalizePublicRssUrl,
  parseRetryAfter,
} from '../js/news-utils.js';
import { NEWS_CATEGORIES, NEWS_CATEGORY_IDS, getEnabledNewsSources } from '../config/news-feeds.js';

test('news catalog has unique publishers with HTTPS feeds and future extension points', () => {
  const ids = [];
  for (const categoryId of NEWS_CATEGORY_IDS) {
    const sources = getEnabledNewsSources(categoryId);
    assert.ok(sources.length >= 3);
    for (const source of sources) {
      assert.ok(source.publisher);
      assert.match(source.rss, /^https:\/\//);
      assert.match(source.homepage, /^https:\/\//);
      ids.push(source.id);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 14);
  assert.equal(NEWS_CATEGORIES.gundem.label, 'Türkiye & Dünya');
  assert.ok(ids.includes('tubitak'));
  assert.ok(ids.includes('ntv'));
  assert.ok(ids.includes('cnn-turk'));
  assert.ok(ids.includes('donanimhaber'));
});

test('custom RSS validation accepts public HTTPS feeds and rejects unsafe endpoints', () => {
  assert.equal(normalizePublicRssUrl('https://example.org/feed.xml'), 'https://example.org/feed.xml');
  for (const value of [
    'http://example.org/feed.xml',
    'javascript:alert(1)',
    'https://user:pass@example.org/feed.xml',
    'https://localhost/feed.xml',
    'https://news.local/feed.xml',
    'https://127.0.0.1/feed.xml',
    'https://192.168.1.2/feed.xml',
    'https://10.0.0.2/feed.xml',
    'https://[::1]/feed.xml',
    'https://example.org:8443/feed.xml',
    'https://feeds.example.test/rss.xml',
  ]) assert.equal(normalizePublicRssUrl(value), null, value);
});

test('custom source lists are normalized, bounded and category scoped', () => {
  const result = normalizeCustomSources([
    { id: 'custom-example-org-abc', publisher: '  Example News ', rss: 'https://example.org/feed.xml', homepage: 'https://example.org/', enabled: true },
    { id: 'bad id', publisher: 'Bad', rss: 'https://bad.example/feed', homepage: 'https://bad.example', enabled: true },
  ], 'teknoloji');
  assert.deepEqual(result, [{
    id: 'custom-example-org-abc', publisher: 'Example News', rss: 'https://example.org/feed.xml',
    homepage: 'https://example.org/', enabled: true, custom: true, categoryId: 'teknoloji',
  }]);
});

test('news source preferences retain only boolean states with safe source IDs', () => {
  assert.deepEqual(normalizeNewsPreferences({ bbc: false, 'my-feed': true, 'bad id': false, other: 'yes' }), {
    bbc: false, 'my-feed': true,
  });
});

test('article URLs remove tracking parameters before identity and de-duplication', () => {
  const a = 'https://example.org/news/1?utm_source=mail&id=3#section';
  const b = 'https://example.org/news/1?id=3';
  assert.equal(canonicalArticleUrl(a), canonicalArticleUrl(b));
  assert.equal(createArticleId({ link: a }), createArticleId({ link: b }));
});

test('article normalization removes markup, bounds untrusted text and rejects bad links', () => {
  const source = { id: 'sample', publisher: 'Sample', homepage: 'https://example.org' };
  const articles = normalizeNewsArticles([
    { title: '  <b>Başlık</b>   haber ', link: 'javascript:alert(1)', pubDate: 'invalid', description: '<p>Özet &amp; bilgi</p>' },
    { title: '   ', link: 'https://example.org/empty' },
  ], source);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, 'Başlık haber');
  assert.equal(articles[0].link, '');
  assert.equal(articles[0].publishedAt, '');
  assert.equal(articles[0].description, 'Özet & bilgi');
});

test('article title markup and hidden script/style payloads are removed before rendering', () => {
  const source = { id: 'sample', publisher: 'Sample', homepage: 'https://example.org' };
  const [article] = normalizeNewsArticles([{
    title: '<b>Başlık</b> &amp; gelişme<script>alert(1)</script>',
    link: 'https://example.org/story',
    description: '<style>body{display:none}</style><p>Güvenli <strong>özet</strong></p>',
  }], source);
  assert.equal(article.title, 'Başlık & gelişme');
  assert.equal(article.description, 'Güvenli özet');
});

test('multi-source merge de-duplicates tracking variants and exact syndicated titles', () => {
  const sourceA = { id: 'a', publisher: 'A', homepage: 'https://a.example' };
  const sourceB = { id: 'b', publisher: 'B', homepage: 'https://b.example' };
  const a = normalizeNewsArticles([{ title: 'Aynı haber', link: 'https://example.org/story?utm_source=a', pubDate: '2026-11-15T10:00:00Z' }], sourceA);
  const b = normalizeNewsArticles([{ title: 'Aynı haber', link: 'https://other.example/story', pubDate: '2026-11-15T11:00:00Z' }], sourceB);
  const merged = mergeNewsArticles([a, b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sourceId, 'b');
  assert.ok(merged[0].itemId.startsWith('news-'));
});

test('article filters correctly combine search, unread and saved states', () => {
  const items = [
    { itemId: 'news-one', title: 'Yapay zekâ gelişmesi', source: 'Tekno' },
    { itemId: 'news-two', title: 'Arkeoloji haberi', source: 'Bilim' },
  ];
  assert.deepEqual(filterNewsArticles(items, { filter: 'unread', readIds: new Set(['news-one']) }).map((item) => item.itemId), ['news-two']);
  assert.deepEqual(filterNewsArticles(items, { filter: 'saved', savedIds: new Set(['news-two']) }).map((item) => item.itemId), ['news-two']);
  assert.deepEqual(filterNewsArticles(items, { query: 'YAPAY' }).map((item) => item.itemId), ['news-one']);
});

test('RSS provider rate-limit delay parser honours Retry-After and bounds backoff', () => {
  assert.equal(parseRetryAfter('42'), 42);
  assert.equal(parseRetryAfter(null, 'Please retry in 25 seconds'), 25);
  assert.equal(parseRetryAfter('99999'), 1800);
  assert.equal(parseRetryAfter(null, 'Temporary service error'), 60);
});
