/**
 * Transposing instruments at concert pitch (REND-032), and tempo marks shown or hidden
 * (REND-210), with their decimals or rounded (REND-240), in the score on screen.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

/** SMuFL's sharp, as the score's music font writes it. */
const SHARP = '';

function scoreTexts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function sharps(page: Page): Promise<number> {
  return (await scoreTexts(page)).join('').split(SHARP).length - 1;
}

test('a transposing instrument reads as its part, or at concert pitch', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro8/transposition-tonality-a.gp')]);
  await expectScore(page);
  // Every track: the first is not a transposing one.
  await page.getByRole('button', { name: /^Tracks: / }).click();
  await page.getByRole('menuitem', { name: 'All tracks' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => sharps(page)).toBeGreaterThan(0);
  const written = await sharps(page);

  await page.getByRole('button', { name: /^Staves: / }).click();
  const concert = page.getByRole('menuitemcheckbox', { name: 'Concert pitch' });
  await concert.click();
  await expect.poll(() => sharps(page)).not.toBe(written);

  // The menu stays open for another choice.
  await expect(concert).toBeChecked();
  await concert.click();
  await expect.poll(() => sharps(page)).toBe(written);
  await page.keyboard.press('Escape');
});

test('tempo marks are shown or hidden', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  const tempo = async () => (await scoreTexts(page)).some(text => text.includes('112'));
  await expect.poll(tempo).toBe(true);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page.getByRole('dialog', { name: 'Stylesheet' }).getByRole('switch', { name: 'Tempo marks' }).click();
  await expect.poll(tempo).toBe(false);
});

test('tempo marks with their decimals, or rounded', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/tempo.atex')]);
  await expectScore(page);
  const tempos = async () => (await scoreTexts(page)).filter(text => text.includes('= '));
  await expect.poll(tempos).toEqual([' = 92.5', ' = 120.25']);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'Tempo decimals (120.5)' }).click();
  await expect.poll(tempos).toEqual([' = 93', ' = 120']);
  // Without tempo marks, their decimals cannot be chosen.
  await dialog.getByRole('switch', { name: 'Tempo marks' }).click();
  await expect(dialog.getByRole('switch', { name: 'Tempo decimals (120.5)' })).toBeDisabled();
});
