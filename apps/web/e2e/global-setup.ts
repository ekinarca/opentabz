import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Files every run needs, the last ones added to the generator among them. */
const NEEDED = ['perf-20x500.gp', 'views/tempo-ramps.gp'];

/** Generates fixtures/generated/ (performance scores, .gp demos, corrupt files) when missing. */
export default function globalSetup(): void {
  const root = join(import.meta.dirname, '..', '..', '..');
  if (NEEDED.every(path => existsSync(join(root, 'fixtures', 'generated', path)))) return;
  execFileSync(process.execPath, [join(root, 'packages', 'core', 'scripts', 'generate-fixtures.ts')], {
    cwd: root,
    stdio: 'inherit',
  });
}
