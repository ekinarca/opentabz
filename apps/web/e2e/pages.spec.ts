/**
 * How the pages sit on screen (REND-212…REND-214): one under another, side by side, in rows of as
 * many as the window fits (rearranged as the zoom or the window changes), or as one endless sheet;
 * remembered, and followed by the playback cursor sideways too.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, primaryModifier, test } from './support.ts';

test.skip(({ isMobile }) => isMobile, 'Pages side by side are for desktops.');

async function openScore(page: Page): Promise<void> {
  await openHome(page);
  await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
  await expectScore(page);
  await page.getByRole('radio', { name: 'Page', exact: true }).click();
}

async function openPages(page: Page): Promise<void> {
  await openScore(page);
  await expect.poll(() => page.locator('.ot-page').count()).toBeGreaterThan(3);
}

async function arrange(page: Page, arrangement: string): Promise<void> {
  await page.getByRole('button', { name: /^Pages: / }).click();
  await page.getByRole('menuitemradio', { name: arrangement }).click();
  await expect(page.getByRole('button', { name: `Pages: ${arrangement}` })).toBeVisible();
}

async function zoomTo(page: Page, level: string): Promise<void> {
  await page.getByRole('button', { name: 'Zoom level' }).click();
  await page
    .getByRole('group', { name: 'Zoom presets' })
    .getByRole('button', { name: level, exact: true })
    .click();
  await page.keyboard.press('Escape');
}

/** Where each page sits on the sheet (layout units). */
function pageBoxes(page: Page): Promise<{ x: number; y: number }[]> {
  return page.locator('.ot-page').evaluateAll(pages =>
    pages.map(element => ({
      x: Number.parseFloat((element as HTMLElement).style.left),
      y: Number.parseFloat((element as HTMLElement).style.top),
    })),
  );
}

test('lays the pages side by side, in a grid or on one endless sheet, and remembers', async ({ page }) => {
  await openPages(page);
  const music = await page.locator('.ot-partial').count();

  await arrange(page, 'Side by side');
  const side = await pageBoxes(page);
  expect(side.length).toBeGreaterThan(3);
  expect(new Set(side.map(box => box.y)).size).toBe(1);
  expect(side.map(box => box.x)).toEqual([...side.map(box => box.x)].sort((a, b) => a - b));
  const sheet = page.locator('.ot-sheet');
  const size = await sheet.evaluate(element => element.getBoundingClientRect());
  expect(size.width).toBeGreaterThan(size.height * 2);
  await expect(page.locator('.ot-partial')).toHaveCount(music);

  // A grid fits more pages to a row as the zoom goes down, and fewer as it goes up.
  await arrange(page, 'Grid');
  await zoomTo(page, '25 %');
  await expect
    .poll(async () => {
      const boxes = await pageBoxes(page);
      return boxes.filter(box => box.y === boxes[0]?.y).length;
    })
    .toBeGreaterThan(2);
  const grid = await pageBoxes(page);
  const columns = grid.filter(box => box.y === grid[0]?.y).length;
  expect(grid[columns]?.x).toBe(grid[0]?.x);
  expect(grid[columns]?.y).toBeGreaterThan(grid[0]?.y ?? 0);
  await zoomTo(page, '100 %');
  await expect
    .poll(async () => {
      const boxes = await pageBoxes(page);
      return boxes.filter(box => box.y === boxes[0]?.y).length;
    })
    .toBeLessThan(columns);

  await arrange(page, 'Endless');
  await expect(page.locator('.ot-page')).toHaveCount(1);
  await expect(page.locator('.ot-page-footer')).toHaveCount(0);
  await expect(page.locator('.ot-partial')).toHaveCount(music);

  // The next score opens the same way.
  await openScore(page);
  await expect(page.getByRole('button', { name: 'Pages: Endless' })).toBeVisible();
  await expect(page.locator('.ot-page')).toHaveCount(1);
});

test('the cursor follows the music to a page further along, sideways', async ({ page }) => {
  await openPages(page);
  await arrange(page, 'Side by side');
  const scroller = page.locator('.ot-scroll:not([hidden])');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  await scroller.focus();
  await page.keyboard.press(`${await primaryModifier(page)}+End`);
  const start = await scroller.evaluate(element => element.scrollLeft);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(start + 500);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});
