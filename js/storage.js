/** Small, defensive browser-storage and input-normalization helpers. */
export const lsGet = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
};

export const lsRaw = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

export const lsPut = (key, value) => {
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
};

export const esc = (value) => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

/**
 * Normalize a user-provided web destination. Only HTTP(S) is accepted; credentials,
 * script/data/blob/file URLs and malformed hostnames are rejected.
 */
export function normalizeWebUrl(value, { addHttps = true } = {}) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || input.length > 2048 || /[\u0000-\u001f\u007f]/.test(input)) return null;
  const hasHttpScheme = /^https?:\/\//i.test(input);
  const looksLikeHostPort = /^[^/:?#\s]+:\d+(?:[/?#]|$)/.test(input);
  const hasOtherScheme = /^[a-z][a-z\d+.-]*:/i.test(input) && !hasHttpScheme && !looksLikeHostPort;
  if (hasOtherScheme) return null;
  const candidate = hasHttpScheme || !addHttps ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!url.hostname || url.username || url.password) return null;
    if (url.hostname.includes('..')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeShortcutList(value, fallback = []) {
  if (!Array.isArray(value) || value.length > 100) return fallback.map((item) => ({ ...item }));
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 80) : '';
    const url = normalizeWebUrl(item.url);
    if (!name || !url) return null;
    return { name, url, iconKey: 'globe' };
  }).filter(Boolean);
}

export function normalizeTaskList(value, fallback = []) {
  if (!Array.isArray(value) || value.length > 1000) return fallback.map((item) => ({ ...item }));
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (typeof item.text !== 'string' || !item.text.trim()) return null;
    return {
      text: item.text.trim().slice(0, 10000),
      done: item.done === true,
      priority: ['normal', 'high', 'low'].includes(item.priority) ? item.priority : 'normal',
    };
  }).filter(Boolean);
}

export function normalizeNoteList(value, fallback = []) {
  if (!Array.isArray(value) || value.length > 500) return fallback.map((item) => ({ ...item }));
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (typeof item.body !== 'string' || !item.body.trim()) return null;
    return {
      title: typeof item.title === 'string' ? item.title.trim().slice(0, 300) : 'Not',
      body: item.body.slice(0, 20000),
      date: typeof item.date === 'string' ? item.date.slice(0, 100) : '',
    };
  }).filter(Boolean);
}
