import type { EngineRequestMessage, EngineResponseMessage } from '@opentabz/core/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineCallError, EngineClient, EngineTimeoutError, EngineUnavailableError } from './client.ts';

type Behaviour = (message: EngineRequestMessage) => 'respond' | 'slow' | 'hang' | 'fail' | 'crash';

/** How long a slow request keeps the worker busy (within its deadline, past a quick one's). */
const SLOW_MS = 18_000;

/** A stand-in for the engine worker that answers, hangs, fails or crashes on demand. */
class FakeWorker extends EventTarget {
  public terminated = false;
  public readonly received: EngineRequestMessage[] = [];
  private readonly behaviour: Behaviour;
  /** Until when a slow request keeps the worker busy: what comes after waits, as in the worker. */
  private busyUntil = 0;

  public constructor(behaviour: Behaviour) {
    super();
    this.behaviour = behaviour;
  }

  public postMessage(message: EngineRequestMessage): void {
    this.received.push(message);
    const action = this.behaviour(message);
    if (action === 'slow' || this.busyUntil > Date.now()) {
      this.busyUntil = Math.max(this.busyUntil, Date.now()) + (action === 'slow' ? SLOW_MS : 0);
      setTimeout(() => {
        this.answer(message, 'respond');
      }, this.busyUntil - Date.now());
      return;
    }
    queueMicrotask(() => {
      this.answer(message, action);
    });
  }

  /** Answers a request as the behaviour says (a slow one, once it is done). */
  private answer(message: EngineRequestMessage, action: ReturnType<Behaviour>): void {
    if (this.terminated) return;
    if (action === 'crash') {
      this.dispatchEvent(new ErrorEvent('error', { message: 'boom', cancelable: true }));
      return;
    }
    if (action === 'hang') return;
    const data: EngineResponseMessage =
      action === 'fail'
        ? {
            kind: 'response',
            id: message.id,
            ok: false,
            error: { name: 'OpenFailure', message: 'bad file', stack: null },
          }
        : {
            kind: 'response',
            id: message.id,
            ok: true,
            result:
              message.method === 'init'
                ? { alphaTabVersion: '1.8.4', warmupMs: 1 }
                : { echoed: message.method },
          };
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  public terminate(): void {
    this.terminated = true;
  }
}

function client(behaviours: Behaviour[], onRestart = vi.fn()) {
  const workers: FakeWorker[] = [];
  const engine = new EngineClient({
    createWorker: () => {
      const worker = new FakeWorker(
        behaviours[Math.min(workers.length, behaviours.length - 1)] ?? (() => 'respond'),
      );
      workers.push(worker);
      return worker as unknown as Worker;
    },
    onRestart,
  });
  return { engine, workers, onRestart };
}

describe('EngineClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the worker, then resolves calls with their results', async () => {
    const { engine, workers } = client([() => 'respond']);
    await expect(engine.ready).resolves.toMatchObject({ alphaTabVersion: '1.8.4' });
    await expect(engine.call('closeView', { viewId: 'v' })).resolves.toEqual({ echoed: 'closeView' });
    expect(workers[0]?.received.map(message => message.method)).toEqual(['init', 'closeView']);
  });

  it('turns a remote failure into an EngineCallError with the remote name and message', async () => {
    const { engine } = client([message => (message.method === 'init' ? 'respond' : 'fail')]);
    await engine.ready;
    const call = engine.call('closeView', { viewId: 'v' });
    await expect(call).rejects.toBeInstanceOf(EngineCallError);
    await expect(call).rejects.toMatchObject({ name: 'OpenFailure', message: 'bad file' });
  });

  it('replaces a worker that misses a deadline and reports the restart', async () => {
    const onRestart = vi.fn();
    const { engine, workers } = client(
      [message => (message.method === 'init' ? 'respond' : 'hang'), () => 'respond'],
      onRestart,
    );
    await engine.ready;
    const stuck = engine.call('layoutView', {
      viewId: 'v',
      docId: 'd',
      options: {
        trackIndexes: [0],
        layout: 'page',
        systemsLayout: 'auto',
        staffDisplay: 'default',
        width: 700,
        notationScale: 1,
      },
    });
    const assertion = expect(stuck).rejects.toBeInstanceOf(EngineTimeoutError);
    await vi.advanceTimersByTimeAsync(15_001);
    await assertion;
    expect(workers[0]?.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    await engine.ready;
    expect(onRestart).toHaveBeenCalledOnce();
    // The replacement serves new calls.
    await expect(engine.call('closeView', { viewId: 'v' })).resolves.toEqual({ echoed: 'closeView' });
  });

  it('gives a request waiting behind a slow one its deadline from when the worker starts on it', async () => {
    const onRestart = vi.fn();
    const { engine } = client(
      [message => (message.method === 'unfoldDocument' ? 'slow' : 'respond')],
      onRestart,
    );
    await engine.ready;
    const slow = engine.call('unfoldDocument', { docId: 'd' });
    // Quick (5 s), but answered after the slow one (18 s).
    const quick = engine.call('closeView', { viewId: 'v' });
    await vi.advanceTimersByTimeAsync(SLOW_MS + 1);
    await expect(slow).resolves.toEqual({ echoed: 'unfoldDocument' });
    await expect(quick).resolves.toEqual({ echoed: 'closeView' });
    expect(onRestart).not.toHaveBeenCalled();
  });

  it('gives up after repeated start failures with an EngineUnavailableError', async () => {
    const { engine, workers } = client([() => 'crash']);
    await expect(engine.ready).rejects.toBeInstanceOf(Error);
    await vi.runAllTimersAsync();
    await expect(engine.call('closeView', { viewId: 'v' })).rejects.toBeInstanceOf(EngineUnavailableError);
    expect(workers).toHaveLength(3);
    expect(workers.every(worker => worker.terminated)).toBe(true);
  });
});
