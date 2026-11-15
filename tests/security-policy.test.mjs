import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
const policy = await readFile(new URL('../docs/SECURITY.md', import.meta.url), 'utf8');
const worker = await readFile(new URL('../cloudflare/worker.mjs', import.meta.url), 'utf8');
const wrangler = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');

test('HTML has no inline event handlers or embedded executable scripts', () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.match(html, /<script type="module" src="\.\/js\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
});

test('static and Worker response policies restrict executable content', () => {
  assert.match(headers, /script-src 'self'/);
  assert.doesNotMatch(headers, /(?:^|;)\s*script-src\s+[^;]*unsafe-inline/);
  assert.match(headers, /object-src 'none'/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /frame-src 'none'/);
  assert.match(headers, /connect-src 'self'/);
  assert.doesNotMatch(headers, /rss2json\.com/i);
  assert.match(headers, /https:\/\/api\.open-meteo\.com/);
  assert.match(worker, /'Content-Security-Policy'/);
  assert.match(worker, /default-src 'none'/);
  assert.match(worker, /pathname === '\/api\/news'/);
  assert.match(worker, /pathname === '\/api\/custom-news'/);
  assert.match(wrangler, /run_worker_first = \["\/api\/\*"\]/);
  assert.match(policy, /Worker/);
  assert.match(policy, /Static response headers/);
});
