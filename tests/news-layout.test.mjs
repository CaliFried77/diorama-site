import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/news.css', import.meta.url), 'utf8'),
]);

test('news panel reuses Diorama glass panel and remains a contained popover', () => {
  assert.match(html, /id="weatherPopover"[^>]*class="[^"]*editorial-modal/);
  assert.match(html, /id="newsPopover"[^>]*class="[^"]*editorial-modal/);
  assert.match(css, /\.news-popover\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /width:\s*min\(390px,\s*calc\(100vw\s*-\s*32px\)\)/);
  assert.match(css, /max-height:\s*min\(72vh,\s*640px\)/);
});

test('news categories use a compact horizontal navigation and cards use a readable single column', () => {
  assert.match(html, /id="newsCategories" class="news-categories"/);
  assert.match(css, /\.news-categories,[\s\S]*?#newsCategories\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.news-list-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/s);
});

test('mobile news panel stays inset and below the header instead of becoming fullscreen', () => {
  assert.match(css, /#newsPopover\.news-popover\s*\{[\s\S]*?position:\s*fixed\s*!important;[\s\S]*?right:\s*\.55rem\s*!important;[\s\S]*?width:\s*min\(360px,/s);
  assert.match(css, /max-height:\s*min\(70dvh,/);
});
