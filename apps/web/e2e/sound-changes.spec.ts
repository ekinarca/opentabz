/**
 * Sound-change labels (REND-206): a Guitar Pro 7 file whose guitar turns from a steel-string sound
 * to an overdriven one at bar 3 says so there, by the new sound's label; the sound it starts with
 * goes unlabelled.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function scoreTexts(page: Page): Promise<string[]> {
  const texts = await page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
  return texts.map(text => text.trim());
}

test('names the new sound where a track changes sound', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro7/program-change.gp')]);
  await expectScore(page);
  await expect.poll(() => scoreTexts(page)).toContain('Overdriven Guitar');
  expect(await scoreTexts(page)).not.toContain('Steel Mart');
});
