/**
 * The lyrics pane (VIEW-010) and the lyrics in place of the score (VIEW-022): the lines as
 * written with their headings, the syllable being sung lit, and singing from a syllable clicked.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test, viewTool, viewToolOn } from './support.ts';

async function openLyrics(page: Page) {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/lyrics.atex')]);
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  await viewTool(page, 'Lyrics');
  await expect.poll(() => viewToolOn(page, 'Lyrics')).toBe(true);
  return page.getByRole('region', { name: 'Lyrics', exact: true });
}

test('shows the lyrics as written, lights the syllable sung and sings from a syllable', async ({ page }) => {
  const panel = await openLyrics(page);
  // Three lines, two headings; "Morning" and "upon" written as syllables run together.
  await expect(panel.getByText('Verse', { exact: true })).toBeVisible();
  await expect(panel.getByText('Chorus', { exact: true })).toBeVisible();
  const lines = panel.locator('[data-sung] > p:last-child');
  await expect(lines).toHaveText([
    'Morning light upon the river',
    'Carry me along the shore',
    'Sing it out and sing it loud',
  ]);
  // Nothing is sung on the first beat (the comment takes it); from the second, "Morn".
  const current = panel.locator('button[aria-current="true"]');
  await expect(current).toHaveCount(0);
  await panel.getByRole('button', { name: 'Sing from “Car”' }).click();
  await expect(current).toHaveText('Car');
  await expect(panel.getByRole('button', { name: 'Sing from “Morn”' })).toHaveAttribute('data-state', 'past');
  await expect(panel.getByRole('button', { name: 'Sing from “shore”' })).toHaveAttribute(
    'data-state',
    'future',
  );
  await panel.getByRole('button', { name: 'Sing from “loud”' }).click();
  await expect(current).toHaveText('loud');

  // The lyrics alone, in large type: the score is hidden until they go back to a pane.
  await panel.getByRole('button', { name: 'Lyrics only' }).click();
  await expect(page.getByRole('region', { name: /^Score: / })).toBeHidden();
  await expect(current).toHaveText('loud');
  await panel.getByRole('button', { name: 'Lyrics only' }).click();
  await expect(page.getByRole('region', { name: /^Score: / })).toBeVisible();
});

test('says when a track has no lyrics', async ({ page }) => {
  const panel = await openLyrics(page);
  await panel.getByRole('combobox', { name: 'Track' }).selectOption('1');
  await expect(panel.getByText('Guitar has no lyrics.')).toBeVisible();
});
