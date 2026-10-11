import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Generates fixtures/generated/ (performance scores, .gp demos, corrupt files) when missing. */
export default function globalSetup(): void {
  const root = join(import.meta.dirname, '..', '..', '..');
  if (existsSync(join(root, 'fixtures', 'generated', 'perf-20x500.gp'))) return;
  execFileSync(process.execPath, [join(root, 'packages', 'core', 'scripts', 'generate-fixtures.ts')], {
    cwd: root,
    stdio: 'inherit',
  });
}
