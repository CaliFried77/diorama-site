import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
const policy = await readFile(new URL('../docs/SECURITY.md', import.meta.url), 'utf8');
const netlify = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');

test('HTML has no inline event handlers or embedded executable scripts', () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.match(html, /<script type="module" src="\.\/js\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
});

test('deployment headers restrict scripts and external connections', () => {
  assert.match(headers, /script-src 'self'/);
  assert.doesNotMatch(headers, /(?:^|;)\s*script-src\s+[^;]*unsafe-inline/);
  assert.match(headers, /object-src 'none'/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /frame-src 'none'/);
  assert.match(netlify, /frame-src 'none'/);
  assert.match(netlify, /X-Content-Type-Options = \"nosniff\"/);
  assert.match(headers, /connect-src 'self'/);
  assert.doesNotMatch(headers, /rss2json\.com/i);
  assert.match(headers, /https:\/\/api\.open-meteo\.com/);
  assert.match(policy, /HTTP yanıt başlığı/);
});
