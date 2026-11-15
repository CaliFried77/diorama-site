import dns from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';

export const MAX_FEED_BYTES = 1_000_000;
export const MAX_ARTICLES_PER_FEED = 12;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 9_000;

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([\da-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&#(\d+);/g, (_, decimal) => {
      const code = Number(decimal);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function plainText(value, limit) {
  const unwrapped = String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeXmlEntities(unwrapped
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function extractTag(block, localName) {
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<(?:(?:[\\w.-]+):)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${escaped}\\s*>`, 'i');
  return block.match(pattern)?.[1] ?? '';
}

function extractLink(block) {
  const paired = block.match(/<(?:[\w.-]+:)?link\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?link\s*>/i);
  if (paired) {
    const href = paired[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (href && (!paired[1].match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2] || paired[1].match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2] === 'alternate')) return href;
    const text = plainText(paired[2], 2048);
    if (text) return text;
  }
  const selfClosing = [...block.matchAll(/<(?:[\w.-]+:)?link\b([^>]*?)\/?>/gi)];
  for (const match of selfClosing) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2];
    const href = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (href && (!rel || rel === 'alternate')) return href;
  }
  return '';
}

export function parseRssXml(xml, { limit = MAX_ARTICLES_PER_FEED } = {}) {
  if (typeof xml !== 'string' || !xml.trim() || Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES) {
    throw new Error('RSS akışı boş veya izin verilen boyutu aşıyor.');
  }
  const blocks = [...xml.matchAll(/<(?:[\w.-]+:)?(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?(?:item|entry)\s*>/gi)].map((match) => match[0]);
  if (!blocks.length) throw new Error('RSS veya Atom öğesi bulunamadı.');

  const items = [];
  for (const block of blocks.slice(0, Math.min(limit, MAX_ARTICLES_PER_FEED))) {
    const title = plainText(extractTag(block, 'title'), 500);
    if (!title) continue;
    let link = decodeXmlEntities(extractLink(block)).trim().slice(0, 2048);
    if (!link) {
      const guid = plainText(extractTag(block, 'guid'), 2048);
      if (/^https:\/\//i.test(guid)) link = guid;
    }
    const publishedAt = plainText(
      extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated') || extractTag(block, 'date'),
      100,
    );
    const descriptionRaw = extractTag(block, 'encoded')
      || extractTag(block, 'description')
      || extractTag(block, 'summary')
      || extractTag(block, 'content');
    const description = plainText(descriptionRaw, 1200);
    items.push({ title, link, publishedAt, description });
  }
  if (!items.length) throw new Error('RSS akışında geçerli haber bulunamadı.');
  return items;
}

export function isPublicIpv4(address) {
  if (isIP(address) !== 4) return false;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function normalizePublicFeedUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (!hostname || !hostname.includes('.') || isIP(hostname) !== 0) return null;
    if (/\.(?:localhost|local|internal|test|invalid|example)$/.test(hostname) || hostname === 'localhost') return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

async function resolvePublicIpv4(hostname) {
  const records = await dns.lookup(hostname, { all: true, family: 4, verbatim: true });
  const record = records.find((entry) => isPublicIpv4(entry.address));
  if (!record) throw new Error('Kaynak alan adı herkese açık bir IPv4 adresine çözümlenemedi.');
  return record.address;
}

function requestPinnedHttps(url, address, { timeoutMs = REQUEST_TIMEOUT_MS, maxBytes = MAX_FEED_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: 'https:',
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      servername: url.hostname,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address, family: 4 }]);
        else callback(null, address, 4);
      },
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'Accept-Encoding': 'identity',
        'User-Agent': 'DioramaRSS/1.6.6 (+https feed reader)',
      },
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location || '';
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        resolve({ status, location, body: '' });
        return;
      }
      if (status !== 200) {
        response.resume();
        resolve({ status, location: '', body: '' });
        return;
      }
      const contentLength = Number(response.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        response.destroy(new Error('RSS yanıtı boyut sınırını aşıyor.'));
        return;
      }
      const chunks = [];
      let total = 0;
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          response.destroy(new Error('RSS yanıtı boyut sınırını aşıyor.'));
          request.destroy(new Error('RSS yanıtı boyut sınırını aşıyor.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = String(response.headers['content-type'] || '');
        const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] || 'utf-8';
        let body;
        try { body = new TextDecoder(charset).decode(buffer); }
        catch { body = buffer.toString('utf8'); }
        resolve({ status, location: '', body });
      });
      response.on('error', reject);
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('RSS kaynağı zaman aşımına uğradı.')));
    request.on('error', reject);
    request.end();
  });
}

export async function fetchRssXml(value, dependencies = {}) {
  const resolveIp = dependencies.resolvePublicIpv4 || resolvePublicIpv4;
  const request = dependencies.requestHttps || requestPinnedHttps;
  let url = normalizePublicFeedUrl(value);
  if (!url) throw new Error('Yalnızca herkese açık HTTPS RSS adresleri kullanılabilir.');

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const address = await resolveIp(url.hostname);
    if (!isPublicIpv4(address)) throw new Error('RSS kaynağı özel veya ayrılmış bir ağa yönleniyor.');
    const response = await request(url, address, { timeoutMs: dependencies.timeoutMs ?? REQUEST_TIMEOUT_MS, maxBytes: dependencies.maxBytes ?? MAX_FEED_BYTES });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.location) {
      if (redirects === MAX_REDIRECTS) throw new Error('RSS kaynağı çok fazla yönlendirme yaptı.');
      const next = normalizePublicFeedUrl(new URL(response.location, url).href);
      if (!next) throw new Error('RSS yönlendirmesi güvenli bir HTTPS adresine gitmiyor.');
      url = next;
      continue;
    }
    if (response.status !== 200) throw new Error(`RSS kaynağı HTTP ${response.status || 'yanıt hatası'} döndürdü.`);
    return response.body;
  }
  throw new Error('RSS kaynağı alınamadı.');
}

export async function fetchAndParseFeed(url, dependencies) {
  const xml = await fetchRssXml(url, dependencies);
  return parseRssXml(xml);
}
