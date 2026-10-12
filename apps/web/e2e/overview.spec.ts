/**
 * The song overview (VIEW-015, Guitar Pro's global view): a row per track and a square per bar,
 * filled where the track plays, under the sections and bar numbers. A click goes to the bar and
 * makes the track the active one; a drag selects bars; the keys step bars and sections.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, expectScore, openHome, test, viewTool } from './support.ts';

/** A bar's column and a track's row in the overview, in CSS pixels. */
const COLUMN = 20;
const ROW = 28;

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

function position(page: Page) {
  return page.getByRole('button', { name: /^Go to: / });
}

/** The middle of a square: bar and track counted from 1. */
async function square(bars: Locator, bar: number, track: number): Promise<{ x: number; y: number }> {
  const box = await bars.boundingBox();
  if (box === null) throw new Error('No overview on screen.');
  return { x: box.x + (bar - 0.5) * COLUMN, y: box.y + (track - 0.5) * ROW };
}

test('shows the bars each track plays under the sections; a click goes there with the track', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await viewTool(page, 'Song overview');
  const panel = page.getByRole('region', { name: 'Song overview' });
  await expect(panel).toBeVisible();

  const tracks = panel.getByRole('group', { name: 'Tracks' });
  for (const name of ['Rhythm Guitar', 'Lead Guitar', 'Bass', 'Drums']) {
    await expect(tracks.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(tracks.getByRole('button', { name: 'Rhythm Guitar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (const section of ['Twelve bars', 'Turnaround', 'Ending']) {
    await expect(panel.locator(`span[title="${section}"]`)).toHaveCount(1);
  }

  // Four tracks of 13 bars; the lead guitar comes in after a bar's rest.
  await expect(panel.locator('rect[data-bar]')).toHaveCount(4 * 13 - 1);
  await expect(panel.locator('rect[data-track="1"][data-bar="1"]')).toHaveCount(0);
  await expect(panel.locator('rect[data-track="1"][data-bar="2"]')).toHaveCount(1);

  const bars = panel.getByRole('slider', { name: 'Bars of the song' });
  await expect(bars).toHaveAttribute(
    'aria-valuetext',
    'Bar 1 of 13, Twelve bars. Playing: Rhythm Guitar, Bass, Drums.',
  );

  // The bass in bar 10.
  const target = await square(bars, 10, 3);
  if (isMobile) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);
  await expect(position(page)).toHaveAccessibleName(/^Go to: Bar 10, beat 1,/);
  await expect(bars).toHaveAttribute('aria-valuenow', '10');
  await expect(panel.locator('[data-overview-current]')).toHaveAttribute('data-overview-current', '10');
  await expect(tracks.getByRole('button', { name: 'Bass', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // A track's name makes it the active one.
  await tracks.getByRole('button', { name: 'Drums', exact: true }).click();
  await expect(tracks.getByRole('button', { name: 'Drums', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(tracks.getByRole('button', { name: 'Bass', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('a drag selects bars, the keys step bars and sections, and F8 opens and closes it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Dragging with a mouse and keys are for desktops.');
  await openShuffle(page);
  await page.getByRole('region', { name: /^Score/ }).focus();
  await page.keyboard.press('F8');
  const panel = page.getByRole('region', { name: 'Song overview' });
  await expect(panel).toBeVisible();
  const bars = panel.getByRole('slider', { name: 'Bars of the song' });

  const from = await square(bars, 3, 1);
  const to = await square(bars, 6, 2);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect(panel.locator('[data-overview-selection]')).toHaveAttribute('data-overview-selection', '3-6');
  // The song map marks the same bars.
  const map = page.getByRole('slider', { name: 'Song map' });
  await expect(map.locator('[data-selected]')).toHaveCount(4);
  await expect(map.locator('[data-selected]').first()).toHaveAttribute('data-bar', '3');

  await bars.focus();
  await page.keyboard.press('End');
  await expect(bars).toHaveAttribute('aria-valuenow', '13');
  await page.keyboard.press('Home');
  await expect(bars).toHaveAttribute('aria-valuenow', '1');
  await page.keyboard.press('PageDown');
  await expect(bars).toHaveAttribute('aria-valuenow', '9');
  await expect(bars).toHaveAttribute('aria-valuetext', /^Bar 9 of 13, Turnaround\./);
  await page.keyboard.press('ArrowRight');
  await expect(bars).toHaveAttribute('aria-valuenow', '10');
  await page.keyboard.press('PageUp');
  await expect(bars).toHaveAttribute('aria-valuenow', '9');

  // Mute and solo, as in the mixer.
  const mute = panel.getByRole('button', { name: 'Mute Bass' });
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('button', { name: 'Bass', exact: true })).toHaveClass(/line-through/);
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  await page.keyboard.press('F8');
  await expect(panel).toHaveCount(0);
});
