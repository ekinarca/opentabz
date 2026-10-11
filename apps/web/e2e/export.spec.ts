/**
 * Exports: the pages as a PDF document, SVG and PNG files (EXP-001, EXP-002, EXP-003, EXP-026,
 * EXP-027) and printed (EXP-016), named after a template (EXP-028); the score saved as a Standard MIDI File (EXP-004, EXP-024), named after it, every
 * track named in it, muted tracks left out on request; and as WAV audio (EXP-005, EXP-029), the
 * whole song or the selected bars. What the files hold is proved in
 * packages/core/test/print-sheet.test.ts, packages/core/test/export-midi.test.ts and
 * packages/audio/test/export-render.test.ts.
 */
import { readFileSync } from 'node:fs';
import type { Download, Locator, Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, expectScore, openHome, test, transportText } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** Lays pages out on this paper, in the page view (the preferences new documents follow). */
async function usePaper(page: Page, paper: 'a4' | 'letter'): Promise<void> {
  await page.addInitScript(id => {
    localStorage.setItem('opentabz.preferences.v1', JSON.stringify({ paper: id, layout: 'page' }));
  }, paper);
}

async function openExport(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function downloadFrom(page: Page, button: Locator): Promise<{ file: Download; bytes: Buffer }> {
  const downloading = page.waitForEvent('download', { timeout: 60_000 });
  await button.click();
  const file = await downloading;
  return { file, bytes: readFileSync(await file.path()) };
}

/** Width and height of a PNG file, from its header. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The colour of a PNG's top-left pixel, as the browser decodes it. */
function cornerPixel(page: Page, bytes: Buffer): Promise<number[]> {
  return page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const context = canvas.getContext('2d');
    if (context === null) return [];
    context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(1, 1, 1, 1).data);
  }, bytes.toString('base64'));
}

interface Placed {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

/** Where the browser draws the texts of the first page on screen: each one's origin on its baseline. */
function textsOnScreen(page: Page): Promise<Placed[]> {
  return page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('.ot-page');
    if (sheet === null) return [];
    const pageLeft = Number.parseFloat(sheet.style.left);
    const pageTop = Number.parseFloat(sheet.style.top);
    const pageHeight = Number.parseFloat(sheet.style.height);
    const placed: { text: string; x: number; y: number }[] = [];
    for (const partial of document.querySelectorAll<HTMLElement>('.ot-partial')) {
      const left = Number.parseFloat(partial.style.left) - pageLeft;
      const top = Number.parseFloat(partial.style.top) - pageTop;
      if (top > pageHeight) continue;
      for (const text of partial.querySelectorAll<SVGTextElement>('svg text')) {
        const content = text.textContent.trim();
        if (content.length === 0 || text.closest('.at') !== null || text.getNumberOfChars() === 0) continue;
        const matrix = text.getCTM();
        if (matrix?.b !== 0 || matrix.c !== 0) continue;
        // The glyph's box runs from the font's ascent above the baseline to its descent below:
        // Georgia's and Arial's ascents are 0.807 and 0.810 of their height.
        const start = text.getStartPositionOfChar(0);
        const box = text.getExtentOfChar(0);
        const ascent = getComputedStyle(text).fontFamily.includes('Georgia') ? 1878 / 2327 : 1854 / 2288;
        placed.push({
          text: content,
          x: left + matrix.e + start.x,
          y: top + matrix.f + box.y + box.height * ascent,
        });
      }
    }
    return placed;
  });
}

test('exports the pages as a PDF document: vector, its text where the screen shows it', async ({
  page,
  browserName,
}) => {
  await usePaper(page, 'a4');
  await openShuffle(page);
  // Phones open scores in the vertical layout: show the pages to compare.
  await page.getByRole('radio', { name: 'Page', exact: true }).click();
  await expect(page.locator('.ot-page').first()).toBeVisible();
  const dialog = await openExport(page);
  await expect(dialog.getByRole('radio', { name: 'PDF' })).toHaveAttribute('aria-checked', 'true');
  const { file, bytes } = await downloadFrom(page, dialog.getByRole('button', { name: 'Export PDF' }));
  expect(file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.pdf');
  const pdf = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
  }).promise;
  // The pages of the page view, on A4, with the document's information.
  await expect(page.locator('.ot-page')).toHaveCount(pdf.numPages);
  const first = await pdf.getPage(1);
  expect(first.view.map(value => Math.round(value))).toEqual([0, 0, 595, 842]);
  const { info } = (await pdf.getMetadata()) as { info: Record<string, unknown> };
  expect(info['Title']).toBe('Twelve-Bar Shuffle in A');
  expect(String(info['Producer'])).toContain('alphaTab');

  // Each text sits where the browser draws it in the page view.
  const items = (await first.getTextContent()).items.flatMap(item =>
    'str' in item
      ? [
          {
            text: item.str,
            x: (item.transform[4] as number) * (96 / 72),
            y: ((first.view[3] ?? 0) - (item.transform[5] as number)) * (96 / 72),
          },
        ]
      : [],
  );
  const onScreen = await textsOnScreen(page);
  const checked = [
    'Twelve-Bar Shuffle in A',
    'OpenTabz demo',
    'Music by OpenTabz contributors',
    'Shuffle',
    'Twelve bars',
    'A7',
    'P.M.',
  ];
  for (const text of checked) {
    const screen = onScreen.find(placed => placed.text === text);
    if (screen === undefined) throw new Error(`"${text}" expected on screen.`);
    const nearest = items
      .filter(item => item.text === text)
      .sort(
        (a, b) => Math.hypot(a.x - screen.x, a.y - screen.y) - Math.hypot(b.x - screen.x, b.y - screen.y),
      )[0];
    if (nearest === undefined) throw new Error(`"${text}" expected in the PDF.`);
    expect(Math.abs(nearest.x - screen.x), `${text}: x`).toBeLessThan(1);
    // Engines place hanging and middle baselines a little differently; Chromium is the reference.
    if (browserName === 'chromium') expect(Math.abs(nearest.y - screen.y), `${text}: y`).toBeLessThan(1);
  }
});

test('exports the selected bars on pages of their own', async ({ page }) => {
  await usePaper(page, 'a4');
  await openShuffle(page);
  await page.getByRole('button', { name: /^Go to: / }).click();
  await page
    .getByRole('dialog', { name: 'Go to' })
    .getByRole('button', { name: 'Select Turnaround (bars 9–12)' })
    .click();
  await expect.poll(() => transportText(page)).toMatch(/Bars 9–12 selected/);
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: 'Selection' }).click();
  await expect(dialog.getByText('Bars 9–12 on pages of their own.')).toBeVisible();
  const { bytes } = await downloadFrom(page, dialog.getByRole('button', { name: 'Export PDF' }));
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  expect(pdf.numPages).toBe(1);
  const texts = (await (await pdf.getPage(1)).getTextContent()).items.map(item =>
    'str' in item ? item.str : '',
  );
  // The turnaround, numbered as in the score; nothing of the bars before it.
  expect(texts).toContain('Turnaround');
  expect(texts).toContain('9');
  expect(texts).not.toContain('Shuffle');
  expect(texts).not.toContain('Twelve bars');
});

test('names exported files after a template, remembered', async ({ page }) => {
  await openShuffle(page);
  let dialog = await openExport(page);
  const name = dialog.getByLabel('File name');
  await expect(name).toHaveValue('%T');
  await name.fill('%T - %t (%n of %N)');
  await expect(dialog.getByText('Saved as “Twelve-Bar Shuffle in A - Rhythm Guitar (1 of 4)”')).toBeVisible();
  const midi = await downloadFrom(page, dialog.getByRole('button', { name: 'Export MIDI' }));
  expect(midi.file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A - Rhythm Guitar (1 of 4).mid');
  await page.keyboard.press('Escape');

  // A fresh page (opening the home page again: a reload just before would race its engine).
  await openShuffle(page);
  dialog = await openExport(page);
  await expect(dialog.getByLabel('File name')).toHaveValue('%T - %t (%n of %N)');
  await dialog.getByLabel('File name').fill('%d %T');
  const pdf = await downloadFrom(page, dialog.getByRole('button', { name: 'Export PDF' }));
  expect(pdf.file.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2} Twelve-Bar Shuffle in A\.pdf$/);
});

test('exports the pages as SVG files, vector and with their music symbols as outlines', async ({ page }) => {
  await usePaper(page, 'letter');
  await openShuffle(page);
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: 'SVG' }).click();
  const { file, bytes } = await downloadFrom(page, dialog.getByRole('button', { name: 'Export SVG' }));
  // Every page of the score, one file each, numbered.
  expect(file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.zip');
  const files = unzipSync(new Uint8Array(bytes));
  const names = Object.keys(files);
  expect(names.length).toBeGreaterThan(1);
  expect(names).toEqual(names.map((_, index) => `Twelve-Bar Shuffle in A-${index + 1}.svg`));
  const first = new TextDecoder().decode(files[names[0] ?? '']);
  expect(first).toContain('width="215.9mm" height="279.4mm"');
  expect(first).toContain('>Twelve-Bar Shuffle in A</text>');
  expect(first).toMatch(/<use xlink:href="#g[0-9a-f]+"/);
  expect(first).not.toContain('class="at"');
  const last = new TextDecoder().decode(files[names.at(-1) ?? '']);
  expect(last).toContain(`>${names.length} / ${names.length}</text>`);

  // The browser draws an exported page at the size of a sheet of US Letter.
  const drawn = await page.evaluate(async svg => {
    const image = new Image();
    image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, first);
  expect(drawn).toEqual({ width: 816, height: 1056 });
});

test('exports a range of pages as PNG at a chosen resolution, with or without background', async ({
  page,
}) => {
  await usePaper(page, 'a4');
  await openShuffle(page);
  const dialog = await openExport(page);
  await dialog.getByRole('radio', { name: 'PNG' }).click();
  await dialog.getByRole('radio', { name: 'Range' }).click();
  await expect(dialog.getByText(/The score fills \d+ pages\./)).toBeVisible();
  await dialog.getByLabel('To page').fill('1');
  await dialog.getByRole('radio', { name: '300 dpi' }).click();
  const opaque = await downloadFrom(page, dialog.getByRole('button', { name: 'Export PNG' }));
  // One page: one image, A4 at 300 dpi.
  expect(opaque.file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A-1.png');
  expect(pngSize(opaque.bytes)).toEqual({ width: 2480, height: 3508 });
  expect(await cornerPixel(page, opaque.bytes)).toEqual([255, 255, 255, 255]);

  await dialog.getByRole('radio', { name: '72 dpi' }).click();
  await dialog.getByRole('switch', { name: 'Transparent background' }).click();
  const clear = await downloadFrom(page, dialog.getByRole('button', { name: 'Export PNG' }));
  expect(pngSize(clear.bytes)).toEqual({ width: 595, height: 842 });
  expect((await cornerPixel(page, clear.bytes))[3]).toBe(0);
});

test('prints every page on its own sheet of paper, from the dialog or with the shortcut', async ({
  page,
  browserName,
}) => {
  await usePaper(page, 'a4');
  await page.addInitScript(() => {
    const printing = window as unknown as { printed: number };
    printing.printed = 0;
    window.print = () => {
      printing.printed += 1;
    };
  });
  await openShuffle(page);
  const printed = () => page.evaluate(() => (window as unknown as { printed: number }).printed);
  const pages = page.locator('#ot-print > .ot-print-page');

  const dialog = await openExport(page);
  await dialog.getByRole('button', { name: 'Print…' }).click();
  await expect.poll(printed).toBe(1);
  const count = await pages.count();
  expect(count).toBeGreaterThan(1);
  await expect(pages.first().locator('svg use').first()).toBeAttached();
  // Each page is a sheet of A4 when printed.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#root')).toBeHidden();
  await expect(pages.first()).toBeVisible();
  const box = await pages.first().boundingBox();
  expect(box?.width).toBeCloseTo(793.7, 0);
  expect(box?.height).toBeCloseTo(1122.5, 0);
  if (browserName === 'chromium') {
    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1');
    expect(pdf.match(/\/Type\s*\/Page\b/g)?.length).toBe(count);
  }
  await page.emulateMedia({ media: 'screen' });
  // When printing is over, the pages go.
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(pages).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // ⌘P / Ctrl+P prints, and the dialog it opens closes after.
  await page.locator('.ot-scroll').first().focus();
  await page.keyboard.press('ControlOrMeta+p');
  await expect.poll(printed).toBe(2);
  await expect(pages).toHaveCount(count);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeHidden();
  await expect(pages).toHaveCount(0);
});

async function exportMidi(page: Page): Promise<{ file: Download; bytes: Buffer }> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export MIDI' }).click();
  const file = await downloading;
  const bytes = readFileSync(await file.path());
  await page.keyboard.press('Escape');
  return { file, bytes };
}

/** Track names (meta event 0x03) in a MIDI file, in order. */
function trackNames(bytes: Buffer): string[] {
  const names: string[] = [];
  for (let at = 0; at + 3 < bytes.length; at++) {
    if (bytes[at] !== 0xff || bytes[at + 1] !== 0x03) continue;
    const length = bytes[at + 2] ?? 0;
    names.push(bytes.subarray(at + 3, at + 3 + length).toString('utf8'));
  }
  return names;
}

test('exports the score as a MIDI file named after it, leaving out muted tracks', async ({ page }) => {
  await openShuffle(page);
  const { file, bytes } = await exportMidi(page);
  expect(file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.mid');
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('MThd');
  // The song's title on the conductor track, then each instrument.
  expect(trackNames(bytes)).toEqual([
    'Twelve-Bar Shuffle in A',
    'Rhythm Guitar',
    'Lead Guitar',
    'Bass',
    'Drums',
  ]);

  await page.getByRole('button', { name: 'Mixer' }).click();
  const mixer = page.getByRole('dialog', { name: 'Mixer' });
  await mixer.getByRole('button', { name: 'Mute Lead Guitar' }).click();
  await page.keyboard.press('Escape');
  expect(trackNames((await exportMidi(page)).bytes)).toEqual([
    'Twelve-Bar Shuffle in A',
    'Rhythm Guitar',
    'Bass',
    'Drums',
  ]);
});

interface Wav {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bits: number;
  readonly seconds: number;
  readonly peak: number;
}

function readWav(bytes: Buffer): Wav {
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('latin1')).toBe('WAVE');
  const sampleRate = bytes.readUInt32LE(24);
  const channels = bytes.readUInt16LE(22);
  const bits = bytes.readUInt16LE(34);
  const data = bytes.readUInt32LE(40);
  let peak = 0;
  for (let at = 44; at + 1 < 44 + data; at += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(at)));
  return {
    sampleRate,
    channels,
    bits,
    seconds: data / (sampleRate * channels * (bits / 8)),
    peak: peak / 32768,
  };
}

async function exportWav(page: Page): Promise<{ file: Download; wav: Wav }> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  const downloading = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export WAV' }).click();
  const file = await downloading;
  const wav = readWav(readFileSync(await file.path()));
  await expect(dialog.getByRole('button', { name: 'Export WAV' })).toBeVisible();
  await page.keyboard.press('Escape');
  return { file, wav };
}

test('exports the audio as WAV: the whole song, or the selected bars', async ({ page }) => {
  await openShuffle(page);
  const whole = await exportWav(page);
  expect(whole.file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.wav');
  expect([whole.wav.sampleRate, whole.wav.channels, whole.wav.bits]).toEqual([44100, 2, 16]);
  // The song plays for half a minute, then its last notes ring out.
  expect(whole.wav.seconds).toBeGreaterThan(30);
  expect(whole.wav.seconds).toBeLessThan(33);
  expect(whole.wav.peak).toBeGreaterThan(0.05);

  // Bars 9 to 12 only: a third of the song.
  await page.getByRole('button', { name: /^Go to: / }).click();
  await page
    .getByRole('dialog', { name: 'Go to' })
    .getByRole('button', { name: 'Select Turnaround (bars 9–12)' })
    .click();
  await expect.poll(() => transportText(page)).toMatch(/Bars 9–12 selected/);
  const part = await exportWav(page);
  expect(part.wav.seconds).toBeGreaterThan(whole.wav.seconds / 4);
  expect(part.wav.seconds).toBeLessThan(whole.wav.seconds / 2);
  expect(part.wav.peak).toBeGreaterThan(0.05);
});
