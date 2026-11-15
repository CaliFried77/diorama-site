import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const utilities = await readFile(new URL('../css/utilities.css', import.meta.url), 'utf8');
const sw = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
const builtHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const baseCss = await readFile(new URL('../css/base.css', import.meta.url), 'utf8');
const newsCss = await readFile(new URL('../css/news.css', import.meta.url), 'utf8');
const widgetsCss = await readFile(new URL('../css/widgets.css', import.meta.url), 'utf8');
const responsiveCss = await readFile(new URL('../css/responsive.css', import.meta.url), 'utf8');
const sourceLicense = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
const sourceNotices = await readFile(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
const distLicense = await readFile(new URL('../dist/LICENSE', import.meta.url), 'utf8');
const distNotices = await readFile(new URL('../dist/THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
const build = await readFile(new URL('../build.mjs', import.meta.url), 'utf8');
const wrangler = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

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
    '.sr-only{position:absolute;width:1px;height:1px',
    '.gap-x-3{column-gap:.75rem}',
    '.gap-y-1{row-gap:.25rem}',
  ]) assert.ok(utilities.includes(rule), `Missing generated utility: ${rule}`);
});

test('build copies extension catalogs and Cloudflare response headers while Wrangler config stays at the source root', () => {
  assert.match(build, /const directories = \['js', 'config', 'server', 'cloudflare'\]/);
  assert.match(build, /_headers/);
  assert.match(build, /modulePreloads/);
  assert.match(build, /createHash/);
  assert.doesNotMatch(build, /cp\(resolve\(root, 'wrangler\.toml'/);
  assert.match(wrangler, /main = "cloudflare\/worker\.mjs"/);
  assert.match(wrangler, /directory = "\.\/dist"/);
  assert.equal(packageJson.scripts.dev, 'npx --yes wrangler@4.162.0 dev');
  assert.equal(packageJson.scripts.deploy, 'npm run build && npx --yes wrangler@4.162.0 deploy');
  assert.equal(packageJson.scripts['deploy:dry-run'], 'npm run build && npx --yes wrangler@4.162.0 deploy --dry-run');
});

test('generated typography and layout share a responsive root scale', () => {
  assert.ok(baseCss.includes('font-size: clamp(16.5px, calc(15.5px + .18vw), 18px);'));
  assert.ok(utilities.includes('.text-xs{font-size:.75rem;line-height:1rem}'));
  assert.ok(utilities.includes('.text-sm{font-size:.875rem;line-height:1.25rem}'));
  assert.ok(utilities.includes('.text-base{font-size:1rem;line-height:1.5rem}'));
  assert.ok(utilities.includes('.text-\\[10px\\]{font-size:12px}'));
  assert.ok(utilities.includes('.text-\\[15px\\]{font-size:17px}'));
});

test('text-bearing panels and buttons grow with the typography scale', () => {
  assert.match(newsCss, /width: min\\(420px/);
  assert.match(newsCss, /\.news-cat-btn[\\s\\S]*?min-height: 40px/);
  assert.match(newsCss, /\.news-save-btn[\\s\\S]*?width: 40px; height: 40px/);
  assert.match(widgetsCss, /\.focus-popover[\\s\\S]*?width: min\\(380px/);
  assert.match(widgetsCss, /\.focus-primary-btn[\\s\\S]*?min-height: 44px/);
  assert.match(responsiveCss, /\.engine-chip[\\s\\S]*?min-height: 36px/);
});

test('hand-authored component styles do not reintroduce tiny fixed-pixel labels', () => {
  for (const [name, css] of [['news.css', newsCss], ['widgets.css', widgetsCss], ['responsive.css', responsiveCss]]) {
    assert.doesNotMatch(css, /(?:font-size|font):\\s*(?:[0-9]|1[01])px\\b/, `${name} contains text smaller than 12px`);
  }
});

test('service worker precaches local shell assets and leaves external live services to the network', () => {
  assert.match(main, /serviceWorker\.register/);
  assert.match(sw, /\!url\.origin === self\.location\.origin|url\.origin !== self\.location\.origin/);
  for (const asset of ['./index.html', './css/utilities.css', './css/widgets.css', './js/main.js', './js/focus-timer-state.js', './js/10-glass-renderer.js', './manifest.webmanifest', './icons/diorama-192.png']) {
    assert.ok(sw.includes(asset), `Offline shell missing ${asset}`);
  }
});


test('production HTML preloads every native module and exposes app metadata', () => {
  for (const module of ['01-core-ui.js', '02-news.js', '03-weather.js', '04-focus-audio.js', '07-habitat-state.js', 'scene-math.js', 'main.js']) {
    assert.ok(builtHtml.includes(`rel=\"modulepreload\" href=\"./js/${module}\"`), `Missing modulepreload for ${module}`);
  }
  assert.match(builtHtml, /name=\"description\"/);
  assert.match(builtHtml, /property=\"og:title\"/);
  assert.match(builtHtml, /rel=\"manifest\" href=\"\.\/manifest\.webmanifest\"/);
  assert.match(builtHtml, /id=\"habitatAnnouncement\"[^>]*aria-live=\"polite\"/);
});


test('web app manifest declares installable portrait-safe app icons and Turkish metadata', () => {
  assert.equal(manifest.name, 'Living Pixel Diorama');
  assert.equal(manifest.lang, 'tr-TR');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose.includes('maskable')));
});


test('the published site includes app and font licenses and exposes them from the Data Manager', async () => {
  assert.equal(distLicense, sourceLicense);
  assert.equal(distNotices, sourceNotices);
  for (const file of ['Inter-OFL.txt', 'JetBrainsMono-OFL.txt', 'PixelifySans-OFL.txt', 'Silkscreen-OFL.txt']) {
    const source = await readFile(new URL(`../licenses/fonts/${file}`, import.meta.url));
    const published = await readFile(new URL(`../dist/licenses/fonts/${file}`, import.meta.url));
    assert.deepEqual(published, source, `published license differs: ${file}`);
  }
  assert.match(html, /id="licenseLinks"/);
  assert.match(html, /href="\.\/LICENSE"/);
  assert.match(html, /href="\.\/THIRD_PARTY_NOTICES\.md"/);
});

test('Service Worker can serve cached license notices while offline', () => {
  assert.match(sw, /md\|txt/);
  assert.match(sw, /endsWith\('\/LICENSE'\)/);
  for (const file of ['./LICENSE', './THIRD_PARTY_NOTICES.md', './licenses/fonts/Inter-OFL.txt']) {
    assert.ok(sw.includes(file), `offline app shell missing ${file}`);
  }
});


test('GitHub quality workflow is present and covers CI plus real-browser smoke tests', () => {
  assert.match(workflow, /on:\s+[\s\S]*push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run security/);
  assert.match(workflow, /wrangler@4\.162\.0 deploy --dry-run/);
  assert.match(workflow, /playwright install --with-deps chromium firefox/);
  assert.match(workflow, /npm run test:browser/);
  assert.match(workflow, /permissions:\s+contents: read/);
});

test('repository ignores build output, local artifacts and environment secrets', () => {
  for (const entry of ['dist/', 'node_modules/', '.wrangler/', 'browser-artifacts/', '.env', '.env.*', '!.env.example']) {
    assert.ok(gitignore.split(/\r?\n/).includes(entry), `missing .gitignore entry: ${entry}`);
  }
});


test('search input does not steal focus on page load', () => {
  const inputIdIndex = html.indexOf('id="searchInput"');
  assert.notEqual(inputIdIndex, -1, 'search input markup should exist');
  const start = html.lastIndexOf('<input', inputIdIndex);
  const end = html.indexOf('>', inputIdIndex);
  assert.ok(start >= 0 && end > inputIdIndex, 'search input tag should be complete');
  assert.equal(/\bautofocus\b/i.test(html.slice(start, end + 1)), false);
});
