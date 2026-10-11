/**
 * Staves of each track (REND-004, REND-005, REND-031): a track shows standard notation,
 * tablature, rhythm slashes or numbered notation as chosen for it; one choice in the Staves menu
 * applies to every track again.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

/** SMuFL's slash notehead, as the score's music font writes it. */
const SLASH = '';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function scoreTexts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function stavesMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Staves: / }).click();
}

test('each track shows the staves chosen for it, until one choice is made for all', async ({ page }) => {
  await openShuffle(page);
  expect((await scoreTexts(page)).some(text => text.includes(SLASH))).toBe(false);

  await stavesMenu(page);
  await page.getByRole('menuitem', { name: 'Each track…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Staves of each track' });
  await expect(dialog.getByRole('checkbox', { name: 'Tab for Rhythm Guitar' })).toBeChecked();
  // Drums have no tablature and no numbered notation.
  await expect(dialog.getByRole('checkbox', { name: 'Tab for Drums' })).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: 'Numbered for Drums' })).toBeDisabled();

  await dialog.getByRole('checkbox', { name: 'Standard for Rhythm Guitar' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Tab for Rhythm Guitar' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Slash for Rhythm Guitar' }).check();
  await expect.poll(async () => (await scoreTexts(page)).some(text => text.includes(SLASH))).toBe(true);

  await dialog.getByRole('checkbox', { name: 'Numbered for Rhythm Guitar' }).check();
  // Numbered notation names the key it counts from: the shuffle is in A.
  await expect.poll(async () => (await scoreTexts(page)).includes('1 = A')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Staves: Each track' })).toBeVisible();

  await stavesMenu(page);
  await page.getByRole('menuitemradio', { name: 'Tab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Staves: Tab' })).toBeVisible();
  await expect.poll(async () => (await scoreTexts(page)).some(text => text.includes(SLASH))).toBe(false);
});
