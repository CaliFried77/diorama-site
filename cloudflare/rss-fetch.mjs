import { normalizePublicFeedUrl, parseRssXml, MAX_FEED_BYTES } from '../server/rss-parser.mjs';

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 9_000;

async function readBoundedText(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error('RSS yanıtı boyut sınırını aşıyor.');
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('RSS yanıtı boyut sınırını aşıyor.');
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('RSS yanıtı boyut sınırını aşıyor.').catch(() => {});
        throw new Error('RSS yanıtı boyut sınırını aşıyor.');
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const contentType = response.headers.get('content-type') || '';
  const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] || 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export async function fetchAndParseFeedCloudflare(value, {
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = MAX_FEED_BYTES,
} = {}) {
  let url = normalizePublicFeedUrl(value);
  if (!url) throw new Error('Yalnızca herkese açık HTTPS RSS adresleri kullanılabilir.');

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response;
      try {
        response = await fetchImpl(url.href, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
            'Accept-Encoding': 'identity',
            'User-Agent': 'DioramaRSS/2.0.0-dev.1 (+https feed reader)',
          },
        });
      } catch {
        if (controller.signal.aborted) throw new Error('RSS kaynağı zaman aşımına uğradı.');
        throw new Error('RSS kaynağı alınamadı.');
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location') || '';
        await response.body?.cancel().catch(() => {});
        if (!location) throw new Error('RSS kaynağı geçersiz yönlendirme döndürdü.');
        if (redirects === MAX_REDIRECTS) throw new Error('RSS kaynağı çok fazla yönlendirme yaptı.');
        let nextUrl;
        try { nextUrl = normalizePublicFeedUrl(new URL(location, url).href); }
        catch { nextUrl = null; }
        if (!nextUrl) throw new Error('RSS yönlendirmesi güvenli bir HTTPS adresine gitmiyor.');
        url = nextUrl;
        continue;
      }

      if (response.status !== 200) {
        await response.body?.cancel().catch(() => {});
        throw new Error('RSS kaynağı HTTP ' + (response.status || 'yanıt hatası') + ' döndürdü.');
      }

      let xml;
      try { xml = await readBoundedText(response, maxBytes); }
      catch (error) {
        if (controller.signal.aborted) throw new Error('RSS kaynağı zaman aşımına uğradı.');
        throw error;
      }
      return parseRssXml(xml);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('RSS kaynağı alınamadı.');
}
