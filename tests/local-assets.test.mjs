import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const utilities = await readFile(new URL('../css/utilities.css', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const build = await readFile(new URL('../build.mjs', import.meta.url), 'utf8');

test('the page does not depend on Tailwind CDN and loads local CSS utilities including the news reader layer', () => {
  assert.equal(html.includes('cdn.tailwindcss.com'), false);
  assert.match(html, /href="\.\/css\/base\.css"/);
  assert.match(html, /href="\.\/css\/utilities\.css"/);
  assert.match(html, /href="\.\/css\/responsive\.css"/);
});

test('generated local utilities cover representative layout, color, responsive and state variants', () => {
  for (const rule of [
    '.flex{display:flex}',
    '.hidden{display:none}',
    '.bg-white\\/\\[0\\.05\\]',
    '.hover\\:text-white:hover',
    '@media(min-width:640px){.sm\\:text-7xl',
    'input[type="file"]::file-selector-button',
    '.group:hover .group-hover\\:opacity-100',
    '.placeholder-white\\/55::placeholder',
  ]) assert.ok(utilities.includes(rule), `Missing generated utility: ${rule}`);
});

test('build copies extension catalogs and deployable response headers while host config stays at the source root', () => {
  assert.match(build, /configDir/);
  assert.match(build, /_headers/);
  assert.doesNotMatch(build, /cp\(resolve\(root, 'netlify\.toml'/);
});

test('service worker precaches local shell assets and leaves external live services to the network', () => {
  assert.match(main, /serviceWorker\.register/);
  assert.match(sw, /\!url\.origin === self\.location\.origin|url\.origin !== self\.location\.origin/);
  for (const asset of ['./index.html', './css/utilities.css', './css/widgets.css', './js/main.js', './js/focus-timer-state.js', './js/10-glass-renderer.js']) {
    assert.ok(sw.includes(asset), `Offline shell missing ${asset}`);
  }
});
