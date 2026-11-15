import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const read = (path) => readFile(resolve(root, path), 'utf8');

const html = await read('index.html');
const headers = await read('_headers');
const swTemplate = await read('sw.template.js');
const buildScript = await read('build.mjs');
const customNews = await read('server/custom-news-handler.mjs');
const cloudflareWorker = await read('cloudflare/worker.mjs');
const main = await read('js/main.js');
const baseCss = await read('css/base.css');
const packageJson = JSON.parse(await read('package.json'));
const releaseVersion = packageJson.version;

if (/\son[a-z]+\s*=/i.test(html)) failures.push('Inline HTML event handler found.');
if (/<script(?![^>]*type=["']module["'])/i.test(html)) failures.push('Unexpected non-module script element found.');
if (/cdn\.tailwindcss\.com/i.test(html)) failures.push('Tailwind CDN dependency remains.');
if (!/(?:^|;)\s*script-src\s+'self'(?:;|$)/.test(headers) || /(?:^|;)\s*script-src\s+[^;]*unsafe-inline/.test(headers)) {
  failures.push('CSP must restrict scripts to self without unsafe-inline.');
}
for (const directive of [
  "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
  'X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin',
]) {
  if (!headers.includes(directive)) failures.push('Missing static security header/directive: ' + directive);
}
if (!swTemplate.includes('__CACHE_NAME__') || !swTemplate.includes('__APP_SHELL_JSON__') || !buildScript.includes('createHash')) {
  failures.push('Service Worker app shell is not generated from build assets for release ' + releaseVersion + '.');
}
if (!swTemplate.includes("cache: 'reload'") || !swTemplate.includes("cache: 'no-cache'")) {
  failures.push('Service Worker must bypass stale HTTP assets during install and prefer revalidated network resources while online.');
}
if (!customNews.includes('isSameOriginRequest') || !customNews.includes('sec-fetch-site')) {
  failures.push('Custom RSS endpoint is missing its browser origin check.');
}
if (!cloudflareWorker.includes("pathname === '/api/news'") || !cloudflareWorker.includes("pathname === '/api/custom-news'")) {
  failures.push('Cloudflare Worker is missing a required same-origin API route.');
}
if (!html.includes('manifest.webmanifest') || !html.includes('name="description"') || !html.includes('property="og:title"')) {
  failures.push('App metadata, manifest or Open Graph basics are missing.');
}

const scan = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const code = await readFile(path, 'utf8');
      if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(code)) {
        failures.push('Dynamic code execution sink in ' + relative(root, path));
      }
    }
  }
};
for (const directory of ['js', 'config', 'server', 'cloudflare']) await scan(resolve(root, directory));

const appCode = [
  await read('js/02-news.js'),
  await read('server/news-handler.mjs'),
  await read('server/custom-news-handler.mjs'),
  await read('cloudflare/worker.mjs'),
].join('\n');
if (/rss2json\.com/i.test(appCode)) failures.push('Browser/server code still depends on the third-party RSS2JSON converter.');
if (!headers.includes("connect-src 'self'")) failures.push('Static CSP must keep API requests same-origin.');
if (!cloudflareWorker.includes("'Content-Security-Policy'") || !cloudflareWorker.includes("default-src 'none'")) {
  failures.push('Worker-generated API responses must receive a restrictive CSP.');
}
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test([html, main, baseCss, headers].join('\n'))) {
  failures.push('External Google Fonts dependency remains; fonts must be self-hosted.');
}
if (!headers.includes("font-src 'self'") || !headers.includes("style-src 'self' 'unsafe-inline'")) {
  failures.push('CSP must restrict font and stylesheet loads to the same origin.');
}
for (const family of ['Inter', 'JetBrains Mono', 'Pixelify Sans', 'Silkscreen']) {
  if (!baseCss.includes("font-family: '" + family + "'")) failures.push('Missing local @font-face for ' + family + '.');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Security audit passed: browser, server and Worker code contain no unsafe script sinks; static/API CSP, origin checks and release policies passed.');
