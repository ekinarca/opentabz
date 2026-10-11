/**
 * Proof that brush strokes, arpeggios and rasgueado patterns are played as strums with the
 * written duration and spread (FEATURE_MATRIX PLAY-091, PLAY-092).
 */
import { describe, expect, it } from 'vitest';
import {
  notesBetween,
  playFixture,
  playTex,
  QUARTER,
  soundingNotes,
  type SoundingNote,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;

function guitar(...bars: string[]): SoundingNote[] {
  const played = playTex(
    [
      '\\title "Strums"',
      '\\tempo 120',
      '\\track "Guitar" {instrument acousticGuitarSteel}',
      '\\staff {score tabs}',
      '\\tuning (E4 B3 G3 D3 A2 E2)',
      bars.join(' |\n'),
    ].join('\n'),
  );
  return soundingNotes(played.events);
}

/** [key, onset relative to the beat] of the notes struck in a beat, in the order they sound. */
function strum(notes: readonly SoundingNote[], beatStart: number, beatLength: number): number[][] {
  return notesBetween(notes, beatStart, beatStart + beatLength)
    .sort((a, b) => a.start - b.start)
    .map(note => [note.key, note.start - beatStart]);
}

describe('PLAY-091 brush strokes and arpeggios', () => {
  // C major over an open low E: E2 C3 E3 G3 C4 E4 from the lowest string up.
  const sixStrings = '(0.1 1.2 0.3 2.4 3.5 0.6)';
  const fiveStrings = '(0.1 1.2 0.3 2.4 3.5)';
  const threeStrings = '(0.1 1.2 0.3)';

  it('PLAY-091 strums down from the lowest string and up from the highest, spreading the notes evenly', () => {
    const notes = guitar(
      `:4 ${sixStrings}{bd 200} ${fiveStrings}{bu 120} ${threeStrings}{bd 120} ${threeStrings}{bu 60}`,
    );
    expect(strum(notes, 0, QUARTER)).toEqual([
      [40, 0],
      [48, 40],
      [52, 80],
      [55, 120],
      [60, 160],
      [64, 200],
    ]);
    expect(strum(notes, QUARTER, QUARTER)).toEqual([
      [64, 0],
      [60, 30],
      [55, 60],
      [52, 90],
      [48, 120],
    ]);
    expect(strum(notes, 2 * QUARTER, QUARTER)).toEqual([
      [55, 0],
      [60, 60],
      [64, 120],
    ]);
    expect(strum(notes, 3 * QUARTER, QUARTER)).toEqual([
      [64, 0],
      [60, 30],
      [55, 60],
    ]);
    // Every string of a strum stops together at the end of the beat.
    for (let beat = 0; beat < 4; beat++) {
      const ends = notesBetween(notes, beat * QUARTER, (beat + 1) * QUARTER).map(note => note.end);
      expect(new Set(ends)).toEqual(new Set([(beat + 1) * QUARTER]));
    }
  });

  it('PLAY-091 rolls an arpeggio over its length, string by string, the two directions mirroring each other', () => {
    const notes = guitar(`:2 ${fiveStrings}{ad} ${fiveStrings}{au 240}`);
    const half = 2 * QUARTER;
    const down = strum(notes, 0, half);
    const up = strum(notes, half, half);
    // Without a written length, alphaTex gives the roll the note's length divided by its strings.
    expect(down.map(([, onset]) => onset)).toEqual([0, 96, 192, 288, 384]);
    // A roll written as 240 ticks long: one string every 60 ticks.
    expect(up.map(([, onset]) => onset)).toEqual([0, 60, 120, 180, 240]);
    // One roll goes string by string from one side of the chord, the other from the opposite side.
    const downKeys = down.map(([key]) => key);
    const upKeys = up.map(([key]) => key);
    expect(downKeys).toEqual([...upKeys].reverse());
    const ascending = [48, 52, 55, 60, 64];
    expect([ascending, [...ascending].reverse()]).toContainEqual(downKeys);
  });
});

/** Stroke starts (relative to the beat) of a rasgueado and how often each chord note is struck. */
function rasgueado(
  notes: readonly SoundingNote[],
  beatStart: number,
): { strikes: number[]; starts: number[] } {
  const onsets = new Map<number, number[]>();
  for (const note of notesBetween(notes, beatStart, beatStart + QUARTER)) {
    onsets.set(note.key, [...(onsets.get(note.key) ?? []), note.start - beatStart]);
  }
  const perKey = [...onsets.values()];
  const strikes = perKey.map(list => list.length);
  const strokes = Math.max(...strikes);
  const starts = Array.from({ length: strokes }, (_, stroke) =>
    Math.min(...perKey.map(list => list[stroke] ?? Number.POSITIVE_INFINITY)),
  );
  return { strikes, starts };
}

describe('PLAY-092 rasgueado', () => {
  // Pattern, number of strokes (one per finger in its name) and, where the name defines it, the
  // rhythm of the strokes as fractions of the beat.
  const triplet = [0, 1 / 3, 2 / 3];
  const anapaest = [0, 1 / 4, 1 / 2];
  const patterns: readonly (readonly [string, number, readonly number[] | null])[] = [
    ['ii', 2, null],
    ['mi', 2, null],
    ['miiTriplet', 3, triplet],
    ['miiAnapaest', 3, anapaest],
    ['pmpTriplet', 3, triplet],
    ['pmpAnapaest', 3, anapaest],
    ['peiTriplet', 3, triplet],
    ['peiAnapaest', 3, anapaest],
    ['paiTriplet', 3, triplet],
    ['paiAnapaest', 3, anapaest],
    ['amiTriplet', 3, triplet],
    ['amiAnapaest', 3, anapaest],
    ['ppp', 3, null],
    ['amii', 4, null],
    ['amip', 4, null],
    ['eami', 4, null],
    ['eamii', 5, null],
    ['peami', 5, null],
  ];

  it('PLAY-092 plays all 18 patterns, re-striking the whole chord once per finger within the beat', () => {
    const played = playFixture('alphatex/playback/rasgueado-patterns.atex');
    const notes = soundingNotes(played.events);
    const beats = played.score.tracks[0]?.staves[0]?.bars.flatMap(bar => bar.voices[0]?.beats ?? []) ?? [];
    patterns.forEach(([name, strokes, rhythm], index) => {
      const beat = beats[index];
      expect(beat?.hasRasgueado, name).toBe(true);
      const beatStart = index * QUARTER;
      const { strikes, starts } = rasgueado(notes, beatStart);
      // Every note of the chord is struck once per stroke.
      expect(strikes, name).toEqual(new Array<number>(beat?.notes.length ?? 0).fill(strokes));
      expect(starts[0], name).toBe(0);
      expect(
        starts.every((start, stroke) => stroke === 0 || start > (starts[stroke - 1] ?? 0)),
        name,
      ).toBe(true);
      expect(Math.max(...starts), name).toBeLessThan(QUARTER);
      if (rhythm !== null) {
        starts.forEach((start, stroke) => {
          expect(start, `${name} stroke ${stroke}`).toBeCloseTo((rhythm[stroke] ?? 0) * QUARTER, 6);
        });
      }
    });
    // The chord after the patterns is struck once.
    expect(rasgueado(notes, 6 * 3 * QUARTER).strikes).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('PLAY-092 plays the rasgueados of a Guitar Pro file', () => {
    const played = playFixture('alphatab/audio/rasgueado.gp');
    const notes = soundingNotes(played.events);
    // Beat 1: "ii", two even strokes; beat 3: "pmp" anapaest, short-short-long.
    expect(rasgueado(notes, 0)).toEqual({ strikes: [2, 2, 2, 2, 2], starts: [0, QUARTER / 2] });
    expect(rasgueado(notes, 2 * QUARTER)).toEqual({
      strikes: [3, 3, 3, 3, 3],
      starts: [0, QUARTER / 4, QUARTER / 2],
    });
    expect(notesBetween(notes, QUARTER, 2 * QUARTER)).toEqual([]);
    expect(notesBetween(notes, 3 * QUARTER, BAR)).toEqual([]);
  });
});
