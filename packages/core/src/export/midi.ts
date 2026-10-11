/**
 * MIDI export: a Standard MIDI File (format 1) of the score as it is played, with a conductor
 * track (song title, tempo map, meter, a marker at every section as it comes round) and a named
 * track per instrument holding its notes, bends, programs and controllers. alphaTab's generator
 * does the playing; this lays its events out as other programs expect them.
 */
import * as alphaTab from '@coderline/alphatab';
import type { TrackInterpretation } from '../shared/playback.ts';

export interface MidiExportOptions {
  /** Tracks left out of the file (muted in the mixer, say). */
  readonly leaveOut?: readonly number[];
  /**
   * Channels per track: two (Guitar Pro's way: bends move only the bent note) or one (each
   * instrument on one channel, as some programs prefer; a bend then moves every note sounding).
   */
  readonly channelsPerTrack?: 1 | 2;
  /** How each track is played (the mixer's playing style). */
  readonly interpretations?: readonly TrackInterpretation[];
}

interface TimedBytes {
  readonly tick: number;
  readonly bytes: Uint8Array;
}

const END_OF_TRACK = Uint8Array.of(0xff, 0x2f, 0x00);
const { MidiEventType } = alphaTab.midi;
/** Events of the whole song: tempo and meter. */
const CONDUCTOR_EVENTS: ReadonlySet<alphaTab.midi.MidiEventType> = new Set([
  MidiEventType.TempoChange,
  MidiEventType.TimeSignature,
]);
/** Events of an instrument's channels (alphaTab's own rest and metronome events stay out). */
const CHANNEL_EVENTS: ReadonlySet<alphaTab.midi.MidiEventType> = new Set([
  MidiEventType.NoteOn,
  MidiEventType.NoteOff,
  MidiEventType.ControlChange,
  MidiEventType.ProgramChange,
  MidiEventType.PitchBend,
]);
const text = new TextEncoder();

function metaText(type: number, value: string): Uint8Array {
  const data = text.encode(value);
  return Uint8Array.of(0xff, type, ...variableLength(data.length), ...data);
}

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

function eventBytes(event: alphaTab.midi.MidiEvent): Uint8Array {
  const buffer = alphaTab.io.ByteBuffer.empty();
  event.writeTo(buffer);
  return buffer.toArray();
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length);
  out.set(text.encode(type), 0);
  new DataView(out.buffer).setUint32(4, body.length);
  out.set(body, 8);
  return out;
}

/** One MTrk chunk: the events in tick order, then the end of the track at the last tick. */
function trackChunk(events: readonly TimedBytes[]): Uint8Array {
  const sorted = [...events].sort((a, b) => a.tick - b.tick);
  const end = sorted.at(-1)?.tick ?? 0;
  const parts: number[] = [];
  let previous = 0;
  for (const { tick, bytes } of [...sorted, { tick: end, bytes: END_OF_TRACK }]) {
    parts.push(...variableLength(tick - previous), ...bytes);
    previous = tick;
  }
  return chunk('MTrk', Uint8Array.from(parts));
}

/** Runs `action` with every track's bends on its primary channel, then restores the score. */
function withOneChannelPerTrack<T>(score: alphaTab.model.Score, action: () => T): T {
  const saved = score.tracks.map(track => track.playbackInfo.secondaryChannel);
  for (const track of score.tracks) track.playbackInfo.secondaryChannel = track.playbackInfo.primaryChannel;
  try {
    return action();
  } finally {
    score.tracks.forEach((track, index) => {
      track.playbackInfo.secondaryChannel = saved[index] ?? track.playbackInfo.secondaryChannel;
    });
  }
}

export function exportMidi(score: alphaTab.model.Score, options: MidiExportOptions = {}): Uint8Array {
  const generate = () => {
    const midiFile = new alphaTab.midi.MidiFile();
    midiFile.format = alphaTab.midi.MidiFileFormat.MultiTrack;
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile, true);
    const generator = new alphaTab.midi.MidiFileGenerator(score, new alphaTab.Settings(), handler);
    (options.interpretations ?? []).forEach((interpretation, trackIndex) => {
      generator.trackInterpretations.set(trackIndex, { ...interpretation });
    });
    generator.generate();
    return { midiFile, lookup: generator.tickLookup, shift: handler.tickShift };
  };
  const { midiFile, lookup, shift } =
    options.channelsPerTrack === 1 ? withOneChannelPerTrack(score, generate) : generate();

  // The conductor track: title, tempo, meter and the sections as they come round.
  const conductor: TimedBytes[] = [];
  if (score.title !== '') conductor.push({ tick: 0, bytes: metaText(0x03, score.title) });
  if (score.copyright !== '') conductor.push({ tick: 0, bytes: metaText(0x02, score.copyright) });
  const instruments = new Map<number, TimedBytes[]>();
  for (const track of midiFile.tracks) {
    for (const event of track.events) {
      if (CONDUCTOR_EVENTS.has(event.type)) conductor.push({ tick: event.tick, bytes: eventBytes(event) });
      else if (CHANNEL_EVENTS.has(event.type)) {
        const events = instruments.get(event.track) ?? [];
        events.push({ tick: event.tick, bytes: eventBytes(event) });
        instruments.set(event.track, events);
      }
    }
  }
  for (const bar of lookup.masterBars) {
    const section = bar.masterBar.section;
    if (section === null) continue;
    const name = [section.marker, section.text].filter(part => part !== '').join(' ');
    if (name !== '') conductor.push({ tick: bar.start + shift, bytes: metaText(0x06, name) });
  }

  const leaveOut = new Set(options.leaveOut ?? []);
  const tracks = [trackChunk(conductor)];
  score.tracks.forEach((track, index) => {
    if (leaveOut.has(index)) return;
    tracks.push(
      trackChunk([{ tick: 0, bytes: metaText(0x03, track.name) }, ...(instruments.get(index) ?? [])]),
    );
  });

  const header = new Uint8Array(6);
  const view = new DataView(header.buffer);
  view.setUint16(0, 1);
  view.setUint16(2, tracks.length);
  view.setUint16(4, midiFile.division);
  const parts = [chunk('MThd', header), ...tracks];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
