import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetPainted, markPainted, whenPainted } from './first-paint.ts';

describe('first paint', () => {
  afterEach(() => {
    vi.useRealTimers();
    forgetPainted('doc');
  });

  it('waits for the document to paint, and answers at once afterwards', async () => {
    let ready = false;
    const waiting = whenPainted('doc', 10_000).then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);
    markPainted('doc');
    await waiting;
    expect(ready).toBe(true);
    await expect(whenPainted('doc', 10_000)).resolves.toBeUndefined();
  });

  it('never waits forever', async () => {
    vi.useFakeTimers();
    let ready = false;
    const waiting = whenPainted('doc', 3000).then(() => {
      ready = true;
    });
    vi.advanceTimersByTime(2999);
    await Promise.resolve();
    expect(ready).toBe(false);
    vi.advanceTimersByTime(1);
    await waiting;
    expect(ready).toBe(true);
  });
});
