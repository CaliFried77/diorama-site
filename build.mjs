import { rm, mkdir, cp, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const swTemplate = await readFile(resolve(root, 'sw.template.js'), 'utf8');
const moduleEntry = '<script type="module" src="./js/main.js"></script>';

if (!html.includes(moduleEntry)) throw new Error('index.html must load js/main.js as a native ES module.');
if (html.includes('cdn.tailwindcss.com')) throw new Error('Tailwind CDN reference must not be present in production HTML.');
if (!html.includes('./css/utilities.css')) throw new Error('index.html must load the locally generated utility stylesheet.');
if (!html.includes('<!-- BUILD:MODULE_PRELOADS -->')) throw new Error('index.html must contain the generated module-preload marker.');
if (!swTemplate.includes('__CACHE_NAME__') || !swTemplate.includes('__APP_SHELL_JSON__')) throw new Error('sw.template.js is missing its build placeholders.');
if (/defer src="\.\/js\//.test(html)) throw new Error('Legacy classic-script entrypoints remain in index.html.');

const directories = ['js', 'config', 'server', 'cloudflare'];
const sourceFiles = [];
for (const directory of directories) {
  const fullDirectory = resolve(root, directory);
  const entries = (await readdir(fullDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(?:js|mjs)$/.test(entry.name))
    .map((entry) => resolve(fullDirectory, entry.name))
    .sort();
  sourceFiles.push(...entries);
}

const hasSource = (path) => sourceFiles.some((file) => file === resolve(root, path));
if (!hasSource('js/main.js')) throw new Error('Missing js/main.js entrypoint.');
if (!hasSource('config/habitat-catalog.js') || !hasSource('config/news-feeds.js')) {
  throw new Error('Missing application configuration modules.');
}
for (const required of [
  'server/rss-parser.mjs',
  'server/news-handler.mjs',
  'server/custom-news-handler.mjs',
  'cloudflare/rss-fetch.mjs',
  'cloudflare/worker.mjs',
]) {
  if (!hasSource(required)) throw new Error('Missing Cloudflare application module: ' + required);
}
if (!html.includes('Diorama RSS API')) throw new Error('News provider attribution must identify the first-party RSS API.');
if (/rss2json\.com/i.test(html)) throw new Error('Third-party RSS2JSON dependency remains in the page.');

// Validate every local ES-module import and parse every first-party source module.
for (const fullPath of sourceFiles) {
  const source = await readFile(fullPath, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(fullPath), match[1]);
    try { await access(target); }
    catch { throw new Error(relative(root, fullPath) + ' imports missing file: ' + match[1]); }
  }
  const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error('Syntax check failed for ' + relative(root, fullPath) + ':\n' + syntax.stderr);
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const directory of ['css', 'js', 'config', 'icons', 'fonts', 'licenses']) {
  await cp(resolve(root, directory), resolve(dist, directory), { recursive: true });
}
await cp(resolve(root, 'index.html'), resolve(dist, 'index.html'));
await cp(resolve(root, 'LICENSE'), resolve(dist, 'LICENSE'));
await cp(resolve(root, 'THIRD_PARTY_NOTICES.md'), resolve(dist, 'THIRD_PARTY_NOTICES.md'));
await cp(resolve(root, 'manifest.webmanifest'), resolve(dist, 'manifest.webmanifest'));
await cp(resolve(root, '_headers'), resolve(dist, '_headers'));

for (const cssFile of ['base.css', 'utilities.css', 'responsive.css', 'news.css', 'widgets.css']) {
  const target = resolve(dist, 'css', cssFile);
  const source = await readFile(target, 'utf8');
  await writeFile(target, minifyCss(source));
}

const jsFiles = sourceFiles
  .filter((file) => file.startsWith(resolve(root, 'js') + '/'))
  .map((file) => relative(resolve(root, 'js'), file))
  .sort();
const modulePreloads = jsFiles.map((name) => '    <link rel="modulepreload" href="./js/' + name + '">').join('\n');
const builtHtml = html.replace('<!-- BUILD:MODULE_PRELOADS -->', modulePreloads);
await writeFile(resolve(dist, 'index.html'), builtHtml);

async function listFiles(directory, base = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath, base));
    else files.push({ fullPath, relativePath: relative(base, fullPath).split('\\').join('/') });
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

const staticFiles = (await listFiles(dist))
  .filter(({ relativePath }) => relativePath !== 'sw.js' && relativePath !== '_headers');
const appShell = ['./', ...staticFiles.map(({ relativePath }) => './' + relativePath)];
const fingerprint = createHash('sha256');
for (const file of staticFiles) {
  fingerprint.update(file.relativePath).update('\0');
  fingerprint.update(await readFile(file.fullPath));
}
const buildHash = fingerprint.digest('hex').slice(0, 16);
const cacheName = 'living-pixel-diorama-shell-' + packageJson.version + '-' + buildHash;
const generatedWorker = swTemplate
  .replace('__CACHE_NAME__', JSON.stringify(cacheName))
  .replace('__APP_SHELL_JSON__', JSON.stringify(appShell, null, 2));
await writeFile(resolve(dist, 'sw.js'), generatedWorker);

const swCheck = spawnSync(process.execPath, ['--check', resolve(dist, 'sw.js')], { encoding: 'utf8' });
if (swCheck.status !== 0) throw new Error('Generated Service Worker syntax check failed:\n' + swCheck.stderr);

console.log(
  'Build complete: dist/ contains ' + jsFiles.length + ' ES modules, static assets, generated utility CSS, security headers and a content-hashed offline shell. Cloudflare Worker sources are validated separately and bundled by Wrangler.',
);
