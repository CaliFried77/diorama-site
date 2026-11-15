import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = resolve(root, 'js');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const files = (await readdir(jsDir)).filter((file) => file.endsWith('.js'));
const configDir = resolve(root, 'config');
const configFiles = (await readdir(configDir)).filter((file) => file.endsWith('.js')).map((file) => `../config/${file}`);
const functionDir = resolve(root, 'netlify/functions');
const netlifyLibDir = resolve(root, 'netlify/lib');
const functionFiles = (await readdir(functionDir)).filter((file) => file.endsWith('.mjs')).map((file) => `../netlify/functions/${file}`);
const netlifyLibFiles = (await readdir(netlifyLibDir)).filter((file) => file.endsWith('.mjs')).map((file) => `../netlify/lib/${file}`);
const sourceFiles = [...files.map((file) => `./${file}`), ...configFiles, ...functionFiles, ...netlifyLibFiles];
const failures = [];

if (!html.includes('<script type="module" src="./js/main.js"></script>')) failures.push('HTML does not load the native module entrypoint.');
if (/defer src="\.\/js\//.test(html)) failures.push('Classic script tags remain.');

const graph = new Map();
for (const relativeFile of sourceFiles) {
  const full = resolve(jsDir, relativeFile);
  const file = relativeFile.replace(/^\.\//, '').replace(/^\.\.\/config\//, 'config/');
  const source = await readFile(full, 'utf8');
  const imports = [];
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(full), match[1]);
    imports.push(target);
    try { await access(target); } catch { failures.push(`${file}: missing import ${match[1]}`); }
  }
  graph.set(full, imports);
  const syntax = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
  if (syntax.status !== 0) failures.push(`${file}: ${syntax.stderr.trim()}`);
}

// Detect dependency cycles. The app uses services/state modules to keep feature dependencies one-way.
const visiting = new Set();
const visited = new Set();
function visit(node, stack = []) {
  if (visiting.has(node)) {
    failures.push(`Circular module dependency: ${[...stack, node].map((p) => p.split('/').at(-1)).join(' -> ')}`);
    return;
  }
  if (visited.has(node)) return;
  visiting.add(node);
  for (const next of graph.get(node) ?? []) if (graph.has(next)) visit(next, [...stack, node]);
  visiting.delete(node);
  visited.add(node);
}
for (const node of graph.keys()) visit(node);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Checks passed: ${sourceFiles.length} JavaScript modules/functions, all local imports resolve, no dependency cycles, syntax is valid.`);
