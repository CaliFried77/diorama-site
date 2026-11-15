import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const news = await readFile(new URL('../js/02-news.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/news.css', import.meta.url), 'utf8');

const rendererStart = news.indexOf('function renderNewsCards(');
const rendererEnd = news.indexOf('\nfunction updateSourceSummary', rendererStart);
const renderer = news.slice(rendererStart, rendererEnd);

test('news cards start compact and expand only when the preview button is pressed', () => {
  assert.ok(rendererStart >= 0 && rendererEnd > rendererStart);
  assert.match(news, /const expandedNewsIds = new Set\(\)/);
  assert.match(renderer, /news-card-expand/);
  assert.match(renderer, /aria-expanded/);
  assert.match(renderer, /news-card-details/);
  assert.match(renderer, /expandedNewsIds\.add\(itemId\)/);
  assert.match(renderer, /description\.textContent = item\.description/);
});

test('publisher navigation is a separate safe link revealed only in expanded details', () => {
  const detailsStart = renderer.indexOf('if (isExpanded)');
  const detailsEnd = renderer.indexOf('expandButton.addEventListener', detailsStart);
  const details = renderer.slice(detailsStart, detailsEnd);
  assert.match(details, /createElement\('a'\)/);
  assert.match(details, /news-open-source/);
  assert.match(details, /target = '_blank'/);
  assert.match(details, /rel = 'noopener noreferrer'/);
  assert.match(details, /referrerPolicy = 'no-referrer'/);
  assert.match(details, /openSource\.href = sourceUrl/);
  assert.doesNotMatch(renderer, /const mainLink/);
});

test('news cards use a two-line compact title and an explicit source action', () => {
  assert.match(css, /-webkit-line-clamp: 2/);
  assert.match(css, /\.news-card-details/);
  assert.match(css, /\.news-open-source/);
  assert.match(css, /min-height: 38px/);
  assert.match(css, /grid-template-columns: minmax\(0,1fr\) 40px/);
});
