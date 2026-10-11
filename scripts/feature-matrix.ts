/**
 * Validates docs/FEATURE_MATRIX.md and prints a progress summary.
 *
 * Rules: ids are unique and well-formed, columns hold allowed values, and every row marked
 * `done` names at least one test file that exists (plus fixtures that exist). Run in CI and by
 * `pnpm check`; exits non-zero on any violation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const matrixPath = join(root, 'docs', 'FEATURE_MATRIX.md');

const SOURCES = new Set(['GP', 'OT', 'GP+']);
const MILESTONES = new Set(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'S']);
const STATUSES = new Set(['planned', 'in progress', 'done']);
const ID_PATTERN = /^[A-Z]+-\d{3}$/;

interface Row {
  line: number;
  id: string;
  feature: string;
  source: string;
  milestone: string;
  fixtures: string[];
  tests: string[];
  status: string;
}

function splitList(cell: string): string[] {
  if (cell === '—' || cell === '') return [];
  return cell
    .split(',')
    .map(part => part.trim().replace(/^`|`$/g, ''))
    .filter(part => part.length > 0);
}

function parse(markdown: string): Row[] {
  const rows: Row[] = [];
  markdown.split('\n').forEach((text, index) => {
    if (!text.startsWith('| ')) return;
    const cells = text
      .slice(1, -1)
      .split(' | ')
      .map(cell => cell.trim());
    const [id, feature, source, milestone, fixtures, tests, status] = cells;
    if (id === undefined || !ID_PATTERN.test(id)) return;
    rows.push({
      line: index + 1,
      id,
      feature: feature ?? '',
      source: source ?? '',
      milestone: milestone ?? '',
      fixtures: splitList(fixtures ?? ''),
      tests: splitList(tests ?? ''),
      status: status ?? '',
    });
  });
  return rows;
}

function validate(rows: Row[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  for (const row of rows) {
    const where = `FEATURE_MATRIX.md:${row.line} ${row.id}`;
    const previous = seen.get(row.id);
    if (previous !== undefined) errors.push(`${where}: duplicate id (first defined on line ${previous})`);
    seen.set(row.id, row.line);
    if (!SOURCES.has(row.source)) errors.push(`${where}: unknown source "${row.source}"`);
    if (!MILESTONES.has(row.milestone)) errors.push(`${where}: unknown milestone "${row.milestone}"`);
    if (!STATUSES.has(row.status)) errors.push(`${where}: unknown status "${row.status}"`);
    if (row.feature.length === 0) errors.push(`${where}: empty feature description`);
    if (row.status === 'done') {
      if (row.tests.length === 0) errors.push(`${where}: marked done without a test`);
      for (const test of row.tests) {
        const file = test.split('#')[0] ?? test;
        if (!existsSync(join(root, file))) errors.push(`${where}: test file not found: ${file}`);
      }
      for (const fixture of row.fixtures) {
        if (!existsSync(join(root, 'fixtures', fixture)))
          errors.push(`${where}: fixture not found: ${fixture}`);
      }
    }
  }
  return errors;
}

function summarize(rows: Row[]): string {
  const byMilestone = new Map<string, { total: number; done: number }>();
  for (const row of rows) {
    const entry = byMilestone.get(row.milestone) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (row.status === 'done') entry.done += 1;
    byMilestone.set(row.milestone, entry);
  }
  const lines = [...byMilestone.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([milestone, { total, done }]) =>
        `  ${milestone.padEnd(3)} ${String(done).padStart(4)} / ${total} done`,
    );
  const done = rows.filter(row => row.status === 'done').length;
  return [`Feature matrix: ${rows.length} rows, ${done} done`, ...lines].join('\n');
}

const rows = parse(readFileSync(matrixPath, 'utf8'));
const errors = validate(rows);
console.log(summarize(rows));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
