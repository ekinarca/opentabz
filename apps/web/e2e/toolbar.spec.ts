/**
 * The view toolbar folds (UX-029), as Guitar Pro's does when the window is narrow: the tools that
 * do not fit go into its "More view tools" menu, kept in reach at the right while the menus scroll
 * under it, where they work as on the toolbar; when every tool fits, there is no such menu.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function toolbar(page: Page) {
  return page.getByRole('toolbar', { name: 'Score view' });
}

test('shows every tool when the window is wide', async ({ page, isMobile }) => {
  test.skip(isMobile, 'A wide window.');
  await page.setViewportSize({ width: 1600, height: 900 });
  await openShuffle(page);
  for (const name of ['Song info', 'Full screen', 'Song overview']) {
    await expect(toolbar(page).getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(toolbar(page).getByRole('button', { name: 'More view tools' })).toHaveCount(0);
});

test('folds the tools that do not fit into a menu where they work as on the toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openShuffle(page);
  const bar = toolbar(page);
  const more = bar.getByRole('button', { name: 'More view tools' });
  await expect(more).toBeVisible();
  // In reach on the screen, as is the zoom: the menus scroll under them.
  for (const control of [more, bar.getByRole('button', { name: 'Zoom level' })]) {
    const box = await control.boundingBox();
    expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= 360).toBe(true);
  }
  await expect(bar.getByRole('button', { name: 'Song info', exact: true })).toHaveCount(0);

  await bar.getByRole('button', { name: 'More view tools' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Lyrics' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await menu.getByRole('menuitem', { name: 'Song info' }).click();
  await expect(page.getByRole('dialog', { name: 'Twelve-Bar Shuffle in A' })).toBeVisible();
  await page.keyboard.press('Escape');

  // A panel switched on from the menu, and shown as on there.
  await bar.getByRole('button', { name: 'More view tools' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Lyrics' }).click();
  await expect(page.getByRole('region', { name: 'Lyrics', exact: true })).toBeVisible();
  await bar.getByRole('button', { name: 'More view tools' }).click();
  await expect(page.getByRole('menuitemcheckbox', { name: 'Lyrics' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
});
