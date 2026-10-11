/**
 * Full screen (VIEW-013): the score fills the screen with the app's bars put away. Where a page may
 * take the whole screen (not on iPhone) the browser's full screen comes with it, and leaving that
 * (Esc, or the browser's own controls) leaves ours too.
 */
import { useEffect } from 'react';
import { useUi } from '../state/ui.ts';

/** The element the browser shows full screen, or null (also where the API is missing). */
function browserFullScreen(): Element | null {
  return document.fullscreenElement ?? null;
}

/** Counts our requests, entering and leaving: an answer to an older one is out of date. */
let requests = 0;
/** The browser shows the page full screen because we asked: its end is ours too. */
let inBrowser = false;

export function enterFullScreen(): void {
  useUi.getState().setFullScreen(true);
  if (!document.fullscreenEnabled || browserFullScreen() !== null) return;
  const request = ++requests;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(
    () => {
      if (request === requests) inBrowser = true;
      // Left again while the browser was answering.
      else if (!useUi.getState().fullScreen) document.exitFullscreen().catch(() => undefined);
    },
    // Declined (no user gesture, say): the app's own full screen stays.
    () => undefined,
  );
}

export function leaveFullScreen(): void {
  requests++;
  inBrowser = false;
  useUi.getState().setFullScreen(false);
  if (browserFullScreen() !== null) document.exitFullscreen().catch(() => undefined);
}

export function toggleFullScreen(): void {
  if (useUi.getState().fullScreen) leaveFullScreen();
  else enterFullScreen();
}

/**
 * Answers the browser's `fullscreenchange`: when its full screen ends on its own, the app's ends
 * too. The end of an earlier full screen can be announced late, after a new request: it changes
 * nothing.
 */
export function onBrowserFullScreenChange(): void {
  if (browserFullScreen() !== null || !inBrowser) return;
  inBrowser = false;
  useUi.getState().setFullScreen(false);
}

export function useFullScreenSync(): void {
  useEffect(() => {
    document.addEventListener('fullscreenchange', onBrowserFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onBrowserFullScreenChange);
    };
  }, []);
}
