/**
 * Screen Wake Lock: the screen stays on while a score plays, so a player can read it with both
 * hands on the instrument. The browser gives the lock back when the page is hidden (another tab,
 * the home screen); it is taken again when the page comes back while playback goes on, and let go
 * when playback pauses, stops or finishes.
 *
 * Browsers without the API, or that refuse the request (battery saver, a frame), simply keep their
 * usual screen timeout: playback is not affected.
 */
import { useEffect } from 'react';
import { usePlayer } from '../state/player.ts';

let wanted = false;
let sentinel: WakeLockSentinel | null = null;

/** Whether a lock should be held now. Kept in a function because the values change across awaits. */
function shouldHold(): boolean {
  return wanted && sentinel === null && document.visibilityState === 'visible';
}

async function acquire(): Promise<void> {
  if (!shouldHold()) return;
  if (!('wakeLock' in navigator)) return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    // Playback ended or the page went away while the browser was answering: hand it straight back.
    if (!shouldHold()) {
      void lock.release().catch(() => undefined);
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch {
    // The browser can refuse (no user gesture, battery saver, a frame): playback carries on.
  }
}

function release(): void {
  const lock = sentinel;
  sentinel = null;
  if (lock !== null) void lock.release().catch(() => undefined);
}

/** Playback started or ended: take the lock while it plays, give it back otherwise. */
export function keepScreenAwake(playing: boolean): void {
  wanted = playing;
  if (playing) void acquire();
  else release();
}

/** The page came back to the foreground, or left it: take or give back the lock. */
export function syncScreenWakeLock(): void {
  if (document.visibilityState === 'visible') void acquire();
  else release();
}

/** Keeps the screen on for as long as a score plays. */
export function useScreenWakeLock(): void {
  const playing = usePlayer(state => state.transport.status === 'playing');
  useEffect(() => {
    keepScreenAwake(playing);
    document.addEventListener('visibilitychange', syncScreenWakeLock);
    return () => {
      document.removeEventListener('visibilitychange', syncScreenWakeLock);
      keepScreenAwake(false);
    };
  }, [playing]);
}
