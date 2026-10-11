/**
 * Proof that bends, bend timing styles, simultaneous bends, the whammy bar, vibrato and slides
 * play as pitch-bend curves (FEATURE_MATRIX PLAY-030, PLAY-097, PLAY-098, PLAY-044, PLAY-031,
 * PLAY-032), and that the synthesizer really changes the pitch.
 */
import { describe, expect, it } from 'vitest';
import { between, centsFrom, frequencyOf, fundamental, power, renderAudio } from './playback-audio.ts';
import {
  bendAt,
  bendsBetween,
  channelBendCurve,
  noteBendCurve,
  notesBetween,
  pitchBendRange,
  playTex,
  QUARTER,
  soundingNotes,
  type BendPoint,
  type Played,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;
const PRIMARY = 0;
/** Notes with bends, whammy or bar vibrato play on the track's second channel. */
const SECONDARY = 1;

function guitar(tempo: number, ...bars: string[]): Played {
  return playTex(
    [
      '\\title "Pitch Effects"',
      `\\tempo ${tempo}`,
      '\\track "Guitar" {instrument distortionGuitar}',
      '\\staff {tabs}',
      '\\tuning (E4 B3 G3 D3 A2 E2)',
      bars.join(' |\n'),
    ].join('\n'),
  );
}

function values(curve: readonly BendPoint[]): number[] {
  return curve.map(point => point.semitones);
}

/** How often a curve crosses its centre line. */
function crossings(curve: readonly BendPoint[]): number {
  let count = 0;
  for (let index = 1; index < curve.length; index++) {
    const before = curve[index - 1]?.semitones ?? 0;
    const after = curve[index]?.semitones ?? 0;
    if ((before < 0 && after >= 0) || (before > 0 && after <= 0)) count++;
  }
  return count;
}

function isNonDecreasing(curve: readonly BendPoint[]): boolean {
  return curve.every((point, index) => index === 0 || point.semitones >= (curve[index - 1]?.semitones ?? 0));
}

describe('PLAY-030 bends', () => {
  it('PLAY-030 plays bend, bend-release, pre-bends and tied hold/release as per-note pitch-bend curves', () => {
    const played = guitar(
      120,
      ':2 7.3{b (0 4)} r',
      ':2 7.3{b (0 4 0)} r',
      ':2 7.3{b (4 4)} r',
      ':2 7.3{b (4 0)} r',
      ':4 7.3{b (0 4)} -.3{b (4 4)} :2 -.3{b (4 0)}',
    );
    // Bent notes play on the track's second channel, set to a pitch-bend range of 16 semitones.
    expect(pitchBendRange(played.events, SECONDARY)).toBe(16);
    const notes = soundingNotes(played.events);
    // D4 (fret 7 on the G string) in every bar; the tied notes of the last bar are not re-struck.
    expect(notes.map(note => [note.channel, note.key, note.start, note.end])).toEqual([
      [SECONDARY, 62, 0, 2 * QUARTER],
      [SECONDARY, 62, BAR, BAR + 2 * QUARTER],
      [SECONDARY, 62, 2 * BAR, 2 * BAR + 2 * QUARTER],
      [SECONDARY, 62, 3 * BAR, 3 * BAR + 2 * QUARTER],
      [SECONDARY, 62, 4 * BAR, 5 * BAR],
    ]);
    const curve = noteBendCurve(played.events, SECONDARY, 62);
    const at = (tick: number) => bendAt(curve, tick);
    // Bend: from the fretted pitch up a whole tone over the note.
    expect([at(0), at(QUARTER), at(2 * QUARTER)]).toEqual([0, 1, 2]);
    expect(isNonDecreasing(bendsBetween(curve, 0, 2 * QUARTER))).toBe(true);
    // Bend and release: up by the middle of the note, back down at its end.
    expect([at(BAR), at(BAR + QUARTER), at(BAR + 2 * QUARTER)]).toEqual([0, 2, 0]);
    // Pre-bend: already a whole tone up when struck, and held.
    expect([at(2 * BAR), at(2 * BAR + QUARTER), at(2 * BAR + 2 * QUARTER - 1)]).toEqual([2, 2, 2]);
    // Pre-bend and release.
    expect([at(3 * BAR), at(3 * BAR + QUARTER), at(3 * BAR + 2 * QUARTER)]).toEqual([2, 1, 0]);
    // Tied notes: bend over the first quarter, hold through the second, release over the half.
    const tied = 4 * BAR;
    expect([
      at(tied + QUARTER),
      at(tied + QUARTER + 480),
      at(tied + 2 * QUARTER),
      at(tied + 3 * QUARTER),
    ]).toEqual([2, 2, 2, 1]);
    expect(at(tied + 4 * QUARTER)).toBe(0);
  });

  it('PLAY-030 the synthesizer bends the sounding pitch', () => {
    // D4, held for a third of the whole note, bent up to E4 by two thirds, then held (60 BPM: 4 s).
    const audio = renderAudio(guitar(60, '7.3{be (bend 0 0 20 0 40 4)}.1', 'r.1'));
    expect(Math.abs(centsFrom(fundamental(between(audio.left, 0.3, 1.2)), 62))).toBeLessThan(20);
    expect(Math.abs(centsFrom(fundamental(between(audio.left, 3.0, 3.9)), 64))).toBeLessThan(20);
  });
});

describe('PLAY-097 bend timing styles', () => {
  it('PLAY-097 follows the drawn curve, spreads a gradual bend over the note, and bends fast just before the next note', () => {
    // The same bend drawn to reach a whole tone a quarter of the way into a half note.
    const played = guitar(
      120,
      ':2 7.3{be (bend 0 0 15 4)} r',
      ':2 7.3{be (bend gradual 0 0 15 4)} r',
      ':2 7.3{be (bend fast 0 0 15 4)} r',
    );
    const curve = noteBendCurve(played.events, SECONDARY, 62);
    const at = (tick: number) => bendAt(curve, tick);
    const half = 2 * QUARTER;
    // As drawn: up within the first quarter of the note, then held.
    expect([at(240), at(480), at(half - 1)]).toEqual([1, 2, 2]);
    // Gradual: the same bend spread over the whole note.
    expect([at(BAR + 480), at(BAR + QUARTER), at(BAR + half)]).toEqual([0.5, 1, 2]);
    // Fast: nothing until the last 75 ms (144 ticks at 120 BPM) before the next note.
    const fast = bendsBetween(curve, 2 * BAR, 2 * BAR + half);
    const moving = fast.filter(point => point.semitones > 0);
    expect(at(2 * BAR + half - 145)).toBe(0);
    expect(moving[0]?.tick).toBeGreaterThanOrEqual(2 * BAR + half - 144);
    expect(at(2 * BAR + half)).toBe(2);
  });
});

// alphaTab bends notes with per-note (MIDI 2.0) pitch bend keyed by MIDI key: strings that start on
// different pitches bend independently on one channel, as proved here. Two strings bent from the
// same pitch get a channel each (patch 0017, playback-channels.test.ts).
describe('PLAY-098 simultaneous bends on different pitches', () => {
  // A3 (G string) bent a whole tone and D4 (B string) a semitone, while E4 rings unbent.
  const chord = '(2.3{be (bend 0 0 20 0 40 4)} 3.2{be (bend 0 0 20 0 40 2)} 0.1).1';

  it('gives every bent string its own curve and leaves the unbent string alone', () => {
    const played = guitar(60, chord, 'r.1');
    const notes = soundingNotes(played.events);
    expect(notes.map(note => [note.channel, note.key])).toEqual([
      [SECONDARY, 57],
      [SECONDARY, 62],
      [PRIMARY, 64],
    ]);
    expect(bendAt(noteBendCurve(played.events, SECONDARY, 57), BAR)).toBe(2);
    expect(bendAt(noteBendCurve(played.events, SECONDARY, 62), BAR)).toBe(1);
    expect(values(noteBendCurve(played.events, PRIMARY, 64)).every(value => value === 0)).toBe(true);
    expect(channelBendCurve(played.events, PRIMARY)).toEqual([]);
    expect(channelBendCurve(played.events, SECONDARY)).toEqual([]);
  });

  it('the synthesizer bends both strings independently', () => {
    const audio = renderAudio(guitar(60, chord, 'r.1'));
    const before = between(audio.left, 0.2, 1.2);
    const after = between(audio.left, 3.0, 3.9);
    const level = (samples: Float32Array, key: number) => power(samples, frequencyOf(key));
    // Before the bends: A3, D4 and E4.
    expect(level(before, 57)).toBeGreaterThan(100 * level(before, 59));
    expect(level(before, 62)).toBeGreaterThan(100 * level(before, 63));
    // After: A3 has become B3, D4 has become D#4, and E4 has not moved.
    expect(level(after, 59)).toBeGreaterThan(100 * level(after, 57));
    expect(level(after, 63)).toBeGreaterThan(100 * level(after, 62));
    expect(level(after, 64)).toBeGreaterThan(20 * level(after, 65));
  });
});

describe('PLAY-044 whammy bar', () => {
  it('PLAY-044 moves the pitch wheel of the whammy channel and takes the whole chord with it', () => {
    const played = guitar(120, ':2 3.3{tb (0 -4 0)} 3.3{tb (dive 0 -8)}', ':2 r (0.1 1.2){tb (0 -4)}');
    const notes = soundingNotes(played.events);
    expect(notes.map(note => [note.channel, note.key, note.start])).toEqual([
      [SECONDARY, 58, 0],
      [SECONDARY, 58, 2 * QUARTER],
      [SECONDARY, 60, BAR + 2 * QUARTER],
      [SECONDARY, 64, BAR + 2 * QUARTER],
    ]);
    const wheel = channelBendCurve(played.events, SECONDARY);
    const at = (tick: number) => bendAt(wheel, tick);
    // Dip: down a whole tone and back; dive: down two whole tones by the end of the note.
    expect([at(0), at(QUARTER), at(2 * QUARTER)]).toEqual([0, -2, 0]);
    expect(at(BAR)).toBe(-4);
    // The chord on the second beat of bar 2 dips as one.
    expect([at(BAR + 2 * QUARTER), at(2 * BAR)]).toEqual([0, -2]);
  });

  it('PLAY-044 the synthesizer lowers every note of the chord with the bar', () => {
    // C4 and E4, held for a third of the whole note, then dipped a whole tone by two thirds.
    const audio = renderAudio(guitar(60, '(0.1 1.2).1{tbe (0 0 20 0 40 -4)}', 'r.1'));
    const before = between(audio.left, 0.2, 1.2);
    const after = between(audio.left, 3.0, 3.9);
    const level = (samples: Float32Array, key: number) => power(samples, frequencyOf(key));
    expect(level(before, 60)).toBeGreaterThan(100 * level(before, 58));
    expect(level(before, 64)).toBeGreaterThan(100 * level(before, 62));
    expect(level(after, 58)).toBeGreaterThan(100 * level(after, 60));
    expect(level(after, 62)).toBeGreaterThan(100 * level(after, 64));
  });
});

describe('PLAY-031 vibrato', () => {
  it('PLAY-031 wobbles a note slightly or widely around its pitch, and bar vibrato moves the whole beat', () => {
    const played = guitar(120, ':2 7.3{v} 7.3{vw}', ':2 (0.1 1.2){v} r');
    const curve = noteBendCurve(played.events, PRIMARY, 62);
    const slight = bendsBetween(curve, 0, 2 * QUARTER - 1);
    const wide = bendsBetween(curve, 2 * QUARTER, BAR);
    // Slight: a quarter of a semitone either way; wide: half a semitone.
    expect(Math.max(...values(slight))).toBeCloseTo(0.25, 2);
    expect(Math.min(...values(slight))).toBeCloseTo(-0.25, 2);
    expect(Math.max(...values(wide))).toBeCloseTo(0.5, 2);
    expect(Math.min(...values(wide))).toBeCloseTo(-0.5, 2);
    // Both keep wobbling for the whole note and end on pitch.
    expect(crossings(slight)).toBeGreaterThanOrEqual(8);
    expect(crossings(wide)).toBeGreaterThanOrEqual(8);
    expect(bendAt(curve, 2 * QUARTER - 1)).not.toBe(0);
    expect(bendAt(curve, BAR)).toBe(0);
    // Bar (whammy) vibrato: both chord notes on the whammy channel, its wheel swinging a semitone.
    const chord = notesBetween(soundingNotes(played.events), BAR, 2 * BAR);
    expect(chord.map(note => note.channel)).toEqual([SECONDARY, SECONDARY]);
    const wheel = channelBendCurve(played.events, SECONDARY);
    expect(Math.max(...values(wheel))).toBeCloseTo(1, 1);
    expect(Math.min(...values(wheel))).toBeCloseTo(-1, 1);
    expect(crossings(wheel)).toBeGreaterThanOrEqual(6);
    expect(bendAt(wheel, BAR + 2 * QUARTER)).toBe(0);
  });
});

describe('PLAY-032 slides', () => {
  it('PLAY-032 glides into the target note: legato without re-striking, shift slide re-struck', () => {
    const played = guitar(120, ':4 5.3{sl} 7.3 5.3{ss} 7.3');
    const notes = soundingNotes(played.events);
    // C4 slides to D4: the legato target is not struck again, the shift-slide target is.
    expect(notes.map(note => [note.key, note.start, note.end])).toEqual([
      [60, 0, 2 * QUARTER],
      [60, 2 * QUARTER, 3 * QUARTER],
      [62, 3 * QUARTER, BAR],
    ]);
    const curve = noteBendCurve(played.events, PRIMARY, 60);
    const at = (tick: number) => bendAt(curve, tick);
    // Legato: the pitch leaves C4 halfway through the note and arrives on D4 with the next beat.
    expect([at(QUARTER / 2 - 1), at(QUARTER), at(2 * QUARTER - 1)]).toEqual([0, 2, 2]);
    expect(isNonDecreasing(bendsBetween(curve, 0, QUARTER))).toBe(true);
    // Shift: the same glide, then D4 is picked.
    expect([at(2 * QUARTER + 479), at(3 * QUARTER)]).toEqual([0, 2]);
  });

  it('PLAY-032 slides into a note from below or above and out of it upwards or downwards', () => {
    const played = guitar(120, ':2 5.3{sib} r', ':2 5.3{sia} r', ':2 5.3{sou} r', ':2 5.3{sod} r');
    const curve = noteBendCurve(played.events, PRIMARY, 60);
    const at = (tick: number) => bendAt(curve, tick);
    const half = 2 * QUARTER;
    // In: from three semitones below or above, on pitch after the first quarter of the note.
    expect([at(0), at(half / 4), at(half - 1)]).toEqual([-3, 0, 0]);
    expect([at(BAR), at(BAR + half / 4), at(BAR + half - 1)]).toEqual([3, 0, 0]);
    // Out: on pitch for three quarters of the note, then three semitones up or down.
    expect([at(2 * BAR + (3 * half) / 4 - 1), at(2 * BAR + half)]).toEqual([0, 3]);
    expect([at(3 * BAR + (3 * half) / 4 - 1), at(3 * BAR + half)]).toEqual([0, -3]);
  });
});
