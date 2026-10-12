/**
 * The drum view (VIEW-006, VIEW-020, VIEW-021): a pad for each piece the track plays, lit as the
 * music plays; a pad for each sound the kit can make with its MIDI number, General MIDI's only on
 * request; names never, on hover or always, large on request.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test, viewTool, viewToolOn } from './support.ts';

async function openDrums(page: Page) {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  await viewTool(page, 'Drums');
  await expect.poll(() => viewToolOn(page, 'Drums')).toBe(true);
  const panel = page.getByRole('region', { name: 'Drums', exact: true });
  await panel.getByRole('combobox', { name: 'Track' }).selectOption('3');
  return panel;
}

async function settings(page: Page, choose: (popover: ReturnType<Page['getByRole']>) => Promise<void>) {
  await page.getByRole('button', { name: 'Drum view settings' }).click();
  const popover = page.getByRole('dialog', { name: 'Drum view settings' });
  await expect(popover).toBeVisible();
  await choose(popover);
  await page.keyboard.press('Escape');
}

test('lights the pieces of the kit as they are played', async ({ page }) => {
  const panel = await openDrums(page);
  const pads = panel.locator('[data-pad]');
  // From the cymbals at the top of the staff down to the kick.
  await expect(pads).toHaveCount(7);
  await expect
    .poll(() => pads.evaluateAll(list => list.map(pad => pad.getAttribute('data-pad'))))
    .toEqual(['Crash high', 'Hi-Hat', 'High Tom', 'Snare', 'Mid Tom', 'Low Tom', 'Kick']);
  // The first beat: the kick and the closed hi-hat; the snare comes on the second.
  await expect(panel.locator('[data-pad="Kick"]')).toHaveAttribute('data-kind', 'current');
  await expect(panel.locator('[data-pad="Hi-Hat"]')).toHaveAttribute('data-kind', 'current');
  await expect(panel.locator('[data-pad="Snare"]')).toHaveAttribute('data-kind', 'none');
  await expect(panel.getByRole('list')).toHaveAccessibleName(
    /^Drums of Drums\. Playing (Hi-Hat \(closed\), Kick \(hit\)|Kick \(hit\), Hi-Hat \(closed\))\.$/,
  );
});

test('lists every sound of the kit with its MIDI number, General MIDI ones on request', async ({ page }) => {
  const panel = await openDrums(page);
  await panel.getByRole('radio', { name: 'Sounds' }).click();
  const pads = panel.locator('[data-pad]');
  const all = await pads.count();
  expect(all).toBeGreaterThan(90);
  const snare = panel.locator('[data-pad="Snare.38"]');
  await expect(snare).toHaveAttribute('title', 'Snare (hit), MIDI 38');
  await expect(snare).toHaveAttribute('data-used', 'true');
  await expect(panel.locator('[data-pad="Shaker.82"]')).toHaveAttribute('data-used', 'false');
  // Names and numbers always shown, then General MIDI's sounds only.
  await settings(page, async popover => {
    await popover.getByRole('radio', { name: 'Always' }).click();
    await popover.getByRole('switch', { name: 'General MIDI sounds only' }).click();
    await popover.getByRole('switch', { name: 'Large labels' }).click();
  });
  await expect(snare).toContainText('Snare (hit)');
  await expect(snare).toContainText('38');
  await expect(panel.locator('[data-pad="Shaker.82"]')).toHaveCount(0);
  expect(await pads.count()).toBeLessThan(all);
  // Large labels make larger pads.
  const box = await snare.boundingBox();
  expect(box?.width).toBeGreaterThan(80);
});

test('says when a track has no drums', async ({ page }) => {
  const panel = await openDrums(page);
  await panel.getByRole('combobox', { name: 'Track' }).selectOption('0');
  await expect(panel.getByText('Rhythm Guitar is not a drum track.')).toBeVisible();
});
