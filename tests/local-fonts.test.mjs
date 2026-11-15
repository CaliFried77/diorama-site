import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const html = await read('../index.html');
const main = await read('../js/main.js');
const css = await read('../css/base.css');
const headers = await read('../_headers');
const netlify = await read('../netlify.toml');
const build = await read('../build.mjs');
const packageJson = JSON.parse(await read('../package.json'));
const notices = await read('../THIRD_PARTY_NOTICES.md');
const mit = await read('../LICENSE');

const fontFiles = [
  'inter-light.woff2', 'inter-regular.woff2', 'inter-medium.woff2', 'inter-semibold.woff2',
  'jetbrains-mono-regular.woff2', 'jetbrains-mono-medium.woff2',
  'pixelify-sans-variable.woff2', 'silkscreen-regular.woff2', 'silkscreen-bold.woff2',
];

 test('release version and software license are explicit', () => {
  assert.equal(packageJson.version, '1.6.6');
  assert.match(mit, /^MIT License/);
  assert.match(mit, /Copyright \(c\) 2026 Living Pixel Diorama contributors/);
  assert.match(notices, /not\*\* replace the separate licenses/i);
});

test('all four font families are declared locally with the previously used weights', () => {
  for (const family of ["'Inter'", "'JetBrains Mono'", "'Pixelify Sans'", "'Silkscreen'"]) assert.ok(css.includes(`font-family: ${family}`));
  for (const weight of ['300', '400', '500', '600', '400 700', '700']) assert.ok(css.includes(`font-weight: ${weight};`));
  assert.match(css, /font-display:\s*swap/);
  assert.match(css, /\.\.\/fonts\/inter-regular\.woff2/);
  assert.match(css, /\.\.\/fonts\/pixelify-sans-variable\.woff2/);
});

test('the page preloads same-origin fonts and no Google Fonts runtime remains', () => {
  assert.match(html, /rel="preload" href="\.\/fonts\/inter-regular\.woff2" as="font"/);
  assert.match(html, /rel="preload" href="\.\/fonts\/pixelify-sans-variable\.woff2" as="font"/);
  assert.doesNotMatch(`${html}
${main}
${css}`, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.doesNotMatch(main, /loadOptionalFonts|document\.createElement\('link'\)/);
});

test('CSP allows only same-origin font and stylesheet resources', () => {
  for (const policy of [headers, netlify]) {
    assert.match(policy, /style-src 'self' 'unsafe-inline'/);
    assert.match(policy, /font-src 'self'/);
    assert.doesNotMatch(policy, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  }
});

test('build copies local fonts so the generated app shell can precache them', async () => {
  assert.match(build, /cp\(resolve\(root, 'fonts'\), resolve\(dist, 'fonts'\)/);
  for (const name of fontFiles) {
    const source = await readFile(new URL(`../fonts/${name}`, import.meta.url));
    const built = await readFile(new URL(`../dist/fonts/${name}`, import.meta.url));
    assert.deepEqual(built, source, `dist font differs: ${name}`);
    assert.equal(source.subarray(0, 4).toString('ascii'), 'wOF2', `not WOFF2: ${name}`);
    assert.ok((await stat(new URL(`../dist/fonts/${name}`, import.meta.url))).size > 1000);
  }
  const sw = await read('../dist/sw.js');
  for (const name of fontFiles) assert.ok(sw.includes(`./fonts/${name}`), `font absent from app shell: ${name}`);
});

test('each bundled family has a complete OFL 1.1 text and copyright header', async () => {
  const expected = [
    ['Inter-OFL.txt', 'Copyright 2020 The Inter Project Authors'],
    ['JetBrainsMono-OFL.txt', 'Copyright 2020 The JetBrains Mono Project Authors'],
    ['PixelifySans-OFL.txt', 'Copyright 2021 The Pixelify Sans Project Authors'],
    ['Silkscreen-OFL.txt', 'Copyright 2001 The Silkscreen Project Authors'],
  ];
  for (const [file, copyright] of expected) {
    const text = await read(`../licenses/fonts/${file}`);
    assert.ok(text.includes(copyright), `missing copyright: ${file}`);
    assert.match(text, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(text, /must be distributed entirely under this license/);
  }
});
