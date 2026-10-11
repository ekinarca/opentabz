import type { DrumSound, TrackDrums } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { kitPads, padLights, soundPads } from './drums.ts';
import { NO_NOTES } from './fretboard.ts';

function sound(name: string, midi: number, staffLine: number): DrumSound {
  return { key: name, name, piece: name.replace(/\s*\(.*$/, ''), midi, staffLine };
}

/** A kit in MIDI order; the track plays the kick, the snare and both hi-hats. */
const SOUNDS = [
  sound('Kick (hit)', 35, 8),
  sound('Snare (hit)', 38, 3),
  sound('Hi-Hat (closed)', 42, -1),
  sound('Hi-Hat (open)', 46, -1),
  sound('Crash high (hit)', 49, -2),
  sound('Shaker (hit)', 82, -1),
];

const DRUMS: TrackDrums = {
  trackIndex: 0,
  sounds: SOUNDS,
  notes: {
    trackIndex: 0,
    staffIndex: null,
    beats: Int32Array.from([1, 0, 2, 0, 0, 2, 2, 1, 0, 0, 3, 3, 1, 0, 0]),
    notes: Int32Array.from([0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 3, 0]),
  },
};

const note = (pitch: number) => ({ string: 0, fret: 0, pitch, flags: 0, staff: 0 });

describe('the drum view model (VIEW-006, VIEW-020)', () => {
  it('shows a pad per piece played, from the top of the staff down to the kick', () => {
    expect(kitPads(DRUMS).map(pad => [pad.label, pad.sounds])).toEqual([
      ['Hi-Hat', [2, 3]],
      ['Snare', [1]],
      ['Kick', [0]],
    ]);
  });

  it('shows a pad per sound of the kit, General MIDI ones only on request', () => {
    expect(soundPads(DRUMS, false).map(pad => [pad.midi, pad.used])).toEqual([
      [35, true],
      [38, true],
      [42, true],
      [46, true],
      [49, false],
      [82, false],
    ]);
    expect(soundPads(DRUMS, true).map(pad => pad.midi)).toEqual([35, 38, 42, 46, 49]);
  });

  it('lights a pad for what sounds now, before what comes next or later in the bar', () => {
    const pads = kitPads(DRUMS);
    const lights = padLights(pads, {
      current: [note(0), note(2)],
      next: [note(3), note(1)],
      bar: [note(1)],
      flats: false,
    });
    expect([...lights]).toEqual([
      ['Hi-Hat', { kind: 'current', sound: 2 }],
      ['Snare', { kind: 'next', sound: 1 }],
      ['Kick', { kind: 'current', sound: 0 }],
    ]);
    expect(padLights(pads, NO_NOTES).size).toBe(0);
  });
});
