/**
 * Recent scores (LIB-005) and the last session (UX-028), kept on this device only: a score opened
 * is listed on the home page to open again (one still open comes to the front), the list can be
 * cleared, and the scores open last time open again at the start when the settings ask. Turning
 * "Remember recent scores" off forgets them.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** Waits until the open scores are kept for next time. */
async function kept(page: Page, count: number): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('opentabz.session.v1');
        const session: unknown = raw === null ? null : JSON.parse(raw);
        return typeof session === 'object' && session !== null && 'fingerprints' in session
          ? (session.fingerprints as unknown[]).length
          : 0;
      }),
    )
    .toBe(count);
}

function recent(page: Page) {
  return page.getByRole('region', { name: 'Recent scores' });
}

/** Settings, from the top bar or, on a phone, its menu. */
async function settings(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
  } else await page.getByRole('button', { name: 'Settings', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings' });
}

test('lists the scores opened lately, opens one again, and clears the list', async ({ page }) => {
  await openHome(page);
  await expect(recent(page)).toHaveCount(0);
  await openShuffle(page);
  await kept(page, 1);

  // Home again: the shuffle is listed.
  await page.getByRole('button', { name: 'OpenTabz home' }).click();
  const shuffle = recent(page).getByRole('button', { name: 'Open Twelve-Bar Shuffle in A again' });
  await expect(shuffle).toBeVisible();
  // Still open: it comes to the front, not a second time.
  await shuffle.click();
  await expectScore(page);
  await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(1);

  // Closed, it opens again from what the device kept.
  await page.getByRole('button', { name: 'Close Twelve-Bar Shuffle in A' }).click();
  await shuffle.click();
  await expectScore(page);

  await page.getByRole('button', { name: 'OpenTabz home' }).click();
  await recent(page).getByRole('button', { name: 'Clear the list' }).click();
  await expect(recent(page)).toHaveCount(0);
});

test('opens the scores from last time at the start when asked, and forgets them when told', async ({
  page,
  isMobile,
}) => {
  await openHome(page);
  const dialog = await settings(page, isMobile);
  const reopen = dialog.getByRole('switch', { name: 'Open the scores from last time at the start' });
  await reopen.click();
  await expect(reopen).toBeChecked();
  await page.keyboard.press('Escape');
  await openShuffle(page);
  await kept(page, 1);

  await page.reload();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Twelve-Bar Shuffle in A', exact: true })).toBeVisible();

  // Not remembered any more: nothing opens again, nothing is listed.
  const again = await settings(page, isMobile);
  await again.getByRole('switch', { name: 'Remember recent scores' }).click();
  await expect(
    again.getByRole('switch', { name: 'Open the scores from last time at the start' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Open documents' })).toHaveCount(0);
  await expect(recent(page)).toHaveCount(0);
});
