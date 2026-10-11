/**
 * Real-world files the owner keeps in fixtures/private (gitignored, never committed): each one
 * must open, render, play and keep the cursor moving forward. Without such files (CI) the tests
 * are skipped.
 */
import { readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { dropFiles, elapsedSeconds, expect, expectScore, FIXTURES, openHome, test } from './support.ts';

const SCORE = /\.(gp|gp3|gp4|gp5|gpx|xml|musicxml|mxl|capx)$/i;

function privateScores(): string[] {
  const root = join(FIXTURES, 'private');
  const found: string[] = [];
  const walk = (dir: string): void => {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (SCORE.test(name)) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

const scores = privateScores();

test.describe('private real-world files', () => {
  test.skip(scores.length === 0, 'No private files here: they are kept locally and never committed.');
  test.skip(({ isMobile }) => isMobile, 'Desktop is enough for a smoke test of local files.');

  for (const path of scores) {
    test(`${basename(path)} opens, renders and plays with the cursor moving forward`, async ({ page }) => {
      await page.addInitScript(() => {
        const seen = new WeakSet<Animation>();
        const log: { t: number; from: number; to: number; y: number; duration: number }[] = [];
        Object.assign(window, { cursorGlides: log });
        const position = (frame: ComputedKeyframe | undefined) =>
          /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(String(frame?.['transform'] ?? '')) ?? [];
        setInterval(() => {
          const cursor = document.querySelector('.ot-scroll:not([hidden]) .ot-cursor-beat');
          for (const animation of cursor?.getAnimations() ?? []) {
            if (seen.has(animation)) continue;
            seen.add(animation);
            const effect = animation.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            const frames = effect.getKeyframes();
            const [, fromX, y] = position(frames[0]);
            const [, toX] = position(frames[1]);
            log.push({
              t: Number(animation.startTime ?? document.timeline.currentTime ?? 0),
              from: Number(fromX),
              to: Number(toX),
              y: Number(y),
              duration: Number(effect.getTiming().duration ?? 0),
            });
          }
        }, 4);
      });
      await openHome(page);
      await dropFiles(page, [path]);
      await expectScore(page);
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => elapsedSeconds(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(6);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      const backward = await page.evaluate(() => {
        const log = (
          window as unknown as {
            cursorGlides: { t: number; from: number; to: number; y: number; duration: number }[];
          }
        ).cursorGlides;
        let count = 0;
        log.forEach((current, index) => {
          const previous = log[index - 1];
          if (previous?.y !== current.y) return;
          const progress = Math.min(1, (current.t - previous.t) / Math.max(1, previous.duration));
          if (current.from < previous.from + (previous.to - previous.from) * progress - 1) count++;
        });
        return count;
      });
      expect(backward).toBe(0);
    });
  }
});
