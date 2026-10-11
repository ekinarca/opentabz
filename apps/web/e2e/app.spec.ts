/** The shell around the score: themes, zoom, page furniture, privacy and legal notices. */
import { dropFiles, expect, expectScore, fixture, openFiles, openHome, openThemes, test } from './support.ts';

test.describe('the app', () => {
  test('themes apply instantly and are remembered', async ({ page }) => {
    await openHome(page);
    for (const [name, theme] of [
      ['Night (dark)', 'dark'],
      ['Parchment (sepia)', 'sepia'],
      ['Stage (high contrast)', 'stage'],
      ['Studio (light)', 'light'],
      ['Night (dark)', 'dark'],
    ] as const) {
      await openThemes(page);
      await page.getByRole('menuitemradio', { name }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('zoom steps and stays between 25 % and 400 %', async ({ page, isMobile }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    const level = page.getByRole('button', { name: 'Zoom level' });
    test.skip(isMobile && !(await zoomIn.isVisible()), 'Phones zoom with the browser.');
    await expect(level).toHaveText('100 %');
    await zoomIn.click();
    await expect(level).toHaveText('110 %');
    for (let step = 0; step < 30 && (await zoomIn.isEnabled()); step++) await zoomIn.click();
    await expect(level).toHaveText('400 %');
    await expect(zoomIn).toBeDisabled();
    for (let step = 0; step < 30 && (await zoomOut.isEnabled()); step++) await zoomOut.click();
    await expect(level).toHaveText('25 %');
    await expect(zoomOut).toBeDisabled();
    await expect(page.locator('.ot-sheet')).toHaveCSS('zoom', '0.25');
  });

  test('pages have numbers, and the title runs at the top of the following pages', async ({ page }) => {
    await openHome(page);
    await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
    await expectScore(page);
    await page.getByRole('radio', { name: 'Page' }).click();
    const pages = page.locator('.ot-page');
    await expect.poll(() => pages.count()).toBeGreaterThan(3);
    const total = await pages.count();
    await expect(pages.first().locator('.ot-page-footer')).toHaveText(`1 / ${total}`);
    await expect(pages.first().locator('.ot-page-header')).toHaveCount(0);
    await expect(pages.nth(1).locator('.ot-page-header')).toHaveText('Performance 5 × 150');
    await expect(pages.nth(1).locator('.ot-page-footer')).toHaveText(`2 / ${total}`);
  });

  test('never talks to any server but its own', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const foreign: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      if (new URL(url).origin !== origin) foreign.push(url);
    });
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled({ timeout: 20_000 });
    await play.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await openFiles(page, [fixture('alphatab/guitarpro5/effects.gp5')]);
    await expectScore(page);
    expect(foreign).toEqual([]);
  });

  test('the landing page carries the trademark notice and the studio name', async ({ page }) => {
    await openHome(page);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('Guitar Pro is a registered trademark of Arobas Music.');
    await expect(footer).toContainText('not affiliated with Arobas Music');
    await expect(footer).toContainText('Whale Development Studios');
  });
});
