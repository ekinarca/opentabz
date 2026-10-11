/**
 * The application's single engine client. Created lazily — main.tsx warms it up right after the
 * first paint so the first dropped file renders without waiting for the engine to load.
 */
import { EngineClient } from './client.ts';

let instance: EngineClient | null = null;
let restartListener: (() => void) | null = null;

export function getEngine(): EngineClient {
  instance ??= new EngineClient({
    createWorker: () =>
      new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module', name: 'OpenTabz engine' }),
    onRestart: () => restartListener?.(),
  });
  return instance;
}

/** Registers the handler that reloads documents after the engine worker was replaced. */
export function onEngineRestart(listener: () => void): void {
  restartListener = listener;
}
