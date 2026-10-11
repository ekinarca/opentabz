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

  test('tap tempo sets the speed from the tapped tempo', async ({ page }) => {
    await openShuffle(page);
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await speed.click();
    const tap = page.getByRole('button', { name: 'Tap tempo' });
    await expect(tap).toBeVisible();
    // Five taps 400 ms apart (150 BPM) on a 112 BPM song: about 134 %. Timed inside the page.
    await tap.evaluate(async button => {
      for (let count = 0; count < 5; count++) {
        if (count > 0) await new Promise(resolve => setTimeout(resolve, 400));
        (button as HTMLButtonElement).click();
      }
    });
    const percent = Number.parseInt((await speed.innerText()).replace(/\D/g, ''), 10);
    expect(percent).toBeGreaterThanOrEqual(130);
    expect(percent).toBeLessThanOrEqual(138);
  });

  test('plays at one fixed tempo, ignoring the tempo map, and back', async ({ page }) => {
    await openShuffle(page);
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await speed.click();
    const fixed = page.getByRole('switch', { name: 'Fixed tempo' });
    await fixed.click();
    // It starts at the score's tempo here.
    await expect(page.getByLabel('Fixed tempo, quarter notes per minute')).toHaveValue('112');
    await page.getByRole('group', { name: 'Tempo presets' }).getByRole('button', { name: '80' }).click();
    await page.keyboard.press('Escape');
    await expect(position(page)).toHaveAccessibleName(/80 beats per minute, fixed tempo$/);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat [2-4],|Bar [2-9],/, { timeout: 10_000 });
    await expect(position(page)).toHaveAccessibleName(/80 beats per minute, fixed tempo$/);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await speed.click();
    await fixed.click();
    await page.keyboard.press('Escape');
    await expect(position(page)).toHaveAccessibleName(/112 beats per minute$/);
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
    await expect(dialog.getByLabel('Bar', { exact: true })).toBeFocused();
    await dialog.getByLabel('Bar', { exact: true }).fill('5');
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

  test('loops a range of bars typed by number', async ({ page }) => {
    await openShuffle(page);
    await page.keyboard.press(`${MOD}+g`);
    const dialog = page.getByRole('dialog', { name: 'Go to' });
    await dialog.getByLabel('From bar').fill('3');
    await dialog.getByLabel('To bar').fill('4');
    await dialog.getByRole('button', { name: 'Loop', exact: true }).click();
    await expect(dialog).toBeHidden();
    const toolbar = page.getByRole('toolbar', { name: 'Playback' });
    await expect(toolbar).toContainText('Bars 3–4 selected');
    await expect(page.getByRole('button', { name: 'Loop the selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(position(page)).toHaveAccessibleName(/Bar 3, beat 1,/);
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
