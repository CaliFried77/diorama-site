import { createNewsHandler } from '../netlify/functions/news.mjs';
import { createCustomNewsHandler } from '../netlify/functions/custom-news.mjs';
import { fetchAndParseFeedCloudflare } from './rss-fetch.mjs';

const newsHandler = createNewsHandler({
  fetchFeed: (source) => fetchAndParseFeedCloudflare(source.rss),
});

const customNewsHandler = createCustomNewsHandler({
  fetchFeed: (url, options) => fetchAndParseFeedCloudflare(url, options),
});

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function jsonError(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ status: 'error', message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function checkRateLimit(request, limiter) {
  if (!limiter || typeof limiter.limit !== 'function') {
    return jsonError('API hız sınırı yapılandırılamadı.', 503);
  }

  // Cloudflare provides this header at the edge. Missing IP metadata fails closed.
  const clientIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (!clientIp) return jsonError('İstemci adresi doğrulanamadı.', 503);

  try {
    const result = await limiter.limit({ key: clientIp });
    if (!result?.success) {
      return jsonError('Çok fazla istek gönderildi. Lütfen biraz sonra tekrar dene.', 429, {
        'Retry-After': '60',
      });
    }
    return null;
  } catch {
    return jsonError('API hız sınırı şu anda kullanılamıyor.', 503);
  }
}

function cacheKeyFor(request) {
  const url = new URL(request.url);
  url.searchParams.delete('refresh');
  url.searchParams.sort();
  return new Request(url.toString(), { method: 'GET' });
}

async function handleNewsRequest(request, env, ctx) {
  const limited = await checkRateLimit(request, env.NEWS_RATE_LIMITER);
  if (limited) return limited;

  const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';
  const cache = globalThis.caches?.default;
  const cacheKey = cacheKeyFor(request);

  if (!forceRefresh && cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('Cache-Control', 'public, max-age=30');
        headers.set('X-Diorama-Cache', 'HIT');
        return applySecurityHeaders(new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers,
        }));
      }
    } catch {
      // Cache is an optimization only. The source handler remains authoritative.
    }
  }

  const response = await newsHandler(request);
  const headers = new Headers(response.headers);
  const cacheable = response.status === 200 && headers.has('Netlify-CDN-Cache-Control');
  headers.delete('Netlify-CDN-Cache-Control');
  headers.set('X-Diorama-Cache', 'MISS');
  if (cacheable) headers.set('Cache-Control', 'public, max-age=30');

  const publicResponse = applySecurityHeaders(new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));

  if (!forceRefresh && cache && cacheable) {
    try {
      const storedHeaders = new Headers(publicResponse.headers);
      storedHeaders.set('Cache-Control', 'public, max-age=240');
      const entry = new Response(publicResponse.clone().body, {
        status: publicResponse.status,
        statusText: publicResponse.statusText,
        headers: storedHeaders,
      });
      const write = cache.put(cacheKey, entry);
      if (ctx?.waitUntil) ctx.waitUntil(write.catch(() => {}));
      else await write;
    } catch {
      // A cache write failure must not turn a successful RSS response into an error.
    }
  }

  return publicResponse;
}

async function handleCustomNewsRequest(request, env) {
  const limited = await checkRateLimit(request, env.CUSTOM_NEWS_RATE_LIMITER);
  if (limited) return limited;
  return applySecurityHeaders(await customNewsHandler(request));
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;

    if (pathname === '/api/news') return handleNewsRequest(request, env, ctx);
    if (pathname === '/api/custom-news') return handleCustomNewsRequest(request, env);

    if (pathname.startsWith('/api/')) {
      return jsonError('API uç noktası bulunamadı.', 404);
    }

    return env.ASSETS.fetch(request);
  },
};
