/**
 * The stylesheet (REND-218): F7 or the toolbar opens it; a change shows in the score at once, is
 * remembered for the file, and "As in the file" brings the file's own style back. The staff
 * lines' thickness, the space between systems and the first system's indent (REND-228). The
 * music engraved or handwritten, on screen and in exported pages (REND-241). The chord diagrams'
 * size and spacing (REND-227), kept with the text as the score is scaled (REND-223). The words
 * printed for techniques (REND-242). The tuning legend, or the strings before the tablature
 * (REND-225). Where the lyrics go (REND-239). Fingering's labels and place (REND-252).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** Track names written in the painted score. */
function trackName(page: Page) {
  return page.locator('.ot-partials text', { hasText: /^R\.Gt\.$/ });
}

/** The first system's height, in layout units. */
function systemHeight(page: Page): Promise<number> {
  return page
    .locator('.ot-partial[data-kind="system"]')
    .first()
    .evaluate(element => Number.parseFloat((element as HTMLElement).style.height));
}

test('changes show in the score, are remembered for the file, and go back to the file’s', async ({
  page,
}) => {
  await openShuffle(page);
  await expect(trackName(page).first()).toBeVisible();
  const height = await systemHeight(page);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'As in the file' })).toBeDisabled();

  await dialog
    .getByRole('radiogroup', { name: 'One track shown' })
    .getByRole('radio', { name: 'Hidden' })
    .click();
  await expect(trackName(page)).toHaveCount(0);

  const scale = dialog.getByRole('slider', { name: 'Scale' });
  await scale.focus();
  await page.keyboard.press('End');
  await expect(scale).toHaveAttribute('aria-valuetext', '200 %');
  await expect.poll(() => systemHeight(page)).toBeGreaterThan(height * 1.8);
  await expect(dialog.getByRole('button', { name: 'As in the file' })).toBeEnabled();
  await page.keyboard.press('Escape');

  // The same file again: its style comes back. Twice the size, the title fills the first screen:
  // the first system is painted once it is scrolled to.
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  const first = page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]').first();
  await expect(first).toBeAttached();
  await expect.poll(() => systemHeight(page)).toBeGreaterThan(height * 1.8);
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator('svg')).toBeVisible();
  await expect(trackName(page)).toHaveCount(0);

  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('slider', { name: 'Scale' })).toHaveAttribute('aria-valuetext', '200 %');
  await dialog.getByRole('button', { name: 'As in the file' }).click();
  await expect(trackName(page).first()).toBeVisible();
  await expect.poll(() => systemHeight(page)).toBeCloseTo(height, 0);
});

test('chord names are spelled in the style chosen, in the score and the chords panel (REND-226)', async ({
  page,
}) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro7/chords.gp')]);
  await expectScore(page);
  const texts = () => page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
  await expect.poll(async () => (await texts()).includes('Cm')).toBe(true);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('radiogroup', { name: 'Chord names' }).getByRole('radio', { name: 'Jazz' }).click();
  await expect.poll(async () => (await texts()).includes('C-')).toBe(true);
  expect(await texts()).not.toContain('Cm');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Chords', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Chords', exact: true }).getByText('C-', { exact: true }).first(),
  ).toBeVisible();
});

test('looks and stylesheets of one’s own, one the default for scores opened from now on (REND-220)', async ({
  page,
}) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro7/chords.gp')]);
  await expectScore(page);
  const texts = () => page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
  await expect.poll(async () => (await texts()).includes('Cm')).toBe(true);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByLabel('Apply a stylesheet').selectOption({ label: 'Jazz chart' });
  await expect.poll(async () => (await texts()).includes('C-')).toBe(true);

  await dialog.getByLabel('Save this style as').fill('Gig');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('list', { name: 'Your stylesheets' })).toContainText('Gig');
  await dialog.getByLabel('Scores opened from now on').selectOption({ label: 'Gig' });
  await page.keyboard.press('Escape');

  // Another score starts with it: the jazz chart has no tuning legend.
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect.poll(async () => (await texts()).includes('Twelve-Bar Shuffle in A')).toBe(true);
  expect(await texts()).not.toContain('Standard');
});

test('staff lines thicker, systems further apart, the first system indented', async ({ page }) => {
  await openShuffle(page);
  const systems = page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]');
  /** The first system's staff lines: where the longest start, and how thick they are. */
  const lines = () =>
    systems
      .first()
      .locator('rect')
      .evaluateAll(rects => {
        // Staff and tablature lines: long and thin (a phone's indented system is narrow).
        const long = rects.filter(
          rect => Number(rect.getAttribute('width')) > 60 && Number(rect.getAttribute('height')) < 10,
        );
        return {
          left: Math.min(...long.map(rect => Number(rect.getAttribute('x')))),
          thickness: Math.max(...long.map(rect => Number(rect.getAttribute('height')))),
        };
      });
  /** From the first system's top staff line to the second's. */
  const gap = () =>
    systems.evaluateAll(elements =>
      (elements as HTMLElement[]).slice(0, 2).reduce((distance, element, index) => {
        const tops = [...element.querySelectorAll('rect')]
          .filter(rect => Number(rect.getAttribute('width')) > 60 && Number(rect.getAttribute('height')) < 10)
          .map(rect => Number(rect.getAttribute('y')));
        const line = Number.parseFloat(element.style.top) + Math.min(...tops);
        return index === 0 ? -line : distance + line;
      }, 0),
    );
  await expect.poll(async () => (await lines()).thickness).toBeGreaterThan(0);
  const before = await lines();
  const gapBefore = await gap();

  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  for (const name of ['Staff line thickness', 'Space between systems', 'First system indent']) {
    await dialog.getByRole('slider', { name }).focus();
    await page.keyboard.press('End');
  }
  await expect(dialog.getByRole('slider', { name: 'Staff line thickness' })).toHaveAttribute(
    'aria-valuetext',
    '× 3.0',
  );
  await expect(dialog.getByRole('slider', { name: 'First system indent' })).toHaveAttribute(
    'aria-valuetext',
    '50 mm',
  );
  // Three times as thick; 50 mm (189 px at 96 dpi) further in; 60 px more between systems
  // (alphaTab keeps 10 px above and below each, four times as much now).
  await expect.poll(async () => (await lines()).thickness).toBeCloseTo(before.thickness * 3, 1);
  await expect.poll(async () => (await lines()).left - before.left).toBeCloseTo((50 * 96) / 25.4, 0);
  await expect.poll(gap).toBeCloseTo(gapBefore + 60, 0);
});

test('the coda on a system of its own, the space above it as asked (REND-200)', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/playback/coda-march.atex')]);
  await expectScore(page);
  const systems = page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]');
  /** The system with the coda (bar 7): its first bar, and the space between it and the one above. */
  const coda = () =>
    systems.evaluateAll(elements => {
      const boxes = (elements as HTMLElement[]).map(element => ({
        first: Number(element.dataset['firstBar']),
        last: Number(element.dataset['lastBar']),
        top: Number.parseFloat(element.style.top),
        bottom: Number.parseFloat(element.style.top) + Number.parseFloat(element.style.height),
      }));
      const index = boxes.findIndex(box => box.first <= 6 && box.last >= 6);
      const own = boxes[index];
      const above = boxes[index - 1];
      return own === undefined || above === undefined
        ? null
        : { first: own.first, gap: own.top - above.bottom };
    });
  // As Guitar Pro draws it: the coda starts a system, 10 mm below the music before it.
  await expect.poll(async () => (await coda())?.first).toBe(6);
  const usual = (await coda())?.gap ?? 0;

  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F7');
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  const space = dialog.getByRole('slider', { name: 'Space above the coda' });
  await expect(space).toHaveAttribute('aria-valuetext', '10 mm');
  await space.focus();
  await page.keyboard.press('End');
  await expect(space).toHaveAttribute('aria-valuetext', '50 mm');
  // 40 mm more: 151 px at 96 dpi, as the score is zoomed (at least half of it).
  await expect.poll(async () => ((await coda())?.gap ?? 0) - usual).toBeGreaterThan(75);

  // Attached: no space set apart above it, wherever it falls.
  await dialog.getByRole('switch', { name: 'Coda on a system of its own' }).click();
  await expect(space).toHaveAttribute('data-disabled', '');
  await expect.poll(async () => (await coda())?.gap ?? 0).toBeLessThan(usual - 15);
});

test('chord diagrams at the size and spacing asked, kept as the score is scaled (REND-227, REND-223)', async ({
  page,
}) => {
  await openShuffle(page);
  /**
   * The diagrams above the music, row by row: the space between two strings, and how far the
   * second diagram is from the first (across, or down to the next row on a narrow screen).
   */
  const diagrams = () =>
    page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="header"]').evaluateAll(elements => {
      const lines = elements
        .flatMap(element => {
          const top = Number.parseFloat((element as HTMLElement).style.top) || 0;
          return [...element.querySelectorAll('rect')]
            .filter(
              rect => Number(rect.getAttribute('width')) <= 3 && Number(rect.getAttribute('height')) > 25,
            )
            .map(rect => ({ x: Number(rect.getAttribute('x')), y: top + Number(rect.getAttribute('y')) }));
        })
        .sort((a, b) => a.y - b.y || a.x - b.x);
      const sameRow = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) < 1;
      const gaps = lines.slice(1).flatMap((line, index) => {
        const before = lines[index];
        return before !== undefined && sameRow(before, line) ? [line.x - before.x] : [];
      });
      const spacing = Math.min(...gaps);
      // Six strings a diagram: the second starts at the seventh.
      const [first, second] = [lines[0], lines[6]];
      const step =
        first === undefined || second === undefined ? 0 : Math.hypot(second.x - first.x, second.y - first.y);
      return { strings: lines.length, spacing, step };
    });
  // A7, D7 and E7, six strings each.
  await expect.poll(async () => (await diagrams()).strings).toBe(18);
  const usual = await diagrams();

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  const slider = (name: string) => dialog.getByRole('slider', { name, exact: true });
  await slider('Size of the diagrams above the music').focus();
  await page.keyboard.press('End');
  await expect(slider('Size of the diagrams above the music')).toHaveAttribute('aria-valuetext', '× 2.0');
  await expect.poll(async () => (await diagrams()).spacing).toBeCloseTo(usual.spacing * 2, 1);
  const large = await diagrams();
  await slider('Space between them').focus();
  await page.keyboard.press('Home');
  await expect.poll(async () => (await diagrams()).step).toBeLessThan(large.step);

  // Half the size: the diagrams too, unless they keep their size with the text.
  await slider('Scale').focus();
  await page.keyboard.press('Home');
  await expect.poll(async () => (await diagrams()).spacing).toBeCloseTo(usual.spacing, 1);
  await dialog.getByRole('switch', { name: 'Keep the size of text and chord diagrams' }).click();
  await expect.poll(async () => (await diagrams()).spacing).toBeCloseTo(usual.spacing * 2, 1);

  // Above their beats: a size and a room of their own.
  await expect(slider('Size of the diagrams above their beats')).toHaveCount(0);
  await dialog.getByRole('switch', { name: 'Chord diagrams above their beats' }).click();
  await expect(slider('Size of the diagrams above their beats')).toHaveAttribute('aria-valuetext', '× 1.0');
  await expect(slider('Room each takes along the staff')).toHaveAttribute('aria-valuetext', '× 1.0');
});

test('techniques are written with the words chosen, and as usual when left empty (REND-242)', async ({
  page,
}) => {
  await openShuffle(page);
  const written = (word: string) =>
    page.locator('.ot-scroll:not([hidden]) .ot-partials text', { hasText: word });
  await expect(written('P.M.').first()).toBeVisible();

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  const palmMute = dialog.getByRole('textbox', { name: 'Palm mute' });
  await expect(palmMute).toHaveAttribute('placeholder', 'P.M.');
  await palmMute.fill('mute');
  await palmMute.press('Enter');
  await expect(written('mute').first()).toBeVisible();
  await expect(written('P.M.')).toHaveCount(0);

  // Emptied: the usual word again.
  await palmMute.fill('');
  await palmMute.press('Enter');
  await expect(written('P.M.').first()).toBeVisible();
});

test('the tuning above the music, saying as much as asked, or before the tablature (REND-225)', async ({
  page,
}) => {
  await openShuffle(page);
  const written = (text: RegExp) =>
    page.locator('.ot-scroll:not([hidden]) .ot-partials text', { hasText: text });
  // The shuffle's guitar is in standard tuning: its name.
  await expect(written(/^Standard$/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  const detail = dialog.getByLabel('What the legend says');
  await detail.selectOption('all');
  // The name and every string: E for the first and the sixth.
  await expect(written(/^\s*= E$/)).toHaveCount(2);
  await detail.selectOption('changed');
  // Nothing tuned otherwise: nothing to say.
  await expect(written(/^Standard$/)).toHaveCount(0);
  await expect(written(/^\s*= E$/)).toHaveCount(0);

  await dialog
    .getByRole('radiogroup', { name: 'Where the tuning goes' })
    .getByRole('radio', { name: 'Before the tablature' })
    .click();
  await expect(detail).toHaveCount(0);
  // The strings' names at the start of the tablature, from the highest.
  await expect(written(/^B$/)).toHaveCount(1);
  await expect(written(/^E$/)).toHaveCount(2);
});

test('the lyrics under the staff, or above the staves (REND-239)', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/lyrics.atex')]);
  await expectScore(page);
  /** The first syllable's height against the first system's staff: negative above it, positive below. */
  const side = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
      .first()
      .evaluate(element => {
        const lines = [...element.querySelectorAll('rect')]
          .filter(rect => Number(rect.getAttribute('height')) < 2 && Number(rect.getAttribute('width')) > 60)
          .map(rect => Number(rect.getAttribute('y')));
        const syllable = [...element.querySelectorAll('text')].find(text => text.textContent === 'Morn-');
        if (syllable === undefined || lines.length === 0) return 0;
        const y = Number(syllable.getAttribute('y'));
        return y < Math.min(...lines) ? -1 : y > Math.max(...lines) ? 1 : 0;
      });
  await expect.poll(side).toBe(1);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Stylesheet' })
    .getByRole('radiogroup', { name: 'Where the lyrics go' })
    .getByRole('radio', { name: 'Above the staves' })
    .click();
  await expect.poll(side).toBe(-1);
});

test('fingering labelled and placed as asked (REND-252)', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'an arpeggio study' }).click();
  await expectScore(page);
  /** How often a SMuFL fingering letter is written in the score. */
  const count = async (codePoint: number) =>
    (await page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents())
      .join('')
      .split(String.fromCodePoint(codePoint)).length - 1;
  const P = 0xed17;
  const T = 0xed18;
  // The study's right hand: p i m a.
  await expect.poll(() => count(P)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog
    .getByRole('radiogroup', { name: 'Right-hand fingers' })
    .getByRole('radio', { name: 't i m a o' })
    .click();
  // The thumb a t now.
  await expect.poll(() => count(P)).toBe(0);
  await expect.poll(() => count(T)).toBeGreaterThan(0);
  /** Whether the first system's fingering all lies above its staff. */
  const above = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
      .first()
      .evaluate((element, letter) => {
        const top = Math.min(
          ...[...element.querySelectorAll('rect')]
            .filter(
              rect => Number(rect.getAttribute('height')) < 2 && Number(rect.getAttribute('width')) > 60,
            )
            .map(rect => Number(rect.getAttribute('y'))),
        );
        const marks = [...element.querySelectorAll('g.at')]
          .filter(group => group.textContent === letter)
          .map(group =>
            Number(/translate\([^ ]+ ([^)]+)\)/.exec(group.getAttribute('transform') ?? '')?.[1]),
          );
        return marks.length > 0 && marks.every(y => y < top);
      }, String.fromCodePoint(T));
  expect(await above()).toBe(false);
  await dialog
    .getByRole('radiogroup', { name: 'On the staff' })
    .getByRole('radio', { name: 'Above' })
    .click();
  await expect.poll(above).toBe(true);
});

const petaluma = dirname(createRequire(import.meta.url).resolve('@vexflow-fonts/petaluma/package.json'));
const PETALUMA = { otf: join(petaluma, 'petaluma.otf'), metadata: join(petaluma, 'metadata.json') };

/** The music symbols' outlines the first exported SVG page draws, by code point. */
async function exportedSymbols(page: Page): Promise<Map<string, string>> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('radio', { name: 'SVG' }).click();
  const downloading = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export SVG' }).click();
  const bytes = readFileSync(await (await downloading).path());
  const files = unzipSync(new Uint8Array(bytes));
  const first = new TextDecoder().decode(files[Object.keys(files)[0] ?? ''] ?? new Uint8Array());
  await page.keyboard.press('Escape');
  return new Map(
    [...first.matchAll(/<path id="g([0-9a-f]+)" d="([^"]*)"\/>/g)].map(match => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
}

test('the music engraved, handwritten or in a SMuFL font of one’s own, on screen and in exports', async ({
  page,
}) => {
  await openShuffle(page);
  const symbol = page.locator('.ot-scroll:not([hidden]) .ot-partial .at').first();
  await expect(symbol).toBeAttached();
  const family = () => symbol.evaluate(element => getComputedStyle(element).fontFamily);
  expect(await family()).toMatch(/^"?Bravura"?/);
  const engraved = await exportedSymbols(page);
  expect(engraved.size).toBeGreaterThan(5);

  const stylesheet = async () => {
    await page.getByRole('region', { name: /^Score/ }).focus();
    await page.keyboard.press('F7');
    return page.getByRole('dialog', { name: 'Stylesheet' });
  };
  let dialog = await stylesheet();
  let font = dialog.getByRole('combobox', { name: 'Music font' });
  await font.selectOption({ label: 'Handwritten (Petaluma)' });
  await expect(dialog.getByText('Petaluma: the notes as if written by hand.')).toBeVisible();
  // Petaluma, Bravura standing in for the symbols it lacks.
  await expect.poll(family).toMatch(/^"?Petaluma"?, "?Bravura"?/);
  await expect.poll(() => page.evaluate(() => document.fonts.check('36px Petaluma'))).toBe(true);
  await page.keyboard.press('Escape');

  // Exported pages draw the same symbols, from Petaluma's outlines.
  const handwritten = await exportedSymbols(page);
  expect([...handwritten.keys()].sort()).toEqual([...engraved.keys()].sort());
  const redrawn = [...handwritten].filter(([codePoint, d]) => d !== engraved.get(codePoint));
  expect(redrawn.length).toBeGreaterThan(5);

  // A font of one's own: its file and its metadata chosen together (Petaluma's stand in for one).
  dialog = await stylesheet();
  font = dialog.getByRole('combobox', { name: 'Music font' });
  const files = dialog.getByLabel('SMuFL font and its metadata');
  await files.setInputFiles([PETALUMA.metadata]);
  await expect(dialog.getByRole('alert')).toHaveText(
    'Choose the font (.otf, .ttf or .woff) and its SMuFL metadata (.json) together.',
  );
  await files.setInputFiles([PETALUMA.otf, PETALUMA.metadata]);
  await expect(font).toHaveValue(/^own:[0-9a-f]{16}$/);
  await expect(dialog.getByText('A SMuFL font of your own, kept in this browser only.')).toBeVisible();
  await expect.poll(family).toMatch(/^"?OpenTabz music [0-9a-f]{12}"?, "?Bravura"?/);
  await page.keyboard.press('Escape');
  const own = await exportedSymbols(page);
  expect(own).toEqual(handwritten);

  // Kept in this browser: the score opened again is set in it; then it is removed.
  await openShuffle(page);
  await expect.poll(family).toMatch(/^"?OpenTabz music [0-9a-f]{12}"?/);
  dialog = await stylesheet();
  await dialog.getByRole('button', { name: 'Remove Petaluma' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Music font' })).toHaveValue('bravura');
  await expect.poll(family).toMatch(/^"?Bravura"?/);
});
