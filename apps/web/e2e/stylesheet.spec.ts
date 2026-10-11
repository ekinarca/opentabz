/**
 * The stylesheet (REND-218): F7 or the toolbar opens it; a change shows in the score at once, is
 * remembered for the file, and "As in the file" brings the file's own style back.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** Track names written in the painted score. */
function trackName(page: Page) {
  return page.locator('.ot-partials text', { hasText: /^R\.Gt\.$/ });
}

/** The first system's height, in layout units. */
function systemHeight(page: Page): Promise<number> {
  return page
    .locator('.ot-partial[data-kind="system"]')
    .first()
    .evaluate(element => Number.parseFloat((element as HTMLElement).style.height));
}

test('changes show in the score, are remembered for the file, and go back to the file’s', async ({
  page,
}) => {
  await openShuffle(page);
  await expect(trackName(page).first()).toBeVisible();
  const height = await systemHeight(page);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'As in the file' })).toBeDisabled();

  await dialog
    .getByRole('radiogroup', { name: 'One track shown' })
    .getByRole('radio', { name: 'Hidden' })
    .click();
  await expect(trackName(page)).toHaveCount(0);

  const scale = dialog.getByRole('slider', { name: 'Scale' });
  await scale.focus();
  await page.keyboard.press('End');
  await expect(scale).toHaveAttribute('aria-valuetext', '200 %');
  await expect.poll(() => systemHeight(page)).toBeGreaterThan(height * 1.8);
  await expect(dialog.getByRole('button', { name: 'As in the file' })).toBeEnabled();
  await page.keyboard.press('Escape');

  // The same file again: its style comes back. Twice the size, the title fills the first screen:
  // the first system is painted once it is scrolled to.
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  const first = page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]').first();
  await expect(first).toBeAttached();
  await expect.poll(() => systemHeight(page)).toBeGreaterThan(height * 1.8);
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator('svg')).toBeVisible();
  await expect(trackName(page)).toHaveCount(0);

  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('slider', { name: 'Scale' })).toHaveAttribute('aria-valuetext', '200 %');
  await dialog.getByRole('button', { name: 'As in the file' }).click();
  await expect(trackName(page).first()).toBeVisible();
  await expect.poll(() => systemHeight(page)).toBeCloseTo(height, 0);
});
