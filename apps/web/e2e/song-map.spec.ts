/**
 * The song map (PLAY-006): a strip of bars above the playback bar that shows where the music is
 * and goes anywhere with a click, a drag or the keys.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

function position(page: Page) {
  return page.getByRole('button', { name: /^Go to: / });
}

test.describe('song map', () => {
  test('shows the song bar by bar, with its sections, and goes where it is clicked', async ({
    page,
    isMobile,
  }) => {
    await openShuffle(page);
    const map = page.getByRole('slider', { name: 'Song map' });
    await expect(map).toHaveAttribute('aria-valuemax', '13');
    await expect(map).toHaveAttribute('aria-valuetext', 'Bar 1 of 13, Twelve bars');
    const box = await map.boundingBox();
    if (box === null) throw new Error('No song map on screen.');
    // 70 % of the way along: bar 10 of 13.
    const x = box.x + box.width * 0.71;
    if (isMobile) await page.touchscreen.tap(x, box.y + box.height / 2);
    else await page.mouse.click(x, box.y + box.height / 2);
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 10, beat 1,/);
    await expect(map).toHaveAttribute('aria-valuetext', 'Bar 10 of 13, Turnaround');
    await expect(map.locator('[data-current]')).toHaveAttribute('data-bar', '10');
  });

  test('steps bars and sections with the keys, and marks the selection', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keys are for desktops.');
    await openShuffle(page);
    const map = page.getByRole('slider', { name: 'Song map' });
    await map.focus();
    await page.keyboard.press('ArrowRight');
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 2, beat 1,/);
    await page.keyboard.press('PageDown');
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 9, beat 1,/);
    await page.keyboard.press('End');
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 13, beat 1,/);
    await page.keyboard.press('PageUp');
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 9, beat 1,/);
    await page.keyboard.press('Home');
    await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 1, beat 1,/);
    // A section selected from the Go to list shows on the map.
    await position(page).click();
    await page
      .getByRole('dialog', { name: 'Go to' })
      .getByRole('button', { name: 'Select Turnaround (bars 9–12)' })
      .click();
    await expect(map.locator('[data-selected]')).toHaveCount(4);
  });
});
