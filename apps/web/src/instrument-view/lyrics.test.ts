import type { LyricSyllable, PlaybackTimeline } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { lyricLines, nextTickOf, sungAt, syllableAt } from './lyrics.ts';

const Q = 960;

function sing(beatId: number, text: string, lineStart = false, heading: string | null = null): LyricSyllable {
  return { beatId, text, continues: false, lineStart, heading };
}

/** Beats 1–4 one quarter each in a bar played twice (a repeat); track 1 plays along. */
const TIMELINE: PlaybackTimeline = {
  playbackId: 'test',
  extraChannels: new Int32Array(0),
  endTick: 8 * Q,
  bars: Int32Array.from([0, 4 * Q, 0, 0, 4, 4 * Q, 8 * Q, 0, 4, 4]),
  slices: Int32Array.from([
    ...[0, Q, 0, 2, Q, 2 * Q, 2, 1, 2 * Q, 3 * Q, 3, 1, 3 * Q, 4 * Q, 4, 1],
    ...[4 * Q, 5 * Q, 5, 1, 5 * Q, 6 * Q, 6, 1, 6 * Q, 7 * Q, 7, 1, 7 * Q, 8 * Q, 8, 1],
  ]),
  items: Int32Array.from([
    ...[1, 0, 0, 9, 1, 0, 2, 0, Q, 3, 0, 2 * Q, 4, 0, 3 * Q],
    ...[1, 0, 4 * Q, 2, 0, 5 * Q, 3, 0, 6 * Q, 4, 0, 7 * Q],
  ]),
};

const VERSE: LyricSyllable[] = [
  sing(1, 'One', true, 'Verse'),
  sing(2, 'two'),
  sing(3, 'three', true),
  sing(4, 'four'),
];

describe('the lyrics model (VIEW-010, VIEW-022)', () => {
  it('lays the verse out in its lines, with their headings', () => {
    expect(lyricLines(VERSE)).toEqual([
      { heading: 'Verse', syllables: [0, 1] },
      { heading: null, syllables: [2, 3] },
    ]);
    expect(lyricLines([])).toEqual([]);
  });

  it('knows when each syllable is sung, a repeat sung again', () => {
    const sung = sungAt(TIMELINE, 0, VERSE);
    expect(sung.map(entry => [entry.tick / Q, entry.syllable])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 0],
      [5, 1],
      [6, 2],
      [7, 3],
    ]);
    expect(syllableAt(sung, 0)).toBe(0);
    expect(syllableAt(sung, 2 * Q + 100)).toBe(2);
    expect(syllableAt(sung, 4 * Q)).toBe(0);
    expect(syllableAt([], 0)).toBeNull();
    // Clicking a syllable plays from where it is sung next.
    expect(nextTickOf(sung, 1, 2 * Q)).toBe(5 * Q);
    expect(nextTickOf(sung, 1, 6 * Q)).toBe(Q);
  });
});
