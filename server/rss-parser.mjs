export const MAX_FEED_BYTES = 1_000_000;
export const MAX_CUSTOM_FEED_BYTES = 256 * 1024;
export const MAX_ARTICLES_PER_FEED = 12;

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    // Decode each XML entity exactly once. Sequential replacements can turn
    // &amp;lt; into < and accidentally strip text that was meant to stay literal.
    .replace(/&(#x[\da-f]+|#\d+|nbsp|amp|quot|apos|lt|gt);/gi, (entity, token) => {
      const normalized = token.toLowerCase();
      if (normalized.startsWith('#x')) {
        const code = Number.parseInt(normalized.slice(2), 16);
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code) : ' ';
      }
      if (normalized.startsWith('#')) {
        const code = Number(normalized.slice(1));
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code) : ' ';
      }
      switch (normalized) {
        case 'nbsp': return ' ';
        case 'amp': return '&';
        case 'quot': return '"';
        case 'apos': return "'";
        case 'lt': return '<';
        case 'gt': return '>';
        default: return entity;
      }
    });
}

function plainText(value, limit) {
  const unwrapped = String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeXmlEntities(unwrapped)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}
function extractTag(block, localName) {
  const escaped = localName.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('<(?:(?:[\\w.-]+):)?' + escaped + '\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?' + escaped + '\\s*>', 'i');
  return block.match(pattern)?.[1] ?? '';
}

function extractLink(block) {
  const paired = block.match(/<(?:[\w.-]+:)?link\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?link\s*>/i);
  if (paired) {
    const href = paired[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    const rel = paired[1].match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (href && (!rel || rel === 'alternate')) return href;
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

function findMarkupEnd(xml, start) {
  const declaration = xml.startsWith('<!', start);
  let quote = '';
  let subsetDepth = 0;

  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (declaration) {
      if (character === '[') { subsetDepth += 1; continue; }
      if (character === ']' && subsetDepth > 0) { subsetDepth -= 1; continue; }
    }
    if (character === '>' && subsetDepth === 0) return index;
  }
  return -1;
}

// A single forward pass avoids retrying an unclosed <item>/<entry> from every
// later opening tag. Only the first bounded set of complete blocks is needed.
function scanItemBlocks(xml, maxBlocks) {
  const blocks = [];
  const stopAfter = Math.max(1, maxBlocks);
  let pendingStart = -1;
  let cursor = 0;

  while (cursor < xml.length && blocks.length < stopAfter) {
    const open = xml.indexOf('<', cursor);
    if (open === -1) break;

    if (xml.startsWith('<!--', open)) {
      const end = xml.indexOf('-->', open + 4);
      if (end === -1) break;
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', open)) {
      const end = xml.indexOf(']]>', open + 9);
      if (end === -1) break;
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith('<?', open)) {
      const end = xml.indexOf('?>', open + 2);
      if (end === -1) break;
      cursor = end + 2;
      continue;
    }

    const end = findMarkupEnd(xml, open);
    if (end === -1) break;

    let nameStart = open + 1;
    const closing = xml[nameStart] === '/';
    if (closing) nameStart += 1;

    let nameEnd = nameStart;
    while (nameEnd < end) {
      const code = xml.charCodeAt(nameEnd);
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 47 || code === 62) break;
      nameEnd += 1;
    }

    const qualifiedName = xml.slice(nameStart, nameEnd);
    const localName = qualifiedName.slice(qualifiedName.lastIndexOf(':') + 1).toLowerCase();
    if (localName === 'item' || localName === 'entry') {
      if (closing) {
        if (pendingStart !== -1) {
          blocks.push(xml.slice(pendingStart, end + 1));
          pendingStart = -1;
        }
      } else if (pendingStart === -1) {
        pendingStart = open;
      }
    }

    cursor = end + 1;
  }

  return blocks;
}

export function parseRssXml(xml, { limit = MAX_ARTICLES_PER_FEED } = {}) {
  if (typeof xml !== 'string' || !xml.trim() || new TextEncoder().encode(xml).byteLength > MAX_FEED_BYTES) {
    throw new Error('RSS akışı boş veya izin verilen boyutu aşıyor.');
  }
  const boundedLimit = Math.max(0, Math.min(Number.isInteger(limit) ? limit : MAX_ARTICLES_PER_FEED, MAX_ARTICLES_PER_FEED));
  const blocks = scanItemBlocks(xml, boundedLimit);
  if (!blocks.length) throw new Error('RSS veya Atom öğesi bulunamadı.');

  const items = [];
  for (const block of blocks.slice(0, boundedLimit)) {
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

export function normalizePublicFeedUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const ipv4Literal = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const ipv6Literal = hostname.startsWith('[') && hostname.endsWith(']');
    const numericHost = /^\d+$/.test(hostname);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (!hostname || !hostname.includes('.') || ipv4Literal || ipv6Literal || numericHost) return null;
    if (/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(hostname)) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}
