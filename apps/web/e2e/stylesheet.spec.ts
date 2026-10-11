/**
 * The stylesheet (REND-218): F7 or the toolbar opens it; a change shows in the score at once, is
 * remembered for the file, and "As in the file" brings the file's own style back. The staff
 * lines' thickness, the space between systems and the first system's indent (REND-228).
 */
import type { Page } from '@playwright/test';
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
