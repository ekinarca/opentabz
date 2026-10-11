/**
 * Page setup (REND-012, REND-221, REND-222): twelve paper formats or a size of one's own, portrait
 * or landscape, and the margins around the music, on screen and in the exported PDF alike, kept
 * for the next score.
 */
import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, expectScore, openHome, test } from './support.ts';

const MM = 96 / 25.4;

async function openShuffle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded') !== null) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('opentabz.preferences.v1', JSON.stringify({ paper: 'a4', layout: 'page' }));
  });
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  // Phones open scores in the vertical layout.
  await page.getByRole('radio', { name: 'Page', exact: true }).click();
  await expect(page.locator('.ot-page').first()).toBeVisible();
}

/** The first page's size and where its music starts, in layout units. */
function firstPage(page: Page): Promise<{ width: number; height: number; inset: number }> {
  return page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('.ot-page');
    const system = document.querySelector<HTMLElement>('.ot-partial[data-kind="system"]');
    const number = (value: string | undefined) => Number.parseFloat(value ?? '0');
    return {
      width: number(sheet?.style.width),
      height: number(sheet?.style.height),
      inset: number(system?.style.left) - number(sheet?.style.left),
    };
  });
}

async function paperMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Paper: / }).click();
}

async function pdfPageSize(page: Page): Promise<number[]> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export PDF' }).click();
  const file = await download;
  const path = await file.path();
  const pdf = await getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: false })
    .promise;
  const first = await pdf.getPage(1);
  await page.keyboard.press('Escape');
  return first.view.map(value => Math.round(value));
}

function field(dialog: Locator, name: string): Locator {
  return dialog.getByRole('spinbutton', { name, exact: true });
}

test('twelve formats, portrait or landscape, on screen and in the PDF', async ({ page }) => {
  await openShuffle(page);
  await paperMenu(page);
  const formats = page.getByRole('menuitemradio');
  for (const name of ['A3', 'A4', 'A5', 'B4 (JIS)', 'B5 (JIS)', 'US Letter', 'US Legal', 'Tabloid']) {
    await expect(formats.filter({ hasText: name }).first()).toBeVisible();
  }
  await page.getByRole('menuitemradio', { name: 'A5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Paper: A5' })).toBeVisible();
  await expect.poll(async () => Math.round((await firstPage(page)).width)).toBe(Math.round(148 * MM));

  await paperMenu(page);
  await page.getByRole('menuitemradio', { name: 'Landscape' }).click();
  await expect(page.getByRole('button', { name: 'Paper: A5, landscape' })).toBeVisible();
  await expect.poll(async () => Math.round((await firstPage(page)).width)).toBe(Math.round(210 * MM));
  expect(Math.round((await firstPage(page)).height)).toBe(Math.round(148 * MM));
  // A5 on its side: 210 × 148 mm, in points.
  expect(await pdfPageSize(page)).toEqual([0, 0, 595, 420]);
});

test('a size of one’s own and the margins, kept for the next score', async ({ page }) => {
  await openShuffle(page);
  const before = await firstPage(page);
  await paperMenu(page);
  await page.getByRole('menuitem', { name: 'Page setup…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Page setup' });
  await expect(dialog.getByLabel('Paper', { exact: true })).toHaveValue('a4');

  await field(dialog, 'Width').fill('300');
  await expect(dialog.getByLabel('Paper', { exact: true })).toHaveValue('custom');
  await field(dialog, 'Height').fill('200');
  await field(dialog, 'Left').fill('30');
  await expect.poll(async () => Math.round((await firstPage(page)).width)).toBe(Math.round(300 * MM));
  const after = await firstPage(page);
  expect(Math.round(after.height)).toBe(Math.round(200 * MM));
  // The music starts 18 mm further in.
  expect(after.inset - before.inset).toBeCloseTo(18 * MM, 0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Paper: Custom' })).toBeVisible();
  // 300 × 200 mm, in points.
  expect(await pdfPageSize(page)).toEqual([0, 0, 850, 567]);

  await openShuffle(page);
  await expect(page.getByRole('button', { name: 'Paper: Custom' })).toBeVisible();
  await expect.poll(async () => Math.round((await firstPage(page)).width)).toBe(Math.round(300 * MM));
});
