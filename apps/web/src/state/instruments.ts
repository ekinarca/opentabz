/**
 * Instruments a track is put in with (EDIT-030, EDIT-067) and the tunings offered for each number
 * of strings (EDIT-032): MIDI programs of General MIDI, strings as MIDI note numbers from the
 * highest.
 */
import type { NewTrack } from '@opentabz/core/shared';

export const INSTRUMENT_IDS = [
  'electric-guitar',
  'distortion-guitar',
  'acoustic-guitar',
  'classical-guitar',
  'seven-string-guitar',
  'bass',
  'five-string-bass',
  'ukulele',
  'banjo',
  'piano',
  'voice',
  'drums',
] as const;

export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

const GUITAR = [64, 59, 55, 50, 45, 40];

/** Each instrument's program, strings and whether it is drums. */
export const INSTRUMENTS: Readonly<Record<InstrumentId, Omit<NewTrack, 'name' | 'shortName'>>> = {
  'electric-guitar': { program: 27, tuning: GUITAR, percussion: false },
  'distortion-guitar': { program: 30, tuning: GUITAR, percussion: false },
  'acoustic-guitar': { program: 25, tuning: GUITAR, percussion: false },
  'classical-guitar': { program: 24, tuning: GUITAR, percussion: false },
  'seven-string-guitar': { program: 30, tuning: [...GUITAR, 35], percussion: false },
  bass: { program: 33, tuning: [43, 38, 33, 28], percussion: false },
  'five-string-bass': { program: 33, tuning: [43, 38, 33, 28, 23], percussion: false },
  // Re-entrant: the fourth string (G4) above the third.
  ukulele: { program: 24, tuning: [69, 64, 60, 67], percussion: false },
  // Open G, the short fifth string (G4) last.
  banjo: { program: 105, tuning: [62, 59, 55, 50, 67], percussion: false },
  piano: { program: 0, tuning: [], percussion: false },
  voice: { program: 53, tuning: [], percussion: false },
  drums: { program: 0, tuning: [], percussion: true },
};

export interface TuningPreset {
  readonly id: string;
  readonly tuning: readonly number[];
}

/** Tunings offered, by number of strings. */
export const TUNING_PRESETS: Readonly<Record<number, readonly TuningPreset[]>> = {
  4: [
    { id: 'bass-standard', tuning: [43, 38, 33, 28] },
    { id: 'bass-drop-d', tuning: [43, 38, 33, 26] },
    { id: 'bass-d-standard', tuning: [41, 36, 31, 26] },
    { id: 'ukulele', tuning: [69, 64, 60, 67] },
  ],
  5: [
    { id: 'bass-five', tuning: [43, 38, 33, 28, 23] },
    { id: 'banjo-open-g', tuning: [62, 59, 55, 50, 67] },
  ],
  6: [
    { id: 'standard', tuning: GUITAR },
    { id: 'drop-d', tuning: [64, 59, 55, 50, 45, 38] },
    { id: 'half-step-down', tuning: [63, 58, 54, 49, 44, 39] },
    { id: 'd-standard', tuning: [62, 57, 53, 48, 43, 38] },
    { id: 'drop-c', tuning: [62, 57, 53, 48, 43, 36] },
    { id: 'open-g', tuning: [62, 59, 55, 50, 43, 38] },
    { id: 'open-d', tuning: [62, 57, 54, 50, 45, 38] },
    { id: 'open-e', tuning: [64, 59, 56, 52, 47, 40] },
    { id: 'dadgad', tuning: [62, 57, 55, 50, 45, 38] },
  ],
  7: [
    { id: 'seven-standard', tuning: [...GUITAR, 35] },
    { id: 'seven-drop-a', tuning: [...GUITAR, 33] },
  ],
};

const NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** A MIDI note's name with its octave (60: C4). */
export function noteName(midi: number): string {
  return `${NOTES[((midi % 12) + 12) % 12] ?? ''}${String(Math.floor(midi / 12) - 1)}`;
}

/** The preset a tuning is, if any. */
export function presetOf(tuning: readonly number[]): TuningPreset | null {
  return (
    TUNING_PRESETS[tuning.length]?.find(
      preset =>
        preset.tuning.length === tuning.length &&
        preset.tuning.every((pitch, index) => pitch === tuning[index]),
    ) ?? null
  );
}
