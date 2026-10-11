/**
 * Main-thread controller of the audio path (ADR-0015):
 *
 *   engine worker ──MIDI──▶ synth worker ──shared ring──▶ AudioWorklet ──▶ speakers
 *
 * The main thread only sends commands and receives positions; it never touches audio data.
 * The synthesizer, SoundFont and MIDI are prepared ahead of time; the AudioContext is created
 * inside the first play gesture (browsers only allow audible contexts after user activation),
 * so the first note sounds within a few tens of milliseconds of pressing play.
 */
import type { SynthCommand, SynthEvent } from '@opentabz/audio/protocol';
import { createRingBuffers, type RingBuffers } from '@opentabz/audio/ring';
import sonivoxUrl from '@coderline/alphatab/soundfont/sonivox.sf2?url';
import { getEngine } from '../engine/instance.ts';
import workletUrl from './ring-player.worklet.ts?worker&url';

/** The synthesizer renders at this rate; the AudioContext resamples if the device differs. */
export const SYNTH_SAMPLE_RATE = 48_000;
/** About 0.68 s of stereo audio. */
const RING_CAPACITY = 1 << 15;

type Listener = (event: SynthEvent) => void;

export class AudioUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AudioUnavailableError';
  }
}

export class AudioEngine {
  private worker: Worker | null = null;
  private ring: RingBuffers | null = null;
  private workletPort: MessagePort | null = null;
  private context: AudioContext | null = null;
  private outputPromise: Promise<void> | null = null;
  private preparePromise: Promise<void> | null = null;
  private readonly listeners = new Set<Listener>();

  /** Subscribes to every event of the synth worker. */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Starts the synth worker, connects it to the engine and loads the SoundFont. Needs no user
   * gesture; call it as soon as a document is open.
   */
  public prepare(): Promise<void> {
    this.preparePromise ??= this.prepareInternal();
    return this.preparePromise;
  }

  /**
   * Ensures audio output exists. Must be called synchronously from a user gesture handler (the
   * AudioContext is created before the first await).
   */
  public ensureOutput(): Promise<void> {
    if (this.context !== null) {
      if (this.context.state !== 'running') void this.context.resume();
      return this.outputPromise ?? Promise.resolve();
    }
    const context = new AudioContext({ sampleRate: SYNTH_SAMPLE_RATE, latencyHint: 'interactive' });
    this.context = context;
    this.outputPromise = this.connectOutput(context);
    return this.outputPromise;
  }

  public send(command: Exclude<SynthCommand, { type: 'init' }>): void {
    this.worker?.postMessage(command);
  }

  public dispose(): void {
    this.worker?.terminate();
    void this.context?.close();
  }

  private async prepareInternal(): Promise<void> {
    if (typeof SharedArrayBuffer === 'undefined' || !crossOriginIsolated) {
      throw new AudioUnavailableError(
        'This browser does not allow shared memory for audio (cross-origin isolation is off).',
      );
    }
    const ring = createRingBuffers(RING_CAPACITY);
    this.ring = ring;
    const worker = new Worker(new URL('./synth.worker.ts', import.meta.url), {
      type: 'module',
      name: 'OpenTabz synth',
    });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<SynthEvent>) => {
      for (const listener of [...this.listeners]) listener(event.data);
    });

    const workletChannel = new MessageChannel();
    const engineChannel = new MessageChannel();
    this.workletPort = workletChannel.port1;
    await getEngine().call('connectSynth', { port: engineChannel.port1 }, [engineChannel.port1]);

    const ready = this.waitFor(event => event.type === 'ready');
    const init: SynthCommand = {
      type: 'init',
      sampleRate: SYNTH_SAMPLE_RATE,
      ring,
      workletPort: workletChannel.port2,
      enginePort: engineChannel.port2,
    };
    worker.postMessage(init, [workletChannel.port2, engineChannel.port2]);
    await ready;

    const response = await fetch(sonivoxUrl);
    if (!response.ok)
      throw new AudioUnavailableError(`Loading the sound bank failed (HTTP ${response.status}).`);
    const bytes = await response.arrayBuffer();
    const loaded = this.waitFor(
      event => event.type === 'soundFontLoaded' || (event.type === 'error' && event.context === 'soundFont'),
    );
    this.send({ type: 'loadSoundFont', bytes });
    const result = await loaded;
    if (result.type === 'error')
      throw new AudioUnavailableError(`The sound bank could not be read: ${result.message}`);
  }

  private async connectOutput(context: AudioContext): Promise<void> {
    await this.prepare();
    const ring = this.ring;
    const port = this.workletPort;
    if (ring === null || port === null) throw new AudioUnavailableError('The synthesizer is not ready.');
    await context.audioWorklet.addModule(workletUrl);
    const node = new AudioWorkletNode(context, 'opentabz-ring-player', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { ring },
    });
    node.port.postMessage({ port }, [port]);
    node.connect(context.destination);
    this.workletPort = null;
  }

  /** Resolves with the first synth event matching `predicate`. */
  public waitFor(predicate: (event: SynthEvent) => boolean): Promise<SynthEvent> {
    return new Promise(resolve => {
      const unsubscribe = this.subscribe(event => {
        if (!predicate(event)) return;
        unsubscribe();
        resolve(event);
      });
    });
  }
}

let instance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  instance ??= new AudioEngine();
  return instance;
}
