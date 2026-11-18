import { createNewsHandler } from '../server/news-handler.mjs';
import { createCustomNewsHandler } from '../server/custom-news-handler.mjs';
import { fetchAndParseFeedCloudflare } from './rss-fetch.mjs';
import { MAX_CUSTOM_FEED_BYTES } from '../server/rss-parser.mjs';

const newsHandler = createNewsHandler({
  fetchFeed: (source) => fetchAndParseFeedCloudflare(source.rss),
});

const customNewsHandler = createCustomNewsHandler({
  fetchFeed: (url) => fetchAndParseFeedCloudflare(url, {
    timeoutMs: 6_500,
    maxBytes: MAX_CUSTOM_FEED_BYTES,
  }),
});

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
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
  const cacheable = response.status === 200 && /^public\b/.test(headers.get('Cache-Control') || '');
  headers.set('X-Diorama-Cache', 'MISS');

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
    if (pathname.startsWith('/api/')) return jsonError('API uç noktası bulunamadı.', 404);

    return env.ASSETS.fetch(request);
  },
};
