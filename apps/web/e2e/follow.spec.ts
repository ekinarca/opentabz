/**
 * Following the music: scrolling continuously or page by page (or not at all) and where the
 * playing line sits, the cursor's style and colour, the bar and note highlights, and scrolling by
 * hand while playing. The cursor and the view are sampled every frame in the page, so the checks
 * follow the music rather than the clock.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function ready(page: Page): Promise<void> {
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await ready(page);
}

/** 150 bars: enough systems to scroll through. */
async function openLongSong(page: Page): Promise<void> {
  await openHome(page);
  await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
  await ready(page);
  await page.getByRole('button', { name: /^Playback speed: / }).click();
  await page.getByRole('button', { name: '300 %', exact: true }).click();
  await page.keyboard.press('Escape');
}

async function following(page: Page) {
  await page.getByRole('button', { name: 'Following the music' }).click();
  const panel = page.getByRole('dialog', { name: 'Following the music' });
  await expect(panel).toBeVisible();
  return panel;
}

async function choose(page: Page, role: 'radio' | 'switch', name: string): Promise<void> {
  const panel = await following(page);
  await panel.getByRole(role, { name, exact: true }).click();
  await page.keyboard.press('Escape');
}

async function play(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
}

async function pause(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
}

/** Stops and goes back to the start (phones keep this in the ⋯ menu). */
async function stop(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Stop and go to the start' });
  if (await button.isVisible()) {
    await button.click();
  } else {
    await page.getByRole('button', { name: 'More playback controls' }).click();
    await page.getByRole('menuitem', { name: 'Stop and go to the start' }).click();
  }
}

function scroller(page: Page) {
  return page.locator('.ot-scroll:not([hidden])');
}

/** The style rules colouring the notes being played (empty when none are). */
function highlightCss(page: Page): Promise<string> {
  return page.evaluate(() =>
    [...document.querySelectorAll('.ot-overlay style')].map(style => style.textContent).join(''),
  );
}

interface Frame {
  /** How far the view is scrolled. */
  readonly scrollTop: number;
  /** The playing system's top and bottom in the view, and the view's height. */
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
  /** The playing system's place in the whole score (the same while the music stays on it). */
  readonly system: number;
}

/** Samples the view and the playing system every frame, until the music reached `systems` more systems. */
function followFor(page: Page, systems: number): Promise<Frame[]> {
  return page.evaluate(
    count =>
      new Promise<Frame[]>(resolve => {
        const frames: Frame[] = [];
        let changes = 0;
        const deadline = performance.now() + 45_000;
        const sample = () => {
          const view = document.querySelector('.ot-scroll:not([hidden])');
          const line = view?.querySelector('.ot-cursor-beat') ?? null;
          if (view !== null && line !== null) {
            const area = view.getBoundingClientRect();
            const box = line.getBoundingClientRect();
            const top = box.top - area.top;
            const frame = {
              scrollTop: view.scrollTop,
              top,
              bottom: box.bottom - area.top,
              height: view.clientHeight,
              system: Math.round(top + view.scrollTop),
            };
            const previous = frames.at(-1);
            if (previous !== undefined && Math.abs(previous.system - frame.system) > 8) changes += 1;
            frames.push(frame);
          }
          if (changes >= count || performance.now() > deadline) resolve(frames);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    systems,
  );
}

/** Frames (by index) where the music moved on to another system. */
function systemChanges(frames: readonly Frame[]): number[] {
  const changes: number[] = [];
  for (let index = 1; index < frames.length; index++) {
    const [before, now] = [frames[index - 1], frames[index]];
    if (before !== undefined && now !== undefined && Math.abs(now.system - before.system) > 8) {
      changes.push(index);
    }
  }
  return changes;
}

/** Frames (by index) where the view scrolled. */
function viewMoves(frames: readonly Frame[]): number[] {
  const moves: number[] = [];
  for (let index = 1; index < frames.length; index++) {
    const [before, now] = [frames[index - 1], frames[index]];
    if (before !== undefined && now !== undefined && Math.abs(now.scrollTop - before.scrollTop) > 0.5) {
      moves.push(index);
    }
  }
  return moves;
}

function inView(frame: Frame): boolean {
  return frame.top >= -1 && frame.bottom <= frame.height + 1;
}

interface Places {
  /** Per bar played (told apart by the bar highlight), the places the beat line took. */
  readonly perBar: number[];
  /** Whether the line ever glided (an animation from one place to another). */
  readonly glided: boolean;
}

/** Samples the cursor every frame, until `bars` bars have been played through. */
function cursorPlaces(page: Page, bars: number): Promise<Places> {
  return page.evaluate(
    count =>
      new Promise<Places>(resolve => {
        const places = new Map<string, Set<string>>();
        let glided = false;
        const deadline = performance.now() + 45_000;
        const sample = () => {
          const view = document.querySelector('.ot-scroll:not([hidden])');
          const bar = view?.querySelector('.ot-cursor-bar');
          const effect = view?.querySelector('.ot-cursor-beat')?.getAnimations()[0]?.effect;
          if (bar instanceof HTMLElement && effect instanceof KeyframeEffect) {
            const [from, to] = effect.getKeyframes();
            const start = String(from?.['transform']);
            if (start !== String(to?.['transform'])) glided = true;
            const key = `${bar.style.transform} ${bar.style.width}`;
            places.set(key, (places.get(key) ?? new Set<string>()).add(start));
          }
          if (places.size > count || performance.now() > deadline) {
            resolve({ perBar: [...places.values()].slice(0, count).map(set => set.size), glided });
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      }),
    bars,
  );
}

/** Scrolls the score down by hand: the mouse wheel, or a finger swiping up on phones. */
async function scrollByHand(page: Page, isMobile: boolean): Promise<void> {
  const box = await scroller(page).boundingBox();
  if (box === null) throw new Error('No score on screen.');
  const x = box.x + box.width / 2;
  if (!isMobile) {
    await scroller(page).hover({ position: { x: box.width / 2, y: box.height / 2 } });
    await page.mouse.wheel(0, 1600);
    return;
  }
  const touch = await page.context().newCDPSession(page);
  for (let swipe = 0; swipe < 3; swipe++) {
    const from = box.y + box.height * 0.85;
    const to = box.y + box.height * 0.1;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
    for (let step = 1; step <= 8; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: from + ((to - from) * step) / 8 }],
      });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await touch.detach();
}

/**
 * Scrolls by hand until `check` passes. A busy page can drop an input event (the view then does
 * not move at all), and a user would simply scroll again.
 */
async function scrollAwayByHand(page: Page, isMobile: boolean, check: () => Promise<void>): Promise<void> {
  await expect(async () => {
    await scrollByHand(page, isMobile);
    await check();
  }).toPass({ timeout: 20_000 });
}

/** Where the view is scrolled once it has come to rest (a hand scroll may still be gliding). */
async function restingScrollTop(page: Page): Promise<number> {
  let last = Number.NaN;
  await expect
    .poll(async () => {
      const now = await scroller(page).evaluate(element => element.scrollTop);
      const resting = Math.abs(now - last) < 0.5;
      last = now;
      return resting;
    })
    .toBe(true);
  return last;
}

/** Whether the playing system is in view. */
async function musicInView(page: Page): Promise<boolean> {
  const frames = await page.evaluate(
    () =>
      new Promise<number[][]>(resolve => {
        const samples: number[][] = [];
        const sample = () => {
          const view = document.querySelector('.ot-scroll:not([hidden])');
          const line = view?.querySelector('.ot-cursor-beat') ?? null;
          if (view !== null && line !== null) {
            const area = view.getBoundingClientRect();
            const box = line.getBoundingClientRect();
            samples.push([box.top - area.top, box.bottom - area.top, view.clientHeight]);
          }
          if (samples.length >= 3) resolve(samples);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
  return frames.every(([top = 0, bottom = 0, height = 0]) => top >= -1 && top < height && bottom > 0);
}

test.describe('following the music', () => {
  test('colours the cursor and the notes being played, as chosen and remembered', async ({ page }) => {
    await openShuffle(page);
    await choose(page, 'radio', 'Blue');
    await expect(scroller(page)).toHaveAttribute('data-cursor-color', 'blue');
    await page.reload();
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await ready(page);
    await expect(scroller(page)).toHaveAttribute('data-cursor-color', 'blue');

    await play(page);
    // The beat line and the notes of the beat being played are drawn in the chosen colour.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const view = document.querySelector('.ot-scroll:not([hidden])');
          const line = view?.querySelector('.ot-cursor-beat');
          const css = [...document.querySelectorAll('.ot-overlay style')]
            .map(style => style.textContent)
            .join('');
          const beat = /\.(b\d+) :is/.exec(css)?.[1];
          const note = beat === undefined ? null : (view?.querySelector(`g.${beat} text`) ?? null);
          return {
            line: line === null || line === undefined ? null : getComputedStyle(line).backgroundColor,
            note: note === null ? null : getComputedStyle(note).fill,
          };
        }),
      )
      .toEqual({ line: 'rgb(47, 124, 246)', note: 'rgb(47, 124, 246)' });
    await expect(scroller(page).locator('.ot-cursor-bar')).toBeVisible();
    await pause(page);
    // Paused, no notes are coloured.
    await expect.poll(() => highlightCss(page)).toBe('');

    // Both highlights switched off: neither shows while playing.
    await choose(page, 'switch', 'Colour the notes being played');
    await choose(page, 'switch', 'Highlight the bar');
    const places = cursorPlaces(page, 1);
    await play(page);
    await places;
    expect(await highlightCss(page)).toBe('');
    await expect(scroller(page).locator('.ot-cursor-bar')).toBeHidden();
    await expect(scroller(page).locator('.ot-cursor-beat')).toBeVisible();
    await pause(page);
  });

  test('the cursor glides, steps from note to note or beat to beat, or hides', async ({ page }) => {
    await openShuffle(page);
    // The shuffle's guitar plays eight notes a bar, in 4/4.
    let places = cursorPlaces(page, 2);
    await play(page);
    expect(await places).toEqual({ perBar: [8, 8], glided: true });
    await stop(page);

    await choose(page, 'radio', 'Per note');
    places = cursorPlaces(page, 2);
    await play(page);
    expect(await places).toEqual({ perBar: [8, 8], glided: false });
    await stop(page);

    await choose(page, 'radio', 'Per beat');
    places = cursorPlaces(page, 2);
    await play(page);
    expect(await places).toEqual({ perBar: [4, 4], glided: false });
    await stop(page);

    // Hidden: the bar is still highlighted, without the line.
    await choose(page, 'radio', 'Hidden');
    places = cursorPlaces(page, 1);
    await play(page);
    await places;
    await expect(scroller(page).locator('.ot-cursor-beat')).toBeHidden();
    await expect(scroller(page).locator('.ot-cursor-bar')).toBeVisible();
    await pause(page);
  });

  test('scrolls continuously at the playing line, page by page, or not at all', async ({ page }) => {
    await openLongSong(page);

    await choose(page, 'radio', 'Off');
    let frames = await Promise.all([followFor(page, 2), play(page)]).then(([sampled]) => sampled);
    expect(systemChanges(frames)).toHaveLength(2);
    expect(viewMoves(frames)).toEqual([]);
    await stop(page);

    // Continuous, with the playing line 60 % down the view: each new system scrolls there.
    let panel = await following(page);
    await panel.getByRole('radio', { name: 'Continuous', exact: true }).click();
    const line = panel.getByRole('slider', { name: 'Playing line' });
    await line.focus();
    await page.keyboard.press('End');
    await expect(line).toHaveAttribute('aria-valuetext', '60 % from the top');
    await page.keyboard.press('Escape');
    // (On phones the first systems are all in view at that line: scrolling starts with the third.)
    frames = await Promise.all([followFor(page, 3), play(page)]).then(([sampled]) => sampled);
    const settled = frames.filter(frame => frame.scrollTop > 1).map(frame => frame.top / frame.height);
    settled.sort((a, b) => a - b);
    expect(settled.length).toBeGreaterThan(0);
    expect(settled[Math.floor(settled.length / 2)]).toBeCloseTo(0.6, 1);
    await stop(page);

    // Page by page: the view stays put while the music is in view, then turns at once.
    await scroller(page).evaluate(element => {
      element.scrollTop = 0;
    });
    panel = await following(page);
    await panel.getByRole('radio', { name: 'Page by page', exact: true }).click();
    await expect(panel.getByRole('slider', { name: 'Playing line' })).toBeHidden();
    await page.keyboard.press('Escape');
    frames = await Promise.all([followFor(page, 5), play(page)]).then(([sampled]) => sampled);
    await pause(page);
    const changes = systemChanges(frames);
    const moves = viewMoves(frames);
    expect(moves.length).toBeGreaterThan(0);
    // Some systems came into play without the view moving: they were in view already.
    expect(moves.length).toBeLessThan(changes.length);
    for (const move of moves) {
      // Every turn happens as the music reaches another system, in one go, bringing it in view.
      expect(changes).toContain(move);
      const frame = frames[move];
      expect(frame === undefined ? false : inView(frame)).toBe(true);
    }
  });

  test('scrolling by hand pauses the following until asked back', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile && browserName === 'webkit', 'Playwright cannot swipe in WebKit on phones.');
    await openLongSong(page);
    await play(page);
    const back = page.getByRole('button', { name: 'Back to the music' });
    await scrollAwayByHand(page, isMobile, async () => {
      await expect(back).toBeVisible({ timeout: 2000 });
    });
    await expect.poll(() => musicInView(page)).toBe(false);

    // The music moves on to other systems, and the view stays where it was taken.
    const scrolledTo = await restingScrollTop(page);
    let frames = await followFor(page, 2);
    expect(systemChanges(frames)).toHaveLength(2);
    expect(frames.every(frame => Math.abs(frame.scrollTop - scrolledTo) < 1)).toBe(true);

    await back.click();
    await expect(back).toBeHidden();
    await expect.poll(() => musicInView(page)).toBe(true);
    // Following again.
    frames = await followFor(page, 2);
    expect(viewMoves(frames).length).toBeGreaterThan(0);

    // Pressing play again also comes back to the music, as it does after looking around paused.
    await scrollAwayByHand(page, isMobile, async () => {
      await expect(back).toBeVisible({ timeout: 2000 });
    });
    await pause(page);
    await expect(back).toBeVisible();
    await play(page);
    await expect(back).toBeHidden();
    await expect.poll(() => musicInView(page)).toBe(true);
    await pause(page);
    await scrollAwayByHand(page, isMobile, async () => {
      await expect.poll(() => musicInView(page), { timeout: 2000 }).toBe(false);
    });
    await expect(back).toBeHidden();
    await play(page);
    await expect.poll(() => musicInView(page)).toBe(true);
    await pause(page);
  });
});
