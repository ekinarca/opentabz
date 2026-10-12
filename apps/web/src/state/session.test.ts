import { describe, expect, it } from 'vitest';
import { parseSession, sessionOf } from './session.ts';

describe('the scores open last time (UX-028)', () => {
  it('keeps the open scores in order, and the one in front', () => {
    const docs = [
      { key: 'a', fingerprint: 'f1' },
      { key: 'b', fingerprint: null },
      { key: 'c', fingerprint: 'f3' },
    ];
    // A score whose contents are not known yet is left out.
    expect(sessionOf(docs, 'c')).toEqual({ fingerprints: ['f1', 'f3'], active: 1 });
    expect(sessionOf(docs, 'b')).toEqual({ fingerprints: ['f1', 'f3'], active: -1 });
    expect(sessionOf([], null)).toEqual({ fingerprints: [], active: -1 });
  });

  it('reads back what was kept, and nothing from anything else', () => {
    expect(parseSession(JSON.stringify({ fingerprints: ['f1', 'f2'], active: 1 }))).toEqual({
      fingerprints: ['f1', 'f2'],
      active: 1,
    });
    expect(parseSession(JSON.stringify({ fingerprints: ['f1'], active: 4 }))?.active).toBe(-1);
    expect(parseSession(JSON.stringify({ fingerprints: [1], active: 0 }))).toBeNull();
    expect(parseSession(JSON.stringify({ fingerprints: ['f1'], active: 0.5 }))).toBeNull();
    expect(parseSession('[')).toBeNull();
    expect(parseSession(null)).toBeNull();
  });
});
