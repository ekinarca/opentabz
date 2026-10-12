/**
 * Tempo ramps (REND-156): a Guitar Pro file whose tempo speeds up from bar 2 to bar 4 and slows
 * down from bar 5 to bar 7 marks the ramps accel. and rit. after their tempos.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function scoreTexts(page: Page): Promise<string[]> {
  const texts = await page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
  return texts.map(text => text.trim());
}

test('marks a tempo ramp accel. or rit. by where it goes', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('generated/views/tempo-ramps.gp')]);
  await expectScore(page);
  await expect.poll(() => scoreTexts(page)).toEqual(expect.arrayContaining(['accel.', 'rit.']));
  expect((await scoreTexts(page)).filter(text => text === 'accel.' || text === 'rit.')).toHaveLength(2);
});
