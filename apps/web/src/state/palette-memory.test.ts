import { describe, expect, it } from 'vitest';
import { parseRecent, RECENT_COMMANDS, withRecent } from './palette-memory.ts';

describe('the command palette’s past commands', () => {
  it('keeps the latest first, once each, as many as fit', () => {
    expect(withRecent(['zoom-in', 'loop'], 'loop')).toEqual(['loop', 'zoom-in']);
    const many = Array.from({ length: RECENT_COMMANDS }, (_, index) => `command-${index}`);
    expect(withRecent(many, 'newest')).toEqual(['newest', ...many.slice(0, RECENT_COMMANDS - 1)]);
  });

  it('reads what was stored, and nothing from anything else', () => {
    expect(parseRecent(JSON.stringify(['loop', 'export']))).toEqual(['loop', 'export']);
    expect(parseRecent(JSON.stringify(['loop', 3, null]))).toEqual(['loop']);
    expect(parseRecent('{')).toEqual([]);
    expect(parseRecent(JSON.stringify({ loop: true }))).toEqual([]);
    expect(parseRecent(null)).toEqual([]);
  });
});
