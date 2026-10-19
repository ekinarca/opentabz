/** The metronome and the count-in: settings, the visual count-in, and the metronome on its own. */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, primaryModifier, test, topBarTool } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

function position(page: Page) {
  return page.getByRole('button', { name: /^Go to: / });
}

async function openSettings(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'More playback controls' }).click();
    await page.getByRole('menuitem', { name: 'Practice settings…' }).click();
  } else {
    await page.getByRole('button', { name: 'Practice settings…' }).click();
  }
  const dialog = page.getByRole('dialog', { name: 'Practice settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('metronome and count-in', () => {
  test('settings: sound, clicks per beat, custom accents and count-in, kept after a reload', async ({
    page,
    isMobile,
  }) => {
    await openShuffle(page);
    let dialog = await openSettings(page, isMobile);
    await dialog.getByRole('switch', { name: 'Metronome' }).click();
    await dialog.getByLabel('Sound').selectOption('woodblock');
    await dialog.getByRole('radio', { name: 'Two clicks per beat' }).click();
    // Swing applies to two or four clicks per beat.
    await expect(dialog.getByRole('slider', { name: 'Swing' })).toBeVisible();
    await dialog.getByRole('radio', { name: 'Custom' }).click();
    const accents = dialog.getByRole('group', { name: 'Custom accents' });
    await accents.getByRole('button', { name: 'Beat 2: normal' }).click();
    await expect(accents.getByRole('button', { name: 'Beat 2: soft' })).toBeVisible();
    await dialog.getByRole('button', { name: 'One beat more' }).click();
    await expect(accents.getByRole('button', { name: 'Beat 5: normal' })).toBeVisible();
    await dialog.getByRole('switch', { name: 'Count-in', exact: true }).click();
    await dialog.getByRole('radio', { name: '2 bars' }).click();
    await dialog.getByRole('switch', { name: 'Before every pass of a loop' }).click();
    await page.keyboard.press('Escape');
    if (!isMobile) {
      await expect(page.getByRole('button', { name: 'Metronome', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }

    // Open documents are not kept yet (the library comes in M3); the settings are.
    // A fresh page (opening the home page again: a reload just before would race its engine).
    await openShuffle(page);
    dialog = await openSettings(page, isMobile);
    await expect(dialog.getByRole('switch', { name: 'Metronome' })).toBeChecked();
    await expect(dialog.getByLabel('Sound')).toHaveValue('woodblock');
    await expect(dialog.getByRole('radio', { name: 'Two clicks per beat' })).toBeChecked();
    await expect(dialog.getByRole('button', { name: 'Beat 2: soft' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Beat 5: normal' })).toBeVisible();
    await expect(dialog.getByRole('switch', { name: 'Count-in', exact: true })).toBeChecked();
    await expect(dialog.getByRole('radio', { name: '2 bars' })).toBeChecked();
    await expect(dialog.getByRole('switch', { name: 'Before every pass of a loop' })).toBeChecked();
  });

  test('counts in visibly, then plays from the start; the beat display follows the song', async ({
    page,
    isMobile,
  }) => {
    await openShuffle(page);
    const dialog = await openSettings(page, isMobile);
    await dialog.getByRole('switch', { name: 'Metronome' }).click();
    await dialog.getByRole('switch', { name: 'Count-in', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    // A bar of 4/4 at 112 BPM: about two seconds of count-in, shown large over the score.
    const countIn = page.getByTestId('count-in');
    await expect(countIn).toBeVisible({ timeout: 10_000 });
    await expect(countIn).toContainText(/[1-4]/);
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 1,/);
    await expect(countIn).toBeHidden({ timeout: 10_000 });
    // Then the song plays: the position and the visual metronome move.
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat [2-4],|Bar [2-9],/, { timeout: 10_000 });
    await expect(page.getByRole('img', { name: /^Beat [1-4] of 4$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });
});

test.describe('loops and the speed trainer', () => {
  test.skip(({ isMobile }) => isMobile, 'Selects a bar with the keyboard; phones select by touch.');

  async function loopFirstBar(page: Page): Promise<void> {
    await openShuffle(page);
    await page.locator('.ot-scroll:not([hidden])').focus();
    await page.keyboard.press(`${await primaryModifier(page)}+Shift+ArrowRight`);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bar 1 selected');
  }

  test('the speed trainer raises the speed after each pass of the loop', async ({ page }) => {
    await loopFirstBar(page);
    const dialog = await openSettings(page, false);
    const trainer = dialog.getByRole('switch', { name: 'Speed trainer' });
    await dialog.getByLabel('Start at').fill('200');
    await dialog.getByLabel('Up to').fill('300');
    await dialog.getByLabel('Step').fill('50');
    await dialog.getByLabel('Passes at each speed').fill('1');
    await trainer.click();
    await expect(dialog.getByRole('status')).toHaveText('Now 200 %: speed 1 of 3.');
    await page.keyboard.press('Escape');
    // The trainer turned the loop on.
    await expect(page.getByRole('button', { name: 'Loop the selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await expect(speed).toHaveText('200 %');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    // A bar at 112 BPM lasts about 1.1 s at 200 %: the speed moves on after each pass.
    await expect(speed).toHaveText('250 %', { timeout: 10_000 });
    await expect(speed).toHaveText('300 %', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    // Choosing a speed by hand ends the trainer's run.
    await speed.click();
    await page.getByRole('button', { name: '100 %', exact: true }).click();
    await page.keyboard.press('Escape');
    const again = await openSettings(page, false);
    await expect(again.getByRole('switch', { name: 'Speed trainer' })).not.toBeChecked();
  });

  test('rests between passes of a loop, shown on screen', async ({ page }) => {
    await loopFirstBar(page);
    const dialog = await openSettings(page, false);
    await dialog.getByLabel('Rest between passes').selectOption({ label: '1 bar' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Loop the selection' }).click();
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await speed.click();
    await page.getByRole('button', { name: '200 %', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    // After the first pass (about a second), a bar of rest before the next.
    const rest = page.getByTestId('rest');
    await expect(rest).toBeVisible({ timeout: 10_000 });
    await expect(rest).toContainText('Rest');
    await expect(rest).toBeHidden({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });

  test('a loop can repeat a set number of times, then stop', async ({ page }) => {
    await loopFirstBar(page);
    const dialog = await openSettings(page, false);
    await dialog.getByLabel('Repeat a loop').selectOption({ label: '2 times, then stop' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Loop the selection' }).click();
    const speed = page.getByRole('button', { name: /^Playback speed: / });
    await speed.click();
    await page.getByRole('button', { name: '300 %', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    // Two passes of 0.7 s, then playback stops by itself.
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 1,/);
  });
});

test.describe('the metronome on its own', () => {
  test('runs without a song: tempo, tap tempo, meter, start and stop', async ({ page, isMobile }) => {
    await openHome(page);
    await topBarTool(page, 'Standalone metronome');
    const dialog = page.getByRole('dialog', { name: 'Metronome' });
    await expect(dialog).toBeVisible();
    const start = dialog.getByRole('button', { name: 'Start' });
    await expect(start).toBeEnabled({ timeout: 20_000 });

    const tempo = dialog.getByRole('spinbutton', { name: 'Tempo' });
    await tempo.fill('150');
    await expect(dialog.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '150');
    await dialog.getByRole('button', { name: 'Faster' }).click();
    await expect(tempo).toHaveValue('151');

    await dialog.getByLabel('Beats per bar').selectOption('3');
    await expect(dialog.getByRole('img', { name: /of 3$/ })).toBeVisible();

    await start.click();
    const stop = dialog.getByRole('button', { name: 'Stop' });
    await expect(stop).toBeVisible();
    // The visual metronome moves through the bar.
    const beat = dialog.getByRole('img', { name: /^Beat \d of 3$/ });
    const seen = new Set<string>();
    for (let poll = 0; poll < 40 && seen.size < 3; poll++) {
      seen.add((await beat.getAttribute('aria-label')) ?? '');
      await page.waitForTimeout(60);
    }
    expect(seen.size).toBe(3);

    // Tap tempo with the T key: five taps 400 ms apart are 150 BPM. The taps are timed inside the
    // page; a driver's clicks would add their own delays.
    await page.evaluate(async () => {
      for (let count = 0; count < 5; count++) {
        if (count > 0) await new Promise(resolve => setTimeout(resolve, 400));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      }
    });
    const tapped = Number(await tempo.inputValue());
    expect(tapped).toBeGreaterThanOrEqual(145);
    expect(tapped).toBeLessThanOrEqual(155);
    // The Tap button taps too.
    const tap = dialog.getByRole('button', { name: 'Tap tempo' });
    await tap.click();
    await page.waitForTimeout(250);
    await tap.click();
    await expect(tempo).not.toHaveValue(String(tapped));

    await stop.click();
    await expect(start).toBeVisible();
    if (!isMobile) {
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('pauses an open song and gives it back when closed', async ({ page }) => {
    await openShuffle(page);
    await topBarTool(page, 'Standalone metronome');
    const dialog = page.getByRole('dialog', { name: 'Metronome' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 20_000 });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    // The song is loaded again and plays.
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat [2-4],|Bar [2-9],/, { timeout: 10_000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });
});
