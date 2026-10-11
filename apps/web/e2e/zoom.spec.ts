/**
 * Zoom (REND-215…REND-217): from 10 % to 800 % with a slider, presets and steps; ⌘/Ctrl with the
 * wheel and a two-finger pinch zoom around where they are; the page's width or a whole page
 * fitted to the window, and kept fitted as it changes.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page, layout: 'page' | 'scroll' = 'scroll'): Promise<void> {
  await page.addInitScript(chosen => {
    localStorage.setItem('opentabz.preferences.v1', JSON.stringify({ paper: 'a4', layout: chosen }));
  }, layout);
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  // Phones open scores in the vertical layout.
  if (layout === 'page') await page.getByRole('radio', { name: 'Page', exact: true }).click();
}

function level(page: Page): Locator {
  return page.getByRole('button', { name: 'Zoom level' });
}

async function zoom(page: Page): Promise<number> {
  return Number.parseInt((await level(page).textContent()) ?? '', 10);
}

test('zooms from 10 % to 800 % with the slider, and to the presets', async ({ page }) => {
  await openShuffle(page);
  await level(page).click();
  const panel = page.getByRole('dialog', { name: 'Zoom level' });
  const slider = panel.getByRole('slider', { name: 'Zoom' });
  await expect(slider).toHaveAttribute('aria-valuetext', '100 %');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(level(page)).toHaveText('800 %');
  await expect(page.locator('.ot-sheet')).toHaveCSS('zoom', '8');
  await page.keyboard.press('Home');
  await expect(level(page)).toHaveText('10 %');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => Number.parseFloat(await page.locator('.ot-sheet').evaluate(sheet => sheet.style.zoom)))
    .toBeGreaterThan(0.1);

  const presets = panel.getByRole('group', { name: 'Zoom presets' });
  await presets.getByRole('button', { name: '150 %' }).click();
  await expect(level(page)).toHaveText('150 %');
  await expect(presets.getByRole('button', { name: '150 %' })).toHaveAttribute('aria-pressed', 'true');
  // Fitting is for the page layout.
  await expect(panel.getByRole('group', { name: 'Fit to the window' })).toHaveCount(0);
});

test('⌘/Ctrl with the wheel zooms around the pointer; the wheel alone scrolls', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Phones have no wheel.');
  await openShuffle(page);
  const scroller = page.locator('.ot-scroll');
  const box = await scroller.boundingBox();
  if (box === null) throw new Error('No score on screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);

  await page.mouse.wheel(0, 200);
  await expect(level(page)).toHaveText('100 %');

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await expect.poll(() => zoom(page)).toBeGreaterThan(140);
  const zoomedIn = await zoom(page);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 300);
  await page.keyboard.up('Control');
  await expect.poll(() => zoom(page)).toBeLessThan(zoomedIn);
});

test('two fingers pinch the score to zoom it', async ({ page }) => {
  await openShuffle(page);
  const sheet = page.locator('.ot-sheet');
  const box = await page.locator('.ot-scroll').boundingBox();
  if (box === null) throw new Error('No score on screen.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // Two touch points move apart from 60 to 180 pixels: three times as far apart.
  await sheet.evaluate(
    (target, center) => {
      const touch = (type: string, pointerId: number, offset: number) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            pointerId,
            pointerType: 'touch',
            isPrimary: pointerId === 1,
            clientX: center.x + offset,
            clientY: center.y,
            bubbles: true,
          }),
        );
      touch('pointerdown', 1, -30);
      touch('pointerdown', 2, 30);
      for (let step = 1; step <= 6; step++) {
        touch('pointermove', 1, -30 - step * 10);
        touch('pointermove', 2, 30 + step * 10);
      }
      touch('pointerup', 1, -90);
      touch('pointerup', 2, 90);
    },
    { x, y },
  );
  await expect(level(page)).toHaveText('300 %');
});

test('fits the page width or a whole page to the window, and keeps it fitted', async ({ page }) => {
  await openShuffle(page, 'page');
  const scroller = page.locator('.ot-scroll');
  const firstPage = page.locator('.ot-page').first();
  await level(page).click();
  const panel = page.getByRole('dialog', { name: 'Zoom level' });
  const fits = panel.getByRole('group', { name: 'Fit to the window' });

  await fits.getByRole('button', { name: 'Page width' }).click();
  await expect(fits.getByRole('button', { name: 'Page width' })).toHaveAttribute('aria-pressed', 'true');
  const pageFillsWidth = async () => {
    const [view, sheetPage] = await Promise.all([scroller.boundingBox(), firstPage.boundingBox()]);
    const width = await scroller.evaluate(element => element.clientWidth);
    if (view === null || sheetPage === null) return false;
    // The page and its margins (32 px a side, zoomed) take the width, to the percent.
    const used = sheetPage.width * (1 + 64 / 793.7);
    return used <= width + 1 && used >= width * 0.98 - 8;
  };
  await expect.poll(pageFillsWidth).toBe(true);

  // The window narrows: the page follows.
  const before = await zoom(page);
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('No viewport.');
  await page.setViewportSize({ width: Math.round(viewport.width * 0.8), height: viewport.height });
  await expect.poll(() => zoom(page)).toBeLessThan(before);
  await expect.poll(pageFillsWidth).toBe(true);

  if (!(await panel.isVisible())) await level(page).click();
  await fits.getByRole('button', { name: 'Whole page' }).click();
  await expect(fits.getByRole('button', { name: 'Whole page' })).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(async () => {
      const [height, sheetPage] = await Promise.all([
        scroller.evaluate(element => element.clientHeight),
        firstPage.boundingBox(),
      ]);
      return sheetPage !== null && sheetPage.height <= height;
    })
    .toBe(true);

  // A zoom chosen by hand ends the fitting.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await level(page).click();
  await expect(fits.getByRole('button', { name: 'Whole page' })).toHaveAttribute('aria-pressed', 'false');
});
