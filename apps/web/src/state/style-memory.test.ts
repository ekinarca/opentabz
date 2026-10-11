import { DEFAULT_SCORE_STYLE } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { parseStyle, parseStyleMemory, recallStyle, rememberStyle } from './style-memory.ts';

const HASH = 'a'.repeat(64);

describe('styles remembered per song', () => {
  it('reads a stored style back, and nothing that is broken or out of range', () => {
    const style = { ...DEFAULT_SCORE_STYLE, scale: 1.5, brackets: 'none', singleTrackNames: 'all' };
    expect(parseStyle(JSON.parse(JSON.stringify(style)))).toEqual(style);
    expect(parseStyle({ ...style, scale: 7 })).toBeNull();
    expect(parseStyle({ ...style, brackets: 'curly' })).toBeNull();
    expect(parseStyle({ ...style, tuning: 'yes' })).toBeNull();
    expect(parseStyle(null)).toBeNull();
    const memory = parseStyleMemory(
      JSON.stringify({ [HASH]: style, short: style, ['b'.repeat(64)]: { scale: 1 } }),
    );
    expect([...memory.keys()]).toEqual([HASH]);
    expect(parseStyleMemory('{oops').size).toBe(0);
  });

  it('keeps a song’s style for the next time it is opened', () => {
    const style = { ...DEFAULT_SCORE_STYLE, systemSeparator: true };
    rememberStyle(HASH, style);
    expect(recallStyle(HASH)).toEqual(style);
    expect(recallStyle('c'.repeat(64))).toBeNull();
  });
});
