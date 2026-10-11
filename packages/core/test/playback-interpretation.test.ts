/**
 * Proof that a track's playing style changes what is played (OpenTabz patch 0018, FEATURE_MATRIX
 * PLAY-115…PLAY-118): notes ringing on, chords strummed, palm mutes damped lightly or heavily, and
 * strong beats stressed, as Guitar Pro's track interpretation does.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { generatePlayback } from '../src/playback/generate.ts';
import { DEFAULT_INTERPRETATION, type TrackInterpretation } from '../src/shared/playback.ts';
import * as alphaTab from '@coderline/alphatab';
import { QUARTER, soundingNotes, type Played } from './playback-helpers.ts';

function guitar(style: Partial<TrackInterpretation>, ...bars: string[]): Played {
  const tex = [
    '\\title "Style"',
    '\\tempo 120',
    '\\track "Guitar" {instrument electricGuitarClean}',
    '\\staff {tabs}',
    '\\tuning (E4 B3 G3 D3 A2 E2)',
    bars.join(' |\n'),
  ].join('\n');
  const { score } = openScore(new TextEncoder().encode(tex), 'style.atex');
  const playback = generatePlayback(score, 'style', undefined, [{ ...DEFAULT_INTERPRETATION, ...style }]);
  const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(playback.midi);
  return { score, playback, midi, events: midi.tracks.flatMap(track => track.events) };
}

describe('PLAY-115 automatic let ring', () => {
  it('PLAY-115 lets every note ring until the next note on its string or a rest', () => {
    const bars = [':8 0.6 2.5 2.4 1.3 0.2 0.1 2.5 r'];
    const plain = soundingNotes(guitar({}, ...bars).events);
    const ringing = soundingNotes(guitar({ letRing: true }, ...bars).events);
    expect(plain.map(note => note.end - note.start)).toEqual([480, 480, 480, 480, 480, 480, 480]);
    // The low E rings to the rest; the A string rings until it is played again.
    expect(ringing[0]?.end).toBe(7 * 480);
    expect(ringing[1]?.end).toBe(6 * 480);
  });
});

describe('PLAY-116 automatic brush', () => {
  it('PLAY-116 strums chords from the low string up, single notes as written', () => {
    const notes = soundingNotes(guitar({ brush: true }, ':4 (0.6 2.5 2.4 1.3 0.2 0.1) 3.1 r r').events);
    const chord = notes.filter(note => note.start < QUARTER);
    const starts = chord.map(note => note.start).sort((a, b) => a - b);
    expect(starts[0]).toBe(0);
    expect(new Set(starts).size).toBe(6);
    expect(starts.at(-1)).toBeLessThanOrEqual(60);
    expect(notes.find(note => note.start >= QUARTER)?.start).toBe(QUARTER);
    const plain = soundingNotes(guitar({}, ':4 (0.6 2.5 2.4 1.3 0.2 0.1) 3.1 r r').events);
    expect(new Set(plain.filter(note => note.start < QUARTER).map(note => note.start)).size).toBe(1);
  });
});

describe('PLAY-117 palm-mute intensity', () => {
  it('PLAY-117 damps palm-muted notes less or more', () => {
    const length = (palmMute: number) =>
      soundingNotes(guitar({ palmMute }, ':4 0.6{pm} r r r').events).map(note => note.end - note.start)[0] ??
      0;
    expect(length(0)).toBeGreaterThan(length(0.5));
    expect(length(0.5)).toBeGreaterThan(length(1));
  });
});

describe('PLAY-118 accentuation', () => {
  it('PLAY-118 stresses the first beat of the bar, and the middle of a 4/4 bar a little', () => {
    const velocities = (accent: boolean) =>
      soundingNotes(guitar({ accent }, ':4 3.3{dy mf} 3.3 3.3 3.3', ':4 3.3 3.3 3.3 3.3').events).map(
        note => note.velocity,
      );
    expect(velocities(false)).toEqual([79, 79, 79, 79, 79, 79, 79, 79]);
    expect(velocities(true)).toEqual([95, 79, 87, 79, 95, 79, 87, 79]);
  });
});
