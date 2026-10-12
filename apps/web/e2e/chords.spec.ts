/**
 * The chords panel (VIEW-007, VIEW-027): the chord sounding, the next one with the beats left
 * until it, every chord of the track drawn as a diagram, and playing from a chord clicked; the
 * diagrams, the panel's and the score's, mirrored for left-handed players (REND-314); the fingering
 * the file gives, under the panel's diagrams (REND-208).
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test, topBarTool } from './support.ts';

/** SMuFL's chord diagram marks: a string not played, an open string. */
const MUTED = '\u{E859}';
const OPEN = '\u{E85A}';

/**
 * Whether the score's first chord diagram starts with a string not played: the leftmost mark of
 * the top row of diagrams above the music. Null before they are drawn.
 */
function mutedFirst(page: Page): Promise<boolean | null> {
  return page.locator('.ot-scroll:not([hidden]) .ot-partials text').evaluateAll(
    (texts, [muted, open]) => {
      const marks = texts
        .filter(text => text.textContent === muted || text.textContent === open)
        .map(text => {
          const box = text.getBoundingClientRect();
          return { muted: text.textContent === muted, x: box.x, y: box.y };
        });
      const top = Math.min(...marks.map(mark => mark.y));
      const row = marks.filter(mark => mark.y < top + 4).sort((a, b) => a.x - b.x);
      return row[0]?.muted ?? null;
    },
    [MUTED, OPEN],
  );
}

test('shows the chord now, the next one counting down, and plays from a chord', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  const toggle = page.getByRole('button', { name: 'Chords', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByRole('region', { name: 'Chords', exact: true });

  // A7 for four bars, then D7: sixteen beats to go.
  const now = panel.getByTestId('chord-now');
  const next = panel.getByTestId('chord-next');
  await expect(now.getByRole('img')).toHaveAccessibleName(
    'A7: not played, open, 2, open, 2, open, from the lowest string',
  );
  await expect(next.getByRole('img')).toHaveAccessibleName(/^D7: /);
  await expect(panel.getByTestId('chord-countdown')).toHaveText('in 16 beats');
  // Every chord of the track, the one sounding marked.
  const all = panel.getByRole('list', { name: 'Chords of the track' });
  await expect(all.getByRole('button')).toHaveCount(3);
  for (const name of ['A7', 'D7', 'E7'])
    await expect(all.getByRole('img', { name, exact: true })).toBeVisible();
  await expect(all.getByRole('button', { name: 'Play from the next A7' })).toHaveAttribute(
    'aria-current',
    'true',
  );

  // Clicking E7 goes to where it comes next: bar 9; then D7 comes after four beats.
  await all.getByRole('button', { name: 'Play from the next E7' }).click();
  await expect(now.getByRole('img')).toHaveAccessibleName(/^E7: /);
  await expect(next.getByRole('img')).toHaveAccessibleName(/^D7: /);
  await expect(panel.getByTestId('chord-countdown')).toHaveText('in 4 beats');
  await expect(all.getByRole('button', { name: 'Play from the next E7' })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('mirrors the diagrams for left-handed players, in the panel and in the score', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await page.getByRole('button', { name: 'Chords', exact: true }).click();
  const now = page
    .getByRole('region', { name: 'Chords', exact: true })
    .getByTestId('chord-now')
    .locator('svg');
  // A7, not played on the lowest string: its cross on the left, as right-handed players read it.
  const crossAt = () =>
    now.evaluate(svg => {
      const cross = [...svg.querySelectorAll('text')].find(text => text.textContent === '×');
      if (cross === undefined || !(svg instanceof SVGSVGElement)) return null;
      return Number(cross.getAttribute('x')) / svg.viewBox.baseVal.width;
    });
  await expect(now).toHaveAttribute('data-left-handed', 'false');
  expect(await crossAt()).toBeLessThan(0.5);
  await expect.poll(() => mutedFirst(page)).toBe(true);

  await topBarTool(page, 'Settings');
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('switch', { name: 'Left-handed fretboard and chord diagrams' }).click();
  await page.keyboard.press('Escape');
  // The highest string on the left: the cross goes to the right, in the panel and in the score.
  await expect(now).toHaveAttribute('data-left-handed', 'true');
  expect(await crossAt()).toBeGreaterThan(0.5);
  await expect.poll(() => mutedFirst(page)).toBe(false);
  // Named as before, from the lowest string.
  await expect(now).toHaveAccessibleName('A7: not played, open, 2, open, 2, open, from the lowest string');
});

test('writes the fingering the file gives under the panel’s diagrams', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatab/guitarpro7/chords.gp')]);
  await expectScore(page);
  await page.getByRole('button', { name: 'Chords', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Chords', exact: true });
  // C, from the lowest string: the third finger, the second, the first.
  const now = panel.getByTestId('chord-now').getByRole('img');
  await expect(now).toHaveAccessibleName(
    'C: not played, 3, 2, open, 1, open, from the lowest string; fingers none, 3, 2, none, 1, none',
  );
  await expect(now.locator('[data-finger]')).toHaveText(['3', '2', '1']);
  // The barred C: the first finger across, the others above it.
  const all = panel.getByRole('list', { name: 'Chords of the track' });
  await expect(all.getByRole('img', { name: 'C', exact: true }).nth(1).locator('[data-finger]')).toHaveText([
    '1',
    '2',
    '3',
    '4',
    '1',
  ]);
});
