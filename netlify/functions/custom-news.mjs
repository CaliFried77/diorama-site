import { fetchAndParseFeed, normalizePublicFeedUrl } from '../lib/rss-core.mjs';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readJsonBodyLimited(request, maxBytes) {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('body too large').catch(() => {});
        throw new Error('too_large');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try { return JSON.parse(Buffer.concat(chunks, total).toString('utf8')); }
  catch { throw new Error('invalid_json'); }
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { return new URL(origin).origin === new URL(request.url).origin; }
    catch { return false; }
  }
  return request.headers.get('sec-fetch-site')?.toLowerCase() !== 'cross-site';
}

export function createCustomNewsHandler({ fetchFeed = (url) => fetchAndParseFeed(url, { timeoutMs: 6500 }) } = {}) {
  return async function handleCustomNewsRequest(request) {
    if (request.method !== 'POST') return json({ status: 'error', message: 'Yalnızca POST desteklenir.' }, 405);
    if (!isSameOriginRequest(request)) return json({ status: 'error', message: 'Bu uç nokta yalnızca aynı kaynaktan çağrılabilir.' }, 403);
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 4096) return json({ status: 'error', message: 'İstek gövdesi çok büyük.' }, 413);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
      return json({ status: 'error', message: 'Content-Type application/json olmalıdır.' }, 415);
    }
    let body;
    try { body = await readJsonBodyLimited(request, 4096); }
    catch (error) {
      if (error.message === 'too_large') return json({ status: 'error', message: 'İstek gövdesi çok büyük.' }, 413);
      return json({ status: 'error', message: 'Geçersiz JSON isteği.' }, 400);
    }
    const feedUrl = typeof body?.url === 'string' ? body.url : '';
    if (feedUrl.length > 2048) return json({ status: 'error', message: 'RSS adresi çok uzun.' }, 400);
    if (!normalizePublicFeedUrl(feedUrl)) {
      return json({ status: 'error', message: 'Yalnızca herkese açık HTTPS RSS/Atom adresleri kabul edilir.' }, 400);
    }
    try {
      const items = await fetchFeed(feedUrl);
      if (!Array.isArray(items) || !items.length) return json({ status: 'error', message: 'Akışta haber bulunamadı.' }, 502);
      return json({ status: 'ok', fetchedAt: new Date().toISOString(), items: items.slice(0, 12) });
    } catch (error) {
      return json({ status: 'error', message: String(error?.message || 'RSS kaynağı okunamadı.').slice(0, 180) }, 502);
    }
  };
}

export const config = {
  path: '/api/custom-news',
  method: 'POST',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 40 },
};

export default createCustomNewsHandler();
