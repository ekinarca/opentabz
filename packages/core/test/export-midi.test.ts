/**
 * MIDI export (EXP-004, EXP-024), read back with a small Standard MIDI File reader: format 1 with
 * a conductor track (title, tempo map, meter, section markers in playing order) and one named
 * track per instrument; bends as pitch bends on their own channel or the track's only one; tracks
 * left out on request.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { exportMidi } from '../src/export/midi.ts';
import { openScore } from '../src/open/open.ts';
import { readFixture } from './helpers.ts';

interface SmfEvent {
  readonly tick: number;
  readonly status: number;
  readonly data: Uint8Array;
  /** Meta events: their type and, for texts, the text. */
  readonly meta?: number;
  readonly text?: string;
}

interface Smf {
  readonly format: number;
  readonly division: number;
  readonly tracks: SmfEvent[][];
}

function readSmf(bytes: Uint8Array): Smf {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const id = (at: number) => decoder.decode(bytes.subarray(at, at + 4));
  expect(id(0)).toBe('MThd');
  const format = view.getUint16(8);
  const count = view.getUint16(10);
  const division = view.getUint16(12);
  let at = 8 + view.getUint32(4);
  const tracks: SmfEvent[][] = [];
  for (let index = 0; index < count; index++) {
    expect(id(at)).toBe('MTrk');
    const end = at + 8 + view.getUint32(at + 4);
    at += 8;
    const events: SmfEvent[] = [];
    let tick = 0;
    let running = 0;
    const variable = () => {
      let value = 0;
      let byte = 0;
      do {
        byte = bytes[at++] ?? 0;
        value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      return value;
    };
    while (at < end) {
      tick += variable();
      let status = bytes[at] ?? 0;
      if (status < 0x80) status = running;
      else at++;
      if (status === 0xff) {
        const meta = bytes[at++] ?? 0;
        const length = variable();
        const data = bytes.subarray(at, at + length);
        at += length;
        events.push({ tick, status, data, meta, text: decoder.decode(data) });
      } else if (status === 0xf0 || status === 0xf7) {
        const length = variable();
        events.push({ tick, status, data: bytes.subarray(at, at + length) });
        at += length;
      } else {
        running = status;
        const size = (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
        events.push({ tick, status, data: bytes.subarray(at, at + size) });
        at += size;
      }
    }
    expect(events.at(-1)?.meta, 'every track ends with its end').toBe(0x2f);
    tracks.push(events);
  }
  return { format, division, tracks };
}

const texts = (events: readonly SmfEvent[], meta: number) =>
  events.filter(event => event.meta === meta).map(event => event.text);
const notesOn = (events: readonly SmfEvent[]) =>
  events.filter(event => (event.status & 0xf0) === 0x90 && (event.data[1] ?? 0) > 0);
const channels = (events: readonly SmfEvent[], kind: number) =>
  [
    ...new Set(events.filter(event => (event.status & 0xf0) === kind).map(event => event.status & 0x0f)),
  ].sort();

function open(path: string) {
  return openScore(readFixture(path), path.split('/').at(-1) ?? path).score;
}

describe('MIDI export', () => {
  it('EXP-004: a conductor track and a named track per instrument, with every note', () => {
    const score = open('alphatex/demos/twelve-bar-shuffle.atex');
    const smf = readSmf(exportMidi(score));
    expect(smf.format).toBe(1);
    expect(smf.division).toBe(960);
    const [conductor, ...instruments] = smf.tracks;
    if (conductor === undefined) throw new Error('A conductor track expected.');
    expect(texts(conductor, 0x03)).toEqual(['Twelve-Bar Shuffle in A']);
    expect(instruments.map(events => texts(events, 0x03))).toEqual(score.tracks.map(track => [track.name]));
    // Instruments hold no tempo; the conductor holds no notes.
    expect(notesOn(conductor)).toEqual([]);
    for (const events of instruments) expect(events.some(event => event.meta === 0x51)).toBe(false);
    // As many notes per track as alphaTab's generator plays.
    const midiFile = new alphaTab.midi.MidiFile();
    midiFile.format = alphaTab.midi.MidiFileFormat.MultiTrack;
    new alphaTab.midi.MidiFileGenerator(
      score,
      new alphaTab.Settings(),
      new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile, true),
    ).generate();
    const generated = score.tracks.map(
      (_, index) =>
        midiFile.tracks
          .flatMap(track => track.events)
          .filter(event => event.track === index && event.type === alphaTab.midi.MidiEventType.NoteOn).length,
    );
    expect(instruments.map(events => notesOn(events).length)).toEqual(generated);
    expect(generated.every(count => count > 0)).toBe(true);
  });

  it('EXP-004: the tempo map, the meter and a marker each time a section comes round', () => {
    const score = open('alphatab/guitarpro8/beat-tempo-change.gp');
    const [conductor] = readSmf(exportMidi(score)).tracks;
    if (conductor === undefined) throw new Error('A conductor track expected.');
    const tempos = conductor
      .filter(event => event.meta === 0x51)
      .map(event =>
        Math.round(
          60_000_000 / (((event.data[0] ?? 0) << 16) | ((event.data[1] ?? 0) << 8) | (event.data[2] ?? 0)),
        ),
      );
    const expected = score.masterBars.flatMap(bar =>
      bar.tempoAutomations.map(automation => Math.round(automation.value)),
    );
    expect(tempos).toEqual(expected);
    expect(conductor.filter(event => event.meta === 0x58).length).toBeGreaterThan(0);

    const shuffle = open('alphatex/demos/twelve-bar-shuffle.atex');
    const [shuffleConductor] = readSmf(exportMidi(shuffle)).tracks;
    expect(texts(shuffleConductor ?? [], 0x06)).toEqual(['Twelve bars', 'Turnaround', 'Ending']);
  });

  it('EXP-004, EXP-024: bends are pitch bends on a second channel, or on the only one', () => {
    const score = open('alphatab/guitarpro7/bends.gp');
    const track = score.tracks[0];
    if (track === undefined) throw new Error('A track expected.');
    // Two channels: the bent notes and their bends on the second.
    const two = readSmf(exportMidi(score)).tracks[1] ?? [];
    expect(channels(two, 0x90)).toEqual([track.playbackInfo.secondaryChannel]);
    expect(channels(two, 0xe0)).toEqual([track.playbackInfo.secondaryChannel]);
    const one = readSmf(exportMidi(score, { channelsPerTrack: 1 })).tracks[1] ?? [];
    expect(channels(one, 0x90)).toEqual([track.playbackInfo.primaryChannel]);
    expect(channels(one, 0xe0)).toEqual([track.playbackInfo.primaryChannel]);
    // The score is left as it was.
    expect(track.playbackInfo.secondaryChannel).not.toBe(track.playbackInfo.primaryChannel);
  });

  it('EXP-024: muted tracks can be left out', () => {
    const score = open('alphatex/demos/twelve-bar-shuffle.atex');
    const smf = readSmf(exportMidi(score, { leaveOut: [1, 3] }));
    expect(smf.tracks.slice(1).map(events => texts(events, 0x03)[0])).toEqual([
      score.tracks[0]?.name,
      score.tracks[2]?.name,
    ]);
  });
});
