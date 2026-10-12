/**
 * Track colours (REND-036): each track's colour from the file marks it in the tracks menu, the
 * song overview (its name and the bars it plays) and the instrument views' active track; tracks
 * of a file that gives no colours get one each, told apart.
 */
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

/** Red, Green, Yellow and Blue, as the file names and colours its tracks. */
const NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
const COLORS = ['rgb(255, 0, 0)', 'rgb(0, 255, 0)', 'rgb(255, 255, 0)', 'rgb(0, 0, 255)'];

test('marks every track with its colour from the file', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro7/colors.gp')]);
  await expectScore(page);

  await page.getByRole('button', { name: /^Tracks: / }).click();
  for (const [index, name] of NAMES.entries())
    await expect(
      page.getByRole('menuitemcheckbox', { name, exact: true }).locator('span[aria-hidden]'),
    ).toHaveCSS('background-color', COLORS[index] ?? '');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Song overview', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Song overview' });
  const tracks = panel.getByRole('group', { name: 'Tracks' });
  for (const [index, name] of NAMES.entries())
    await expect(tracks.getByRole('button', { name, exact: true }).locator('span').first()).toHaveCSS(
      'background-color',
      COLORS[index] ?? '',
    );
  await panel.getByRole('button', { name: 'Close the song overview' }).click();

  // The instrument views' active track, in its colour, as it changes.
  await page.getByRole('button', { name: 'Fretboard', exact: true }).click();
  const fretboard = page.getByRole('region', { name: 'Fretboard', exact: true });
  const swatch = fretboard.locator('[data-track-color]');
  await expect(swatch).toHaveCSS('background-color', COLORS[0] ?? '');
  await fretboard.getByRole('combobox', { name: 'Track' }).selectOption({ index: 3 });
  await expect(swatch).toHaveCSS('background-color', COLORS[3] ?? '');
});

test('gives the tracks of a file without colours one each, the bars they play in it', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('musicxml-testsuite/41a-MultiParts-Partorder.xml')]);
  await expectScore(page);
  await page.getByRole('button', { name: 'Song overview', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Song overview' });
  const swatches = panel
    .getByRole('group', { name: 'Tracks' })
    .locator('button[aria-pressed] > span:first-child');
  await expect(swatches).toHaveCount(4);
  const colors = await swatches.evaluateAll(spans =>
    spans.map(span => getComputedStyle(span).backgroundColor),
  );
  expect(new Set(colors).size).toBe(4);
  // The bars each track plays, in its colour.
  const cells = await panel
    .locator('rect[data-track]')
    .evaluateAll(rects =>
      rects.map(rect => [Number(rect.getAttribute('data-track')), getComputedStyle(rect).fill] as const),
    );
  expect(new Set(cells.map(([track]) => track)).size).toBe(4);
  for (const [track, fill] of cells) expect(fill).toBe(colors[track]);
});
