/** Practice controls: speed, position, going to bars and sections, stepping, the shortcut sheet. */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  // Keys go to the page, not to a focused control.
  await page.locator('.ot-scroll:not([hidden])').focus();
}

function position(page: Page) {
  return page.getByRole('button', { name: /^Go to: / });
}

test.describe('practice controls', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Keyboard shortcuts are for desktops; phones are covered in mobile.spec.ts.',
  );

  test('speed from 10 % to 300 %, by preset, slider keys and shortcuts', async ({ page }) => {
    await openShuffle(page);
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await expect(speed).toHaveText('100 %');
    await speed.click();
    await page.getByRole('button', { name: '50 %', exact: true }).click();
    await expect(speed).toHaveText('50 %');
    // Total time is score time: it does not change with the practice speed.
    await expect(position(page)).toContainText('/ 0:27');
    // Closing the panel puts focus back on its button; the speed keys work from there too.
    await page.keyboard.press('Escape');
    await expect(speed).toBeFocused();
    await page.keyboard.press('=');
    await expect(speed).toHaveText('55 %');
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await expect(speed).toHaveText('45 %');
    for (let step = 0; step < 12; step++) await page.keyboard.press('-');
    await expect(speed).toHaveText('10 %');
    await page.keyboard.press(`${MOD}+F9`);
    await expect(page.getByRole('dialog', { name: 'Playback speed' })).toBeVisible();
    await page.getByRole('button', { name: '300 %', exact: true }).click();
    await expect(speed).toHaveText('300 %');
    await expect(page.getByRole('button', { name: 'Faster', exact: true })).toBeDisabled();
  });

  test('shows bar, beat, meter and tempo, and steps beat by beat', async ({ page }) => {
    await openShuffle(page);
    await expect(position(page)).toHaveAccessibleName('Go to: Bar 1, beat 1, 4/4, 112 beats per minute');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 2,/);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 1,/);
    await page.keyboard.press(`${MOD}+ArrowRight`);
    await expect(position(page)).toHaveAccessibleName(/Bar 2, beat 1,/);
    await page.keyboard.press('End');
    await expect(position(page)).toHaveAccessibleName(/Bar 2, beat 4,/);
    await page.keyboard.press('Home');
    await expect(position(page)).toHaveAccessibleName(/Bar 2, beat 1,/);
    await page.keyboard.press(`${MOD}+End`);
    await expect(position(page)).toHaveAccessibleName(/Bar 13, beat 1,/);
    await page.keyboard.press(`${MOD}+Home`);
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 1,/);
    // Stepping with sound works without playing.
    await page.keyboard.press('Alt+ArrowRight');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('goes to a bar or a section, and steps through sections', async ({ page }) => {
    await openShuffle(page);
    await page.keyboard.press(`${MOD}+g`);
    const dialog = page.getByRole('dialog', { name: 'Go to' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Bar')).toBeFocused();
    await dialog.getByLabel('Bar').fill('5');
    await page.keyboard.press('Enter');
    await expect(position(page)).toHaveAccessibleName(/Bar 5, beat 1,/);
    await position(page).click();
    await page
      .getByRole('dialog', { name: 'Go to' })
      .getByRole('button', { name: /Turnaround/ })
      .click();
    await expect(position(page)).toHaveAccessibleName(/Bar 9, beat 1,/);
    await page.locator('.ot-scroll:not([hidden])').focus();
    await page.keyboard.press('Alt+PageDown');
    await expect(position(page)).toHaveAccessibleName(/Bar 13, beat 1,/);
    await page.keyboard.press('Alt+PageUp');
    await expect(position(page)).toHaveAccessibleName(/Bar 9, beat 1,/);
  });

  test('extends a selection with the keyboard and selects everything', async ({ page }) => {
    await openShuffle(page);
    await page.keyboard.press(`${MOD}+Shift+ArrowRight`);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bar 1 selected');
    await page.keyboard.press(`${MOD}+Shift+ArrowRight`);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bars 1–2 selected');
    await page.keyboard.press('Escape');
    await expect(page.locator('.ot-selection:not([hidden])')).toHaveCount(0);
    await page.keyboard.press(`${MOD}+a`);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bars 1–13 selected');
  });

  test('lists every shortcut, and single-key shortcuts can be turned off', async ({ page }) => {
    await openShuffle(page);
    await page.keyboard.press('?');
    const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Next beat, and hear it');
    await sheet.getByLabel('Single-key shortcuts (−, =, ?)').uncheck();
    await page.keyboard.press('Escape');
    await page.locator('.ot-scroll:not([hidden])').focus();
    await page.keyboard.press('-');
    await expect(page.getByRole('button', { name: /^Playback speed: / })).toHaveText('100 %');
    // Arrow keys and modified keys still work.
    await page.keyboard.press(`${MOD}+ArrowRight`);
    await expect(position(page)).toHaveAccessibleName(/Bar 2, beat 1,/);
  });
});
