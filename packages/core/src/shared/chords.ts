/**
 * The chords of one track for the chords panel, built in the engine worker on request;
 * alphaTab-free.
 */
export interface ChordShape {
  readonly name: string;
  /** The fret at the top of the diagram (1: the nut). */
  readonly firstFret: number;
  /** Fret per string, from the highest string to the lowest; 0 open, -1 not played. Empty without a diagram. */
  readonly strings: readonly number[];
  /** Frets held by a barre. */
  readonly barres: readonly number[];
}

export interface TrackChords {
  readonly trackIndex: number;
  /** The track's chords, each once, in the order they first come. */
  readonly chords: readonly ChordShape[];
  /** Per beat carrying a chord, in score order: [beatId, index into `chords`]. */
  readonly beats: Int32Array;
}

export const TRACK_CHORD_STRIDE = 2;
