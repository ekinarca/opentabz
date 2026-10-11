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
/** The synth worker answers its first message well within this. */
const START_TIMEOUT_MS = 15_000;
/** Loading the sound bank (1.3 MB) may take this long on a slow connection. */
const SOUND_BANK_TIMEOUT_MS = 120_000;
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
   * gesture; call it as soon as a document is open. A failed start can be retried.
   */
  public prepare(): Promise<void> {
    this.preparePromise ??= this.prepareInternal().catch((error: unknown) => {
      this.worker?.terminate();
      this.worker = null;
      this.preparePromise = null;
      throw error;
    });
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
    // iOS mutes Web Audio with the ring/silent switch unless the session is declared as playback.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session !== undefined) session.type = 'playback';
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
    // A worker that cannot load, or fails later, reports it here: while starting it fails the
    // start, afterwards it reaches the listeners as an error event.
    let starting = true;
    let failStart: (error: AudioUnavailableError) => void = () => undefined;
    const crashed = new Promise<never>((_, reject) => {
      failStart = reject;
    });
    // The failure may come before anything awaits it (WebKit reports that as unhandled).
    crashed.catch(() => undefined);
    worker.addEventListener('error', event => {
      event.preventDefault();
      const message = event.message || 'unknown error';
      if (starting) {
        failStart(new AudioUnavailableError(`The sound engine could not start (${message}).`));
        return;
      }
      const failure: SynthEvent = { type: 'error', context: 'worker', message };
      for (const listener of [...this.listeners]) listener(failure);
    });

    const workletChannel = new MessageChannel();
    const engineChannel = new MessageChannel();
    this.workletPort = workletChannel.port1;
    await getEngine().call('connectSynth', { port: engineChannel.port1 }, [engineChannel.port1]);

    const ready = this.waitFor(
      event => event.type === 'ready' || (event.type === 'error' && event.context === 'init'),
    );
    const init: SynthCommand = {
      type: 'init',
      sampleRate: SYNTH_SAMPLE_RATE,
      ring,
      workletPort: workletChannel.port2,
      enginePort: engineChannel.port2,
    };
    worker.postMessage(init, [workletChannel.port2, engineChannel.port2]);
    const started = await withTimeout(
      Promise.race([ready, crashed]),
      START_TIMEOUT_MS,
      'The sound engine did not start.',
    );
    if (started.type === 'error')
      throw new AudioUnavailableError(`The sound engine could not start: ${started.message}`);

    const loadSoundBank = async () => {
      const response = await fetch(sonivoxUrl);
      if (!response.ok)
        throw new AudioUnavailableError(`Loading the sound bank failed (HTTP ${response.status}).`);
      const bytes = await response.arrayBuffer();
      const loaded = this.waitFor(
        event =>
          event.type === 'soundFontLoaded' || (event.type === 'error' && event.context === 'soundFont'),
      );
      this.send({ type: 'loadSoundFont', bytes });
      return loaded;
    };
    const result = await withTimeout(
      Promise.race([loadSoundBank(), crashed]),
      SOUND_BANK_TIMEOUT_MS,
      'Loading the sounds took too long. Check the connection and try again.',
    );
    starting = false;
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

/** `promise`, or an error after `milliseconds`: a step that never answers fails instead of hanging. */
function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AudioUnavailableError(message));
    }, milliseconds);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new AudioUnavailableError(String(error)));
      },
    );
  });
}

let instance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  instance ??= new AudioEngine();
  return instance;
}
