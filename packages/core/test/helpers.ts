import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');

export function readFixture(path: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES_DIR, path)));
}

/** Fixture paths (relative to fixtures/) below `dir` whose names match `pattern`. */
export function listFixtures(dir: string, pattern: RegExp): string[] {
  const root = join(FIXTURES_DIR, dir);
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (pattern.test(name)) found.push(relative(FIXTURES_DIR, path));
    }
  };
  walk(root);
  return found;
}

export function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, char => char.charCodeAt(0));
}

/** Guitar Pro 3–5 style header: length byte + 30 padded bytes. */
export function gpHeader(version: string): Uint8Array {
  const header = new Uint8Array(31);
  header[0] = version.length;
  header.set(ascii(version), 1);
  return header;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
