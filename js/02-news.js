import { lsGet, lsSet, normalizeWebUrl } from './storage.js';
import { NEWS_CATEGORIES, NEWS_CATEGORY_IDS } from '../config/news-feeds.js';
import {
  canonicalArticleUrl,
  createArticleId,
  filterNewsArticles,
  formatNewsDate,
  mergeNewsArticles,
  normalizeCustomSources,
  normalizeNewsArticles,
  normalizeNewsPreferences,
  normalizePublicRssUrl,
  parseRetryAfter,
} from './news-utils.js';

/* NEWS — personalized, multi-source RSS reader with local cache and source controls. */
const NEWS_CACHE_TTL = 48 * 60 * 60 * 1000;
const SOURCE_CACHE_TTL = 5 * 60 * 1000;
const SOURCE_STALE_TTL = 48 * 60 * 60 * 1000;
const NEWS_CACHE_PREFIX = 'diorama_news_cache_';
const SOURCE_CACHE_PREFIX = 'diorama_news_feed_cache_';
const BACKOFF_PREFIX = 'diorama_news_backoff_';
const SOURCE_PREFS_KEY = 'diorama_news_source_preferences_v1';
const CUSTOM_SOURCES_KEY = 'diorama_news_custom_sources_v1';
const READ_IDS_KEY = 'diorama_news_read_ids_v1';
const SAVED_IDS_KEY = 'diorama_news_saved_ids_v1';
const NEWS_API_ENDPOINT = '/api/news';
const CUSTOM_NEWS_API_ENDPOINT = '/api/custom-news';
const NEWS_REQUEST_TIMEOUT_MS = 30000;
const MAX_ARTICLES_PER_CATEGORY = 30;
const MAX_SAVED_IDS = 500;
const MAX_CUSTOM_SOURCES = 20;

let activeNewsCat = NEWS_CATEGORY_IDS.includes('gundem') ? 'gundem' : NEWS_CATEGORY_IDS[0];
let currentNewsItems = [];
let tickerIdx = 0;
let newsRequestSeq = 0;
let newsController = null;
let activeFilter = 'all';
let searchQuery = '';
let sourceSettingsOpen = false;
let sourceStatus = new Map();
let sourcePreferences = normalizeNewsPreferences(lsGet(SOURCE_PREFS_KEY, {}));
let customSources = readCustomSources();
let readIds = new Set(readIdArray(READ_IDS_KEY));
let savedIds = new Set(readIdArray(SAVED_IDS_KEY));
const expandedNewsIds = new Set();

const newsListContainer = document.getElementById('newsListContainer');
const newsSourceSub = document.getElementById('newsSourceSub');
const headlineTickerLink = document.getElementById('headlineTickerLink');
const newsCategoriesContainer = document.getElementById('newsCategories');
const newsSettingsPanel = document.getElementById('newsSettingsPanel');
const newsSourceManagerList = document.getElementById('newsSourceManagerList');
const newsSettingsSummary = document.getElementById('newsSettingsSummary');
const newsListMeta = document.getElementById('newsListMeta');
const newsSearchInput = document.getElementById('newsSearchInput');
const refreshNewsBtn = document.getElementById('refreshNewsBtn');

function readIdArray(key) {
  const value = lsGet(key, []);
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.length <= 80).slice(-MAX_SAVED_IDS) : [];
}

function readCustomSources() {
  const raw = lsGet(CUSTOM_SOURCES_KEY, {});
  const result = {};
  for (const categoryId of NEWS_CATEGORY_IDS) {
    result[categoryId] = normalizeCustomSources(raw?.[categoryId], categoryId, MAX_CUSTOM_SOURCES);
  }
  return result;
}

function persistIdSet(key, set) {
  lsSet(key, [...set].slice(-MAX_SAVED_IDS));
}

function getAllSources(categoryId) {
  const builtIn = (NEWS_CATEGORIES[categoryId]?.sources ?? []).map((source) => ({ ...source, custom: false }));
  return [...builtIn, ...(customSources[categoryId] ?? [])];
}

function isSourceEnabled(source) {
  return source.enabled !== false && sourcePreferences[source.id] !== false;
}

function getEnabledSources(categoryId) {
  return getAllSources(categoryId).filter(isSourceEnabled);
}

function safeExternalUrl(value, fallback = '') {
  return normalizeWebUrl(typeof value === 'string' ? value : '', { addHttps: false })
    || normalizeWebUrl(fallback, { addHttps: false })
    || 'https://www.bbc.com/turkce';
}

function readSourceCache(source) {
  const cached = lsGet(SOURCE_CACHE_PREFIX + source.id, null);
  if (!cached || !Array.isArray(cached.items) || !Number.isFinite(cached.savedAt)) return null;
  const age = Date.now() - cached.savedAt;
  if (age < 0 || age > SOURCE_STALE_TTL) return null;
  return {
    items: normalizeNewsArticles(cached.items, source),
    savedAt: cached.savedAt,
    age,
  };
}

function readCategoryCache(categoryId) {
  const cached = lsGet(NEWS_CACHE_PREFIX + categoryId, null);
  if (!cached || !Array.isArray(cached.items) || !Number.isFinite(cached.savedAt)) return null;
  const age = Date.now() - cached.savedAt;
  if (age < 0 || age > NEWS_CACHE_TTL) return null;
  const allSources = getAllSources(categoryId);
  const sources = new Map(allSources.map((source) => [source.id, source]));
  const enabledIds = new Set(allSources.filter(isSourceEnabled).map((source) => source.id));
  const items = cached.items.flatMap((item) => {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) return [];
    if (item.sourceId && !sources.has(item.sourceId)) return [];
    if (item.sourceId && !enabledIds.has(item.sourceId)) return [];
    const source = sources.get(item.sourceId) || { id: item.sourceId || 'legacy', publisher: String(item.sourceName || 'Haber kaynağı'), homepage: 'https://www.bbc.com/turkce' };
    return normalizeNewsArticles([item], source);
  });
  return items.length ? { items, savedAt: cached.savedAt, age } : null;
}

function readBackoff(sourceId) {
  const value = lsGet(BACKOFF_PREFIX + sourceId, null);
  if (!value || !Number.isFinite(value.until) || value.until <= Date.now()) return null;
  return value;
}

function setSourceBackoff(source, seconds, reason) {
  lsSet(BACKOFF_PREFIX + source.id, {
    until: Date.now() + Math.max(5, Math.min(1800, seconds)) * 1000,
    reason: String(reason || 'Kaynak geçici olarak bekletiliyor').slice(0, 160),
  });
}

function updateHeadlineTicker() {
  const category = NEWS_CATEGORIES[activeNewsCat] || NEWS_CATEGORIES[NEWS_CATEGORY_IDS[0]];
  const fallbackSource = getEnabledSources(activeNewsCat)[0] || getAllSources(activeNewsCat)[0];
  if (!currentNewsItems.length) {
    headlineTickerLink.textContent = `Haber akışı bekleniyor · ${fallbackSource?.publisher || category.label}`;
    headlineTickerLink.href = safeExternalUrl(fallbackSource?.homepage, 'https://www.bbc.com/turkce');
    headlineTickerLink.setAttribute('aria-label', `${fallbackSource?.publisher || category.label} web sitesini aç`);
    return;
  }
  const item = currentNewsItems[tickerIdx % currentNewsItems.length];
  headlineTickerLink.textContent = item.title;
  headlineTickerLink.href = safeExternalUrl(item.link, fallbackSource?.homepage);
  headlineTickerLink.setAttribute('aria-label', `${item.source}: ${item.title}`);
}

function updateFilterButtons() {
  document.querySelectorAll('.news-filter-btn').forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.classList.toggle('is-active', selected);
  });
}

function renderNewsCards(emptyMessage = '') {
  newsListContainer.replaceChildren();
  const filtered = filterNewsArticles(currentNewsItems, { query: searchQuery, filter: activeFilter, readIds, savedIds });
  newsListMeta.textContent = `${filtered.length} haber gösteriliyor · ${currentNewsItems.length} haber bulundu`;
  updateFilterButtons();

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'news-empty-state';
    empty.textContent = emptyMessage || (searchQuery
      ? 'Aramanla eşleşen haber bulunamadı.'
      : activeFilter === 'saved'
        ? 'Henüz kaydettiğin haber yok. Kart üzerindeki yer imi simgesini kullanabilirsin.'
        : activeFilter === 'unread'
          ? 'Okunmamış haber kalmadı. Yeni haberler için akışı yenileyebilirsin.'
          : 'Bu kategoride şu anda gösterilebilecek haber yok.');
    newsListContainer.appendChild(empty);
    updateHeadlineTicker();
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => {
    const itemId = item.itemId || createArticleId(item);
    const isRead = readIds.has(itemId);
    const isSaved = savedIds.has(itemId);
    const isExpanded = expandedNewsIds.has(itemId);
    const source = getAllSources(activeNewsCat).find((entry) => entry.id === item.sourceId);
    const sourceUrl = safeExternalUrl(item.link, source?.homepage);
    const card = document.createElement('article');
    card.className = `news-card${isRead ? ' is-read' : ''}${isExpanded ? ' is-expanded' : ''}`;

    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.className = 'news-card-expand';
    expandButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    expandButton.setAttribute('aria-label', isExpanded ? 'Haber detayını daralt' : `Haber detayını göster: ${item.title}`);

    const meta = document.createElement('div');
    meta.className = 'news-card-meta';
    const publisher = document.createElement('span');
    publisher.className = 'news-card-source';
    publisher.textContent = item.source || 'Haber kaynağı';
    const date = document.createElement('time');
    date.className = 'news-card-date';
    date.textContent = item.time || formatNewsDate(item.publishedAt);
    if (item.publishedAt) date.dateTime = item.publishedAt;
    meta.append(publisher, date);

    const title = document.createElement('h4');
    title.className = 'news-card-title';
    title.textContent = item.title;

    const expandHint = document.createElement('span');
    expandHint.className = 'news-card-expand-hint';
    expandHint.textContent = isExpanded ? 'Detayları gizle' : 'Özeti gör';
    expandButton.append(meta, title, expandHint);

    const actions = document.createElement('div');
    actions.className = 'news-card-actions';
    const readStatus = document.createElement('span');
    readStatus.className = 'news-read-status';
    readStatus.textContent = isRead ? 'Okundu' : 'Yeni';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'news-save-btn';
    saveButton.setAttribute('aria-label', isSaved ? 'Haberi kayıtlardan çıkar' : 'Haberi kaydet');
    saveButton.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    saveButton.title = isSaved ? 'Kaydedilenlerden çıkar' : 'Haberi kaydet';
    saveButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z"/></svg>';
    saveButton.classList.toggle('is-saved', isSaved);
    saveButton.addEventListener('click', () => {
      if (savedIds.has(itemId)) savedIds.delete(itemId);
      else { savedIds.delete(itemId); savedIds.add(itemId); }
      persistIdSet(SAVED_IDS_KEY, savedIds);
      renderNewsCards();
    });
    actions.append(readStatus, saveButton);
    card.append(expandButton, actions);

    if (isExpanded) {
      const details = document.createElement('div');
      details.className = 'news-card-details';
      const description = document.createElement('p');
      description.className = 'news-card-description';
      description.textContent = item.description || 'Bu haber için yayıncı tarafından bir açıklama sağlanmamış.';
      const openSource = document.createElement('a');
      openSource.className = 'news-open-source';
      openSource.href = sourceUrl;
      openSource.target = '_blank';
      openSource.rel = 'noopener noreferrer';
      openSource.referrerPolicy = 'no-referrer';
      openSource.textContent = 'Haberi kaynağında aç ↗';
      openSource.addEventListener('click', () => {
        readIds.delete(itemId);
        readIds.add(itemId);
        persistIdSet(READ_IDS_KEY, readIds);
      });
      details.append(description, openSource);
      card.appendChild(details);
    }

    expandButton.addEventListener('click', () => {
      if (expandedNewsIds.has(itemId)) {
        expandedNewsIds.delete(itemId);
      } else {
        expandedNewsIds.add(itemId);
        if (expandedNewsIds.size > 80) expandedNewsIds.delete(expandedNewsIds.values().next().value);
        readIds.delete(itemId);
        readIds.add(itemId);
        persistIdSet(READ_IDS_KEY, readIds);
      }
      renderNewsCards();
    });
    fragment.appendChild(card);
  });
  newsListContainer.appendChild(fragment);
  updateHeadlineTicker();
}

function updateSourceSummary(statuses, sourceCount) {
  const counts = { fresh: 0, cached: 0, limited: 0, failed: 0, stale: 0, offline: 0 };
  statuses.forEach((status) => { counts[status] = (counts[status] || 0) + 1; });
  const parts = [];
  if (counts.fresh) parts.push(`${counts.fresh} güncel`);
  if (counts.cached) parts.push(`${counts.cached} önbellek`);
  if (counts.limited) parts.push(`${counts.limited} beklemede`);
  if (counts.failed) parts.push(`${counts.failed} hatalı`);
  if (counts.stale) parts.push(`${counts.stale} eski veri`);
  if (counts.offline) parts.push(`${counts.offline} çevrimdışı`);
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  newsSourceSub.textContent = `${sourceCount} kaynak · ${parts.join(' · ') || 'Veri bekleniyor'} · ${time}`;
}

function renderSourceManager() {
  if (!newsSourceManagerList) return;
  newsSourceManagerList.replaceChildren();
  const sources = getAllSources(activeNewsCat);
  const enabledCount = sources.filter(isSourceEnabled).length;
  newsSettingsSummary.textContent = `${enabledCount}/${sources.length} kaynak açık`;
  sources.forEach((source) => {
    const row = document.createElement('div');
    row.className = 'news-source-row';
    const sourceLabel = document.createElement('label');
    sourceLabel.className = 'news-source-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSourceEnabled(source);
    checkbox.setAttribute('aria-label', `${source.publisher} kaynağını etkinleştir`);
    checkbox.addEventListener('change', () => {
      sourcePreferences[source.id] = checkbox.checked;
      sourcePreferences = normalizeNewsPreferences(sourcePreferences);
      lsSet(SOURCE_PREFS_KEY, sourcePreferences);
      renderSourceManager();
      loadNewsCategory(activeNewsCat);
    });
    const text = document.createElement('span');
    text.className = 'news-source-row-copy';
    const name = document.createElement('strong');
    name.textContent = source.publisher;
    const host = document.createElement('small');
    try { host.textContent = new URL(source.rss).hostname; } catch { host.textContent = 'RSS akışı'; }
    text.append(name, host);
    const status = document.createElement('span');
    status.className = `news-source-status status-${sourceStatus.get(source.id) || 'idle'}`;
    status.textContent = ({ fresh: 'Güncel', cached: 'Önbellek', limited: 'Beklemede', failed: 'Hata', stale: 'Eski veri', offline: 'Çevrimdışı', idle: 'Hazır' })[sourceStatus.get(source.id) || 'idle'];
    sourceLabel.append(checkbox, text);
    row.append(sourceLabel, status);
    if (source.custom) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'news-source-remove';
      removeButton.textContent = 'Kaldır';
      removeButton.setAttribute('aria-label', `${source.publisher} özel kaynağını kaldır`);
      removeButton.addEventListener('click', (event) => {
        event.preventDefault();
        customSources[activeNewsCat] = customSources[activeNewsCat].filter((item) => item.id !== source.id);
        lsSet(CUSTOM_SOURCES_KEY, customSources);
        delete sourcePreferences[source.id];
        lsSet(SOURCE_PREFS_KEY, sourcePreferences);
        renderSourceManager();
        loadNewsCategory(activeNewsCat);
      });
      row.appendChild(removeButton);
    }
    newsSourceManagerList.appendChild(row);
  });
}

function buildCategoryTabs() {
  if (!newsCategoriesContainer) return;
  newsCategoriesContainer.replaceChildren();
  NEWS_CATEGORY_IDS.forEach((categoryId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cat = categoryId;
    button.className = 'news-cat-btn';
    button.textContent = NEWS_CATEGORIES[categoryId].label;
    button.setAttribute('aria-pressed', categoryId === activeNewsCat ? 'true' : 'false');
    button.addEventListener('click', () => loadNewsCategory(categoryId));
    newsCategoriesContainer.appendChild(button);
  });
}

async function fetchOneSource(source, signal) {
  if (!source.custom) throw new Error('Yerleşik RSS kaynakları toplu Diorama API üzerinden alınır.');
  const endpoint = new URL(CUSTOM_NEWS_API_ENDPOINT, window.location.origin);
  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    cache: 'no-store',
    credentials: 'same-origin',
    referrerPolicy: 'no-referrer',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: source.rss }),
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok || payload?.status !== 'ok' || !Array.isArray(payload?.items)) {
    const message = typeof payload?.message === 'string' ? payload.message : '';
    const error = new Error(message.slice(0, 240) || `Diorama RSS API HTTP ${response.status || 'yanıt hatası'}`);
    error.status = response.status || 0;
    error.retryAfter = response.headers.get('Retry-After');
    error.retrySeconds = parseRetryAfter(error.retryAfter, message);
    throw error;
  }
  return normalizeNewsArticles(payload.items, source);
}

function persistFreshSource(source, items) {
  const savedAt = Date.now();
  lsSet(SOURCE_CACHE_PREFIX + source.id, {
    savedAt,
    items: items.map(({ title, link, publishedAt, description }) => ({ title, link, publishedAt, description })),
  });
  lsSet(BACKOFF_PREFIX + source.id, null);
  return { source, items, status: 'fresh', cachedAt: savedAt };
}

function failedSourceResult(source, cached, error, signal) {
  if (!signal.aborted) {
    if (error?.status === 429) setSourceBackoff(source, error.retrySeconds || 60, error.message);
    else setSourceBackoff(source, error?.status >= 500 ? 90 : 45, error?.message || 'Kaynağa ulaşılamadı');
  }
  return {
    source,
    items: cached?.items ?? [],
    status: cached ? 'stale' : 'failed',
    cachedAt: cached?.savedAt ?? 0,
    message: error?.message || 'Kaynağa ulaşılamadı',
    error,
  };
}

async function fetchSourceWithPolicy(source, signal, { force = false, online = true } = {}) {
  const cached = readSourceCache(source);
  const backoff = readBackoff(source.id);
  if (!online) return { source, items: cached?.items ?? [], status: 'offline', cachedAt: cached?.savedAt ?? 0 };
  if (backoff) return { source, items: cached?.items ?? [], status: 'limited', cachedAt: cached?.savedAt ?? 0, message: backoff.reason };
  if (!force && cached && cached.age < SOURCE_CACHE_TTL) return { source, items: cached.items, status: 'cached', cachedAt: cached.savedAt };

  try {
    const items = await fetchOneSource(source, signal);
    return persistFreshSource(source, items);
  } catch (error) {
    return failedSourceResult(source, cached, error, signal);
  }
}

async function fetchBuiltInSources(categoryId, sources, signal, { force = false } = {}) {
  if (!sources.length) return [];
  const endpoint = new URL(NEWS_API_ENDPOINT, window.location.origin);
  endpoint.searchParams.set('category', categoryId);
  endpoint.searchParams.set('sources', sources.map((source) => source.id).sort().join(','));
  if (force) endpoint.searchParams.set('refresh', '1');

  try {
    const response = await fetch(endpoint, {
      signal,
      cache: force ? 'reload' : 'default',
      credentials: 'same-origin',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok || !payload || !Array.isArray(payload.results)) {
      const message = typeof payload?.message === 'string' ? payload.message : '';
      const error = new Error(message.slice(0, 240) || `Diorama Haber API HTTP ${response.status || 'yanıt hatası'}`);
      error.status = response.status || 0;
      error.retryAfter = response.headers.get('Retry-After');
      error.retrySeconds = parseRetryAfter(error.retryAfter, message);
      throw error;
    }

    const byId = new Map(payload.results.map((result) => [result.sourceId, result]));
    return sources.map((source) => {
      const cached = readSourceCache(source);
      const result = byId.get(source.id);
      if (result?.status === 'ok' && Array.isArray(result.items)) {
        const items = normalizeNewsArticles(result.items, source);
        return persistFreshSource(source, items);
      }
      const error = new Error(String(result?.message || 'RSS kaynağı okunamadı.').slice(0, 240));
      error.status = result?.errorCode === 'timeout' ? 504 : 502;
      return failedSourceResult(source, cached, error, signal);
    });
  } catch (error) {
    return sources.map((source) => failedSourceResult(source, readSourceCache(source), error, signal));
  }
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

function updateCategoryButtons() {
  document.querySelectorAll('.news-cat-btn').forEach((button) => {
    const selected = button.dataset.cat === activeNewsCat;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.classList.toggle('is-active', selected);
  });
}

async function loadNewsCategory(categoryId, { force = false } = {}) {
  const category = NEWS_CATEGORIES[categoryId] ? categoryId : activeNewsCat;
  activeNewsCat = category;
  tickerIdx = 0;
  const requestId = ++newsRequestSeq;
  newsController?.abort();
  const controller = new AbortController();
  newsController = controller;
  const timeoutId = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT_MS);
  const sources = getEnabledSources(category);
  updateCategoryButtons();
  if (sourceSettingsOpen) renderSourceManager();

  if (!sources.length) {
    currentNewsItems = [];
    sourceStatus = new Map();
    newsSourceSub.textContent = 'Bu kategoride etkin kaynak yok. Kaynaklar bölümünden en az bir yayıncıyı aç.';
    renderNewsCards();
    renderSourceManager();
    newsListContainer.setAttribute('aria-busy', 'false');
    refreshNewsBtn.disabled = false;
    refreshNewsBtn.removeAttribute('aria-busy');
    clearTimeout(timeoutId);
    if (requestId === newsRequestSeq) newsController = null;
    return;
  }

  // Paint immediately from source-level cache, then refresh eligible feeds.
  const sourceCached = sources.map((source) => ({ source, cache: readSourceCache(source) })).filter((entry) => entry.cache);
  const categoryCached = readCategoryCache(category);
  const cachedSeed = sourceCached.length
    ? mergeNewsArticles(sourceCached.map((entry) => entry.cache.items), MAX_ARTICLES_PER_CATEGORY)
    : (categoryCached?.items ?? []);
  currentNewsItems = cachedSeed;
  sourceStatus = new Map(sources.map((source) => [source.id, 'idle']));
  newsSourceSub.textContent = cachedSeed.length ? `${sources.length} kaynak · Kayıtlı haberler gösteriliyor, akışlar kontrol ediliyor…` : `${sources.length} kaynak · Haberler yükleniyor…`;
  renderNewsCards();
  renderSourceManager();
  refreshNewsBtn.disabled = true;
  refreshNewsBtn.setAttribute('aria-busy', 'true');

  try {
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    const resultById = new Map();
    const refreshBuiltIn = [];
    const refreshCustom = [];
    for (const source of sources) {
      const cached = readSourceCache(source);
      const backoff = readBackoff(source.id);
      if (!online) {
        resultById.set(source.id, { source, items: cached?.items ?? [], status: 'offline', cachedAt: cached?.savedAt ?? 0 });
      } else if (backoff) {
        resultById.set(source.id, { source, items: cached?.items ?? [], status: 'limited', cachedAt: cached?.savedAt ?? 0, message: backoff.reason });
      } else if (!force && cached && cached.age < SOURCE_CACHE_TTL) {
        resultById.set(source.id, { source, items: cached.items, status: 'cached', cachedAt: cached.savedAt });
      } else if (source.custom) refreshCustom.push(source);
      else refreshBuiltIn.push(source);
    }

    const [builtInResults, customResults] = await Promise.all([
      online ? fetchBuiltInSources(category, refreshBuiltIn, controller.signal, { force }) : [],
      mapWithConcurrency(refreshCustom, 5, (source) => fetchSourceWithPolicy(source, controller.signal, { force, online })),
    ]);
    [...builtInResults, ...customResults].forEach((result) => resultById.set(result.source.id, result));
    const results = sources.map((source) => resultById.get(source.id) || { source, items: [], status: 'failed', cachedAt: 0 });
    if (requestId !== newsRequestSeq || activeNewsCat !== category) return;
    sourceStatus = new Map(results.map((result) => [result.source.id, result.status]));
    currentNewsItems = mergeNewsArticles(results.map((result) => result.items), MAX_ARTICLES_PER_CATEGORY);
    if (!currentNewsItems.length && categoryCached?.items?.length) currentNewsItems = categoryCached.items;

    if (currentNewsItems.length) {
      lsSet(NEWS_CACHE_PREFIX + category, {
        savedAt: Date.now(),
        items: currentNewsItems.map(({ title, link, publishedAt, sourceId, source, description }) => ({
          title, link, publishedAt, sourceId, sourceName: source, description,
        })),
      });
    }
    updateCategoryButtons();
    renderNewsCards();
    renderSourceManager();
    const states = results.map((result) => result.status);
    updateSourceSummary(states, sources.length);
    if (!currentNewsItems.length) {
      const hasBackoff = states.includes('limited');
      newsListContainer.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'news-empty-state';
      empty.textContent = hasBackoff
        ? 'Haber servisinin istek sınırına ulaşıldı. Kısa süre sonra yeniden deneyebilirsin.'
        : 'Şu anda kaynaklardan haber alınamadı. İnternet bağlantını kontrol edip yeniden deneyebilirsin.';
      newsListContainer.appendChild(empty);
    }
    const failedCount = states.filter((status) => ['failed', 'stale', 'offline', 'limited'].includes(status)).length;
    newsListMeta.textContent = `${currentNewsItems.length} haber · ${sources.length - failedCount}/${sources.length} kaynak kullanılabilir`;
  } catch (error) {
    if (requestId !== newsRequestSeq || activeNewsCat !== category) return;
    const cache = readCategoryCache(category);
    currentNewsItems = cache?.items ?? [];
    newsSourceSub.textContent = controller.signal.aborted ? 'Haber isteği zaman aşımına uğradı' : 'Haber akışı yüklenemedi';
    renderNewsCards();
  } finally {
    clearTimeout(timeoutId);
    if (requestId === newsRequestSeq) {
      newsController = null;
      refreshNewsBtn.disabled = false;
      refreshNewsBtn.removeAttribute('aria-busy');
      newsListContainer.setAttribute('aria-busy', 'false');
    }
  }
}

function toggleSourceSettings() {
  sourceSettingsOpen = !sourceSettingsOpen;
  newsSettingsPanel.hidden = !sourceSettingsOpen;
  document.getElementById('newsSettingsBtn').setAttribute('aria-expanded', sourceSettingsOpen ? 'true' : 'false');
  if (sourceSettingsOpen) renderSourceManager();
}

function addCustomSource(event) {
  event.preventDefault();
  const nameInput = document.getElementById('newsSourceNameInput');
  const urlInput = document.getElementById('newsSourceRssInput');
  const message = document.getElementById('newsCustomSourceMessage');
  const publisher = nameInput.value.trim().slice(0, 60);
  const rss = normalizePublicRssUrl(urlInput.value.trim());
  const totalCustom = NEWS_CATEGORY_IDS.reduce((sum, categoryId) => sum + (customSources[categoryId]?.length ?? 0), 0);
  if (!publisher || !rss) {
    message.textContent = 'Geçerli bir yayıncı adı ve herkese açık HTTPS RSS adresi gir.';
    return;
  }
  if (totalCustom >= MAX_CUSTOM_SOURCES) {
    message.textContent = `En fazla ${MAX_CUSTOM_SOURCES} özel kaynak ekleyebilirsin.`;
    return;
  }
  const duplicate = [...NEWS_CATEGORY_IDS.flatMap((categoryId) => getAllSources(categoryId))].some((source) => source.rss === rss);
  if (duplicate) {
    message.textContent = 'Bu RSS adresi zaten eklenmiş.';
    return;
  }
  const host = new URL(rss).hostname.replace(/^www\./, '').replace(/[^a-z0-9-]+/g, '-').slice(0, 40);
  const id = `custom-${host}-${Date.now().toString(36)}`;
  customSources[activeNewsCat].push({ id, publisher, rss, homepage: new URL(rss).origin, enabled: true, custom: true, categoryId: activeNewsCat });
  if (customSources[activeNewsCat].length > MAX_CUSTOM_SOURCES) customSources[activeNewsCat] = customSources[activeNewsCat].slice(-MAX_CUSTOM_SOURCES);
  lsSet(CUSTOM_SOURCES_KEY, customSources);
  nameInput.value = '';
  urlInput.value = '';
  message.textContent = `${publisher} kaynağı eklendi.`;
  renderSourceManager();
  loadNewsCategory(activeNewsCat);
}

buildCategoryTabs();
renderSourceManager();
document.getElementById('newsSettingsBtn').addEventListener('click', toggleSourceSettings);
document.getElementById('addNewsSourceForm').addEventListener('submit', addCustomSource);
document.getElementById('refreshNewsBtn').addEventListener('click', () => loadNewsCategory(activeNewsCat, { force: true }));
document.getElementById('headlineNextBtn').addEventListener('click', () => {
  if (!currentNewsItems.length) return;
  tickerIdx = (tickerIdx + 1) % currentNewsItems.length;
  updateHeadlineTicker();
});
newsCategoriesContainer.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = [...newsCategoriesContainer.querySelectorAll('button')];
  const current = buttons.indexOf(document.activeElement);
  if (current < 0 || !buttons.length) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].click();
});
newsSearchInput.addEventListener('input', () => {
  searchQuery = newsSearchInput.value.slice(0, 120);
  renderNewsCards();
});
document.querySelectorAll('.news-filter-btn').forEach((button) => button.addEventListener('click', () => {
  activeFilter = ['all', 'unread', 'saved'].includes(button.dataset.filter) ? button.dataset.filter : 'all';
  renderNewsCards();
}));
const headlineBarEl = document.getElementById('headlineBar');
setInterval(() => {
  const isHoveredOrFocused = typeof headlineBarEl?.matches === 'function' && headlineBarEl.matches(':hover, :focus-within');
  if (!document.hidden && currentNewsItems.length && !isHoveredOrFocused) {
    tickerIdx = (tickerIdx + 1) % currentNewsItems.length;
    updateHeadlineTicker();
  }
}, 9000);
loadNewsCategory(activeNewsCat);
setInterval(() => {
  if (!document.hidden && typeof navigator !== 'undefined' && navigator.onLine) loadNewsCategory(activeNewsCat);
}, 30 * 60 * 1000);
window.addEventListener('online', () => {
  if (!document.hidden) loadNewsCategory(activeNewsCat);
});
