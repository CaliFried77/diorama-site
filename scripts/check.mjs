import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const directories = ['js', 'config', 'server', 'cloudflare'];
const sourceFiles = [];

for (const directory of directories) {
  const fullDirectory = resolve(root, directory);
  const entries = (await readdir(fullDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(?:js|mjs)$/.test(entry.name))
    .map((entry) => resolve(fullDirectory, entry.name))
    .sort();
  sourceFiles.push(...entries);
}

const failures = [];
if (!html.includes('<script type="module" src="./js/main.js"></script>')) failures.push('HTML does not load the native module entrypoint.');
if (/defer src="\.\/js\//.test(html)) failures.push('Classic script tags remain.');

const graph = new Map();
for (const fullPath of sourceFiles) {
  const source = await readFile(fullPath, 'utf8');
  const imports = [];
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(fullPath), match[1]);
    imports.push(target);
    try { await access(target); }
    catch { failures.push(relative(root, fullPath) + ': missing import ' + match[1]); }
  }
  graph.set(fullPath, imports);

  const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
  if (syntax.status !== 0) failures.push(relative(root, fullPath) + ': ' + syntax.stderr.trim());
}

// Detect dependency cycles across browser, server and Cloudflare modules.
const visiting = new Set();
const visited = new Set();
function visit(node, stack = []) {
  if (visiting.has(node)) {
    failures.push('Circular module dependency: ' + [...stack, node].map((path) => path.split('/').at(-1)).join(' -> '));
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
console.log('Checks passed: ' + sourceFiles.length + ' browser, config, server and Cloudflare modules; imports resolve, no cycles, syntax valid.');
