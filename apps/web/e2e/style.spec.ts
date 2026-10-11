/**
 * How a track is played, from the mixer: its playing style (PLAY-115…PLAY-118: let ring, strummed
 * chords, stressed strong beats and palm-mute damping), changed while the music plays without
 * stopping it, and a drum track's kit (PLAY-054); both remembered for the file. What each plays
 * is proved in playback-interpretation.test.ts and render-offline.test.ts.
 */
import type { Page } from '@playwright/test';
import { elapsedSeconds, expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

async function guitarStyle(page: Page) {
  await page.getByRole('button', { name: 'Mixer' }).click();
  const mixer = page.getByRole('dialog', { name: 'Mixer' });
  await mixer.getByRole('button', { name: 'More settings for Rhythm Guitar' }).click();
  return mixer;
}

test('the playing style changes while playing, and is remembered', async ({ page }) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => elapsedSeconds(page)).toBeGreaterThanOrEqual(1);
  let mixer = await guitarStyle(page);
  const letRing = mixer.getByRole('switch', { name: 'Let notes ring' });
  await expect(letRing).toHaveAttribute('aria-checked', 'false');
  const damping = mixer.getByRole('slider', { name: 'Rhythm Guitar: Palm mute' });
  await expect(damping).toHaveAttribute('aria-valuetext', 'As written');
  await letRing.click();
  await mixer.getByRole('switch', { name: 'Strum chords' }).click();
  await mixer.getByRole('switch', { name: 'Stress strong beats' }).click();
  await damping.focus();
  await page.keyboard.press('End');
  await expect(damping).toHaveAttribute('aria-valuetext', 'Heavy');
  // The song is swapped in where it plays: it goes on.
  const after = await elapsedSeconds(page);
  await expect.poll(() => elapsedSeconds(page)).toBeGreaterThanOrEqual(after + 2);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();

  await page.reload();
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  mixer = await guitarStyle(page);
  await expect(mixer.getByRole('switch', { name: 'Let notes ring' })).toHaveAttribute('aria-checked', 'true');
  await expect(mixer.getByRole('switch', { name: 'Strum chords' })).toHaveAttribute('aria-checked', 'true');
  await expect(mixer.getByRole('switch', { name: 'Stress strong beats' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(mixer.getByRole('slider', { name: 'Rhythm Guitar: Palm mute' })).toHaveAttribute(
    'aria-valuetext',
    'Heavy',
  );
});

test('a drum track plays the kit chosen from the sound bank, remembered for the file', async ({ page }) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Mixer' }).click();
  let mixer = page.getByRole('dialog', { name: 'Mixer' });
  await mixer.getByRole('button', { name: 'More settings for Drums' }).click();
  const kit = mixer.getByLabel('Drum kit');
  await expect(kit).toHaveValue('0');
  expect(await kit.locator('option').allTextContents()).toEqual(['Standard', 'Room', 'Jazz', 'Brush']);
  await kit.selectOption({ label: 'Brush' });
  await page.keyboard.press('Escape');

  await page.reload();
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Mixer' }).click();
  mixer = page.getByRole('dialog', { name: 'Mixer' });
  await mixer.getByRole('button', { name: 'More settings for Drums' }).click();
  await expect(mixer.getByLabel('Drum kit')).toHaveValue('40');
});
