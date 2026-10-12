/**
 * Main-thread client for the engine worker: typed calls, per-call deadlines and a watchdog that
 * replaces a stuck worker. Never imports the engine itself (ADR-0004).
 */
import type {
  EngineArgs,
  EngineInfo,
  EngineMethod,
  EngineRequestMessage,
  EngineResponseMessage,
  EngineResult,
  SerializedError,
} from '@opentabz/core/shared';

/** Deadline per method, in milliseconds. Generous: real files finish in a fraction of this. */
const DEADLINES: Readonly<Record<EngineMethod, number>> = {
  init: 30_000,
  open: 20_000,
  closeDocument: 5_000,
  layoutView: 15_000,
  paint: 10_000,
  closeView: 5_000,
  edit: 10_000,
  undo: 10_000,
  redo: 10_000,
  trackBeats: 10_000,
  saveDocument: 30_000,
  blankDocument: 10_000,
  connectSynth: 5_000,
  preparePlayback: 20_000,
  previewBeats: 5_000,
  trackNotes: 10_000,
  trackChords: 10_000,
  trackLyrics: 10_000,
  trackDrums: 10_000,
  scoreOverview: 10_000,
  registerMusicFont: 10_000,
  unfoldDocument: 30_000,
  exportAudioSong: 30_000,
  exportMidi: 30_000,
};

export class EngineCallError extends Error {
  public readonly remoteStack: string | null;

  public constructor(error: SerializedError) {
    super(error.message);
    this.name = error.name;
    this.remoteStack = error.stack;
  }
}

/** The engine stopped responding; the worker was replaced and its state is gone. */
export class EngineTimeoutError extends Error {
  public readonly method: EngineMethod;

  public constructor(method: EngineMethod, deadline: number) {
    super(`The engine did not finish "${method}" within ${deadline} ms and was restarted.`);
    this.name = 'EngineTimeoutError';
    this.method = method;
  }
}

interface Pending {
  readonly method: EngineMethod;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** The engine worker could not be started (repeated failures while loading). */
export class EngineUnavailableError extends Error {
  public constructor(detail: string) {
    super(`The engine could not be started: ${detail}`);
    this.name = 'EngineUnavailableError';
  }
}

export interface EngineClientOptions {
  /** Creates a fresh engine worker. */
  readonly createWorker: () => Worker;
  /** Called after a stuck worker was replaced; documents must be reopened. */
  readonly onRestart?: (info: EngineInfo) => void;
  /** Called for errors the worker reports after it started (they are not fatal by themselves). */
  readonly onWorkerError?: (message: string) => void;
}

/** A worker that fails while starting is replaced at most this many times in a row. */
const MAX_START_ATTEMPTS = 3;

export class EngineClient {
  private readonly options: EngineClientOptions;
  private worker: Worker;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private readyPromise: Promise<EngineInfo>;
  private started = false;
  private startAttempts = 0;
  private unavailable: EngineUnavailableError | null = null;

  public constructor(options: EngineClientOptions) {
    this.options = options;
    this.worker = this.spawn();
    this.readyPromise = this.start();
  }

  /** Resolves once the current worker has started and warmed up. */
  public get ready(): Promise<EngineInfo> {
    return this.readyPromise;
  }

  public async call<M extends EngineMethod>(
    method: M,
    args: EngineArgs<M>,
    transfer: Transferable[] = [],
  ): Promise<EngineResult<M>> {
    if (this.unavailable !== null) throw this.unavailable;
    await this.readyPromise;
    return this.request(method, args, transfer);
  }

  public dispose(): void {
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('The engine was shut down.'));
    }
    this.pending.clear();
  }

  private request<M extends EngineMethod>(
    method: M,
    args: EngineArgs<M>,
    transfer: Transferable[] = [],
  ): Promise<EngineResult<M>> {
    const id = this.nextId++;
    const deadline = DEADLINES[method];
    return new Promise<EngineResult<M>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timeout(id);
      }, deadline);
      this.pending.set(id, { method, resolve: resolve as (value: unknown) => void, reject, timer });
      const message: EngineRequestMessage<M> = { kind: 'request', id, method, args };
      this.worker.postMessage(message, transfer);
    });
  }

  private start(): Promise<EngineInfo> {
    this.started = false;
    this.startAttempts += 1;
    const ready = this.request('init', {});
    ready.then(
      () => {
        this.started = true;
        this.startAttempts = 0;
        // Tests and diagnostics wait for this before measuring open times.
        performance.mark('ot:engine-ready');
      },
      () => undefined,
    );
    return ready;
  }

  private spawn(): Worker {
    const worker = this.options.createWorker();
    worker.addEventListener('message', (event: MessageEvent<EngineResponseMessage>) => {
      this.receive(event.data);
    });
    worker.addEventListener('error', event => {
      event.preventDefault();
      if (this.started) {
        // A late error inside the worker is reported; requests still complete or hit their deadline.
        this.options.onWorkerError?.(event.message);
        return;
      }
      this.failAll(new Error(`The engine failed while starting: ${event.message}`));
      this.restart(event.message);
    });
    return worker;
  }

  private receive(message: EngineResponseMessage): void {
    const pending = this.pending.get(message.id);
    if (pending === undefined) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.ok) pending.resolve(message.result);
    else pending.reject(new EngineCallError(message.error));
  }

  private timeout(id: number): void {
    const pending = this.pending.get(id);
    if (pending === undefined) return;
    this.pending.delete(id);
    pending.reject(new EngineTimeoutError(pending.method, DEADLINES[pending.method]));
    this.failAll(new Error('The engine was restarted after another request stopped responding.'));
    this.restart(`"${pending.method}" exceeded its deadline`);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private restart(reason: string): void {
    this.worker.terminate();
    if (!this.started && this.startAttempts >= MAX_START_ATTEMPTS) {
      this.unavailable = new EngineUnavailableError(reason);
      this.readyPromise = Promise.reject(this.unavailable);
      this.readyPromise.catch(() => undefined);
      return;
    }
    const wasStarted = this.started;
    this.worker = this.spawn();
    this.readyPromise = this.start();
    if (wasStarted)
      void this.readyPromise.then(
        info => this.options.onRestart?.(info),
        () => undefined,
      );
  }
}
