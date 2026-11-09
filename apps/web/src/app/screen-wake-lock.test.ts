import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepScreenAwake, syncScreenWakeLock } from './screen-wake-lock.ts';

interface FakeSentinel extends WakeLockSentinel {
  readonly released: boolean;
}

function fakeSentinel(): FakeSentinel {
  const listeners = new Set<() => void>();
  const sentinel = {
    type: 'screen' as const,
    released: false,
    onrelease: null,
    release: vi.fn(() => {
      sentinel.released = true;
      for (const listener of listeners) listener();
      return Promise.resolve();
    }),
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(() => true),
  };
  return sentinel;
}

/** A browser whose Screen Wake Lock API answers with a lock we can inspect. */
function fakeWakeLock() {
  const sentinels: FakeSentinel[] = [];
  const request = vi.fn(() => {
    const sentinel = fakeSentinel();
    sentinels.push(sentinel);
    return Promise.resolve(sentinel);
  });
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  return { request, sentinels };
}

function setVisible(visible: boolean): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  });
}

describe('screen wake lock', () => {
  beforeEach(() => {
    setVisible(true);
  });

  afterEach(() => {
    keepScreenAwake(false);
    Reflect.deleteProperty(navigator, 'wakeLock');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('holds a screen lock while playback plays, and gives it back when it stops', async () => {
    const { request, sentinels } = fakeWakeLock();
    keepScreenAwake(true);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    const lock = sentinels[0];
    expect(lock?.released).toBe(false);

    keepScreenAwake(false);
    await vi.waitFor(() => {
      expect(lock?.released).toBe(true);
    });
  });

  it('does not take a second lock while one is held', async () => {
    const { request } = fakeWakeLock();
    keepScreenAwake(true);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    keepScreenAwake(true);
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('takes the lock again when the page comes back while playback goes on', async () => {
    const { request, sentinels } = fakeWakeLock();
    keepScreenAwake(true);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    setVisible(false);
    syncScreenWakeLock();
    await vi.waitFor(() => {
      expect(sentinels[0]?.released).toBe(true);
    });

    setVisible(true);
    syncScreenWakeLock();
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  it('does not take the lock while the page is hidden', async () => {
    const { request } = fakeWakeLock();
    setVisible(false);
    keepScreenAwake(true);
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
  });

  it('gives back a lock that arrives after playback has stopped', async () => {
    let answer: ((lock: FakeSentinel) => void) | undefined;
    const request = vi.fn(
      () =>
        new Promise<WakeLockSentinel>(resolve => {
          answer = lock => {
            resolve(lock);
          };
        }),
    );
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    const lock = fakeSentinel();

    keepScreenAwake(true);
    keepScreenAwake(false);
    answer?.(lock);
    await vi.waitFor(() => {
      expect(lock.released).toBe(true);
    });
  });

  it('carries on when the browser refuses the lock', async () => {
    const request = vi.fn(() => Promise.reject(new Error('not allowed')));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    keepScreenAwake(true);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    await Promise.resolve();
  });

  it('carries on where the Screen Wake Lock API is missing', async () => {
    keepScreenAwake(true);
    await Promise.resolve();
  });
});
