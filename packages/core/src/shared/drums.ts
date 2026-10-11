/**
 * The drums of one track for the drum view, built in the engine worker on request; alphaTab-free.
 */
import type { TrackNotes } from './notes.ts';

export interface DrumSound {
  /** The articulation's unique id ("Snare.38"). */
  readonly key: string;
  /** Its name as Guitar Pro shows it: "Snare (hit)", "Hi-Hat (open)". */
  readonly name: string;
  /** The kit piece it is played on: "Snare", "Hi-Hat". */
  readonly piece: string;
  /** The General MIDI percussion key it sounds. */
  readonly midi: number;
  /** The staff line it is written on (0: the top line; negative: above the staff). */
  readonly staffLine: number;
}

export interface TrackDrums {
  readonly trackIndex: number;
  /** Every sound of the track's kit, in MIDI order; the notes name them by index. */
  readonly sounds: readonly DrumSound[];
  /** The track's notes as instrument views read them, each note's pitch the index of its sound. */
  readonly notes: TrackNotes;
}

/** General MIDI's percussion keys, Acoustic Bass Drum to Open Triangle. */
export const GM_PERCUSSION_LOW = 35;
export const GM_PERCUSSION_HIGH = 81;
