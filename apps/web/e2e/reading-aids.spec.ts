/**
 * Reading aids (VIEW-009, REND-306, REND-317): note names above the notes, with octaves if asked,
 * and beat counts under them, from the Staves menu; remembered.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function texts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function staves(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Staves: / }).click();
}

test('note names above the notes and counts under them, remembered', async ({ page }) => {
  await openShuffle(page);
  expect(await texts(page)).not.toContain('A·E');

  await staves(page);
  await page.getByRole('menuitemradio', { name: 'Letters', exact: true }).click();
  // The riff's power chord: A on the A string, E on the D string.
  await expect.poll(async () => (await texts(page)).includes('A·E')).toBe(true);

  await staves(page);
  await page.getByRole('menuitemradio', { name: 'Letters and octaves' }).click();
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(true);

  await staves(page);
  await page.getByRole('menuitemcheckbox', { name: 'Beat counts' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await texts(page)).filter(text => text === '&').length).toBeGreaterThan(3);

  // The next score is read the same way.
  await openShuffle(page);
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(true);
  await staves(page);
  await page.getByRole('menuitemradio', { name: 'None', exact: true }).click();
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(false);
});
