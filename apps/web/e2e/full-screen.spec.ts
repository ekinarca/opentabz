/**
 * Full screen (VIEW-013): the score fills the screen with the app's bars put away, and the browser
 * goes full screen too where a page may ask it to. A strip keeps the song's name, the zoom and the
 * way out. The toolbar button, F11 or ⌃⌘F, and Esc.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test, viewTool } from './support.ts';

async function open(page: Page): Promise<void> {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/lyrics.atex')]);
  await expectScore(page);
}

/** Whether the browser shows the page full screen; null where a page may not ask for it. */
function browserFullScreen(page: Page): Promise<boolean | null> {
  return page.evaluate(() =>
    document.fullscreenEnabled ? (document.fullscreenElement ?? null) === document.documentElement : null,
  );
}

async function expectFullScreen(page: Page, on: boolean): Promise<void> {
  await expect(page.getByRole('banner')).toHaveCount(on ? 0 : 1);
  await expect(page.getByRole('toolbar', { name: 'Score view' })).toHaveCount(on ? 0 : 1);
  await expect(page.getByRole('toolbar', { name: 'Full screen' })).toHaveCount(on ? 1 : 0);
  await expect.poll(() => browserFullScreen(page)).not.toBe(!on);
}

test('the toolbar button puts the bars away, keeps zoom and the way out', async ({ page }) => {
  await open(page);
  const score = page.getByRole('region', { name: /^Score/ });
  const before = (await score.boundingBox())?.height ?? 0;

  await viewTool(page, 'Full screen');
  await expectFullScreen(page, true);
  const strip = page.getByRole('toolbar', { name: 'Full screen' });
  await expect(strip).toContainText('Lyrics Views');
  await expect(score).toBeVisible();
  await expect.poll(async () => (await score.boundingBox())?.height ?? 0).toBeGreaterThan(before + 40);

  await expect(strip).toContainText('100 %');
  await strip.getByRole('button', { name: 'Zoom in' }).click();
  await expect(strip).toContainText('110 %');

  await strip.getByRole('button', { name: 'Leave full screen' }).click();
  await expectFullScreen(page, false);
  await expect(page.getByRole('button', { name: 'Zoom level' })).toHaveText('110 %');
});

test('F11 or ⌃⌘F go full screen and back; Esc leaves', async ({ page }) => {
  await open(page);
  await page.getByRole('region', { name: /^Score/ }).focus();

  await page.keyboard.press('F11');
  await expectFullScreen(page, true);
  await page.keyboard.press('F11');
  await expectFullScreen(page, false);

  const apple = await page.evaluate(
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac OS X'),
  );
  if (apple) {
    await page.keyboard.press('Control+Meta+f');
    await expectFullScreen(page, true);
    await page.keyboard.press('Control+Meta+f');
    await expectFullScreen(page, false);
  }

  await page.keyboard.press('F11');
  await expectFullScreen(page, true);
  await page.keyboard.press('Escape');
  await expectFullScreen(page, false);
});
