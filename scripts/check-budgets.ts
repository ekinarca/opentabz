/**
 * Bundle budgets for the production build (ARCHITECTURE.md §9). Run after `pnpm build`:
 *
 * - initial JavaScript (the entry chunk and everything it imports statically) under 300 KB gzip;
 * - the main thread never loads alphaTab: its code lives in the worker bundles only (ADR-0004).
 *
 * Worker bundles, CSS and other assets are reported for information. Exits non-zero on a breach.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = join(import.meta.dirname, '..', 'apps', 'web', 'dist');
const INITIAL_JS_BUDGET = 300 * 1024;

interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
  readonly imports?: readonly string[];
  readonly css?: readonly string[];
}

const manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8')) as Record<
  string,
  ManifestChunk
>;

function gzipSize(file: string): number {
  return gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry === true);
const entry = entries.find(([key]) => key === 'index.html');
if (entry === undefined) throw new Error('No index.html entry in the Vite manifest.');

// The entry chunk and its static imports, transitively.
const initial = new Set<string>();
const visit = (key: string): void => {
  const chunk = manifest[key];
  if (chunk === undefined || initial.has(chunk.file)) return;
  initial.add(chunk.file);
  for (const imported of chunk.imports ?? []) visit(imported);
};
visit(entry[0]);

let failed = false;
const initialBytes = [...initial].reduce((sum, file) => sum + gzipSize(file), 0);
console.log(`Initial JavaScript: ${kb(initialBytes)} gzip (budget ${kb(INITIAL_JS_BUDGET)})`);
for (const file of initial) console.log(`  ${file.padEnd(40)} ${kb(gzipSize(file)).padStart(10)}`);
if (initialBytes > INITIAL_JS_BUDGET) {
  console.error('✗ Initial JavaScript is over budget.');
  failed = true;
}

// alphaTab's banner and a distinctive class name must not reach the main thread's code.
for (const file of initial) {
  const source = readFileSync(join(dist, file), 'utf8');
  if (source.includes('alphaTab v1.') || source.includes('class ScoreRenderer')) {
    console.error(`✗ ${file} contains alphaTab; the main thread must not load the engine (ADR-0004).`);
    failed = true;
  }
}

console.log('Other assets (gzip):');
const assets = join(dist, 'assets');
for (const name of readdirSync(assets).sort()) {
  const file = join('assets', name);
  if (initial.has(file) || name.endsWith('.map') || statSync(join(dist, file)).isDirectory()) continue;
  if (!/\.(js|css|sf2)$/.test(name)) continue;
  console.log(`  ${file.padEnd(40)} ${kb(gzipSize(file)).padStart(10)}`);
}

if (failed) process.exit(1);
console.log('✓ Bundle budgets met.');
