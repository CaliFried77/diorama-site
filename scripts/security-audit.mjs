import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const headers = await readFile(resolve(root, '_headers'), 'utf8');
const swTemplate = await readFile(resolve(root, 'sw.template.js'), 'utf8');
const buildScript = await readFile(resolve(root, 'build.mjs'), 'utf8');
const customNews = await readFile(resolve(root, 'netlify/functions/custom-news.mjs'), 'utf8');
const main = await readFile(resolve(root, 'js/main.js'), 'utf8');
const baseCss = await readFile(resolve(root, 'css/base.css'), 'utf8');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const releaseVersion = packageJson.version;

if (/\son[a-z]+\s*=/i.test(html)) failures.push('Inline HTML event handler found.');
if (/<script(?![^>]*type=["']module["'])/i.test(html)) failures.push('Unexpected non-module script element found.');
if (/cdn\.tailwindcss\.com/i.test(html)) failures.push('Tailwind CDN dependency remains.');
if (!/(?:^|;)\s*script-src\s+'self'(?:;|$)/.test(headers) || /(?:^|;)\s*script-src\s+[^;]*unsafe-inline/.test(headers)) failures.push('CSP must restrict scripts to self without unsafe-inline.');
for (const directive of ['object-src \'none\'', 'base-uri \'self\'', 'frame-ancestors \'none\'', 'X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin']) {
  if (!headers.includes(directive)) failures.push(`Missing security header/directive: ${directive}`);
}
if (!swTemplate.includes('__CACHE_NAME__') || !swTemplate.includes('__APP_SHELL_JSON__') || !buildScript.includes('createHash')) failures.push(`Service worker app shell is not generated from build assets for release ${releaseVersion}.`);
if (!swTemplate.includes("cache: 'reload'") || !swTemplate.includes("cache: 'no-cache'")) failures.push('Service Worker must bypass stale HTTP assets during install and prefer revalidated network resources while online.');
if (!customNews.includes('isSameOriginRequest') || !customNews.includes('sec-fetch-site')) failures.push('Custom RSS endpoint is missing its browser origin check.');
if (!html.includes('manifest.webmanifest') || !html.includes('name="description"') || !html.includes('property="og:title"')) failures.push('App metadata, manifest or Open Graph basics are missing.');

const scan = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const code = await readFile(path, 'utf8');
      if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(code)) failures.push(`Dynamic code execution sink in ${path.slice(root.length + 1)}`);
    }
  }
};
await scan(resolve(root, 'js'));
await scan(resolve(root, 'config'));
await scan(resolve(root, 'netlify'));

const appCode = [
  await readFile(resolve(root, 'js/02-news.js'), 'utf8'),
  await readFile(resolve(root, 'netlify/functions/news.mjs'), 'utf8'),
  await readFile(resolve(root, 'netlify/functions/custom-news.mjs'), 'utf8'),
].join('\n');
if (/rss2json\.com/i.test(appCode)) failures.push('Browser/server code still depends on the third-party RSS2JSON converter.');
if (!headers.includes("connect-src 'self'")) failures.push('CSP must keep API requests same-origin.');

if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test([html, main, baseCss, headers].join('\n'))) failures.push('External Google Fonts dependency remains; fonts must be self-hosted.');
if (!headers.includes("font-src 'self'") || !headers.includes("style-src 'self' 'unsafe-inline'")) failures.push('CSP must restrict font and stylesheet loads to the same origin.');
for (const family of ['Inter', 'JetBrains Mono', 'Pixelify Sans', 'Silkscreen']) {
  if (!baseCss.includes(`font-family: '${family}'`)) failures.push(`Missing local @font-face for ${family}.`);
}


if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Security audit passed: no inline event handlers, no unsafe script execution sinks, CSP and release policy checks passed.');
