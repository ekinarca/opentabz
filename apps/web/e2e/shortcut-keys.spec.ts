/**
 * Keys of one's own (PLAT-036), as Guitar Pro's preferences set them: the shortcut sheet changes an
 * action's keys to the next keys pressed (Esc keeps them as they were), takes keys from another
 * action only when asked, and puts one action's keys or every key back; the app runs actions by
 * their new keys and keeps them for next time.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

test.skip(({ isMobile }) => isMobile, 'Keyboard shortcuts are for computers.');

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function sheet(page: Page) {
  return page.getByRole('dialog', { name: 'Keyboard shortcuts' });
}

async function openSheet(page: Page): Promise<void> {
  await page.getByRole('region', { name: /^Score: / }).focus();
  await page.keyboard.press('?');
  await expect(sheet(page)).toBeVisible();
}

function keysOf(page: Page, action: string) {
  return sheet(page).getByRole('button', { name: `Change the keys of ${action}` });
}

test('changes an action’s keys, runs it by them, and keeps them', async ({ page }) => {
  await openShuffle(page);
  const loop = page.getByRole('button', { name: 'Loop', exact: true });
  await expect(loop).toHaveAttribute('aria-pressed', 'false');
  await openSheet(page);
  const keys = keysOf(page, 'Loop on or off');
  await expect(keys).toHaveText('F9');
  await keys.click();
  await expect(keys).toHaveText('Press the new keys…');
  await page.keyboard.press('l');
  await expect(keys).toHaveText('L');
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await page.getByRole('region', { name: /^Score: / }).focus();
  await page.keyboard.press('l');
  await expect(loop).toHaveAttribute('aria-pressed', 'true');
  // F9 is the loop's no more.
  await page.keyboard.press('F9');
  await expect(loop).toHaveAttribute('aria-pressed', 'true');
  // Its tooltip writes the new keys.
  await loop.hover();
  await expect(page.getByRole('tooltip').filter({ hasText: 'Loop' }).locator('kbd')).toHaveText('L');

  await openShuffle(page);
  await openSheet(page);
  await expect(keysOf(page, 'Loop on or off')).toHaveText('L');
});

test('takes keys from another action only when asked, and puts keys back', async ({ page }) => {
  await openShuffle(page);
  await openSheet(page);
  const metronome = keysOf(page, 'Metronome on or off');
  const original = (await metronome.textContent()) ?? '';
  await metronome.click();
  await page.keyboard.press('F9');
  await expect(sheet(page).getByRole('alert')).toContainText('F9 is already for Loop on or off.');
  await sheet(page).getByRole('button', { name: 'Keep as it was' }).click();
  await expect(metronome).toHaveText(original);

  await metronome.click();
  await page.keyboard.press('F9');
  await sheet(page).getByRole('button', { name: 'Use it here' }).click();
  await expect(metronome).toHaveText('F9');
  await expect(keysOf(page, 'Loop on or off')).toHaveText('No keys');

  // Esc while recording keeps the keys, and the sheet open.
  await metronome.click();
  await page.keyboard.press('Escape');
  await expect(metronome).toHaveText('F9');
  await expect(sheet(page)).toBeVisible();

  await sheet(page).getByRole('button', { name: 'Put back the keys of Metronome on or off' }).click();
  await expect(metronome).toHaveText(original);
  await sheet(page).getByRole('button', { name: 'Put back every key' }).click();
  await expect(keysOf(page, 'Loop on or off')).toHaveText('F9');
  await expect(sheet(page).getByRole('button', { name: 'Put back every key' })).toHaveCount(0);
});
