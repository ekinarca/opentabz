import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { headersFor, parseHeadersFile } from './netlify-headers.ts';

describe('_headers parsing', () => {
  it('reads path rules and their headers, skipping comments', () => {
    const rules = parseHeadersFile(
      '# comment\n/*\n  X-A: 1\n  X-B: two: parts\n\n/assets/*\n  Cache-Control: immutable\n',
    );
    expect(rules).toHaveLength(2);
    expect([...headersFor(rules, '/index.html')]).toEqual([
      ['X-A', '1'],
      ['X-B', 'two: parts'],
    ]);
    expect(headersFor(rules, '/assets/app.js').get('Cache-Control')).toBe('immutable');
    expect(headersFor(rules, '/index.html').has('Cache-Control')).toBe(false);
  });

  it('rejects headers outside a path rule', () => {
    expect(() => parseHeadersFile('  X-A: 1')).toThrow(/line 1/);
  });

  it('gives every production path the security and isolation headers', () => {
    const rules = parseHeadersFile(
      readFileSync(join(import.meta.dirname, '..', 'public', '_headers'), 'utf8'),
    );
    for (const path of ['/', '/index.html', '/assets/index-abc.js', '/deep/link']) {
      const headers = headersFor(rules, path);
      expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
      expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    }
    expect(headersFor(rules, '/assets/index-abc.js').get('Cache-Control')).toContain('immutable');
  });
});
