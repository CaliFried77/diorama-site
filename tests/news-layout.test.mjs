import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/news.css', import.meta.url), 'utf8'),
]);

const lastRule = (source, selector) => {
  const start = source.lastIndexOf(selector);
  assert.notEqual(start, -1, `Missing final CSS rule: ${selector}`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
};

test('news panel shares Diorama glass, has a readable width and scrolls as one panel', () => {
  assert.match(html, /id="weatherPopover"[^>]*class="[^"]*editorial-modal/);
  assert.match(html, /id="newsPopover"[^>]*class="[^"]*editorial-modal/);
  const v163 = css.slice(css.indexOf('/* v1.6.3'));
  assert.match(v163, /#newsPopover\.news-popover\s*\{[^}]*width:\s*min\(420px,/s);
  assert.match(v163, /#newsPopover\.news-popover\s*\{[^}]*max-height:\s*min\(78vh,/s);
  assert.match(v163, /#newsPopover\.news-popover\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(v163, /\.news-list-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(v163, /\.news-list-container\s*\{[^}]*max-height:\s*none/s);
  assert.match(v163, /\.news-list-container\s*\{[^}]*overflow:\s*visible/s);
});

test('desktop categories are a single row and mobile category controls are all visible', () => {
  assert.match(html, /id="newsCategories" class="news-categories"/);
  const desktop = css.slice(css.indexOf('@media (min-width: 640px)'));
  assert.match(desktop, /#newsCategories\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap/s);
  const mobile = css.slice(css.indexOf('@media (max-width: 639px)', css.indexOf('@media (min-width: 640px)')));
  assert.match(mobile, /#newsCategories\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(mobile, /overflow:\s*visible/);
});

test('mobile news panel stays inset and within the viewport', () => {
  const mobile = css.slice(css.lastIndexOf('@media (max-width: 639px)'));
  assert.match(css, /#newsPopover\.news-popover\s*\{[^}]*position:\s*fixed\s*!important/s);
  assert.match(mobile, /right:\s*\.5rem\s*!important/);
  assert.match(mobile, /width:\s*min\(420px,/);
  assert.match(mobile, /max-height:\s*min\(78dvh,/);
});

test('headline titles remain regular reading typography instead of pixel font', () => {
  const titleRule = lastRule(css, '.news-card-title');
  assert.doesNotMatch(titleRule, /font-family:\s*['"]?Pixelify/);
});
