import { rm, mkdir, cp, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const moduleEntry = '<script type="module" src="./js/main.js"></script>';
if (!html.includes(moduleEntry)) throw new Error('index.html must load js/main.js as a native ES module.');
if (html.includes('cdn.tailwindcss.com')) throw new Error('Tailwind CDN reference must not be present in production HTML.');
if (!html.includes('./css/utilities.css')) throw new Error('index.html must load the locally generated utility stylesheet.');
if (/defer src="\.\/js\//.test(html)) throw new Error('Legacy classic-script entrypoints remain in index.html.');

const jsDir = resolve(root, 'js');
const configDir = resolve(root, 'config');
const functionsDir = resolve(root, 'netlify/functions');
const netlifyLibDir = resolve(root, 'netlify/lib');
const jsFiles = (await readdir(jsDir)).filter((name) => name.endsWith('.js')).sort();
const configFiles = (await readdir(configDir)).filter((name) => name.endsWith('.js')).sort();
const functionFiles = (await readdir(functionsDir)).filter((name) => name.endsWith('.mjs')).sort();
const netlifyLibFiles = (await readdir(netlifyLibDir)).filter((name) => name.endsWith('.mjs')).sort();
if (!jsFiles.includes('main.js')) throw new Error('Missing js/main.js entrypoint.');
if (!configFiles.includes('habitat-catalog.js') || !configFiles.includes('news-feeds.js')) throw new Error('Missing application configuration modules.');
if (!functionFiles.includes('news.mjs') || !functionFiles.includes('custom-news.mjs') || !netlifyLibFiles.includes('rss-core.mjs')) throw new Error('Missing Netlify RSS API modules.');
if (!html.includes('Diorama RSS API')) throw new Error('News provider attribution must identify the first-party RSS API.');
if (/rss2json\.com/i.test(html)) throw new Error('Third-party RSS2JSON dependency remains in the page.');

// Validate every local ES-module import and run Node's parser over every source file.
for (const file of jsFiles) {
  const fullPath = resolve(jsDir, file);
  const source = await readFile(fullPath, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(fullPath), match[1]);
    try { await access(target); } catch { throw new Error(`${file} imports missing file: ${match[1]}`); }
  }
  const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`Syntax check failed for ${file}:\n${syntax.stderr}`);
}
for (const file of [...functionFiles, ...netlifyLibFiles]) {
  const fullPath = resolve(file.startsWith('news') || file.startsWith('custom-news') ? functionsDir : netlifyLibDir, file);
  const source = await readFile(fullPath, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(fullPath), match[1]);
    try { await access(target); } catch { throw new Error(`${file} imports missing file: ${match[1]}`); }
  }
  const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`Syntax check failed for ${file}:\n${syntax.stderr}`);
}

// Compress only the deployable CSS. Keep source CSS human-readable for maintenance.
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
await cp(resolve(root, 'index.html'), resolve(dist, 'index.html'));
await cp(resolve(root, 'css'), resolve(dist, 'css'), { recursive: true });
await cp(resolve(root, 'js'), resolve(dist, 'js'), { recursive: true });
await cp(resolve(root, 'config'), resolve(dist, 'config'), { recursive: true });
await cp(resolve(root, 'sw.js'), resolve(dist, 'sw.js'));
await cp(resolve(root, '_headers'), resolve(dist, '_headers'));
for (const cssFile of ['base.css', 'utilities.css', 'responsive.css', 'news.css']) {
  const target = resolve(dist, 'css', cssFile);
  const source = await readFile(target, 'utf8');
  await writeFile(target, minifyCss(source));
}
console.log(`Build complete: dist/ contains ${jsFiles.length} feature modules, ${configFiles.length} configuration modules and minified CSS. Netlify deploy also bundles ${functionFiles.length} API functions and ${netlifyLibFiles.length} server modules from netlify/functions/.`);
