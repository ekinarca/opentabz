import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The UI imports `@opentabz/core/shared` and the export worker `@opentabz/core/print`; nothing
 * under either may pull in the engine (ADR-0004). Print code may use shared code and fflate.
 */
describe.each([
  ['shared', ['./']],
  ['print', ['./', '../shared/', 'fflate']],
])('%s entry point', (folder, allowed) => {
  const dir = join(import.meta.dirname, '..', 'src', folder);
  for (const file of readdirSync(dir)) {
    it(`${file} has no engine imports`, () => {
      const source = readFileSync(join(dir, file), 'utf8');
      const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map(match => match[1] ?? '');
      for (const specifier of imports) {
        expect(
          allowed.some(prefix => specifier.startsWith(prefix)),
          `${file} imports ${specifier}`,
        ).toBe(true);
      }
    });
  }
});
