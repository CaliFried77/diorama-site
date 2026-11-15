import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('hero clock and date have larger desktop and mobile typography', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const css = await readFile(resolve(root, 'css/responsive.css'), 'utf8');
  assert.match(html, /id="heroClock" class="pixel-clock/);
  assert.match(html, /id="heroDate" class="hero-date pixel-text/);
  assert.match(css, /\.pixel-clock\s*\{[^}]*font-size:\s*clamp\(4\.25rem,\s*7vw,\s*5\.5rem\)/s);
  assert.match(css, /\.hero-date\s*\{[^}]*font-size:\s*clamp\(1\.05rem,\s*1\.55vw,\s*1\.25rem\)/s);
  assert.match(css, /@media\s*\(max-width:\s*639px\)[\s\S]*?\.pixel-clock\s*\{[^}]*font-size:\s*clamp\(3\.25rem,\s*15vw,\s*4\.4rem\)/);
});
