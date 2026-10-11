/** Song info (VIEW-011): every field of the score, its instructions and notices, and its tracks. */
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

test('shows the score information, instructions and notices included', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/lyrics.atex')]);
  await expectScore(page);
  await page.getByRole('button', { name: 'Song info', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Lyrics Views' });
  await expect(dialog).toBeVisible();
  const field = (name: string) => dialog.locator('dt', { hasText: name }).locator('+ dd');
  await expect(field('Subtitle')).toHaveText('OpenTabz test score');
  await expect(field('Instructions')).toHaveText('Sing the verse softly, the chorus out loud.');
  await expect(field('Notices')).toHaveText('Words and music written for the OpenTabz tests.');
  await expect(field('Tempo')).toHaveText('100 BPM');
  await expect(field('Bars')).toHaveText('7');
  // The tracks: a voice, and a guitar in standard tuning.
  await expect(dialog.getByText('Voice', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Tuning: Guitar Standard Tuning · E2 A2 D3 G3 B3 E4')).toBeVisible();
});
