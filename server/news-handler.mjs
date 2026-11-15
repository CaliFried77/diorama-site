import { NEWS_CATEGORIES, NEWS_CATEGORY_IDS } from '../config/news-feeds.js';

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const CACHE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=30',
  'X-Content-Type-Options': 'nosniff',
};

function json(data, status = 200, headers = CACHE_HEADERS) {
  return new Response(JSON.stringify(data), { status, headers });
}

export function createNewsHandler({ fetchFeed } = {}) {
  if (typeof fetchFeed !== 'function') throw new TypeError('createNewsHandler requires a fetchFeed function.');

  return async function handleNewsRequest(request) {
    if (request.method !== 'GET') {
      return json({ status: 'error', message: 'Yalnızca GET desteklenir.' }, 405, { ...NO_CACHE_HEADERS, Allow: 'GET' });
    }

    const url = new URL(request.url);
    const categoryId = url.searchParams.get('category') || '';
    const category = NEWS_CATEGORIES[categoryId];
    if (!category || !NEWS_CATEGORY_IDS.includes(categoryId)) {
      return json({ status: 'error', message: 'Geçersiz haber kategorisi.' }, 400, NO_CACHE_HEADERS);
    }

    const forceRefresh = url.searchParams.get('refresh') === '1';
    const requested = url.searchParams.get('sources');
    const allowed = new Map(category.sources.map((source) => [source.id, source]));
    let sources = category.sources;
    if (requested !== null) {
      if (requested.length > 600) return json({ status: 'error', message: 'Kaynak listesi çok uzun.' }, 400, NO_CACHE_HEADERS);
      const ids = [...new Set(requested.split(',').map((value) => value.trim()).filter(Boolean))];
      if (!ids.length || ids.length > category.sources.length || ids.some((id) => !allowed.has(id))) {
        return json({ status: 'error', message: 'Kaynak listesinde geçersiz bir kimlik var.' }, 400, NO_CACHE_HEADERS);
      }
      sources = ids.sort().map((id) => allowed.get(id));
    }

    const results = await Promise.all(sources.map(async (source) => {
      try {
        const items = await fetchFeed(source);
        return {
          sourceId: source.id,
          status: 'ok',
          fetchedAt: new Date().toISOString(),
          items: Array.isArray(items) ? items.slice(0, 12) : [],
        };
      } catch (error) {
        const message = String(error?.message || 'Kaynak geçici olarak okunamadı.').slice(0, 180);
        return {
          sourceId: source.id,
          status: 'error',
          errorCode: /zaman aşım/i.test(message) ? 'timeout' : 'unavailable',
          message,
          fetchedAt: new Date().toISOString(),
          items: [],
        };
      }
    }));

    const successes = results.filter((result) => result.status === 'ok').length;
    const responseHeaders = forceRefresh || successes === 0 ? NO_CACHE_HEADERS : CACHE_HEADERS;
    return json({
      status: successes === results.length ? 'ok' : successes ? 'partial' : 'error',
      category: categoryId,
      generatedAt: new Date().toISOString(),
      sourceCount: sources.length,
      successCount: successes,
      results,
    }, 200, responseHeaders);
  };
}
