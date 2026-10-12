import { describe, expect, it } from 'vitest';
import {
  consumeLaunchedFiles,
  watchForUpdate,
  type LaunchQueue,
  type RegistrationLike,
  type WorkerLike,
} from './pwa.ts';

/** A service worker going through its states. */
class FakeWorker implements WorkerLike {
  public state = 'installing';
  public readonly messages: unknown[] = [];
  private readonly listeners: (() => void)[] = [];
  public postMessage(message: unknown): void {
    this.messages.push(message);
  }
  public addEventListener(_type: 'statechange', listener: () => void): void {
    this.listeners.push(listener);
  }
  public become(state: string): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

class FakeRegistration implements RegistrationLike {
  public waiting: WorkerLike | null = null;
  public installing: WorkerLike | null = null;
  private readonly listeners: (() => void)[] = [];
  public addEventListener(_type: 'updatefound', listener: () => void): void {
    this.listeners.push(listener);
  }
  public found(worker: FakeWorker): void {
    this.installing = worker;
    for (const listener of this.listeners) listener();
  }
}

describe('a new version of the app (PLAT-045)', () => {
  it('is ready once installed beside the running version', () => {
    const registration = new FakeRegistration();
    const ready: WorkerLike[] = [];
    watchForUpdate(
      registration,
      () => true,
      worker => ready.push(worker),
    );
    const worker = new FakeWorker();
    registration.found(worker);
    expect(ready).toEqual([]);
    worker.become('installed');
    expect(ready).toEqual([worker]);
  });

  it('is no news on the very first install, and is ready at once when already waiting', () => {
    const first = new FakeRegistration();
    const ready: WorkerLike[] = [];
    watchForUpdate(
      first,
      () => false,
      worker => ready.push(worker),
    );
    const worker = new FakeWorker();
    first.found(worker);
    worker.become('installed');
    expect(ready).toEqual([]);

    const waiting = new FakeRegistration();
    waiting.waiting = new FakeWorker();
    watchForUpdate(
      waiting,
      () => true,
      worker => ready.push(worker),
    );
    expect(ready).toEqual([waiting.waiting]);
  });
});

describe('files the system opens the installed app with (OPEN-006)', () => {
  it('opens them, as they come', async () => {
    const captured: { consumer?: (params: { files: readonly FileSystemFileHandle[] }) => void } = {};
    const queue: LaunchQueue = {
      setConsumer: next => {
        captured.consumer = next;
      },
    };
    const opened: string[][] = [];
    consumeLaunchedFiles(queue, files => opened.push(files.map(file => file.name)));
    const handle = (name: string) =>
      ({ getFile: () => Promise.resolve(new File(['x'], name)) }) as FileSystemFileHandle;
    expect(captured.consumer).toBeDefined();
    captured.consumer?.({ files: [handle('a.gp'), handle('b.gp5')] });
    await expect.poll(() => opened).toEqual([['a.gp', 'b.gp5']]);
    // Launched without files: nothing to open.
    captured.consumer?.({ files: [] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(opened).toHaveLength(1);
    // Without the API (other browsers): nothing happens.
    expect(() => {
      consumeLaunchedFiles(undefined, () => undefined);
    }).not.toThrow();
  });
});
