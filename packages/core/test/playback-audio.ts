/**
 * Offline audio for the playback proof tests: the generated MIDI is rendered by alphaTab's own
 * synthesizer (the TinySoundFont engine and MIDI sequencer that `AlphaSynth` runs in the synth
 * worker) through its audio exporter, with the bundled Sonivox SoundFont. Measuring pitch and
 * level in the result proves that an effect is audible, not just present in the MIDI.
 */
import * as alphaTab from '@coderline/alphatab';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Played } from './playback-helpers.ts';

const SAMPLE_RATE = 44100;

let soundFontBytes: Uint8Array | null = null;

function soundFont(): Uint8Array {
  if (soundFontBytes === null) {
    const require = createRequire(import.meta.url);
    const dist = dirname(require.resolve('@coderline/alphatab'));
    soundFontBytes = new Uint8Array(readFileSync(join(dist, 'soundfont', 'sonivox.sf2')));
  }
  return soundFontBytes;
}

class SilentEmitter implements alphaTab.IEventEmitter {
  public on(_value: () => void): () => void {
    return () => undefined;
  }
  public off(_value: () => void): void {
    // The offline output never raises events.
  }
}

class SilentEmitterOf<T> implements alphaTab.IEventEmitterOfT<T> {
  public on(_value: (arg: T) => void): () => void {
    return () => undefined;
  }
  public off(_value: (arg: T) => void): void {
    // The offline output never raises events.
  }
}

/** `AlphaSynth` needs an output; the exporter renders on demand, so this one stays idle. */
class OfflineOutput implements alphaTab.synth.ISynthOutput {
  public readonly sampleRate = SAMPLE_RATE;
  public readonly ready = new SilentEmitter();
  public readonly sampleRequest = new SilentEmitter();
  public readonly samplesPlayed = new SilentEmitterOf<number>();

  public open(_bufferTimeInMilliseconds: number): void {
    // Nothing to open: samples are pulled from the exporter.
  }
  public play(): void {
    // Never plays in real time.
  }
  public pause(): void {
    // Never plays in real time.
  }
  public destroy(): void {
    // Holds no resources.
  }
  public addSamples(_samples: Float32Array): void {
    // Samples are pulled from the exporter instead.
  }
  public resetSamples(): void {
    // Holds no samples.
  }
  public activate(): void {
    // Nothing to activate.
  }
  public enumerateOutputDevices(): Promise<alphaTab.synth.ISynthOutputDevice[]> {
    return Promise.resolve([]);
  }
  public setOutputDevice(_device: alphaTab.synth.ISynthOutputDevice | null): Promise<void> {
    return Promise.resolve();
  }
  public getOutputDevice(): Promise<alphaTab.synth.ISynthOutputDevice | null> {
    return Promise.resolve(null);
  }
}

export interface RenderedAudio {
  readonly left: Float32Array;
  readonly right: Float32Array;
  /** Length of the song according to the synthesizer's sequencer, in milliseconds. */
  readonly endTime: number;
}

/** Renders the whole score, with the transposition the synth worker applies per channel. */
export function renderAudio(played: Played): RenderedAudio {
  const synth = new alphaTab.synth.AlphaSynth(new OfflineOutput(), 0);
  const options = new alphaTab.synth.AudioExportOptions();
  options.soundFonts = [soundFont()];
  options.sampleRate = SAMPLE_RATE;
  options.useSyncPoints = false;
  const exporter = synth.exportAudio(options, played.midi, [], new Map(played.playback.transpositionPitches));
  const chunks: Float32Array[] = [];
  let endTime = 0;
  for (let chunk = exporter.render(500); chunk !== undefined; chunk = exporter.render(500)) {
    chunks.push(chunk.samples);
    endTime = chunk.endTime;
  }
  const frames = chunks.reduce((sum, samples) => sum + samples.length / 2, 0);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  let frame = 0;
  for (const samples of chunks) {
    for (let index = 0; index + 1 < samples.length; index += 2) {
      left[frame] = samples[index] ?? 0;
      right[frame] = samples[index + 1] ?? 0;
      frame++;
    }
  }
  return { left, right, endTime };
}

/** The samples between two points in time (seconds). */
export function between(samples: Float32Array, from: number, to: number): Float32Array {
  return samples.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE));
}

export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/** Equal-tempered frequency of a MIDI key. */
export function frequencyOf(key: number): number {
  return 440 * 2 ** ((key - 69) / 12);
}

/** How far a frequency is from a MIDI key, in cents (100 cents = one semitone). */
export function centsFrom(frequency: number, key: number): number {
  return 1200 * Math.log2(frequency / frequencyOf(key));
}

/** Power of one frequency (Goertzel). */
export function power(samples: Float32Array, frequency: number): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / SAMPLE_RATE);
  let previous = 0;
  let beforePrevious = 0;
  for (const sample of samples) {
    const current = sample + coefficient * previous - beforePrevious;
    beforePrevious = previous;
    previous = current;
  }
  return (
    (previous * previous + beforePrevious * beforePrevious - coefficient * previous * beforePrevious) /
    Math.max(1, samples.length)
  );
}

/** Fundamental frequency by normalized autocorrelation, searched between 70 Hz and 1200 Hz. */
export function fundamental(samples: Float32Array): number {
  const minLag = Math.floor(SAMPLE_RATE / 1200);
  const maxLag = Math.ceil(SAMPLE_RATE / 70);
  const values: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energy = 0;
    for (let i = 0; i + lag < samples.length; i++) {
      const delayed = samples[i + lag] ?? 0;
      sum += (samples[i] ?? 0) * delayed;
      energy += delayed * delayed;
    }
    values[lag] = energy > 0 ? sum / Math.sqrt(energy) : 0;
  }
  const strongest = Math.max(...values.slice(minLag));
  // The first strong peak, so that a multiple of the period is never picked.
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const value = values[lag] ?? 0;
    if (value > 0.85 * strongest && value >= (values[lag - 1] ?? 0) && value >= (values[lag + 1] ?? 0)) {
      const before = values[lag - 1] ?? 0;
      const after = values[lag + 1] ?? 0;
      const shift = (before - after) / (2 * (before - 2 * value + after));
      return SAMPLE_RATE / (lag + (Number.isFinite(shift) ? shift : 0));
    }
  }
  return 0;
}
