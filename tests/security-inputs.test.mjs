import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebUrl, normalizeShortcutList, normalizeTaskList, normalizeNoteList } from '../js/storage.js';
import { HABITATS, HABITAT_IDS, HABITAT_SCENE_PROFILES, HABITAT_CREATURE_PROFILES, HABITAT_INTERACTION_PROFILES } from '../config/habitat-catalog.js';
import { NEWS_CATEGORIES, NEWS_CATEGORY_IDS, getEnabledNewsSources } from '../config/news-feeds.js';

test('web URL normalization accepts HTTPS and rejects dangerous schemes and credentials', () => {
  assert.equal(normalizeWebUrl('example.com'), 'https://example.com/');
  assert.equal(normalizeWebUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(normalizeWebUrl('javascript:alert(1)'), null);
  assert.equal(normalizeWebUrl('data:text/html,boom'), null);
  assert.equal(normalizeWebUrl('https://user:pass@example.com'), null);
  assert.equal(normalizeWebUrl('https://example.com', { addHttps: false }), 'https://example.com/');
  assert.equal(normalizeWebUrl('example.com', { addHttps: false }), null);
  assert.equal(normalizeWebUrl('example.com:8443/path'), 'https://example.com:8443/path');
  assert.equal(normalizeWebUrl('localhost:3000'), 'https://localhost:3000/');
  assert.equal(normalizeWebUrl('example.com:abc'), null);
  assert.equal(normalizeWebUrl('javascript://example.com'), null);
});

test('saved shortcuts are schema-normalized before they reach anchors', () => {
  const items = normalizeShortcutList([
    { name: 'Safe', url: 'https://example.com' },
    { name: 'Bad', url: 'javascript:alert(1)' },
    { name: '<img>', url: 'https://safe.example' },
    null,
  ]);
  assert.deepEqual(items, [
    { name: 'Safe', url: 'https://example.com/', iconKey: 'globe' },
    { name: '<img>', url: 'https://safe.example/', iconKey: 'globe' },
  ]);
});

test('persisted tasks and notes are bounded and normalized', () => {
  assert.deepEqual(normalizeTaskList([{ text: '  test ', done: 1, priority: 'unknown' }]), [
    { text: 'test', done: false, priority: 'normal' },
  ]);
  assert.deepEqual(normalizeNoteList([{ title: 5, body: 'note', date: null }]), [
    { title: 'Not', body: 'note', date: '' },
  ]);
  assert.deepEqual(normalizeTaskList('not-an-array', [{ text: 'fallback', done: false }]), [
    { text: 'fallback', done: false },
  ]);
});

test('habitat catalog has unique IDs and re-usable renderer, creature and interaction profiles', () => {
  assert.equal(HABITATS.length, 8);
  assert.equal(HABITAT_IDS.size, HABITATS.length);
  assert.ok(HABITATS.some((habitat) => habitat.id === 'rainforest' && habitat.creatureProfile === 'parrot' && habitat.interactionProfile === 'fruit'));
  assert.ok(HABITATS.some((habitat) => habitat.id === 'arctic-aurora' && habitat.sceneProfile === 'arctic-tundra' && habitat.creatureProfile === 'arctic_fox' && habitat.interactionProfile === 'cloudberry'));
  for (const habitat of HABITATS) {
    assert.ok(habitat.id && habitat.name && habitat.sceneProfile && habitat.creatureProfile && habitat.interactionProfile);
    assert.ok(HABITAT_SCENE_PROFILES.includes(habitat.sceneProfile));
    assert.ok(HABITAT_CREATURE_PROFILES.includes(habitat.creatureProfile));
    assert.ok(HABITAT_INTERACTION_PROFILES.includes(habitat.interactionProfile));
    assert.equal(typeof habitat.weatherSky, 'boolean');
    assert.equal(HABITAT_IDS.has(habitat.id), true);
  }
});

test('news configuration allows multiple enabled HTTPS sources per category', () => {
  assert.ok(NEWS_CATEGORY_IDS.length >= 3);
  const allSourceIds = [];
  for (const categoryId of NEWS_CATEGORY_IDS) {
    const sources = getEnabledNewsSources(categoryId);
    assert.ok(sources.length >= 1);
    const ids = sources.map((source) => source.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const source of sources) {
      assert.match(source.rss, /^https:\/\//);
      assert.match(source.homepage, /^https:\/\//);
      assert.ok(source.publisher);
      allSourceIds.push(source.id);
    }
  }
  assert.equal(new Set(allSourceIds).size, allSourceIds.length, 'source IDs must be unique across categories');
  assert.deepEqual(getEnabledNewsSources('gundem').map((source) => source.id), [
    'bbc-turkce', 'trt-haber', 'anadolu-ajansi', 'dw-turkce', 'ntv', 'cnn-turk',
  ]);
  assert.deepEqual(getEnabledNewsSources('teknoloji').map((source) => source.id), [
    'webrazzi', 'webtekno', 'technopat', 'shiftdelete', 'donanimhaber',
  ]);
  assert.deepEqual(getEnabledNewsSources('bilim').map((source) => source.id), [
    'evrim-agaci', 'tubitak', 'arkeofili',
  ]);
});
