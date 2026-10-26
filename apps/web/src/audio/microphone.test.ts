import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicrophoneListener } from './microphone.ts';

/** An audio context whose second start waits until `started` is called. */
function fakeAudio() {
  let started = (): void => undefined;
  const waiting = new Promise<void>(resolve => {
    started = resolve;
  });
  let resumes = 0;
  const node = () => ({ connect: vi.fn(), gain: { value: 1 }, fftSize: 0, getFloatTimeDomainData: vi.fn() });
  class FakeAudioContext {
    public readonly sampleRate = 48_000;
    public readonly destination = {};
    public resume(): Promise<void> {
      resumes += 1;
      return resumes === 1 ? Promise.resolve() : waiting;
    }
    public close(): Promise<void> {
      return Promise.resolve();
    }
    public createMediaStreamSource = node;
    public createAnalyser = node;
    public createGain = node;
  }
  const track = { stop: vi.fn() };
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: () => Promise.resolve({ getTracks: () => [track] }) },
  });
  return {
    started: () => {
      started();
    },
    track,
  };
}

describe('the tuner’s microphone', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('listens to nothing once closed while its output was starting', async () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const onReading = vi.fn();
    const listener = new MicrophoneListener(onReading);
    const result = listener.start(30);
    // The microphone is granted; the tuner closes before the output has started.
    await vi.advanceTimersByTimeAsync(0);
    listener.stop();
    audio.started();
    expect(await result).toBe('failed');
    expect(audio.track.stop).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onReading).not.toHaveBeenCalled();
  });

  it('listens until closed', async () => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    audio.started();
    const onReading = vi.fn();
    const listener = new MicrophoneListener(onReading);
    expect(await listener.start(30)).toBe('listening');
    await vi.advanceTimersByTimeAsync(200);
    const heard = onReading.mock.calls.length;
    expect(heard).toBeGreaterThan(0);
    listener.stop();
    await vi.advanceTimersByTimeAsync(200);
    expect(onReading).toHaveBeenCalledTimes(heard);
  });
});
