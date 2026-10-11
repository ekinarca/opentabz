/**
 * AudioWorklet processor that plays the shared ring buffer filled by the synth worker. It never
 * allocates in `process`; it pings the synth worker every few milliseconds so it can top up.
 */
import { RingReader, type RingBuffers } from '@opentabz/audio/ring';

/** How often (in frames) the synth worker is asked to refill: about 21 ms at 48 kHz. */
const PING_FRAMES = 1024;

declare abstract class AudioWorkletProcessor {
  public readonly port: MessagePort;
  public constructor(options?: { processorOptions?: unknown });
  public abstract process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}
declare function registerProcessor(
  name: string,
  processor: new (options: { processorOptions?: unknown }) => AudioWorkletProcessor,
): void;

interface RingPlayerOptions {
  readonly ring: RingBuffers;
}

class RingPlayerProcessor extends AudioWorkletProcessor {
  private readonly reader: RingReader;
  private synthPort: MessagePort | null = null;
  private sincePing = 0;

  public constructor(options: { processorOptions?: unknown }) {
    super();
    const { ring } = options.processorOptions as RingPlayerOptions;
    this.reader = new RingReader(ring);
    this.port.onmessage = (event: MessageEvent<{ readonly port: MessagePort }>) => {
      this.synthPort = event.data.port;
    };
  }

  public process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const left = output?.[0];
    if (output === undefined || left === undefined) return true;
    const right = output[1] ?? left;
    this.reader.read(left, right);
    this.sincePing += left.length;
    if (this.sincePing >= PING_FRAMES) {
      this.sincePing = 0;
      this.synthPort?.postMessage(0);
    }
    return true;
  }
}

registerProcessor('opentabz-ring-player', RingPlayerProcessor);
