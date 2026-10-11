/**
 * Plain, cloneable playback data shared by the engine and the UI. alphaTab-free.
 */

/**
 * When every beat is played, in score ticks (quarter note = 960), following repeats, endings and
 * jumps. Flat integer tables so the UI can binary-search them without allocating.
 */
export interface PlaybackTimeline {
  readonly playbackId: string;
  readonly endTick: number;
  /** Per played bar, in playback order: [startTick, endTick, masterBarIndex, firstSlice, sliceCount]. */
  readonly bars: Int32Array;
  /** Per time slice: [startTick, endTick, firstItem, itemCount]. */
  readonly slices: Int32Array;
  /** Per beat sounding in a slice: [beatId, trackIndex, playbackStartTick]. */
  readonly items: Int32Array;
}

export const TIMELINE_BAR_STRIDE = 5;
export const TIMELINE_SLICE_STRIDE = 4;
export const TIMELINE_ITEM_STRIDE = 3;

/**
 * Where things are on the rendered score, in engine layout coordinates (the same space as
 * partial positions).
 */
export interface ScoreBounds {
  /** Per staff system: [x, y, w, h] of its real bounds. */
  readonly systems: Float32Array;
  /** Per master bar shown: [masterBarIndex, systemIndex]. */
  readonly barIndex: Int32Array;
  /** Per master bar shown: [x, y, w, h] aligned with the staff lines. */
  readonly barRect: Float32Array;
  /** Per beat shown (every rendered staff): [beatId, trackIndex, staffIndex, barBoundsIndex]. */
  readonly beatIndex: Int32Array;
  /** Per beat shown: [onNotesX, realX, realWidth]. */
  readonly beatRect: Float32Array;
}

export const BOUNDS_SYSTEM_STRIDE = 4;
export const BOUNDS_BAR_INDEX_STRIDE = 2;
export const BOUNDS_BAR_RECT_STRIDE = 4;
export const BOUNDS_BEAT_INDEX_STRIDE = 4;
export const BOUNDS_BEAT_RECT_STRIDE = 3;

/** Engine worker → synth worker: everything needed to play a document. */
export interface MidiDelivery {
  readonly type: 'midi';
  readonly playbackId: string;
  /** alphaTab MidiFile serialized with JsonConverter.midiFileToJsObject. */
  readonly midi: unknown;
  /** Ticks by which the MIDI events are shifted relative to score ticks (pickup bars). */
  readonly tickShift: number;
  /** Per-channel transposition in semitones (transposing instruments). */
  readonly transpositionPitches: readonly (readonly [number, number])[];
}
