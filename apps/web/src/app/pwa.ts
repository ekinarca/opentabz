/**
 * The installed app (PLAT-001…PLAT-004, PLAT-045): the service worker that keeps the app for use
 * without a network, the notice when a new version is ready (taken only when asked, so that a
 * score open is never cut short), files the system hands over (file handlers, OPEN-006) and files
 * shared to the app (share target, OPEN-007).
 */
import { create } from 'zustand';

/** What the page needs of a service worker. */
export interface WorkerLike {
  readonly state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

/** What the page needs of the service worker's registration. */
export interface RegistrationLike {
  readonly waiting: WorkerLike | null;
  readonly installing: WorkerLike | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
}

/**
 * Calls `ready` with a new version once it is installed beside the running one (the very first
 * install is no news), or at once when one is already waiting.
 */
export function watchForUpdate(
  registration: RegistrationLike,
  running: () => boolean,
  ready: (worker: WorkerLike) => void,
): void {
  if (registration.waiting !== null && running()) ready(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (worker === null) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && running()) ready(worker);
    });
  });
}

interface UpdateState {
  /** A new version is installed and waits. */
  readonly ready: boolean;
  /** Takes the new version: the page reloads with it. */
  readonly apply: () => void;
}

/** Reopens the open scores once after the reload that brings a new version. */
export const REOPEN_ONCE_KEY = 'opentabz.reopen-once';

export const useUpdate = create<UpdateState>(() => ({ ready: false, apply: () => undefined }));

/** How often a running app looks for a new version (the app's own /sw.js only). */
const UPDATE_EVERY = 60 * 60 * 1000;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const container = navigator.serviceWorker;
  container
    .register('/sw.js')
    .then(registration => {
      watchForUpdate(
        registration,
        () => container.controller !== null,
        worker => {
          useUpdate.setState({
            ready: true,
            apply: () => {
              try {
                sessionStorage.setItem(REOPEN_ONCE_KEY, '1');
              } catch {
                // Storage blocked: the scores simply do not reopen.
              }
              container.addEventListener(
                'controllerchange',
                () => {
                  window.location.reload();
                },
                { once: true },
              );
              worker.postMessage('take-over');
            },
          });
        },
      );
      const check = () => {
        registration.update().catch(() => undefined);
      };
      window.setInterval(check, UPDATE_EVERY);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    })
    .catch(() => undefined);
}

/** Whether the reload that brought a new version asks to reopen the scores, once. */
export function takeReopenOnce(): boolean {
  try {
    const asked = sessionStorage.getItem(REOPEN_ONCE_KEY) !== null;
    sessionStorage.removeItem(REOPEN_ONCE_KEY);
    return asked;
  } catch {
    return false;
  }
}

/** The files shared to the app (`?shared=` count), taken from where the service worker kept them. */
export async function takeSharedFiles(count: number): Promise<File[]> {
  if (!('caches' in window) || count <= 0) return [];
  try {
    const cache = await caches.open('opentabz-shared');
    const files: File[] = [];
    for (let index = 0; index < count; index++) {
      const key = `/shared/${String(index)}`;
      const response = await cache.match(key);
      if (response === undefined) continue;
      const name = decodeURIComponent(response.headers.get('X-File-Name') ?? `shared-${String(index + 1)}`);
      files.push(new File([await response.arrayBuffer()], name));
      await cache.delete(key);
    }
    return files;
  } catch {
    return [];
  }
}

/** The files the system opens the installed app with (Chromium's file handlers). */
interface LaunchParams {
  readonly files: readonly FileSystemFileHandle[];
}

export interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

/** Opens the files the installed app is launched with, as they come. */
export function consumeLaunchedFiles(queue: LaunchQueue | undefined, open: (files: File[]) => void): void {
  queue?.setConsumer(params => {
    void Promise.all(params.files.map(handle => handle.getFile()))
      .then(files => {
        if (files.length > 0) open(files);
      })
      .catch(() => undefined);
  });
}
