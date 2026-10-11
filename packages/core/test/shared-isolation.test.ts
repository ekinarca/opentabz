import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The UI imports `@opentabz/core/shared`; nothing under it may pull in the engine (ADR-0004). */
describe('shared entry point', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'shared');
  for (const file of readdirSync(dir)) {
    it(`${file} has no engine imports`, () => {
      const source = readFileSync(join(dir, file), 'utf8');
      const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map(match => match[1] ?? '');
      for (const specifier of imports) {
        expect(specifier.startsWith('./'), `${file} imports ${specifier}`).toBe(true);
      }
    });
  }
});
