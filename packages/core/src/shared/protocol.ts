/**
 * Typed RPC protocol between the UI (main thread) and the engine worker. Every method is a
 * synchronous operation inside the worker; the client wraps each call in a promise with a
 * watchdog deadline. alphaTab-free; safe on the main thread.
 */
import type { OpenError } from './open-error.ts';
import type { TrackNotes } from './notes.ts';
import type { PlaybackTimeline, ScoreBounds, TrackInterpretation } from './playback.ts';
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
