/**
 * Transposing instruments at concert pitch (REND-032), and tempo marks shown or hidden
 * (REND-210), with their decimals or rounded (REND-240); C and cut C, the pitch a bend reaches,
 * the rests of the lower voices and tuplet brackets (REND-248); arpeggio arrowheads, a trill's
 * second note and "sl." (REND-249); tied notes' frets, dashed quarter rests and coloured voices in
 * the tablature (REND-250); level beams (REND-246); clefs and time signatures at the start of
 * systems (REND-231); technique lines over rests (REND-243); where artificial harmonics are
 * touched, and octave harmonics as a dot (REND-247); the rhythm in the tablature (REND-244) and
 * its circled long notes (REND-245); slash notation's line, barlines and single notes' frets
 * (REND-229); a capo's notes as they sound or as fingered (REND-232); in the score on screen.
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
  // Laid out again without the staff: its treble clef gone (the rests read before were its own).
  await expect.poll(async () => /[\u{E050}\u{E052}]/u.test((await texts()).join(''))).toBe(false);
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

test('the clef on every system or the first only, the time signature on every system', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  const count = async (codePoint: number) =>
    (await scoreTexts(page)).join('').split(String.fromCodePoint(codePoint)).length - 1;
  // Treble clefs (the guitar's an octave down) and the 4s of 4/4.
  const clefs = async () => (await count(0xe050)) + (await count(0xe052));
  const fours = () => count(0xe084);
  await expect.poll(clefs).toBeGreaterThan(1);
  const signed = await fours();
  expect(signed).toBe(2);

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'Clef on every system' }).click();
  await expect.poll(clefs).toBe(1);
  await dialog.getByRole('switch', { name: 'Time signature on every system' }).click();
  await expect.poll(fours).toBeGreaterThan(signed);
});

test('palm mutes either side of a rest drawn as one line on request', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/techniques.atex')]);
  await expectScore(page);
  const mutes = async () => (await scoreTexts(page)).filter(text => text === 'P.M.').length;
  await expect.poll(mutes).toBe(2);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Stylesheet' })
    .getByRole('switch', { name: 'Technique lines over rests' })
    .click();
  await expect.poll(mutes).toBe(1);
});

test('artificial harmonics with where they are touched, without, or octaves as a dot', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/harmonics.atex')]);
  await expectScore(page);
  const texts = async () => (await scoreTexts(page)).map(text => text.trim());
  // 5 <17>, 7 <19>, 5 <12>; and the natural harmonics at the twelfth fret.
  await expect
    .poll(async () => (await texts()).filter(text => text.startsWith('<')))
    .toEqual(['<17>', '<19>', '<12>', '<12>', '<12>', '<12>']);
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'A dot for octave harmonics' }).click();
  await expect.poll(async () => (await texts()).filter(text => /^\d+\.$/.test(text))).toEqual(['5.', '7.']);
  await dialog.getByRole('switch', { name: 'Where artificial harmonics are touched' }).click();
  // Only the natural harmonics keep their brackets.
  await expect
    .poll(async () => (await texts()).filter(text => text.startsWith('<')))
    .toEqual(['<12>', '<12>', '<12>']);
});

test('the rhythm in the tablature under a staff when asked, and each voice’s where asked', async ({
  page,
}) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/techniques.atex')]);
  await expectScore(page);
  /** Thin rules of the first system: stems, barlines. */
  const rules = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
      .first()
      .evaluate(
        element =>
          [...element.querySelectorAll('rect')].filter(
            rect => Number(rect.getAttribute('width')) < 2 && Number(rect.getAttribute('height')) > 2,
          ).length,
      );
  await expect.poll(rules).toBeGreaterThan(0);
  const staffOnly = await rules();

  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog
    .getByRole('radiogroup', { name: 'Rhythm in the tablature' })
    .getByRole('radio', { name: 'Always' })
    .click();
  // The tablature's stems too.
  await expect.poll(rules).toBeGreaterThan(staffOnly);
  const always = await rules();
  // Voice 2's rhythm left out of the tablature: fewer stems.
  await dialog.getByLabel('Voice 2').selectOption('none');
  await expect.poll(rules).toBeLessThan(always);
  // Its half and whole notes circled (REND-245): voice 1's half notes.
  const circles = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"] path')
      .evaluateAll(paths => paths.filter(path => (path.getAttribute('d') ?? '').includes('A1,1')).length);
  const before = await circles();
  await dialog.getByRole('switch', { name: 'Half and whole notes circled' }).click();
  await expect.poll(circles).toBeGreaterThan(before);
});

test('slash notation with or without its line and barlines, and single notes’ frets', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/slash.atex')]);
  await expectScore(page);
  /** The first system's long thin rules (the line) and its staff-tall ones (the barlines). */
  const rules = () =>
    page
      .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
      .first()
      .evaluate(element => {
        const rects = [...element.querySelectorAll('rect')].map(rect => ({
          width: Number(rect.getAttribute('width')),
          height: Number(rect.getAttribute('height')),
        }));
        return {
          lines: rects.filter(rect => rect.width > 100 && rect.height < 3).length,
          barlines: rects.filter(rect => rect.height > 30 && rect.height < 45).length,
        };
      });
  await expect.poll(async () => (await rules()).lines).toBeGreaterThan(0);
  const usual = await rules();
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'A line behind slash notation' }).click();
  await expect.poll(async () => (await rules()).lines).toBe(0);
  await dialog.getByRole('switch', { name: 'Barlines in slash notation' }).click();
  await expect.poll(async () => (await rules()).barlines).toBeLessThan(usual.barlines);
  // The G string's 5 and the B string's 7, their strings circled.
  await dialog.getByRole('switch', { name: 'Frets and strings of single notes in slash notation' }).click();
  await expect
    .poll(async () => (await scoreTexts(page)).filter(text => text === '5' || text === '7'))
    .toEqual(['5', '7']);
});

test('a capo’s notes as they sound, or as fingered in their own key', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/fretboard.atex')]);
  await expectScore(page);
  /** SMuFL's flat, as the score's music font writes it. */
  const flats = async () => (await scoreTexts(page)).join('').split('\u{E260}').length - 1;
  // Capo 2 in B flat: two flats in the key.
  await expect.poll(flats).toBeGreaterThan(0);
  const sounding = await flats();
  await page.getByRole('button', { name: 'Stylesheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Stylesheet' });
  await dialog.getByRole('switch', { name: 'Capos and tunings change the written notes' }).click();
  // As fingered: A flat, four flats in the key.
  await expect.poll(flats).toBeGreaterThan(sounding);
});
