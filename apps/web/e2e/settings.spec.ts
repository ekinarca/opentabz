/**
 * Settings and the audio output: the audio delay (the output opens again with the chosen hint),
 * what the output reports while playing (no audio skipped), and the other settings.
 */
import type { Page } from '@playwright/test';
import { elapsedSeconds, expect, expectScore, openHome, test, topBarTool, viewTool } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

async function playFor(page: Page, seconds: number): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const start = await elapsedSeconds(page);
  await expect.poll(() => elapsedSeconds(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(start + seconds);
}

async function openSettings(page: Page) {
  await topBarTool(page, 'Settings');
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('settings', () => {
  test('the audio delay opens the output again with its hint, and plays without skipping', async ({
    page,
    browserName,
  }) => {
    // Record the latency hint of every audio output the app opens (silent, as in every test).
    await page.addInitScript(() => {
      const Base = window.AudioContext;
      const hints: unknown[] = [];
      class RecordingAudioContext extends Base {
        public constructor(options?: AudioContextOptions) {
          super(options);
          hints.push(options?.latencyHint);
        }
      }
      Object.assign(window, { AudioContext: RecordingAudioContext, latencyHints: hints });
    });
    const hints = () => page.evaluate(() => (window as unknown as { latencyHints: unknown[] }).latencyHints);
    await openShuffle(page);
    await playFor(page, 2);
    expect(await hints()).toEqual(['interactive']);

    let dialog = await openSettings(page);
    // Playing for two seconds skipped no audio (AUD-001); the output reports its delay.
    const status = dialog.getByRole('status');
    await expect(status).toContainText(/Output delay \d+ ms/);
    if (browserName === 'chromium') await expect(status).toContainText('audio skipped 0 ms');
    await dialog.getByRole('radio', { name: 'Steadiest' }).click();
    await page.keyboard.press('Escape');
    // Changing the delay paused playback; the next start opens an output with the new hint.
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await playFor(page, 1);
    expect(await hints()).toEqual(['interactive', 'playback']);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();

    // Remembered.
    await page.reload();
    dialog = await openSettings(page);
    await expect(dialog.getByRole('radio', { name: 'Steadiest' })).toHaveAttribute('aria-checked', 'true');
  });

  test('scores open with the staves, concert pitch and stylesheet chosen (PLAT-032)', async ({ page }) => {
    await openHome(page);
    const dialog = await openSettings(page);
    await dialog
      .getByRole('radiogroup', { name: 'Staves of scores opened from now on' })
      .getByRole('radio', { name: 'Tab', exact: true })
      .click();
    await dialog.getByRole('switch', { name: 'Transposing instruments at concert pitch' }).click();
    await dialog.getByLabel('Stylesheet of scores opened from now on').selectOption('look:compact');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    await expect(page.getByRole('button', { name: /^Staves: / })).toHaveText(/Tab/);
    await page.getByRole('button', { name: /^Staves: / }).click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'Concert pitch' })).toBeChecked();
    await page.keyboard.press('Escape');
    // Compact: four fifths of the size.
    await viewTool(page, 'Stylesheet');
    await expect(
      page.getByRole('dialog', { name: 'Stylesheet' }).getByRole('slider', { name: 'Scale' }),
    ).toHaveAttribute('aria-valuetext', '80 %');

    // Remembered.
    await page.reload();
    const again = await openSettings(page);
    await expect(
      again
        .getByRole('radiogroup', { name: 'Staves of scores opened from now on' })
        .getByRole('radio', { name: 'Tab', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      again.getByRole('switch', { name: 'Transposing instruments at concert pitch' }),
    ).toBeChecked();
    await expect(again.getByLabel('Stylesheet of scores opened from now on')).toHaveValue('look:compact');
  });

  test('the tablature the other way up, the lowest string on top (REND-315)', async ({ page }) => {
    await openShuffle(page);
    /** The first beat's two frets in the tablature: the A string's 0 and the D string's 2, by height. */
    const firstBeat = () =>
      page
        .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
        .first()
        .evaluate(element => {
          const texts = [...element.querySelectorAll('text')].filter(text => /^[02]$/.test(text.textContent));
          const xs = texts.map(text => Number(text.getAttribute('x')));
          // Beats lie left to right; the first beat's frets share the leftmost x.
          const first = Math.min(...xs.filter(x => xs.filter(other => Math.abs(other - x) < 1).length === 2));
          const at = (fret: string) =>
            Number(
              texts
                .find(
                  text => text.textContent === fret && Math.abs(Number(text.getAttribute('x')) - first) < 1,
                )
                ?.getAttribute('y'),
            );
          return at('0') - at('2');
        });
    // As usual the A string's 0 lies under the D string's 2.
    await expect.poll(firstBeat).toBeGreaterThan(0);
    const dialog = await openSettings(page);
    await dialog.getByRole('switch', { name: 'Lowest string on top of the tablature' }).click();
    await page.keyboard.press('Escape');
    await expect.poll(firstBeat).toBeLessThan(0);
  });

  test('the left-handed fretboard and single-key shortcuts are settings too', async ({ page }) => {
    await openShuffle(page);
    const dialog = await openSettings(page);
    await dialog.getByRole('switch', { name: 'Left-handed fretboard and chord diagrams' }).click();
    await dialog.getByRole('switch', { name: 'Single-key shortcuts (−, =, ?)' }).click();
    await page.keyboard.press('Escape');
    await viewTool(page, 'Fretboard');
    await expect(page.getByRole('img', { name: /^Fretboard of / })).toHaveAttribute(
      'data-left-handed',
      'true',
    );
    // With single-key shortcuts off, "-" no longer slows playback down.
    await page.locator('.ot-scroll:not([hidden])').focus();
    await page.keyboard.press('-');
    await expect(page.getByRole('button', { name: /^Playback speed: / })).toHaveText('100 %');
  });
});
