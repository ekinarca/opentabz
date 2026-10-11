/**
 * The chords panel (VIEW-007, VIEW-027): the chord sounding, the next one with the beats left
 * until it, every chord of the track drawn as a diagram, and playing from a chord clicked.
 */
import { expect, expectScore, openHome, test } from './support.ts';

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
