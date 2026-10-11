import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUi } from '../state/ui.ts';
import {
  enterFullScreen,
  leaveFullScreen,
  onBrowserFullScreenChange,
  toggleFullScreen,
} from './full-screen.ts';

/** A browser whose full screen answers when told to, as real ones do a frame or more later. */
function fakeBrowser(enabled: boolean) {
  let element: Element | null = null;
  const answers: (() => void)[] = [];
  // The test DOM has no Fullscreen API: the fake one goes on this document.
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => enabled });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
  const request = vi.fn(
    () =>
      new Promise<void>(resolve => {
        answers.push(() => {
          element = document.documentElement;
          resolve();
        });
      }),
  );
  document.documentElement.requestFullscreen = request;
  const exit = vi.fn(() => {
    element = null;
    return Promise.resolve();
  });
  document.exitFullscreen = exit;
  return {
    request,
    exit,
    /** The browser answers the oldest request, and announces the change. */
    answer: async () => {
      answers.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
      onBrowserFullScreenChange();
    },
    /** The user leaves the browser's full screen (Esc, its own controls). */
    leaveByBrowser: () => {
      element = null;
    },
  };
}

describe('full screen', () => {
  beforeEach(() => {
    leaveFullScreen();
  });
  afterEach(() => {
    Reflect.deleteProperty(document, 'fullscreenEnabled');
    Reflect.deleteProperty(document, 'fullscreenElement');
  });

  it('asks the browser for its full screen too, and leaves it with ours', async () => {
    const browser = fakeBrowser(true);
    toggleFullScreen();
    expect(useUi.getState().fullScreen).toBe(true);
    expect(browser.request).toHaveBeenCalledTimes(1);
    await browser.answer();
    toggleFullScreen();
    expect(useUi.getState().fullScreen).toBe(false);
    expect(browser.exit).toHaveBeenCalledTimes(1);
  });

  it('leaves when the browser leaves its full screen on its own', async () => {
    const browser = fakeBrowser(true);
    enterFullScreen();
    await browser.answer();
    browser.leaveByBrowser();
    onBrowserFullScreenChange();
    expect(useUi.getState().fullScreen).toBe(false);
  });

  it('stays when the end of an earlier full screen is announced after a new request', async () => {
    const browser = fakeBrowser(true);
    enterFullScreen();
    await browser.answer();
    leaveFullScreen();
    enterFullScreen();
    // The exit is announced only now, while the new request is still pending.
    onBrowserFullScreenChange();
    expect(useUi.getState().fullScreen).toBe(true);
    await browser.answer();
    expect(useUi.getState().fullScreen).toBe(true);
    expect(document.fullscreenElement).toBe(document.documentElement);
  });

  it('gives the browser its full screen back when left before it answered', async () => {
    const browser = fakeBrowser(true);
    enterFullScreen();
    leaveFullScreen();
    expect(browser.exit).not.toHaveBeenCalled();
    await browser.answer();
    expect(browser.exit).toHaveBeenCalledTimes(1);
    expect(useUi.getState().fullScreen).toBe(false);
  });

  it('keeps its own full screen where a page may not take the screen (iPhone)', () => {
    const browser = fakeBrowser(false);
    enterFullScreen();
    expect(browser.request).not.toHaveBeenCalled();
    expect(useUi.getState().fullScreen).toBe(true);
    onBrowserFullScreenChange();
    expect(useUi.getState().fullScreen).toBe(true);
  });
});
