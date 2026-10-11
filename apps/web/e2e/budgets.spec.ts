/**
 * Performance budgets (ARCHITECTURE.md §9), measured in the browser with the app's own
 * performance marks. They are enforced on Chromium, the reference browser; the other engines run
 * the same flows and report their numbers.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, measure, openHome, test } from './support.ts';

const BUDGET = {
  warmStartMs: 1000,
  dropSmallMs: 300,
  dropLargeMs: 1500,
  layoutMs: 100,
  playStartMs: 100,
  /** 95th percentile of frame intervals while the cursor follows playback (60 fps is 16.7 ms). */
  frameMs: 20,
};

function check(actual: number, budget: number, browserName: string, label: string): void {
  test.info().annotations.push({
    type: 'budget',
    description: `${label}: ${Math.round(actual)} ms (budget ${budget} ms, ${browserName})`,
  });
  if (browserName === 'chromium') expect(actual, label).toBeLessThan(budget);
}

/** Waits until the engine worker has finished its warm-up (it starts after the first paint). */
async function engineWarm(page: Page): Promise<void> {
  await page.waitForFunction(() => performance.getEntriesByName('ot:engine-ready', 'mark').length > 0);
}

test.describe('budgets', () => {
  test.skip(({ isMobile }) => isMobile, 'Budgets are defined for desktop browsers.');

  test('warm start', async ({ page, browserName }) => {
    await openHome(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // From navigation start to the app being mounted and interactive, with a warm HTTP cache.
    const ready = await page.evaluate(
      () => performance.getEntriesByName('ot:app-ready', 'mark')[0]?.startTime ?? Number.POSITIVE_INFINITY,
    );
    check(ready, BUDGET.warmStartMs, browserName, 'warm start to interactive');
  });

  test('drop to first render: 5 tracks × 150 bars', async ({ page, browserName }) => {
    await openHome(page);
    await engineWarm(page);
    await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
    await expectScore(page);
    check(
      await measure(page, 'ot:drop-to-paint'),
      BUDGET.dropSmallMs,
      browserName,
      'drop to paint (5 × 150)',
    );
  });

  test('drop to first render: 20 tracks × 500 bars', async ({ page, browserName }) => {
    await openHome(page);
    await engineWarm(page);
    await dropFiles(page, [fixture('generated/perf-20x500.gp')]);
    await expectScore(page);
    check(
      await measure(page, 'ot:drop-to-paint'),
      BUDGET.dropLargeMs,
      browserName,
      'drop to paint (20 × 500)',
    );
  });

  test('changing the view is a local operation', async ({ page, browserName }) => {
    await openHome(page);
    await engineWarm(page);
    await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
    await expectScore(page);
    const results: number[] = [];
    for (const name of ['Tab', 'Notation', 'Notation + tab']) {
      await page.evaluate(() => {
        performance.clearMeasures('ot:layout');
      });
      await page.getByRole('button', { name: /^Staves:/ }).click();
      await page.getByRole('menuitemradio', { name, exact: true }).click();
      results.push(await measure(page, 'ot:layout'));
    }
    check(Math.max(...results), BUDGET.layoutMs, browserName, 'view change (5 × 150)');
  });

  test('the cursor and the view follow playback at 60 frames a second', async ({ page, browserName }) => {
    await openHome(page);
    await engineWarm(page);
    await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
    await expectScore(page);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled({ timeout: 20_000 });
    // Fast, so the view scrolls to a new system every couple of seconds while frames are timed.
    await page.getByRole('button', { name: /^Playback speed: / }).click();
    await page.getByRole('button', { name: '300 %', exact: true }).click();
    await page.keyboard.press('Escape');
    await play.click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    const intervals = await page.evaluate(
      () =>
        new Promise<number[]>(resolve => {
          const times: number[] = [];
          const frame = (time: number) => {
            times.push(time);
            if (times.length < 300) requestAnimationFrame(frame);
            else resolve(times.slice(1).map((value, index) => value - (times[index] ?? value)));
          };
          requestAnimationFrame(frame);
        }),
    );
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const sorted = [...intervals].sort((a, b) => a - b);
    check(
      sorted[Math.floor(sorted.length * 0.95)] ?? Infinity,
      BUDGET.frameMs,
      browserName,
      'frame time, p95',
    );
    // The music moved on to other systems while the frames were timed: the view scrolled.
    expect(
      await page.locator('.ot-scroll:not([hidden])').evaluate(element => element.scrollTop),
    ).toBeGreaterThan(0);
  });

  test('playback starts quickly', async ({ page, browserName }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled({ timeout: 20_000 });
    // First start creates the audio output; later starts are what a musician feels while practising.
    await play.click();
    await measure(page, 'ot:play-start');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(play).toBeVisible();
    await page.evaluate(() => {
      performance.clearMeasures('ot:play-start');
    });
    await play.click();
    check(await measure(page, 'ot:play-start'), BUDGET.playStartMs, browserName, 'play to sound');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });
});
