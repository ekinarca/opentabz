/**
 * Playback in a background tab (AUD-002). A hidden tab gets its timers throttled and no animation
 * frames; the music must not depend on either. The synthesizer is driven by the AudioWorklet's
 * pings and positions arrive as messages, so the test stops the page's timers and frames and
 * hides it, as a background tab at worst, and checks that playback goes on.
 */
import { elapsedSeconds, expect, expectScore, openHome, test } from './support.ts';

test('playback goes on with the page hidden and its timers and frames stopped', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => elapsedSeconds(page)).toBeGreaterThanOrEqual(1);
  const before = await elapsedSeconds(page);
  await page.evaluate(() => {
    const never = () => 0;
    Object.assign(window, { setTimeout: never, setInterval: never, requestAnimationFrame: never });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(3000);
  expect(await elapsedSeconds(page)).toBeGreaterThanOrEqual(before + 2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
