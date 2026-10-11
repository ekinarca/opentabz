/**
 * The engine's request handlers, independent of any messaging mechanism. The worker entry
 * forwards protocol messages here; tests call it directly in Node.
 */
import { summarizeScore } from '../document/summary.ts';
import { exportMidi } from '../export/midi.ts';
import { OpenFailure, openScore } from '../open/open.ts';
import { generatePlayback } from '../playback/generate.ts';
import { collectTrackChords } from '../playback/track-chords.ts';
import { collectTrackDrums } from '../playback/track-drums.ts';
import { collectTrackLyrics } from '../playback/track-lyrics.ts';
import { collectTrackNotes } from '../playback/track-notes.ts';
import { RenderSession } from '../render/session.ts';
import type { OpenError } from '../shared/open-error.ts';
import type { TrackChords } from '../shared/chords.ts';
import type { TrackDrums } from '../shared/drums.ts';
import type { TrackLyrics } from '../shared/lyrics.ts';
import type { TrackNotes } from '../shared/notes.ts';
import {
  EXTRA_CHANNEL_DRUMS,
  TIMELINE_EXTRA_CHANNEL_STRIDE,
  type PlaybackTimeline,
  type SynthDelivery,
} from '../shared/playback.ts';
import type {
  EngineArgs,
  EngineResult,
  EngineInfo,
  EngineMethods,
  OpenResult,
  PaintResult,
  ViewLayout,
} from '../shared/protocol.ts';
import type { DocSummary } from '../shared/summary.ts';
import type { ViewOptions } from '../shared/view.ts';
import { ALPHATAB_VERSION } from './version.ts';
import { WARMUP_SCORE } from './warmup.ts';
import * as alphaTab from '@coderline/alphatab';

interface OpenDocument {
  readonly score: alphaTab.model.Score;
  readonly summary: DocSummary;
  /** Beats by id, built on first use (audible stepping). */
  beats: Map<number, alphaTab.model.Beat> | null;
}

interface View {
  readonly docId: string;
  readonly session: RenderSession;
}

export class EngineHostError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EngineHostError';
  }
}

/** Where MIDI for the synthesizer is sent (a MessagePort in the browser). */
export interface MidiSink {
  postMessage(message: SynthDelivery): void;
}

export class EngineHost implements EngineMethods {
  private readonly documents = new Map<string, OpenDocument>();
  private readonly views = new Map<string, View>();
  private documentCounter = 0;
  private synth: MidiSink | null = null;

  public init(_args: EngineArgs<'init'>): EngineInfo {
    const started = performance.now();
    // Warm the JIT on a small score that touches the importers, layout and painter. The score is
    // also round-tripped through a .gp file: Guitar Pro 7+ files use the zip and XML readers.
    const opened = openScore(new TextEncoder().encode(WARMUP_SCORE), 'warmup.atex');
    openScore(new alphaTab.exporter.Gp7Exporter().export(opened.score, new alphaTab.Settings()), 'warmup.gp');
    const session = new RenderSession(opened.score, WARMUP_VIEW);
    try {
      const layout = session.layout();
      session.paint(
        layout.partials
          .filter(p => p.kind === 'system')
          .slice(0, 2)
          .map(p => p.id),
      );
    } finally {
      session.dispose();
    }
    return { alphaTabVersion: ALPHATAB_VERSION, warmupMs: performance.now() - started };
  }

  public open(args: EngineArgs<'open'>): OpenResult {
    const started = performance.now();
    try {
      const opened = openScore(new Uint8Array(args.bytes), args.name);
      this.documentCounter += 1;
      const id = `doc-${this.documentCounter}`;
      const summary = summarizeScore(opened.score, {
        id,
        fileName: args.name,
        byteLength: args.bytes.byteLength,
        format: opened.format,
        formatVersion: opened.formatVersion,
        extensionMismatch: opened.extensionMismatch,
        truncated: opened.truncated,
      });
      this.documents.set(id, { score: opened.score, summary, beats: null });
      return { ok: true, summary, parseMs: performance.now() - started };
    } catch (error) {
      if (error instanceof OpenFailure) return { ok: false, error: error.error };
      return { ok: false, error: internalError(args.name, args.bytes.byteLength, error) };
    }
  }

  public closeDocument(args: EngineArgs<'closeDocument'>): null {
    for (const [viewId, view] of this.views) {
      if (view.docId === args.docId) {
        view.session.dispose();
        this.views.delete(viewId);
      }
    }
    this.documents.delete(args.docId);
    return null;
  }

  public layoutView(args: EngineArgs<'layoutView'>): ViewLayout {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    let view = this.views.get(args.viewId);
    if (view !== undefined && view.docId !== args.docId) {
      view.session.dispose();
      view = undefined;
    }
    if (view === undefined) {
      view = { docId: args.docId, session: new RenderSession(document.score, args.options) };
      this.views.set(args.viewId, view);
    }
    const layout = view.session.layout(args.options);
    return { viewId: args.viewId, ...layout };
  }

  public paint(args: EngineArgs<'paint'>): PaintResult {
    const view = this.views.get(args.viewId);
    if (view === undefined) return { viewId: args.viewId, generation: args.generation, partials: [] };
    if (view.session.currentGeneration !== args.generation) {
      return { viewId: args.viewId, generation: args.generation, partials: [] };
    }
    return { viewId: args.viewId, generation: args.generation, partials: view.session.paint(args.ids) };
  }

  public closeView(args: EngineArgs<'closeView'>): null {
    this.views.get(args.viewId)?.session.dispose();
    this.views.delete(args.viewId);
    return null;
  }

  public connectSynth(args: { readonly port: MidiSink }): null {
    this.synth = args.port;
    return null;
  }

  public preparePlayback(args: EngineArgs<'preparePlayback'>): PlaybackTimeline {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    if (this.synth === null) throw new EngineHostError('No synthesizer is connected.');
    const playback = generatePlayback(
      document.score,
      args.playbackId,
      new alphaTab.Settings(),
      args.interpretations ?? [],
    );
    this.synth.postMessage({
      type: 'midi',
      playbackId: args.playbackId,
      midi: playback.midi,
      tickShift: playback.tickShift,
      transpositionPitches: playback.transpositionPitches,
      bars: playback.bars,
      endTick: playback.timeline.endTick,
      centeredChannels: drumChannels(playback.timeline.extraChannels),
      replace: args.replace ?? false,
    });
    return playback.timeline;
  }

  public previewBeats(args: EngineArgs<'previewBeats'>): null {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    if (this.synth === null) throw new EngineHostError('No synthesizer is connected.');
    document.beats ??= indexBeats(document.score);
    const beats = args.beatIds.flatMap(id => {
      const beat = document.beats?.get(id);
      return beat === undefined ? [] : [beat];
    });
    if (beats.length === 0) return null;
    const midiFile = new alphaTab.midi.MidiFile();
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile);
    const generator = new alphaTab.midi.MidiFileGenerator(document.score, new alphaTab.Settings(), handler);
    // Transposition is applied per channel by the synthesizer, as for the song itself.
    generator.applyTranspositionPitches = false;
    for (const beat of beats) generator.generateSingleBeat(beat);
    this.synth.postMessage({
      type: 'preview',
      midi: alphaTab.model.JsonConverter.midiFileToJsObject(midiFile),
    });
    return null;
  }

  public trackNotes(args: EngineArgs<'trackNotes'>): TrackNotes {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    return collectTrackNotes(document.score, args.trackIndex);
  }

  public trackChords(args: EngineArgs<'trackChords'>): TrackChords {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    return collectTrackChords(document.score, args.trackIndex);
  }

  public trackLyrics(args: EngineArgs<'trackLyrics'>): TrackLyrics {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    return collectTrackLyrics(document.score, args.trackIndex);
  }

  public trackDrums(args: EngineArgs<'trackDrums'>): TrackDrums {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    return collectTrackDrums(document.score, args.trackIndex);
  }

  public exportAudioSong(args: EngineArgs<'exportAudioSong'>): EngineResult<'exportAudioSong'> {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    const playback = generatePlayback(
      document.score,
      'export',
      new alphaTab.Settings(),
      args.interpretations ?? [],
      args.tailSeconds,
    );
    return {
      song: {
        type: 'midi',
        playbackId: 'export',
        midi: playback.midi,
        tickShift: playback.tickShift,
        transpositionPitches: playback.transpositionPitches,
        bars: playback.bars,
        endTick: playback.timeline.endTick,
        centeredChannels: drumChannels(playback.timeline.extraChannels),
        replace: false,
      },
      timeline: playback.timeline,
    };
  }

  public exportMidi(args: EngineArgs<'exportMidi'>): EngineResult<'exportMidi'> {
    const document = this.documents.get(args.docId);
    if (document === undefined) throw new EngineHostError(`Unknown document ${args.docId}.`);
    return { bytes: exportMidi(document.score, args) };
  }

  /** Number of open documents (for tests and diagnostics). */
  public get documentCount(): number {
    return this.documents.size;
  }
}

/** The drum kits among the channels playback added. */
function drumChannels(extraChannels: Int32Array): number[] {
  const channels: number[] = [];
  for (let index = 0; index < extraChannels.length; index += TIMELINE_EXTRA_CHANNEL_STRIDE) {
    if (extraChannels[index + 2] === EXTRA_CHANNEL_DRUMS) channels.push(extraChannels[index + 1] ?? -1);
  }
  return channels;
}

function indexBeats(score: alphaTab.model.Score): Map<number, alphaTab.model.Beat> {
  const beats = new Map<number, alphaTab.model.Beat>();
  for (const track of score.tracks)
    for (const staff of track.staves)
      for (const bar of staff.bars)
        for (const voice of bar.voices) for (const beat of voice.beats) beats.set(beat.id, beat);
  return beats;
}

const WARMUP_VIEW: ViewOptions = {
  trackIndexes: [0],
  layout: 'page',
  systemsLayout: 'auto',
  staffDisplay: 'default',
  width: 800,
  notationScale: 1,
};

function internalError(fileName: string, byteLength: number, error: unknown): OpenError {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return {
    code: 'internal',
    fileName,
    byteLength,
    format: null,
    formatVersion: null,
    extensionMismatch: false,
    position: null,
    detail,
  };
}
