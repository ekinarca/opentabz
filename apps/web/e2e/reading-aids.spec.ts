/**
 * Reading aids (VIEW-009, REND-306, REND-317, REND-318): note names above the notes, with octaves
 * if asked, beat counts under them, and a key to the drums under the title block, from the Staves
 * menu; remembered.
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function texts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function allTracks(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Tracks: / }).click();
  await page.getByRole('menuitem', { name: 'All tracks' }).click();
}

/** The texts at the top of the score, where the key goes, in order. */
async function top(page: Page): Promise<string> {
  await page.locator('.ot-scroll:not([hidden])').evaluate(scroller => {
    scroller.scrollTop = 0;
  });
  return (await texts(page)).join(' ');
}

async function staves(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Staves: / }).click();
}

test('note names above the notes and counts under them, remembered', async ({ page }) => {
  await openShuffle(page);
  expect(await texts(page)).not.toContain('A·E');

  await staves(page);
  await page.getByRole('menuitemradio', { name: 'Letters', exact: true }).click();
  // The riff's power chord: A on the A string, E on the D string.
  await expect.poll(async () => (await texts(page)).includes('A·E')).toBe(true);

  await staves(page);
  await page.getByRole('menuitemradio', { name: 'Letters and octaves' }).click();
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(true);

  await staves(page);
  await page.getByRole('menuitemcheckbox', { name: 'Beat counts' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await texts(page)).filter(text => text === '&').length).toBeGreaterThan(3);

  // The next score is read the same way.
  await openShuffle(page);
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(true);
  await staves(page);
  await page.getByRole('menuitemradio', { name: 'None', exact: true }).click();
  await expect.poll(async () => (await texts(page)).includes('A2·E3')).toBe(false);
});

test('a key to the drums under the title block, in the PDF too, remembered', async ({ page }) => {
  await openShuffle(page);
  await allTracks(page);
  // Names wrap onto two lines where they are long: the words are read in order.
  const written = () => top(page);
  await expect.poll(written).toContain('Twelve-Bar Shuffle in A');
  expect(await written()).not.toContain('Snare (hit)');

  await staves(page);
  await page.getByRole('menuitemcheckbox', { name: 'Drum key' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(written).toContain('Snare (hit)');
  for (const sound of ['Crash high (hit)', 'Hi-Hat (closed)', 'Hi-Hat (open)', 'Kick (hit)']) {
    expect(await written()).toContain(sound);
  }

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Export' }).getByRole('button', { name: 'Export PDF' }).click();
  const pdf = await getDocument({
    data: new Uint8Array(await readFile(await (await download).path())),
    useSystemFonts: false,
  }).promise;
  const firstPage = (await (await pdf.getPage(1)).getTextContent()).items
    .flatMap(item => ('str' in item ? [item.str] : []))
    .join(' ')
    .replace(/\s+/g, ' ');
  expect(firstPage).toContain('Snare (hit)');
  await page.keyboard.press('Escape');

  // The next score shows it too, until it is turned off.
  await openShuffle(page);
  await allTracks(page);
  await expect.poll(written).toContain('Snare (hit)');
  await staves(page);
  await page.getByRole('menuitemcheckbox', { name: 'Drum key' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(written).not.toContain('Snare (hit)');
});
