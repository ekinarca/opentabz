/**
 * Typed RPC protocol between the UI (main thread) and the engine worker. Every method is a
 * synchronous operation inside the worker; the client wraps each call in a promise with a
 * watchdog deadline. alphaTab-free; safe on the main thread.
 */
import type { TrackBeats } from './beats.ts';
import type { BarState, EditCommand, EditOutcome, TrackState } from './edit.ts';
import type { OpenError } from './open-error.ts';
import type { TrackChords } from './chords.ts';
import type { TrackDrums } from './drums.ts';
import type { SmuflMetadataJson } from './music-font.ts';
import type { ScoreOverview } from './overview.ts';
import type { TrackLyrics } from './lyrics.ts';
import type { TrackNotes } from './notes.ts';
import type { MidiDelivery, PlaybackTimeline, ScoreBounds, TrackInterpretation } from './playback.ts';
import type { DocSummary } from './summary.ts';
import type { PartialLayout, ViewOptions } from './view.ts';

export interface EngineInfo {
  /** alphaTab version the engine runs on. */
  readonly alphaTabVersion: string;
  /** Milliseconds the worker spent warming up (JIT) on a built-in score. */
  readonly warmupMs: number;
}

export type OpenResult =
  | { readonly ok: true; readonly summary: DocSummary; readonly parseMs: number }
  | { readonly ok: false; readonly error: OpenError };

export interface ViewLayout {
  readonly viewId: string;
  readonly generation: number;
  readonly width: number;
  readonly height: number;
  readonly partials: readonly PartialLayout[];
  readonly bounds: ScoreBounds;
  readonly layoutMs: number;
}

export interface PaintResult {
  readonly viewId: string;
  readonly generation: number;
  /** Painted partials; empty when the request targeted a superseded generation. */
  readonly partials: readonly { readonly id: string; readonly svg: string }[];
}

/** Methods the engine worker implements. Arguments and results are structured-cloneable. */
export interface EngineMethods {
  init(args: Record<string, never>): EngineInfo;
  open(args: { readonly name: string; readonly bytes: ArrayBuffer }): OpenResult;
  closeDocument(args: { readonly docId: string }): null;
  layoutView(args: {
    readonly viewId: string;
    readonly docId: string;
    readonly options: ViewOptions;
  }): ViewLayout;
  paint(args: {
    readonly viewId: string;
    readonly generation: number;
    readonly ids: readonly string[];
  }): PaintResult;
  closeView(args: { readonly viewId: string }): null;
  /**
   * Edits a document (EDIT-001): the commands are made together, as one edit to undo, or none is
   * made. Its views are laid out again, on their next layout, from the first bar changed.
   */
  edit(args: { readonly docId: string; readonly commands: readonly EditCommand[] }): EditOutcome;
  /** Undoes a document's last edit (EDIT-060). */
  undo(args: { readonly docId: string }): EditOutcome;
  /** Makes a document's last edit undone again. */
  redo(args: { readonly docId: string }): EditOutcome;
  /** A track's properties as they are (EDIT-030 … EDIT-036), for the editor's track dialog. */
  trackProperties(args: { readonly docId: string; readonly track: number }): TrackState;
  /** A bar's properties as they are (EDIT-021 … EDIT-027), for the editor's bar dialog. */
  barProperties(args: { readonly docId: string; readonly bar: number }): BarState;
  /** Every beat of one track, where it is and what it holds, for the editor's caret. */
  trackBeats(args: { readonly docId: string; readonly trackIndex: number }): TrackBeats;
  /** A document as it is now, edited or not, as a Guitar Pro 7/8 file (EDIT-064). */
  saveDocument(args: { readonly docId: string }): { readonly bytes: ArrayBuffer };
  /** A blank score to write in (COMP-001), as a Guitar Pro 7/8 file to open. */
  blankDocument(args: { readonly title: string }): { readonly bytes: ArrayBuffer };
  /** Hands the engine a port to the synth worker; MIDI goes there directly. */
  connectSynth(args: { readonly port: MessagePort }): null;
  /** Generates MIDI for a document, sends it to the synth and returns the playback timeline. */
  preparePlayback(args: {
    readonly docId: string;
    readonly playbackId: string;
    /** How each track is played, by track index; tracks left out play as written. */
    readonly interpretations?: readonly TrackInterpretation[];
    /** The song is already loaded: swap the new MIDI in, keeping the position. */
    readonly replace?: boolean;
  }): PlaybackTimeline;
  /** Sends the given beats to the synth to sound once, as if struck together (audible stepping). */
  previewBeats(args: { readonly docId: string; readonly beatIds: readonly number[] }): null;
  /** The notes of one track, beat by beat, for instrument views. */
  trackNotes(args: { readonly docId: string; readonly trackIndex: number }): TrackNotes;
  /** The chords of one track and the beats that carry them, for the chords panel. */
  trackChords(args: { readonly docId: string; readonly trackIndex: number }): TrackChords;
  /** The lyrics of one track, syllable by syllable on their beats, for the lyrics pane. */
  trackLyrics(args: { readonly docId: string; readonly trackIndex: number }): TrackLyrics;
  /** The drum kit of one track and its notes, for the drum view. */
  trackDrums(args: { readonly docId: string; readonly trackIndex: number }): TrackDrums;
  /** The bars each track plays in, for the song overview. */
  scoreOverview(args: { readonly docId: string }): ScoreOverview;
  /**
   * Makes a music font other than Bravura known for views to engrave with (REND-241): its id and
   * its SMuFL metadata. Fonts are forgotten when the engine restarts.
   */
  registerMusicFont(args: { readonly id: string; readonly metadata: SmuflMetadataJson }): null;
  /**
   * The score with its repeats and jumps written out, every bar as often and in the order it is
   * played (REND-319), as a Guitar Pro 7 file to open as a document of its own.
   */
  unfoldDocument(args: { readonly docId: string }): { readonly bytes: ArrayBuffer };
  /**
   * The song for an audio export: the MIDI playback would send the synthesizer (with a silent
   * tail for the last notes to die away) and its timeline, returned rather than sent.
   */
  exportAudioSong(args: {
    readonly docId: string;
    readonly interpretations?: readonly TrackInterpretation[];
    readonly tailSeconds: number;
  }): { readonly song: MidiDelivery; readonly timeline: PlaybackTimeline };
  /** A Standard MIDI File of a document, as it is played. */
  exportMidi(args: {
    readonly docId: string;
    /** Tracks left out (muted in the mixer). */
    readonly leaveOut?: readonly number[];
    /** Two channels per track (bends on their own) or one. */
    readonly channelsPerTrack?: 1 | 2;
    /** How each track is played, by track index. */
    readonly interpretations?: readonly TrackInterpretation[];
  }): { readonly bytes: Uint8Array };
}

export type EngineMethod = keyof EngineMethods;
export type EngineArgs<M extends EngineMethod> = Parameters<EngineMethods[M]>[0];
export type EngineResult<M extends EngineMethod> = ReturnType<EngineMethods[M]>;

export interface EngineRequestMessage<M extends EngineMethod = EngineMethod> {
  readonly kind: 'request';
  readonly id: number;
  readonly method: M;
  readonly args: EngineArgs<M>;
}

export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
}

export type EngineResponseMessage =
  | { readonly kind: 'response'; readonly id: number; readonly ok: true; readonly result: unknown }
  | { readonly kind: 'response'; readonly id: number; readonly ok: false; readonly error: SerializedError };

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error ? ` (caused by ${error.cause.name}: ${error.cause.message})` : '';
    return { name: error.name, message: `${error.message}${cause}`, stack: error.stack ?? null };
  }
  return { name: 'Error', message: String(error), stack: null };
}
