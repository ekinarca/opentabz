/**
 * Header and footer (REND-236, REND-237): the title block's lines shown or not, written from
 * templates of the score's information and aligned; the pages' header and footer, the first
 * page's and the later ones', with the page number and count; on screen and in the PDF.
 */
import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('opentabz.preferences.v1', JSON.stringify({ paper: 'a4', layout: 'page' }));
  });
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  // Phones open scores in the vertical layout.
  await page.getByRole('radio', { name: 'Page', exact: true }).click();
  await expect(page.locator('.ot-page')).toHaveCount(2);
}

function scoreTexts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function template(dialog: Locator, name: string, value: string): Promise<void> {
  const field = dialog.getByRole('textbox', { name: `Text of ${name}` });
  await field.fill(value);
  await field.press('Enter');
}

test('the title block and the pages’ lines, on screen and in the PDF', async ({ page }) => {
  await openShuffle(page);
  await expect.poll(async () => (await scoreTexts(page)).includes('OpenTabz')).toBe(true);
  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });

  await dialog.getByRole('checkbox', { name: 'Artist', exact: true }).uncheck();
  await expect.poll(async () => (await scoreTexts(page)).includes('OpenTabz')).toBe(false);
  await template(dialog, 'Title', '%TITLE% (%ARTIST%)');
  await expect
    .poll(async () => (await scoreTexts(page)).includes('Twelve-Bar Shuffle in A (OpenTabz)'))
    .toBe(true);

  await template(dialog, 'First page footer', 'Page %PAGE% of %PAGES%');
  await template(dialog, 'Later pages header', '%TITLE% · %ARTIST%');
  await dialog
    .getByRole('radiogroup', { name: 'Alignment of Later pages header' })
    .getByRole('radio', { name: 'Left' })
    .click();
  const pages = page.locator('.ot-page');
  await expect(pages.first().locator('.ot-page-footer')).toHaveText('Page 1 of 2');
  const header = pages.nth(1).locator('.ot-page-header');
  await expect(header).toHaveText('Twelve-Bar Shuffle in A · OpenTabz');
  await expect(header).toHaveCSS('text-align', 'left');
  await page.keyboard.press('Escape');

  // The PDF writes the same.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exportDialog = page.getByRole('dialog', { name: 'Export' });
  const download = page.waitForEvent('download');
  await exportDialog.getByRole('button', { name: 'Export PDF' }).click();
  const pdf = await getDocument({
    data: new Uint8Array(await readFile(await (await download).path())),
    useSystemFonts: false,
  }).promise;
  const pageText = async (number: number) =>
    (await (await pdf.getPage(number)).getTextContent()).items.flatMap(item =>
      'str' in item ? [item.str] : [],
    );
  expect(await pageText(1)).toContain('Page 1 of 2');
  expect(await pageText(1)).toContain('Twelve-Bar Shuffle in A (OpenTabz)');
  expect(await pageText(1)).not.toContain('OpenTabz');
  expect(await pageText(2)).toContain('Twelve-Bar Shuffle in A · OpenTabz');
});

test('each kind of text in the font, size and style chosen (REND-238)', async ({ page }) => {
  await openShuffle(page);
  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });

  await dialog.getByRole('combobox', { name: 'Font of Title' }).selectOption('mono');
  const size = dialog.getByRole('spinbutton', { name: 'Size of Title' });
  await size.fill('40');
  await size.blur();
  const title = page.locator('.ot-scroll:not([hidden]) .ot-partials text', {
    hasText: /^Twelve-Bar Shuffle in A$/,
  });
  await expect.poll(async () => (await title.getAttribute('style')) ?? '').toContain('40px');
  expect(await title.getAttribute('style')).toContain('Courier New');

  await dialog.getByRole('checkbox', { name: 'Page footer in bold' }).check();
  await expect(page.locator('.ot-page').first().locator('.ot-page-footer')).toHaveCSS('font-weight', '700');
  await dialog.getByRole('checkbox', { name: 'Fret numbers in italics' }).check();
  await expect
    .poll(async () =>
      page
        .locator('.ot-scroll:not([hidden]) .ot-partials text', { hasText: /^[0-9]$/ })
        .evaluateAll(texts => texts.some(text => (text.getAttribute('style') ?? '').includes('italic 14px'))),
    )
    .toBe(true);
});
