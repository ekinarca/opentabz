/**
 * Proof that the six triplet feels swing written straight notes in playback (FEATURE_MATRIX
 * PLAY-083…PLAY-088): onsets and lengths in the MIDI, and the beat positions the cursor follows.
 */
import { describe, expect, it } from 'vitest';
import {
  notesBetween,
  playedBars,
  playFixture,
  playTex,
  QUARTER,
  soundingNotes,
  timelineBeatStarts,
  type Played,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;
const EIGHTH = QUARTER / 2;
const SIXTEENTH = QUARTER / 4;

/** Onsets (relative to the bar) of a bar of straight notes `unit` long, with each pair swung. */
function swung(unit: number, firstOfPair: number): number[] {
  const onsets: number[] = [];
  for (let pair = 0; pair < BAR / (2 * unit); pair++)
    onsets.push(pair * 2 * unit, pair * 2 * unit + firstOfPair);
  return onsets;
}

/** Lengths of the notes of that bar: the first of each pair `firstOfPair`, the second the rest. */
function swungLengths(unit: number, firstOfPair: number): number[] {
  return Array.from({ length: BAR / unit }, (_, index) =>
    index % 2 === 0 ? firstOfPair : 2 * unit - firstOfPair,
  );
}

/** Onsets and lengths of the notes in one bar of the fixture, relative to the bar start. */
function barNotes(played: Played, barIndex: number): { onsets: number[]; lengths: number[] } {
  const bar = playedBars(played.playback.timeline)[barIndex];
  if (bar === undefined) throw new Error(`The fixture has no bar ${barIndex}.`);
  const notes = notesBetween(soundingNotes(played.events), bar.start, bar.end);
  return {
    onsets: notes.map(note => note.start - bar.start),
    lengths: notes.map(note => note.end - note.start),
  };
}

/** Beat starts on the timeline (the cursor) inside one bar, relative to the bar start. */
function cursorOnsets(played: Played, barIndex: number): number[] {
  const bar = playedBars(played.playback.timeline)[barIndex];
  if (bar === undefined) throw new Error(`The fixture has no bar ${barIndex}.`);
  return timelineBeatStarts(played.playback.timeline, 0)
    .filter(tick => tick >= bar.start && tick < bar.end)
    .map(tick => tick - bar.start);
}

describe('PLAY-083…PLAY-088 triplet feels', () => {
  const played = playFixture('alphatex/playback/triplet-feels.atex');

  it('plays the reference bar straight', () => {
    expect(barNotes(played, 0)).toEqual({
      onsets: swung(EIGHTH, EIGHTH),
      lengths: swungLengths(EIGHTH, EIGHTH),
    });
  });

  it.each([
    // [matrix id, feel, bar, note value, length of the first note of each pair]
    ['PLAY-083', '8th triplet feel: two thirds and one third of a quarter', 1, EIGHTH, (2 * QUARTER) / 3],
    ['PLAY-084', '16th triplet feel: two thirds and one third of an eighth', 2, SIXTEENTH, (2 * EIGHTH) / 3],
    ['PLAY-085', 'dotted 8th feel: a dotted eighth and a sixteenth', 3, EIGHTH, (3 * QUARTER) / 4],
    ['PLAY-086', 'dotted 16th feel: a dotted sixteenth and a thirty-second', 4, SIXTEENTH, (3 * EIGHTH) / 4],
    ['PLAY-087', 'Scottish 8th feel: a sixteenth and a dotted eighth', 5, EIGHTH, QUARTER / 4],
    ['PLAY-088', 'Scottish 16th feel: a thirty-second and a dotted sixteenth', 6, SIXTEENTH, EIGHTH / 4],
  ] as const)('%s plays each pair of straight notes in the %s', (_id, _feel, bar, unit, firstOfPair) => {
    const expected = swung(unit, firstOfPair);
    expect(barNotes(played, bar)).toEqual({ onsets: expected, lengths: swungLengths(unit, firstOfPair) });
    // The cursor moves with the swing, too.
    expect(cursorOnsets(played, bar)).toEqual(expected);
  });

  it('PLAY-083 swings only pairs of eighths: quarter notes keep their place', () => {
    const mixed = playTex(
      [
        '\\title "Shuffle"',
        '\\track "Alto Saxophone" {instrument altoSax}',
        '\\staff {score}',
        '\\tf triplet8th :4 F4 :8 G4 A4 :4 C5 D5 |',
        '\\tf none F4.1',
      ].join('\n'),
    );
    expect(barNotes(mixed, 0)).toEqual({
      onsets: [0, QUARTER, QUARTER + (2 * QUARTER) / 3, 2 * QUARTER, 3 * QUARTER],
      lengths: [QUARTER, (2 * QUARTER) / 3, QUARTER / 3, QUARTER, QUARTER],
    });
    // After the feel is switched off, the bar plays as written.
    expect(barNotes(played, 7)).toEqual({ onsets: [0], lengths: [BAR] });
  });
});
