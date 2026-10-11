/**
 * Netlify's `_headers` file format, so `vite preview` (and the end-to-end tests that run against
 * it) serves exactly the headers production does: CSP, cross-origin isolation, caching.
 *
 * Format: a line without leading whitespace is a path pattern (`*` matches anything); the
 * indented `Name: value` lines below it are the headers for matching paths. `#` starts a comment.
 */

export interface HeaderRule {
  readonly pattern: RegExp;
  readonly headers: readonly (readonly [string, string])[];
}

export function parseHeadersFile(source: string): HeaderRule[] {
  const rules: { pattern: RegExp; headers: [string, string][] }[] = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim().length === 0 || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const escaped = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      rules.push({ pattern: new RegExp(`^${escaped}$`), headers: [] });
      continue;
    }
    const current = rules.at(-1);
    const colon = line.indexOf(':');
    if (current === undefined || colon < 0) {
      throw new Error(`_headers line ${index + 1}: expected "Name: value" under a path.`);
    }
    current.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

/** Headers for `path`; later rules override earlier ones with the same name. */
export function headersFor(rules: readonly HeaderRule[], path: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const rule of rules) {
    if (!rule.pattern.test(path)) continue;
    for (const [name, value] of rule.headers) result.set(name, value);
  }
  return result;
}
