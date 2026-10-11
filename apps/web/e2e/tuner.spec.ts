/**
 * The tuner (PRAC-100, PRAC-101, PRAC-102, PRAC-113, PRAC-114). The microphone is a steady tone
 * made in the page and never played. The tuner shows the note and how many cents off it is, on
 * a needle or a strobe. It aims at the strings of the track's tuning or at any note, against the
 * reference pitch set, and releases the microphone when it closes.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, expectScore, openHome, test, topBarTool } from './support.ts';

interface FakeMicrophone {
  setTone: (frequency: number) => void;
  microphoneTracks: MediaStreamTrack[];
}

/** A microphone that hears a steady tone rich in harmonics, as a string is. */
async function fakeMicrophone(page: Page, frequency: number): Promise<void> {
  await page.addInitScript(start => {
    const scope = window as unknown as FakeMicrophone;
    const tones: OscillatorNode[] = [];
    let current = start;
    scope.microphoneTracks = [];
    scope.setTone = value => {
      current = value;
      for (const tone of tones) tone.frequency.value = value;
    };
    // On the prototype: WebKit hands the page a fresh MediaDevices object.
    MediaDevices.prototype.getUserMedia = () => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = current;
      const destination = context.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      tones.push(oscillator);
      scope.microphoneTracks.push(...destination.stream.getTracks());
      return Promise.resolve(destination.stream);
    };
  }, frequency);
}

const setTone = (page: Page, frequency: number) =>
  page.evaluate(value => {
    (window as unknown as FakeMicrophone).setTone(value);
  }, frequency);

/** The cents shown, as a number. */
async function cents(tuner: Locator): Promise<number> {
  const text = (await tuner.getByTestId('tuner-cents').textContent()) ?? '';
  const match = /([+−±])(\d+)/.exec(text);
  if (match === null) return Number.NaN;
  return (match[1] === '−' ? -1 : 1) * Number(match[2]);
}

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

test('hears a string, aims at the track tuning and shows the cents on a needle or a strobe', async ({
  page,
}) => {
  await fakeMicrophone(page, 110);
  await openShuffle(page);
  await topBarTool(page, 'Tuner');
  const tuner = page.getByRole('dialog', { name: 'Tuner' });

  // A2, in tune, on the needle; aimed at the A string of the guitar's standard tuning.
  await expect(tuner.getByTestId('tuner-note')).toHaveText('A2');
  await expect.poll(() => cents(tuner)).toBe(0);
  await expect(tuner.getByText('In tune', { exact: true })).toBeVisible();
  await expect(tuner.getByTestId('tuner-needle')).toBeVisible();
  const chips = tuner.getByRole('button', { name: /^Tune only the / });
  await expect(chips).toHaveText(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  const a = tuner.getByRole('button', { name: 'Tune only the A2 string' });
  await expect(a).toHaveAttribute('data-aimed', 'true');
  // A string that stays in tune for a moment is ticked.
  await expect(a).toHaveAttribute('data-tuned', 'true');

  // Ten cents sharp.
  await setTone(page, 110 * 2 ** (10 / 1200));
  await expect.poll(() => cents(tuner)).toBeGreaterThanOrEqual(9);
  expect(await cents(tuner)).toBeLessThanOrEqual(11);
  await expect(tuner.getByText('Sharp: tune down')).toBeVisible();
  await expect(tuner.getByRole('meter')).toHaveAttribute('aria-valuenow', /^(9|10|11)$/);

  // Against A4 = 442 Hz, 110 Hz is about eight cents flat.
  await setTone(page, 110);
  await tuner.getByLabel('Reference pitch (A4)').fill('442');
  await expect.poll(() => cents(tuner)).toBeLessThanOrEqual(-7);
  expect(await cents(tuner)).toBeGreaterThanOrEqual(-9);
  await expect(tuner.getByText('Flat: tune up')).toBeVisible();
  await tuner.getByLabel('Reference pitch (A4)').fill('440');

  // A note between strings: the nearest string, or the nearest note on the chromatic scale.
  await setTone(page, 103.826);
  await expect(tuner.getByTestId('tuner-note')).toHaveText('A2');
  await tuner.getByRole('radio', { name: 'Any note' }).click();
  await expect(tuner.getByTestId('tuner-note')).toHaveText('G♯2');
  await expect.poll(() => cents(tuner)).toBe(0);

  // The strobe drifts while the note is off, and stands still in tune.
  await tuner.getByRole('radio', { name: 'Strobe' }).click();
  const strobe = tuner.getByTestId('tuner-strobe');
  await expect(strobe).toBeVisible();
  const shift = () =>
    strobe
      .locator('div')
      .first()
      .evaluate(element => (element as HTMLElement).style.transform);
  const still = await shift();
  await page.waitForTimeout(300);
  expect(await shift()).toBe(still);
  await setTone(page, 103.826 * 2 ** (30 / 1200));
  await expect.poll(() => cents(tuner)).toBeGreaterThanOrEqual(25);
  const before = await shift();
  await expect.poll(shift).not.toBe(before);

  // Closing the tuner releases the microphone.
  await page.keyboard.press('Escape');
  await expect(tuner).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FakeMicrophone).microphoneTracks.every(track => track.readyState === 'ended'),
      ),
    )
    .toBe(true);
});

test('says when the microphone is blocked, and tries again on request', async ({ page }) => {
  await page.addInitScript(() => {
    MediaDevices.prototype.getUserMedia = () =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await openShuffle(page);
  await topBarTool(page, 'Tuner');
  const tuner = page.getByRole('dialog', { name: 'Tuner' });
  await expect(tuner.getByRole('alert')).toHaveText(/The microphone is blocked/);
  await tuner.getByRole('button', { name: 'Start listening' }).click();
  await expect(tuner.getByRole('alert')).toHaveText(/The microphone is blocked/);
});
