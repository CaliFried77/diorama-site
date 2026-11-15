import { normalizeWebUrl } from './storage.js';

const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|dclid|mc_cid|mc_eid|ref_src|ref_url|igshid)$/i;

function decodeHtmlText(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ' ';
    })
    .replace(/&#x([\da-f]+);/gi, (_, code) => {
      const number = Number.parseInt(code, 16);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ' ';
    });
}

function stripHtmlText(value, maxLength) {
  return decodeHtmlText(String(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizePublicRssUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const normalized = normalizeWebUrl(value, { addHttps: false });
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host || host === 'localhost' || /\.(?:localhost|local|internal|test|invalid|example)$/.test(host)) return null;
    if (!host.includes('.') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':')) return null;
    if (/^(?:0|10|127|169\.254|192\.168|224|240)\./.test(host)) return null;
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return null;
    if (/^(?:\[?::1\]?|\[?fe80:|\[?fc|\[?fd)/i.test(host)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeArticleUrl(value, fallback = '') {
  const url = normalizeWebUrl(typeof value === 'string' ? value : '', { addHttps: false });
  if (url) return url;
  return normalizeWebUrl(fallback, { addHttps: false }) || '';
}

export function canonicalArticleUrl(value) {
  const normalized = normalizeArticleUrl(value);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    return url.href.replace(/\/$/, url.pathname === '/' && !url.search ? '/' : '');
  } catch {
    return '';
  }
}

export function createArticleId(article) {
  const canonical = canonicalArticleUrl(article?.link);
  const fallback = `${article?.sourceId || ''}|${String(article?.title || '').normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim()}`;
  const input = canonical || fallback;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `news-${(hash >>> 0).toString(36)}`;
}

export function normalizeNewsPreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};
  for (const [sourceId, enabled] of Object.entries(value).slice(0, 200)) {
    if (/^[a-z0-9-]{1,80}$/.test(sourceId) && typeof enabled === 'boolean') output[sourceId] = enabled;
  }
  return output;
}

export function normalizeCustomSources(value, categoryId, limit = 20) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, limit).flatMap((source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
    const id = typeof source.id === 'string' ? source.id.trim() : '';
    const publisher = typeof source.publisher === 'string' ? source.publisher.trim().slice(0, 60) : '';
    const rss = normalizePublicRssUrl(source.rss);
    const homepage = normalizePublicRssUrl(source.homepage) || (rss ? new URL(rss).origin : '');
    if (!/^custom-[a-z0-9-]{3,100}$/.test(id) || !publisher || !rss || !homepage || seen.has(id)) return [];
    seen.add(id);
    return [{ id, publisher, rss, homepage, enabled: source.enabled !== false, custom: true, categoryId }];
  });
}

export function normalizeNewsArticles(articles, source) {
  if (!Array.isArray(articles)) return [];
  return articles.slice(0, 30).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const title = typeof raw.title === 'string' ? stripHtmlText(raw.title, 500) : '';
    if (!title) return [];
    const rawDate = typeof raw.publishedAt === 'string' ? raw.publishedAt : (typeof raw.pubDate === 'string' ? raw.pubDate : '');
    const date = rawDate ? new Date(rawDate) : null;
    const publishedAt = date && Number.isFinite(date.getTime()) ? date.toISOString() : '';
    const link = normalizeArticleUrl(raw.link);
    return [{
      title,
      link,
      source: source.publisher,
      sourceId: source.id,
      publishedAt,
      description: typeof raw.description === 'string' ? stripHtmlText(raw.description, 220) : '',
      itemId: '',
    }];
  });
}

export function mergeNewsArticles(sourceResults, limit = 30) {
  const byLink = new Map();
  const byTitle = new Map();
  for (const item of sourceResults.flat()) {
    const linkKey = canonicalArticleUrl(item.link);
    const titleKey = String(item.title || '').normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const existing = (linkKey && byLink.get(linkKey)) || (titleKey && byTitle.get(titleKey));
    if (existing) {
      const existingTime = Date.parse(existing.publishedAt) || 0;
      const incomingTime = Date.parse(item.publishedAt) || 0;
      if (incomingTime > existingTime) {
        Object.assign(existing, item, { itemId: existing.itemId || item.itemId || createArticleId(item) });
      }
      if (linkKey) byLink.set(linkKey, existing);
      if (titleKey) byTitle.set(titleKey, existing);
      continue;
    }
    const normalized = { ...item };
    normalized.itemId = createArticleId(normalized);
    if (linkKey) byLink.set(linkKey, normalized);
    if (titleKey) byTitle.set(titleKey, normalized);
  }
  return [...new Set([...byLink.values(), ...byTitle.values()])]
    .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
    .slice(0, limit);
}

export function filterNewsArticles(articles, { query = '', filter = 'all', readIds = new Set(), savedIds = new Set() } = {}) {
  const normalizedQuery = String(query).normalize('NFKC').toLocaleLowerCase('tr-TR').trim();
  return articles.filter((article) => {
    const id = article.itemId || createArticleId(article);
    if (filter === 'unread' && readIds.has(id)) return false;
    if (filter === 'saved' && !savedIds.has(id)) return false;
    if (!normalizedQuery) return true;
    const haystack = `${article.title} ${article.source} ${article.description || ''}`.normalize('NFKC').toLocaleLowerCase('tr-TR');
    return haystack.includes(normalizedQuery);
  });
}

export function parseRetryAfter(value, message = '') {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.min(30 * 60, Math.max(5, numeric));
  const match = String(message).match(/(?:retry|wait|after|in)\s+(\d+)\s*(?:seconds?|secs?|s\b)/i);
  if (match) return Math.min(30 * 60, Math.max(5, Number(match[1])));
  return 60;
}

export function formatNewsDate(value, locale = 'tr-TR') {
  if (!value) return 'Tarih belirtilmemiş';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return 'Tarih belirtilmemiş';
  const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return new Intl.DateTimeFormat(locale, options).format(date);
}
