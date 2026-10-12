/**
 * The score with its repeats and jumps written out (REND-319): a document of its own, every bar
 * as often and in the order it is played.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

/** The bars the song overview shows. */
async function barCount(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Song overview', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Song overview' });
  await expect(panel.locator('rect[data-bar]').first()).toBeAttached();
  const bars = await panel
    .locator('rect[data-bar]')
    .evaluateAll(rects => new Set(rects.map(rect => rect.getAttribute('data-bar'))).size);
  await page.getByRole('button', { name: 'Song overview', exact: true }).click();
  return bars;
}

test('writes out repeats and jumps as a document of its own', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/repeats.atex')]);
  await expectScore(page);
  expect(await barCount(page)).toBe(5);

  await page.getByRole('button', { name: 'Write out repeats' }).click();
  const tabs = page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem');
  await expect(tabs).toHaveCount(2);
  await expectScore(page);
  // Twice through the first part, the second part, then from the start to Fine.
  await expect.poll(() => barCount(page)).toBe(8);
  // Nothing left to write out.
  await expect(page.getByRole('button', { name: 'Write out repeats' })).toHaveCount(0);
});
