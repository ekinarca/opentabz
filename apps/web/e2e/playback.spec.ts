import { elapsedSeconds, expect, expectScore, openHome, test, transportText } from './support.ts';

test.describe('playback', () => {
  test.beforeEach(async ({ page }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  });

  test('plays, advances and pauses', async ({ page }) => {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect.poll(() => elapsedSeconds(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    const paused = await elapsedSeconds(page);
    await page.waitForTimeout(1200);
    expect(await elapsedSeconds(page)).toBe(paused);
  });

  test('loops a selected bar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse drag selection; touch selection is covered in mobile.spec.ts.');
    // Drag across the first system's opening bar: from its first beat to its last.
    const system = page.locator('.ot-partial[data-kind="system"]').first();
    await system.scrollIntoViewIfNeeded();
    const box = await system.boundingBox();
    if (box === null) throw new Error('the first system is not visible');
    await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.45, { steps: 4 });
    await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.45, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.ot-selection:not([hidden])').first()).toBeVisible();
    const selected = await transportText(page);
    const match = /Bars? (\d+)(?:–(\d+))? selected/.exec(selected);
    if (match === null) throw new Error(`No selection in the transport: ${selected}`);
    const firstBar = Number(match[1]);
    const lastBar = Number(match[2] ?? match[1]);

    await page.getByRole('button', { name: 'Loop the selection' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const seen = new Set<string>();
    for (let sample = 0; sample < 12; sample++) {
      await page.waitForTimeout(400);
      const bars = /Bar (\d+)\n/.exec(await transportText(page));
      if (bars !== null) seen.add(bars[1] ?? '');
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    // Only the selected bars ever play, across several loop passes (about five seconds).
    expect(seen.size).toBeGreaterThan(0);
    for (const value of seen) {
      expect(Number(value)).toBeGreaterThanOrEqual(firstBar);
      expect(Number(value)).toBeLessThanOrEqual(lastBar);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('.ot-selection:not([hidden])')).toHaveCount(0);
  });
});
