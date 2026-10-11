/**
 * Writes fixtures/generated/ (see fixtures.ts). Run with `pnpm fixtures`; the end-to-end tests
 * run it on their own when the files are missing.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generateFixtures } from './fixtures.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const demoDir = join(root, 'fixtures', 'alphatex', 'demos');
const outDir = join(root, 'fixtures', 'generated');

const demos = new Map(
  readdirSync(demoDir)
    .filter(name => name.endsWith('.atex'))
    .sort()
    .map(name => [name, readFileSync(join(demoDir, name), 'utf8')] as const),
);

const started = performance.now();
const files = generateFixtures(demos);
rmSync(outDir, { recursive: true, force: true });
for (const file of files) {
  const path = join(outDir, file.path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, file.bytes);
}
const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
for (const file of files) console.log(`  ${file.path.padEnd(32)} ${kib(file.bytes.length).padStart(11)}`);
console.log(
  `Generated ${files.length} fixtures in ${Math.round(performance.now() - started)} ms → fixtures/generated/`,
);
