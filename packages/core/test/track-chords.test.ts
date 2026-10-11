import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { collectTrackChords } from '../src/playback/track-chords.ts';
import { TRACK_CHORD_STRIDE } from '../src/shared/chords.ts';
import { readFixture } from './helpers.ts';

describe('track chords for the chords panel (VIEW-007)', () => {
  const { score } = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex');

  it('lists each chord once, in the order it first comes, with its diagram', () => {
    const chords = collectTrackChords(score, 0);
    expect(chords.chords).toEqual([
      // From the highest string to the lowest: A7 is x02020 read backwards.
      { name: 'A7', firstFret: 1, strings: [0, 2, 0, 2, 0, -1], barres: [] },
      { name: 'D7', firstFret: 1, strings: [2, 1, 2, 0, -1, -1], barres: [] },
      { name: 'E7', firstFret: 1, strings: [0, 0, 1, 0, 2, 0], barres: [] },
    ]);
  });

  it('names the beats that carry a chord, in score order', () => {
    const { beats, chords } = collectTrackChords(score, 0);
    const names: string[] = [];
    for (let index = 0; index < beats.length; index += TRACK_CHORD_STRIDE) {
      names.push(chords[beats[index + 1] ?? -1]?.name ?? '?');
    }
    // The twelve-bar form: four of A7, two of D7, two of A7, E7, D7, A7 and E7, then the ending.
    expect(names).toEqual(['A7', 'D7', 'A7', 'E7', 'D7', 'A7', 'E7', 'A7']);
    expect(collectTrackChords(score, 3).chords).toEqual([]);
    expect(collectTrackChords(score, 9).beats).toHaveLength(0);
  });
});
