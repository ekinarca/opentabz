/**
 * The tuner's microphone (PRAC-100): sound analysed on this device as it comes in, about twenty
 * times a second. Nothing is recorded, kept or sent, and the microphone is released as soon as
 * the tuner closes.
 */
import { detectPitch, type PitchReading } from '@opentabz/audio/pitch';

export type MicrophoneResult = 'listening' | 'denied' | 'unavailable' | 'failed';

/** Samples per analysed frame: two periods of a five-string bass's low B at 48 kHz. */
const FRAME = 4096;
const INTERVAL_MS = 50;

export class MicrophoneListener {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  public constructor(private readonly onReading: (reading: PitchReading | null, time: number) => void) {}

  /** Asks for the microphone and starts listening for pitches above `minFrequency`. */
  public async start(minFrequency: number): Promise<MicrophoneResult> {
    const devices = (navigator as Partial<Navigator>).mediaDevices;
    if (devices === undefined) return 'unavailable';
    // Made before the first wait, while the click that opened the tuner still counts: Safari
    // starts audio only then.
    const context = new AudioContext();
    this.context = context;
    void context.resume().catch(() => undefined);
    let stream: MediaStream;
    try {
      // The raw sound: processing meant for voice calls bends a sustained note.
      stream = await devices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (error) {
      this.stop();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
      if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'unavailable';
      return 'failed';
    }
    if (this.stopped) {
      for (const track of stream.getTracks()) track.stop();
      return 'failed';
    }
    this.stream = stream;
    await context.resume().catch(() => undefined);
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = FRAME;
    // Pulled through a silent gain so every browser keeps analysing; nothing is heard.
    const silence = context.createGain();
    silence.gain.value = 0;
    source.connect(analyser);
    analyser.connect(silence);
    silence.connect(context.destination);
    const samples = new Float32Array(FRAME);
    this.timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      this.onReading(detectPitch(samples, context.sampleRate, { minFrequency }), performance.now());
    }, INTERVAL_MS);
    return 'listening';
  }

  public stop(): void {
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
