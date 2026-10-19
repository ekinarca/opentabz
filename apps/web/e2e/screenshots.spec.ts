/**
 * README screenshots, written to docs/screenshots/. Skipped unless asked for:
 *
 *   OT_SCREENSHOTS=1 pnpm --filter @opentabz/web exec playwright test screenshots --project=chromium
 */
import { join } from 'node:path';
import { devices, type Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

const OUT = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots');

async function openDemo(page: Page, name: string): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  // Let every visible system paint and the music font settle.
  await page.waitForTimeout(600);
}

test.describe('README screenshots', () => {
  test.skip(process.env['OT_SCREENSHOTS'] === undefined, 'Run with OT_SCREENSHOTS=1.');
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'Desktop Chromium only.');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('landing page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await openHome(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'landing.png') });
  });

  test('a score on the page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openDemo(page, 'Greensleeves');
    await page.screenshot({ path: join(OUT, 'score.png') });
  });

  test('practising a loop with the mixer open', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openDemo(page, 'a blues shuffle');
    const system = page.locator('.ot-partial[data-kind="system"]').first();
    const box = await system.boundingBox();
    if (box === null) throw new Error('no system');
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.45, { steps: 4 });
    await page.mouse.move(box.x + box.width * 0.97, box.y + box.height * 0.45, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Loop the selection' }).click();
    await page.getByRole('button', { name: 'Mixer' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'practice.png') });
  });

  test('the fretboard following the music', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openDemo(page, 'a blues shuffle');
    await page.getByRole('button', { name: 'Fretboard', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForTimeout(2600);
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'fretboard.png') });
  });

  test('writing in the score', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openDemo(page, 'Greensleeves');
    await page.getByRole('button', { name: 'Edit the score' }).click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'editor.png') });
  });
});

test.describe('README screenshots on a phone', () => {
  test.skip(process.env['OT_SCREENSHOTS'] === undefined, 'Run with OT_SCREENSHOTS=1.');
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only.');
  const { defaultBrowserType: _browser, ...iPhone } = devices['iPhone 15'];
  test.use({ ...iPhone });

  test('a score on a phone', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openDemo(page, 'an arpeggio study');
    await page.screenshot({ path: join(OUT, 'phone.png') });
  });
});
