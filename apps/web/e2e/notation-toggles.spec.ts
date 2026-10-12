/**
 * Transposing instruments at concert pitch (REND-032), and tempo marks shown or hidden
 * (REND-210), with their decimals or rounded (REND-240); C and cut C, the pitch a bend reaches,
 * the rests of the lower voices and tuplet brackets (REND-248); arpeggio arrowheads, a trill's
 * second note and "sl." (REND-249); tied notes' frets, dashed quarter rests and coloured voices in
 * the tablature (REND-250); level beams (REND-246); in the score on screen.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

/** SMuFL's sharp, as the score's music font writes it. */
const SHARP = '';

function scoreTexts(page: Page): Promise<string[]> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').allTextContents();
}

async function sharps(page: Page): Promise<number> {
  return (await scoreTexts(page)).join('').split(SHARP).length - 1;
}

test('a transposing instrument reads as its part, or at concert pitch', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro8/transposition-tonality-a.gp')]);
  await expectScore(page);
  // Every track: the first is not a transposing one.
  await page.getByRole('button', { name: /^Tracks: / }).click();
  await page.getByRole('menuitem', { name: 'All tracks' }).click();
  await page.keyboard.press('Escape');
  // Read once the score has settled (on phones it is laid out again as the zoom fits the width).
  let written = 0;
  await expect
    .poll(async () => {
      const now = await sharps(page);
      const settled = now > 0 && now === written;
      written = now;
      return settled;
    })
    .toBe(true);

  await page.getByRole('button', { name: /^Staves: / }).click();
  const concert = page.getByRole('menuitemcheckbox', { name: 'Concert pitch' });
  await concert.click();
  await expect.poll(() => sharps(page)).not.toBe(written);

  // The menu stays open for another choice.
  await expect(concert).toBeChecked();
  await concert.click();
  await expect.poll(() => sharps(page)).toBe(written);
  await page.keyboard.press('Escape');
});

test('tempo marks are shown or hidden', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  const tempo = async () => (await scoreTexts(page)).some(text => text.includes('112'));
  await expect.poll(tempo).toBe(true);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page.getByRole('dialog', { name: 'Stylesheet' }).getByRole('switch', { name: 'Tempo marks' }).click();
  await expect.poll(tempo).toBe(false);
});

test('tempo marks with their decimals, or rounded', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/tempo.atex')]);
  await expectScore(page);
  const tempos = async () => (await scoreTexts(page)).filter(text => text.includes('= '));
  await expect.poll(tempos).toEqual([' = 92.5', ' = 120.25']);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'Tempo decimals (120.5)' }).click();
  await expect.poll(tempos).toEqual([' = 93', ' = 120']);
  // Without tempo marks, their decimals cannot be chosen.
  await dialog.getByRole('switch', { name: 'Tempo marks' }).click();
  await expect(dialog.getByRole('switch', { name: 'Tempo decimals (120.5)' })).toBeDisabled();
});

test('cut C, the pitch a bend reaches, the lower voices’ rests and tuplet brackets', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/notation.atex')]);
  await expectScore(page);
  /** How often a SMuFL symbol is written in the score. */
  const count = async (codePoint: number) =>
    (await scoreTexts(page)).join('').split(String.fromCodePoint(codePoint)).length - 1;
  const brackets = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial path')
      .evaluateAll(
        paths =>
          paths.filter(path =>
            /^M[^M]*L[^M]*L[^M]*M[^M]*L[^M]*L[^M]*$/.test((path.getAttribute('d') ?? '').trim()),
          ).length,
      );
  const CUT_COMMON = 0xe08b;
  const BLACK_HEAD = 0xe0a4;
  const QUARTER_REST = 0xe4e5;
  await expect.poll(() => count(BLACK_HEAD)).toBeGreaterThan(0);
  const heads = await count(BLACK_HEAD);
  const rests = await count(QUARTER_REST);
  expect(await count(CUT_COMMON)).toBe(0);
  expect(await brackets()).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'C and cut C for 4/4 and 2/2' }).click();
  await expect.poll(() => count(CUT_COMMON)).toBe(1);
  await dialog.getByRole('switch', { name: 'Pitch a bend reaches' }).click();
  await expect.poll(() => count(BLACK_HEAD)).toBeLessThan(heads);
  await dialog.getByRole('switch', { name: 'Rests of voices 2 to 4' }).click();
  await expect.poll(() => count(QUARTER_REST)).toBeLessThan(rests);
  await dialog.getByRole('switch', { name: 'Tuplet brackets' }).click();
  await expect.poll(brackets).toBe(0);
});

test('arpeggio arrowheads, a trill’s second note, "sl.", tied frets, dashes and coloured voices', async ({
  page,
}) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/techniques.atex')]);
  await expectScore(page);
  const texts = () => scoreTexts(page);
  const arrowheads = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial path')
      .evaluateAll(
        paths =>
          paths.filter(path => /^M[^ML]*L[^ML]*L[^MLz]*z$/.test((path.getAttribute('d') ?? '').trim()))
            .length,
      );
  const green = () => page.locator('.ot-scroll:not([hidden]) .ot-partial text[fill="#2E9B4F"]').count();
  await expect.poll(texts).toContain('(5)');
  expect(await arrowheads()).toBe(3);
  expect((await texts()).filter(text => text === 'sl.')).toHaveLength(2);
  expect(await texts()).not.toContain('(7)');
  expect(await green()).toBe(0);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'Arrowheads on arpeggios' }).click();
  // The strum keeps its arrowhead.
  await expect.poll(arrowheads).toBe(1);
  await dialog.getByRole('switch', { name: 'A trill’s second note in the tablature' }).click();
  await expect.poll(texts).not.toContain('(5)');
  await dialog.getByRole('switch', { name: '"sl." over slides' }).click();
  await expect.poll(texts).not.toContain('sl.');
  await dialog.getByRole('switch', { name: 'Every tied note’s fret' }).click();
  await expect.poll(texts).toContain('(7)');
  await dialog.getByRole('switch', { name: 'Voices 2 to 4 in colour' }).click();
  await expect.poll(green).toBeGreaterThan(2);
  await dialog.getByRole('switch', { name: 'Quarter rests as a dash' }).click();
  await page.keyboard.press('Escape');

  // Quarter rests show in the tablature where it stands alone: as dashes now.
  const QUARTER_REST = String.fromCodePoint(0xe4e5);
  await page.getByRole('button', { name: /^Staves: / }).click();
  await page.getByRole('menuitemradio', { name: 'Tab', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(texts).toContain('(7)');
  expect((await texts()).join('')).not.toContain(QUARTER_REST);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Stylesheet' })
    .getByRole('switch', { name: 'Quarter rests as a dash' })
    .click();
  await expect.poll(async () => (await texts()).join('').split(QUARTER_REST).length - 1).toBe(2);
});

test('beams drawn level on request', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/techniques.atex')]);
  await expectScore(page);
  /** Beams (filled four-sided paths) whose two ends are not level. */
  const sloped = () =>
    page.locator('.ot-scroll:not([hidden]) .ot-partial path').evaluateAll(
      paths =>
        paths.filter(path => {
          const d = (path.getAttribute('d') ?? '').trim();
          if (!/^M[^ML]*L[^ML]*L[^ML]*L[^MLz]*z$/.test(d)) return false;
          const numbers = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
          return Math.abs((numbers[1] ?? 0) - (numbers[3] ?? 0)) > 0.01;
        }).length,
    );
  await expect.poll(sloped).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Stylesheet' })
    .getByRole('switch', { name: 'Level beams on the staff' })
    .click();
  await expect.poll(sloped).toBe(0);
});
