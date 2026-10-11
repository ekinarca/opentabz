/**
 * Helpers for the playback proof tests (`playback-*.test.ts`). A score goes through the real
 * pipeline (`openScore` → `generatePlayback`), and the MIDI is read back the way the synth worker
 * reads it (`JsonConverter.jsObjectToMidiFile`), so the tests see exactly what is played.
 */
import * as alphaTab from '@coderline/alphatab';
import { openScore } from '../src/open/open.ts';
import { generatePlayback, type GeneratedPlayback } from '../src/playback/generate.ts';
import {
  TIMELINE_BAR_STRIDE,
  TIMELINE_ITEM_STRIDE,
  TIMELINE_SLICE_STRIDE,
  type PlaybackTimeline,
} from '../src/shared/playback.ts';
import { readFixture } from './helpers.ts';

/** MIDI ticks per quarter note. */
export const QUARTER = 960;

export interface Played {
  readonly score: alphaTab.model.Score;
  readonly playback: GeneratedPlayback;
  /** The MIDI file exactly as the synth worker deserializes it. */
  readonly midi: alphaTab.midi.MidiFile;
  /** Every MIDI event in playback order. */
  readonly events: readonly alphaTab.midi.MidiEvent[];
}

/** Opens alphaTex source through the open pipeline and generates its playback. */
export function playTex(tex: string): Played {
  return play(new TextEncoder().encode(tex), 'playback.atex');
}

/** Opens a fixture (path relative to `fixtures/`) and generates its playback. */
export function playFixture(path: string): Played {
  return play(readFixture(path), path.slice(path.lastIndexOf('/') + 1));
}

function play(bytes: Uint8Array, fileName: string): Played {
  const { score } = openScore(bytes, fileName);
  const playback = generatePlayback(score, fileName);
  const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(playback.midi);
  return { score, playback, midi, events: midi.tracks.flatMap(track => track.events) };
}

// ---------------------------------------------------------------------------------------------
// Timeline

export interface PlayedBar {
  readonly start: number;
  readonly end: number;
  readonly masterBar: number;
}

/** The timeline's bars in playback order. */
export function playedBars(timeline: PlaybackTimeline): PlayedBar[] {
  const bars: PlayedBar[] = [];
  for (let base = 0; base + TIMELINE_BAR_STRIDE <= timeline.bars.length; base += TIMELINE_BAR_STRIDE) {
    bars.push({
      start: timeline.bars[base] ?? -1,
      end: timeline.bars[base + 1] ?? -1,
      masterBar: timeline.bars[base + 2] ?? -1,
    });
  }
  return bars;
}

/** Master bar indexes in the order playback visits them. */
export function barOrder(played: Played): number[] {
  return playedBars(played.playback.timeline).map(bar => bar.masterBar);
}

/** Ticks at which the timeline starts each beat of a track (what the playback cursor follows). */
export function timelineBeatStarts(timeline: PlaybackTimeline, trackIndex: number): number[] {
  const starts = new Set<number>();
  for (
    let slice = 0;
    slice + TIMELINE_SLICE_STRIDE <= timeline.slices.length;
    slice += TIMELINE_SLICE_STRIDE
  ) {
    const firstItem = timeline.slices[slice + 2] ?? 0;
    const itemCount = timeline.slices[slice + 3] ?? 0;
    for (let item = firstItem; item < firstItem + itemCount; item++) {
      const base = item * TIMELINE_ITEM_STRIDE;
      if (timeline.items[base + 1] === trackIndex) starts.add(timeline.items[base + 2] ?? -1);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------
// Notes

export interface SoundingNote {
  readonly channel: number;
  readonly key: number;
  readonly velocity: number;
  readonly start: number;
  readonly end: number;
}

/** Note-on events paired with the note-off that ends them, in order of their start. */
export function soundingNotes(events: readonly alphaTab.midi.MidiEvent[]): SoundingNote[] {
  const open = new Map<string, { channel: number; key: number; velocity: number; start: number }[]>();
  const notes: SoundingNote[] = [];
  for (const event of events) {
    if (event instanceof alphaTab.midi.NoteOnEvent) {
      const id = `${event.channel}:${event.noteKey}`;
      const pending = open.get(id) ?? [];
      pending.push({
        channel: event.channel,
        key: event.noteKey,
        velocity: event.noteVelocity,
        start: event.tick,
      });
      open.set(id, pending);
    } else if (event instanceof alphaTab.midi.NoteOffEvent) {
      const pending = open.get(`${event.channel}:${event.noteKey}`) ?? [];
      const index = pending.findIndex(note => note.start < event.tick);
      const note = pending[index];
      if (note !== undefined) {
        pending.splice(index, 1);
        notes.push({ ...note, end: event.tick });
      }
    }
  }
  for (const pending of open.values()) {
    for (const note of pending) notes.push({ ...note, end: Number.POSITIVE_INFINITY });
  }
  return notes.sort((a, b) => a.start - b.start || a.key - b.key);
}

/** Sounding notes that start in `[from, to)`. */
export function notesBetween(notes: readonly SoundingNote[], from: number, to: number): SoundingNote[] {
  return notes.filter(note => note.start >= from && note.start < to);
}

// ---------------------------------------------------------------------------------------------
// Pitch bends

export interface BendPoint {
  readonly tick: number;
  /** Pitch offset in semitones. */
  readonly semitones: number;
}

const PITCH_WHEEL_CENTER = 8192;
/** alphaTab writes per-note bends as 32-bit (MIDI 2.0) values; the synthesizer scales them to 14 bits. */
const PER_NOTE_BEND_SCALE = 2 ** 32 / 2 ** 14;

/** The pitch-bend range a channel is set to (registered parameter 0, data entry MSB), in semitones. */
export function pitchBendRange(events: readonly alphaTab.midi.MidiEvent[], channel: number): number {
  const { DataEntryCoarse, RegisteredParameterCourse, RegisteredParameterFine } =
    alphaTab.midi.ControllerType;
  const controllers = new Map<number, number>();
  // General MIDI default until a channel selects registered parameter 0 and sets it.
  let range = 2;
  for (const event of events) {
    if (!(event instanceof alphaTab.midi.ControlChangeEvent) || event.channel !== channel) continue;
    controllers.set(event.controller, event.value);
    if (
      event.controller === DataEntryCoarse &&
      controllers.get(RegisteredParameterCourse) === 0 &&
      controllers.get(RegisteredParameterFine) === 0
    ) {
      range = event.value;
    }
  }
  return range;
}

/** Per-note pitch bends (MIDI 2.0 style) applied to one key on one channel. */
export function noteBendCurve(
  events: readonly alphaTab.midi.MidiEvent[],
  channel: number,
  key: number,
): BendPoint[] {
  const range = pitchBendRange(events, channel);
  return events.flatMap(event =>
    event instanceof alphaTab.midi.NoteBendEvent && event.channel === channel && event.noteKey === key
      ? [
          {
            tick: event.tick,
            semitones:
              ((event.value / PER_NOTE_BEND_SCALE - PITCH_WHEEL_CENTER) / PITCH_WHEEL_CENTER) * range,
          },
        ]
      : [],
  );
}

/** Channel-wide pitch-wheel changes on one channel. */
export function channelBendCurve(events: readonly alphaTab.midi.MidiEvent[], channel: number): BendPoint[] {
  const range = pitchBendRange(events, channel);
  return events.flatMap(event =>
    event instanceof alphaTab.midi.PitchBendEvent && event.channel === channel
      ? [{ tick: event.tick, semitones: ((event.value - PITCH_WHEEL_CENTER) / PITCH_WHEEL_CENTER) * range }]
      : [],
  );
}

/** The bend in effect at `tick`: the last point at or before it (0 before the first point). */
export function bendAt(curve: readonly BendPoint[], tick: number): number {
  let value = 0;
  for (const point of curve) {
    if (point.tick > tick) break;
    value = point.semitones;
  }
  return value;
}

/** The points of a curve inside `[from, to]`. */
export function bendsBetween(curve: readonly BendPoint[], from: number, to: number): BendPoint[] {
  return curve.filter(point => point.tick >= from && point.tick <= to);
}

// ---------------------------------------------------------------------------------------------
// Controllers and tempo

export interface ControllerValue {
  readonly tick: number;
  readonly value: number;
}

/** Values one controller takes on one channel. */
export function controllerValues(
  events: readonly alphaTab.midi.MidiEvent[],
  channel: number,
  controller: alphaTab.midi.ControllerType,
): ControllerValue[] {
  return events.flatMap(event =>
    event instanceof alphaTab.midi.ControlChangeEvent &&
    event.channel === channel &&
    event.controller === controller
      ? [{ tick: event.tick, value: event.value }]
      : [],
  );
}

export interface TempoChange {
  readonly tick: number;
  readonly bpm: number;
}

/** Tempo events in tick order, in beats per minute. */
export function tempoChanges(events: readonly alphaTab.midi.MidiEvent[]): TempoChange[] {
  return events.flatMap(event =>
    event instanceof alphaTab.midi.TempoChangeEvent ? [{ tick: event.tick, bpm: event.beatsPerMinute }] : [],
  );
}
