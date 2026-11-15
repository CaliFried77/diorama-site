import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, js, css, sw, weatherJs] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../js/04-focus-audio.js', import.meta.url), 'utf8'),
  readFile(new URL('../css/widgets.css', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/03-weather.js', import.meta.url), 'utf8'),
]);

test('focus widget has pixel timer, preset durations and a bounded custom duration input', () => {
  assert.match(html, /id="focusBigTime" class="focus-clock-digits"/);
  assert.match(html, /data-mins="10"/);
  assert.match(html, /data-mins="25"/);
  assert.match(html, /data-mins="45"/);
  assert.match(html, /data-mins="60"/);
  assert.match(html, /id="focusCustomMinutes"[^>]*min="1" max="180"/);
  assert.match(js, /FOCUS_STORAGE_KEY = 'diorama_focus_session_v1'/);
});

test('focus timer has a habitat-aware top-center HUD that is responsive', () => {
  assert.match(html, /id="focusStageOverlay"/);
  assert.match(html, /id="focusStageHabitat"/);
  assert.match(js, /captureCurrentHabitat/);
  assert.match(js, /closeFocusPopover\(\)/);
  assert.match(css, /\.focus-stage-overlay\s*\{[^}]*left:\s*50%/s);
  assert.match(css, /@media \(max-width: 639px\)/);
});

test('focus session restores from local storage and persists across page lifecycle events', () => {
  assert.match(js, /localStorage\.getItem\(FOCUS_STORAGE_KEY\)/);
  assert.match(js, /localStorage\.setItem\(FOCUS_STORAGE_KEY/);
  assert.match(js, /window\.addEventListener\('pagehide'/);
  assert.match(js, /document\.addEventListener\('visibilitychange'/);
  assert.match(sw, /CACHE_PREFIX = 'living-pixel-diorama-shell-'[\s\S]*?CACHE_NAME = `\$\{CACHE_PREFIX\}1\.6\.3`/);
  assert.match(sw, /'\.\/js\/focus-timer-state\.js'/);
  assert.match(sw, /\.\/css\/widgets\.css/);
});

test('fixed widget labels use pixel type while dynamic news content stays regular', () => {
  assert.match(html, /Önümüzdeki saatler<\/p>/);
  assert.match(html, /class="text-xs text-white\/60 mt-4 mb-1\.5 font-pixel"/);
  assert.match(html, /class="text-xs font-semibold text-white\/90 font-pixel">Kişisel Defter/);
  assert.match(css, /\.widget-static-label[\s\S]*?font-family:\s*'Pixelify Sans'/);
});

test('fixed weather and workspace labels use pixel type while search and user-entered focus text stay readable', () => {
  assert.match(html, /id="focusStatusSub"[^>]*font-pixel/);
  assert.match(html, /Sahnede dene<\/p>/);
  assert.match(weatherJs, /wx-stat-label text-\[11px\] text-white\/60/);
  assert.match(css, /\.wx-stat-label/);
  assert.match(html, /id="searchInput"[\s\S]*?class="[^"]*focus:outline-none tracking-wide"/);
  assert.doesNotMatch(html.match(/<span id="pinnedFocusText"[^>]*>/)?.[0] ?? '', /font-pixel/);
});
