import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const utilities = await readFile(new URL('../css/utilities.css', import.meta.url), 'utf8');
const sw = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
const builtHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const baseCss = await readFile(new URL('../css/base.css', import.meta.url), 'utf8');
const newsModule = await readFile(new URL('../js/02-news.js', import.meta.url), 'utf8');
const weatherModule = await readFile(new URL('../js/03-weather.js', import.meta.url), 'utf8');
const calendarModule = await readFile(new URL('../js/11-calendar.js', import.meta.url), 'utf8');
const coreUiModule = await readFile(new URL('../js/01-core-ui.js', import.meta.url), 'utf8');
const dataManagerModule = await readFile(new URL('../js/06-data-manager.js', import.meta.url), 'utf8');
const sceneryModule = await readFile(new URL('../js/09-scenery.js', import.meta.url), 'utf8');
const initializerModule = await readFile(new URL('../js/habitat-initializer.js', import.meta.url), 'utf8');
const initializerModule = await readFile(new URL('../js/habitat-initializer.js', import.meta.url), 'utf8');
const backgroundsModule = await readFile(new URL('../js/habitat-backgrounds.js', import.meta.url), 'utf8');
const floraModule = await readFile(new URL('../js/habitat-flora-renderer.js', import.meta.url), 'utf8');
const creatureModule = await readFile(new URL('../js/08-creatures.js', import.meta.url), 'utf8');
const interactionModule = await readFile(new URL('../js/habitat-interactions.js', import.meta.url), 'utf8');
const habitatCatalog = await readFile(new URL('../config/habitat-catalog.js', import.meta.url), 'utf8');
const cssBuilder = await readFile(new URL('../scripts/build-css.mjs', import.meta.url), 'utf8');
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
  assert.ok(baseCss.includes('font-size: clamp(17.333px, calc(16px + .13vw), 18px);'));
  assert.ok(utilities.includes('.text-xs{font-size:.75rem;line-height:1rem}'));
  assert.ok(utilities.includes('.text-sm{font-size:.875rem;line-height:1.25rem}'));
  assert.ok(cssBuilder.includes("base: ['1rem', '1.5rem']"));
  assert.ok(utilities.includes('.text-\\[10px\\]{font-size:13px}'));
  assert.ok(cssBuilder.includes('Math.max(13, Math.round(Number(match[1]) * 1.125))'));
});

test('text-bearing panels and buttons grow with the typography scale', () => {
  assert.ok(newsCss.includes('width: min(420px'));
  assert.ok(newsCss.includes('.news-cat-btn {'));
  assert.ok(newsCss.includes('min-height: 40px;'));
  assert.ok(newsCss.includes('width: 32px; height: 32px;'));
  assert.ok(widgetsCss.includes('width: min(380px'));
  assert.ok(widgetsCss.includes('min-height: 44px;'));
  assert.ok(responsiveCss.includes('min-height: 36px;'));
});

test('hand-authored component styles avoid tiny fixed-pixel labels', () => {
  const forbiddenSizes = ['font-size: 7px', 'font-size: 8px', 'font-size: 9px', 'font-size: 10px', 'font-size: 11px', 'font: 7px', 'font: 8px', 'font: 9px', 'font: 10px', 'font: 11px'];
  for (const [name, css] of [['news.css', newsCss], ['widgets.css', widgetsCss], ['responsive.css', responsiveCss]]) {
    assert.ok(forbiddenSizes.every((token) => !css.includes(token)), `${name} contains tiny fixed-pixel text`);
  }
});

test('news cards start collapsed and reveal the publisher link after expansion', () => {
  assert.ok(newsModule.includes('const expandedNewsIds = new Set();'));
  assert.ok(newsModule.includes('if (isExpanded) {'));
  assert.ok(newsModule.includes("openSource.textContent = 'Haberi kaynağında aç ↗';"));
  assert.ok(newsCss.includes('-webkit-line-clamp: 2;'));
});

test('weather panel includes CAMS air quality and an artistic solar display', () => {
  assert.ok(weatherModule.includes('air-quality-api.open-meteo.com'));
  assert.ok(weatherModule.includes("current: 'european_aqi,pm2_5,pm10'"));
  assert.ok(weatherModule.includes("getElementById('wxAstral')"));
  assert.ok(widgetsCss.includes('width: min(520px'));
  assert.ok(widgetsCss.includes('aspect-ratio: 1 / 1;'));
  assert.ok(widgetsCss.includes('height: 94px;'));
});

test('calendar is available in the header, opens as a popover and is included in backups', () => {
  assert.ok(main.includes("import './11-calendar.js';"));
  assert.ok(html.includes('id="calendarBtn"'));
  assert.ok(html.includes('id="calendarPopover"'));
  assert.ok(coreUiModule.includes("getElementById('calendarBtn')"));
  assert.ok(calendarModule.includes("'diorama_calendar_events_v1'"));
  assert.ok(calendarModule.includes('function normalizeEvents'));
  assert.ok(dataManagerModule.includes("'diorama_calendar_events_v1'"));
});

test('focus, notebook and habitat controls remain balanced after typography scaling', () => {
  assert.ok(widgetsCss.includes('font-size: 0.8125rem;'));
  assert.ok(widgetsCss.includes('grid-template-columns: 36px minmax(0,1fr) 52px;'));
  assert.ok(widgetsCss.includes('.notes-task-form > * { min-width: 0;'));
  assert.ok(responsiveCss.includes('max-width: min(360px, 34vw)'));
});

test('zen mode hides the complete toolbar and focus HUD, then reveals them at the top edge', () => {
  assert.ok(html.includes('main-header zen-fade zen-hide'));
  assert.ok(html.includes('focus-stage-overlay zen-fade zen-hide'));
  assert.ok(coreUiModule.includes("document.body.classList.add('zen-revealed')"));
  assert.ok(coreUiModule.includes('e.clientY <= 76'));
  assert.ok(coreUiModule.includes("document.body.classList.remove('zen-revealed')"));
  assert.ok(baseCss.includes('body.zen-active.zen-revealed .zen-hide'));
  assert.ok(baseCss.includes('visibility: hidden;'));
});

test('lunar phases render as original crisp pixel art without a decorative frame', () => {
  assert.ok(weatherModule.includes('function pixelMoonMarkup(phase)'));
  assert.ok(weatherModule.includes('shape-rendering="crispEdges"'));
  assert.ok(weatherModule.includes('wx-pixel-moon'));
  assert.ok(!weatherModule.includes('moonGlyphs'));
  const moonArtStyles = widgetsCss.split('.wx-moon-art {')[1]?.split('}')[0] || '';
  assert.ok(moonArtStyles.includes('border: 0;'));
  assert.ok(moonArtStyles.includes('background: transparent;'));
  assert.ok(moonArtStyles.includes('box-shadow: none;'));
});

test('rainforest scenery suppresses generic cloud slabs but keeps foreground weather effects', () => {
  assert.ok(weatherModule.includes('drawWxSky(time, skyOk, suppressClouds = false)'));
  assert.ok(weatherModule.includes('if (!suppressClouds) WX.clouds.forEach'));
  assert.ok(sceneryModule.includes("drawWxSky(time, hab.weatherSky === true, hab.sceneProfile === 'rainforest')"));
  assert.ok(weatherModule.includes('if (sky && WX.rain > 0)'));
});

test('rainforest habitat connects its layered canopy, flora, parrot flock and edible fruit interaction', () => {
  assert.ok(habitatCatalog.includes("id: 'rainforest'"));
  assert.ok(habitatCatalog.includes("sceneProfile: 'rainforest'"));
  assert.ok(habitatCatalog.includes("creatureProfile: 'parrot'"));
  assert.ok(habitatCatalog.includes("interactionProfile: 'fruit'"));
  assert.ok(initializerModule.includes('new PixelParrot()'));
  assert.ok(sceneryModule.includes("hab.sceneProfile === 'rainforest'"));
  assert.ok(backgroundsModule.includes('const midgroundTrees = ['));
  assert.ok(backgroundsModule.includes('const edgeGiants = ['));
  assert.ok(backgroundsModule.includes('const canopyDomes = ['));
  assert.ok(backgroundsModule.includes('rootFlare = prog > 0.78'));
  assert.ok(floraModule.includes("f.type === 'canopy_vine'"));
  assert.ok(floraModule.includes("f.type === 'jungle_fern'"));
  assert.ok(floraModule.includes("f.type === 'heliconia'"));
  assert.ok(floraModule.includes("f.type === 'epiphyte'"));
  assert.ok(floraModule.includes("f.type === 'orchid'"));
  assert.ok(interactionModule.includes("s.type === 'tropical_fruit'"));
  assert.ok(interactionModule.includes('export function drawHabitatStimuli()'));
  assert.ok(sceneryModule.includes('drawHabitatStimuli()'));
  assert.ok(creatureModule.includes('export class PixelParrot'));
  assert.ok(creatureModule.includes('this.palette'));
  assert.ok(creatureModule.includes('const tailLen = 19'));
  assert.ok(creatureModule.includes('p.beakUpper'));
});

test('existing habitat improvements preserve bespoke scene layers', () => {
  assert.ok(backgroundsModule.includes('const drawOrchardTree ='));
  assert.ok(backgroundsModule.includes('const leftTree1X = 24'));
  assert.ok(initializerModule.includes('const willowZones = ['));
  assert.ok(initializerModule.includes("type: 'willow_frond'"));
  assert.ok(initializerModule.includes("type: 'pebble'"));
  assert.ok(initializerModule.includes("type: 'staghorn_coral'"));
  assert.ok(initializerModule.includes("type: 'sea_fan'"));
  assert.ok(sceneryModule.includes("hab.sceneProfile === 'reef'"));
  assert.ok(sceneryModule.includes("hab.sceneProfile === 'wetland'"));
});
test('service worker precaches local shell assets and leaves external live services to the network', () => {
  assert.match(main, /serviceWorker\.register/);
  assert.match(sw, /\!url\.origin === self\.location\.origin|url\.origin !== self\.location\.origin/);
  for (const asset of ['./index.html', './css/utilities.css', './css/widgets.css', './js/main.js', './js/11-calendar.js', './js/focus-timer-state.js', './js/10-glass-renderer.js', './manifest.webmanifest', './icons/diorama-192.png']) {
    assert.ok(sw.includes(asset), `Offline shell missing ${asset}`);
  }
});


test('production HTML preloads every native module and exposes app metadata', () => {
  for (const module of ['01-core-ui.js', '02-news.js', '03-weather.js', '04-focus-audio.js', '07-habitat-state.js', '11-calendar.js', 'scene-math.js', 'main.js']) {
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


test('GitHub quality workflow is present and covers CI plus Chromium smoke tests', () => {
  assert.match(workflow, /on:\s+[\s\S]*push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run security/);
  assert.match(workflow, /wrangler@4\.162\.0 deploy --dry-run/);
  assert.match(workflow, /playwright install --with-deps chromium/);
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
