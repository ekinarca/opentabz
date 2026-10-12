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
  /**
   * Channels playback added for a track's techniques (slap bass sounds, a golpe's drum kit, a
   * second bend channel): [trackIndex, channel, kind]. The track's mixer settings apply to them.
   */
  readonly extraChannels: Int32Array;
}

/**
 * How a track is played, as Guitar Pro's track interpretation: every note ringing on, chords
 * strummed, palm mutes damped from light (0) to heavy (1), strong beats stressed.
 */
export interface TrackInterpretation {
  readonly letRing: boolean;
  readonly brush: boolean;
  readonly palmMute: number;
  readonly accent: boolean;
}

/** As written: nothing added, palm mutes as Guitar Pro plays them. */
export const DEFAULT_INTERPRETATION: TrackInterpretation = {
  letRing: false,
  brush: false,
  palmMute: 0.5,
  accent: false,
};

export const TIMELINE_BAR_STRIDE = 5;
export const TIMELINE_SLICE_STRIDE = 4;
export const TIMELINE_ITEM_STRIDE = 3;
export const TIMELINE_EXTRA_CHANNEL_STRIDE = 3;
/** An extra channel that plays the track's notes with another sound. */
export const EXTRA_CHANNEL_MELODIC = 0;
/** An extra channel that is a drum kit: only mute, solo, level and pan apply. */
export const EXTRA_CHANNEL_DRUMS = 1;

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
  /**
   * Per staff drawn in a system (alphaTab patch 0058): [systemIndex, trackIndex, staffIndex,
   * kind (a STAFF_KIND), firstLine, lineCount]; its lines are `lines[firstLine…]`, from the top.
   */
  readonly staffLines: Int32Array;
  /** The y of every staff's lines, staff after staff. */
  readonly lines: Float32Array;
}

export const BOUNDS_SYSTEM_STRIDE = 4;
export const BOUNDS_BAR_INDEX_STRIDE = 2;
export const BOUNDS_BAR_RECT_STRIDE = 4;
export const BOUNDS_BEAT_INDEX_STRIDE = 4;
export const BOUNDS_BEAT_RECT_STRIDE = 3;
export const BOUNDS_STAFF_LINES_STRIDE = 6;

/** The kinds of staff a track is drawn on, as `ScoreBounds.staffLines` numbers them. */
export const STAFF_KIND = { notation: 0, tablature: 1, slash: 2, numbered: 3 } as const;

/** A span of score ticks, end exclusive (a selection, a loop). */
export interface TickRange {
  readonly startTick: number;
  readonly endTick: number;
}

/** Engine worker → synth worker: a few beats to sound once (stepping through a score). */
export interface PreviewDelivery {
  readonly type: 'preview';
  /** alphaTab MidiFile serialized with JsonConverter.midiFileToJsObject, starting at tick 0. */
  readonly midi: unknown;
}

/** Everything the engine worker sends to the synth worker. */
export type SynthDelivery = MidiDelivery | PreviewDelivery;

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
  /** Played bars in playback order: [startTick, numerator, denominator] (score ticks). */
  readonly bars: Int32Array;
  /** End of the song in score ticks. */
  readonly endTick: number;
  /**
   * Drum kits playback added for a track's techniques (a golpe): played centered, so the track's
   * pan places them, not the kit's own spread (alphaTab patch 0008).
   */
  readonly centeredChannels: readonly number[];
  /** The same song played another way (a track's style changed): swapped in, keeping the position. */
  readonly replace: boolean;
}
