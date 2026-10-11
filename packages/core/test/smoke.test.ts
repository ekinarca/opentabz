import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { WARMUP_SCORE } from '../src/engine/warmup.ts';

describe('warm-up score', () => {
  it('parses as alphaTex', () => {
    const opened = openScore(new TextEncoder().encode(WARMUP_SCORE), 'warmup.atex');
    expect(opened.format).toBe('alphatex');
    expect(opened.score.title).toBe('Warm-up');
    expect(opened.score.masterBars.length).toBe(2);
    expect(opened.score.tracks[0]?.staves[0]?.tuning).toEqual([64, 59, 55, 50, 45, 40]);
  });
});
