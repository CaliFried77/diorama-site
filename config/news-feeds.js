/**
 * News catalog — extend a category by adding another source object to its `sources` array.
 * Every RSS URL is read through the configured RSS JSON adapter. Keep source IDs unique
 * across all categories because IDs are persisted in the local news cache.
 */
export const NEWS_CATEGORIES = Object.freeze({
  gundem: {
    label: 'Türkiye & Dünya',
    sources: [
      { id: 'bbc-turkce', publisher: 'BBC Türkçe', rss: 'https://feeds.bbci.co.uk/turkce/rss.xml', homepage: 'https://www.bbc.com/turkce', enabled: true },
      { id: 'trt-haber', publisher: 'TRT Haber', rss: 'https://www.trthaber.com/manset_articles.rss', homepage: 'https://www.trthaber.com/', enabled: true },
      { id: 'anadolu-ajansi', publisher: 'Anadolu Ajansı', rss: 'https://www.aa.com.tr/tr/rss/default?cat=guncel', homepage: 'https://www.aa.com.tr/tr', enabled: true },
      { id: 'dw-turkce', publisher: 'DW Türkçe', rss: 'https://rss.dw.com/rdf/rss-tur-all', homepage: 'https://www.dw.com/tr/', enabled: true },
      { id: 'ntv', publisher: 'NTV', rss: 'https://www.ntv.com.tr/gundem.rss', homepage: 'https://www.ntv.com.tr/', enabled: true },
      { id: 'cnn-turk', publisher: 'CNN Türk', rss: 'https://www.cnnturk.com/feed/rss/turkiye/news', homepage: 'https://www.cnnturk.com/', enabled: true },
    ],
  },
  teknoloji: {
    label: 'Teknoloji',
    sources: [
      { id: 'webrazzi', publisher: 'Webrazzi', rss: 'https://webrazzi.com/feed/', homepage: 'https://webrazzi.com', enabled: true },
      { id: 'webtekno', publisher: 'Webtekno', rss: 'https://www.webtekno.com/rss.xml', homepage: 'https://www.webtekno.com/', enabled: true },
      { id: 'technopat', publisher: 'Technopat', rss: 'https://www.technopat.net/feed/', homepage: 'https://www.technopat.net/', enabled: true },
      { id: 'shiftdelete', publisher: 'ShiftDelete', rss: 'https://shiftdelete.net/rss', homepage: 'https://shiftdelete.net/', enabled: true },
      { id: 'donanimhaber', publisher: 'DonanımHaber', rss: 'https://www.donanimhaber.com/rss/tum/', homepage: 'https://www.donanimhaber.com/', enabled: true },
    ],
  },
  bilim: {
    label: 'Bilim & Kültür',
    sources: [
      { id: 'evrim-agaci', publisher: 'Evrim Ağacı', rss: 'https://evrimagaci.org/rss.xml', homepage: 'https://evrimagaci.org', enabled: true },
      { id: 'tubitak', publisher: 'TÜBİTAK', rss: 'https://www.tubitak.gov.tr/rss.xml', homepage: 'https://www.tubitak.gov.tr/', enabled: true },
      { id: 'arkeofili', publisher: 'Arkeofili', rss: 'https://arkeofili.com/feed/', homepage: 'https://arkeofili.com/', enabled: true },
    ],
  },
});

export const NEWS_CATEGORY_IDS = Object.freeze(Object.keys(NEWS_CATEGORIES));

function assertHttpsUrl(value, description) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error();
  } catch {
    throw new Error(`Invalid HTTPS URL for ${description}`);
  }
}

const uniqueSourceIds = new Set();
for (const [categoryId, category] of Object.entries(NEWS_CATEGORIES)) {
  if (!/^[a-z0-9-]+$/.test(categoryId) || typeof category.label !== 'string' || !category.label.trim() || !Array.isArray(category.sources)) {
    throw new Error(`Invalid news category: ${categoryId}`);
  }
  for (const source of category.sources) {
    if (!source || !/^[a-z0-9-]+$/.test(source.id) || uniqueSourceIds.has(source.id)) {
      throw new Error(`Invalid or duplicate news source ID: ${source?.id || 'unknown'}`);
    }
    if (typeof source.publisher !== 'string' || !source.publisher.trim()) throw new Error(`Missing publisher for ${source.id}`);
    assertHttpsUrl(source.rss, `RSS feed ${source.id}`);
    assertHttpsUrl(source.homepage, `homepage ${source.id}`);
    if (typeof source.enabled !== 'boolean') throw new Error(`Missing enabled state for ${source.id}`);
    uniqueSourceIds.add(source.id);
  }
}

export function getNewsCategory(id) {
  return NEWS_CATEGORIES[id] ?? null;
}

export function getEnabledNewsSources(id) {
  return (NEWS_CATEGORIES[id]?.sources ?? []).filter((source) => source.enabled);
}
