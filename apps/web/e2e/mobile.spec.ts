/** Phones: everything fits the screen and works with touch. */
import type { Page } from '@playwright/test';
import { elapsedSeconds, expect, expectScore, openHome, test, transportText } from './support.ts';

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'Phone layouts only.');

  async function noHorizontalOverflow(page: Page): Promise<void> {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }

  test('the home page fits the screen', async ({ page }) => {
    await openHome(page);
    await noHorizontalOverflow(page);
  });

  test('a score fits, plays with a tap, and a long press selects a bar', async ({ page }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).tap();
    await expectScore(page);
    await noHorizontalOverflow(page);
    const toolbar = page.getByRole('toolbar', { name: 'Playback' });
    const overflow = await toolbar.evaluate(element => element.scrollWidth - element.clientWidth);
    expect(overflow, 'every playback control is visible').toBeLessThanOrEqual(0);

    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled({ timeout: 20_000 });
    await play.tap();
    await expect.poll(() => elapsedSeconds(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();

    // A long press (held still for half a second) on the music selects that bar.
    const system = page.locator('.ot-partial[data-kind="system"]').first();
    const box = await system.boundingBox();
    if (box === null) throw new Error('no system on screen');
    const point = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.45 };
    await system.dispatchEvent('pointerdown', {
      pointerId: 11,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: point.x,
      clientY: point.y,
    });
    await page.waitForTimeout(650);
    await system.dispatchEvent('pointerup', {
      pointerId: 11,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: point.x,
      clientY: point.y,
    });
    await expect(page.locator('.ot-selection:not([hidden])').first()).toBeVisible();
    expect(await transportText(page)).toMatch(/Bar \d+ selected/);

    // Less frequent controls live in the ⋯ menu on phones, with their keys for a keyboard.
    await page.getByRole('button', { name: 'More playback controls' }).tap();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: /^Stop and go to the start/ }).locator('kbd')).toHaveText(
      /(Shift|⇧) Space/,
    );
    await expect(menu.getByRole('menuitemcheckbox', { name: /^Metronome/ }).locator('kbd')).toHaveText(
      /(Alt|⌥) M/,
    );
    await expect(menu.getByRole('menuitem', { name: /^Clear selection/ }).locator('kbd')).toHaveText('Esc');
    await page.getByRole('menuitem', { name: 'Clear selection' }).tap();
    await expect(page.locator('.ot-selection:not([hidden])')).toHaveCount(0);
  });
});
