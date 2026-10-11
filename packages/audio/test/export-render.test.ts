/**
 * Audio export (EXP-005, EXP-029…EXP-031): the song rendered through the real synth path, faster
 * than real time, as long as it plays; only the selected bars; with the metronome and count-in;
 * at the practice speed and with the mixer applied. And the WAV file it is saved as.
 */
import { generatePlayback, openScore } from '@opentabz/core';
import type { MidiDelivery } from '@opentabz/core/shared';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_METRONOME } from '../src/metronome.ts';
import { renderSong, RenderCancelled, type RenderCommand } from '../src/render.ts';
import { encodeWav } from '../src/wav.ts';
import { fundamental, rms } from './offline.ts';

const SAMPLE_RATE = 44100;
/** Two bars of 4/4 at 120: four seconds. */
const TWO_BARS =
  '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.4 C5.4 E5.4 A5.4 | E5.4 C5.4 A4.2';

function soundFont(): ArrayBuffer {
  const require = createRequire(import.meta.url);
  const dist = dirname(require.resolve('@coderline/alphatab'));
  const bytes = readFileSync(join(dist, 'soundfont', 'sonivox.sf2'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function song(tex: string, tailSeconds = 0): MidiDelivery {
  const { score } = openScore(new TextEncoder().encode(tex), 'song.atex');
  const playback = generatePlayback(score, 'export', undefined, [], tailSeconds);
  return {
    type: 'midi',
    playbackId: 'export',
    midi: playback.midi,
    tickShift: playback.tickShift,
    transpositionPitches: playback.transpositionPitches,
    bars: playback.bars,
    endTick: playback.timeline.endTick,
    centeredChannels: [],
    replace: false,
  };
}

function render(
  tex: string,
  commands: readonly RenderCommand[] = [],
  range: { startTick: number; endTick: number } | null = null,
) {
  return renderSong({ sampleRate: SAMPLE_RATE, soundFont: soundFont(), song: song(tex), commands, range });
}

const seconds = (samples: Float32Array) => samples.length / SAMPLE_RATE;
const window = (samples: Float32Array, from: number, to: number) =>
  samples.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE));

describe('audio export', () => {
  it('EXP-005: renders the whole song, as long as it plays, with every note', async () => {
    const audio = await render(TWO_BARS);
    expect(seconds(audio.left)).toBeGreaterThan(4);
    expect(seconds(audio.left)).toBeLessThan(5);
    for (const second of [0.1, 1.1, 2.1, 3.1])
      expect(rms(window(audio.left, second, second + 0.3))).toBeGreaterThan(0.01);
    expect(audio.left.every(Number.isFinite)).toBe(true);
  });

  it('EXP-005: lets the last notes die away rather than cutting them', async () => {
    // One bar: the song ends as its last note is released, at 2 s.
    const piano =
      '\\tempo 120\n\\track "Piano" {instrument acousticgrandpiano}\n\\staff {score}\nr.2 r.4 C4.4';
    const cut = await renderSong({
      sampleRate: SAMPLE_RATE,
      soundFont: soundFont(),
      song: song(piano),
      commands: [],
      range: null,
    });
    const tail = await renderSong({
      sampleRate: SAMPLE_RATE,
      soundFont: soundFont(),
      song: song(piano, 1.5),
      commands: [],
      range: null,
    });
    expect(seconds(cut.left)).toBeLessThan(2.2);
    expect(seconds(tail.left)).toBeGreaterThan(2 + 1.4);
    expect(seconds(tail.left)).toBeLessThan(2 + 2);
    // The released note rings on softly after the song's end, then dies away.
    const after = rms(window(tail.left, 2.0, 2.3));
    expect(after).toBeGreaterThan(0.001);
    expect(rms(window(tail.left, seconds(tail.left) - 0.2, seconds(tail.left)))).toBeLessThan(after / 4);
  });

  it('EXP-029: renders only the selected bars', async () => {
    const audio = await render(TWO_BARS, [], { startTick: 960 * 4, endTick: 960 * 8 });
    expect(seconds(audio.left)).toBeGreaterThan(2);
    expect(seconds(audio.left)).toBeLessThan(3);
  });

  it('EXP-031: plays at the practice speed', async () => {
    const audio = await render(TWO_BARS, [{ type: 'setSpeed', value: 0.5 }]);
    expect(seconds(audio.left)).toBeGreaterThan(8);
    expect(seconds(audio.left)).toBeLessThan(9);
  });

  it('EXP-030: with the count-in before the song and the metronome through it', async () => {
    const rests = '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nr.1 | r.1';
    const silent = await render(rests);
    expect(rms(silent.left)).toBeLessThan(0.001);
    const clicks = await render(rests, [
      { type: 'setMetronome', enabled: true, volume: 1, settings: DEFAULT_METRONOME },
      { type: 'setCountIn', enabled: true, volume: 1, bars: 1, everyLoop: false },
    ]);
    // A bar of count-in, then the two bars with their clicks.
    expect(seconds(clicks.left)).toBeGreaterThan(6);
    expect(seconds(clicks.left)).toBeLessThan(7.5);
    for (const beat of [0, 1, 2, 3, 4, 5, 8, 11]) {
      const peak = Math.max(...window(clicks.right, beat * 0.5, beat * 0.5 + 0.1).map(Math.abs));
      expect(peak, `click at ${beat * 0.5} s`).toBeGreaterThan(0.01);
    }
  });

  it('EXP-031: with the transposition of the mixer: an octave up sounds an octave up', async () => {
    const a4 = '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.1';
    const plain = await render(a4);
    const octave = await render(a4, [{ type: 'setChannelTranspose', channel: 0, semitones: 12 }]);
    expect(fundamental(window(plain.left, 0.3, 0.8))).toBeCloseTo(440, -1);
    expect(fundamental(window(octave.left, 0.3, 0.8))).toBeCloseTo(880, -1);
  });

  it('applies the mixer: a muted track is silent', async () => {
    const audio = await render(TWO_BARS, [{ type: 'setChannelMute', channel: 0, value: true }]);
    expect(rms(audio.left)).toBeLessThan(0.001);
  });

  it('can be cancelled between chunks', async () => {
    const long = `\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\n${Array(12).fill('A4.1').join(' | ')}`;
    await expect(
      renderSong(
        { sampleRate: SAMPLE_RATE, soundFont: soundFont(), song: song(long), commands: [], range: null },
        { cancelled: () => true },
      ),
    ).rejects.toBeInstanceOf(RenderCancelled);
  });
});

describe('WAV files', () => {
  it('are 16-bit stereo PCM with the samples in order, clipped to full scale', () => {
    const left = Float32Array.of(0, 0.5, -1, 2);
    const right = Float32Array.of(1, -0.5, 0, -2);
    const bytes = encodeWav(left, right, SAMPLE_RATE);
    const view = new DataView(bytes.buffer);
    const text = (from: number, to: number) => new TextDecoder().decode(bytes.subarray(from, to));
    expect([text(0, 4), text(8, 12), text(12, 16), text(36, 40)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect([
      view.getUint16(20, true),
      view.getUint16(22, true),
      view.getUint32(24, true),
      view.getUint16(34, true),
    ]).toEqual([1, 2, SAMPLE_RATE, 16]);
    expect(view.getUint32(40, true)).toBe(4 * 4);
    const pcm = Array.from({ length: 8 }, (_, index) => view.getInt16(44 + index * 2, true));
    expect(pcm).toEqual([0, 32767, 16384, -16384, -32768, 0, 32767, -32768]);
  });
});
