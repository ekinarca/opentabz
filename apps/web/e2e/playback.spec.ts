import type { Page } from '@playwright/test';
import {
  dropFiles,
  elapsedSeconds,
  expect,
  expectScore,
  fixture,
  openHome,
  test,
  transportText,
} from './support.ts';

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
    const position = page.getByRole('button', { name: /^Go to: / });
    const seen = new Set<string>();
    for (let sample = 0; sample < 12; sample++) {
      await page.waitForTimeout(400);
      const bars = /Bar (\d+),/.exec((await position.getAttribute('aria-label')) ?? '');
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

test.describe('playback cursor, seeking and selection gestures', () => {
  test.skip(({ isMobile }) => isMobile, 'Mouse gestures; touch is covered in mobile.spec.ts.');

  const position = (page: Page) => page.getByRole('button', { name: /^Go to: / });

  test.beforeEach(async ({ page }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  });

  test('stop returns to the start', async ({ page }) => {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => elapsedSeconds(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
    await page.getByRole('button', { name: 'Stop and go to the start' }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(position(page)).toHaveAccessibleName(/Bar 1, beat 1,/);
    expect(await elapsedSeconds(page)).toBe(0);
  });

  test('a click on a note moves playback there; double and triple clicks select', async ({ page }) => {
    const system = page.locator('.ot-partial[data-kind="system"]').first();
    await system.scrollIntoViewIfNeeded();
    const box = await system.boundingBox();
    if (box === null) throw new Error('no system');
    // The second bar of the first system.
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.45);
    await expect(position(page)).toHaveAccessibleName(/Bar 2,/);
    await expect(page.locator('.ot-cursor-beat')).toBeVisible();
    await expect(page.locator('.ot-cursor-bar')).toBeVisible();
    // Long enough apart not to count as one multi-click.
    await page.waitForTimeout(600);
    await page.mouse.dblclick(box.x + box.width * 0.6, box.y + box.height * 0.45);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bar 2 selected');
    await page.waitForTimeout(600);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.45, { clickCount: 3 });
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bars 1–13 selected');
  });

  test('the selection handles move the ends of the selection', async ({ page }) => {
    const system = page.locator('.ot-partial[data-kind="system"]').first();
    await system.scrollIntoViewIfNeeded();
    const box = await system.boundingBox();
    if (box === null) throw new Error('no system');
    await page.mouse.dblclick(box.x + box.width * 0.3, box.y + box.height * 0.45);
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bar 1 selected');
    const handle = page.locator('.ot-selection-handle[data-end="end"]');
    const handleBox = await handle.boundingBox();
    if (handleBox === null) throw new Error('no handle');
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height - 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByRole('toolbar', { name: 'Playback' })).toContainText('Bars 1–2 selected');
  });

  test('F9 toggles the loop and ⌥M / Alt+M the metronome', async ({ page }) => {
    await page.locator('.ot-scroll:not([hidden])').focus();
    const loop = page.getByRole('button', { name: 'Loop', exact: true });
    await expect(loop).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('F9');
    await expect(loop).toHaveAttribute('aria-pressed', 'true');
    const metronome = page.getByRole('button', { name: 'Metronome', exact: true });
    await page.keyboard.press('Alt+KeyM');
    await expect(metronome).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Alt+KeyC');
    await expect(page.getByRole('button', { name: 'Count-in', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('the cursor follows playback in every layout', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop layouts.');

  for (const layout of ['Page', 'Vertical', 'Horizontal'] as const) {
    test(`${layout} layout scrolls to keep the cursor in view`, async ({ page }) => {
      await openHome(page);
      await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
      await expectScore(page);
      await page.getByRole('radio', { name: layout }).click();
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
      // Fast, so a few seconds cover several systems.
      await page.getByRole('button', { name: /^Playback speed: / }).click();
      await page.getByRole('button', { name: '300 %', exact: true }).click();
      await page.keyboard.press('Escape');
      const scroller = page.locator('.ot-scroll:not([hidden])');
      const start = await scroller.evaluate(element => ({
        top: element.scrollTop,
        left: element.scrollLeft,
      }));
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(page.locator('.ot-cursor-beat')).toBeVisible();
      await expect
        .poll(
          async () => {
            const now = await scroller.evaluate(element => ({
              top: element.scrollTop,
              left: element.scrollLeft,
            }));
            return layout === 'Horizontal' ? now.left - start.left : now.top - start.top;
          },
          { timeout: 15_000 },
        )
        .toBeGreaterThan(50);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
    });
  }
});

test.describe('mixer', () => {
  test('mutes, solos and sets levels per track, with a practice mode', async ({ page }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    await page.getByRole('button', { name: 'Mixer' }).click();
    const mixer = page.getByRole('dialog', { name: 'Mixer' });
    await expect(mixer).toBeVisible();
    for (const track of ['Rhythm Guitar', 'Lead Guitar', 'Bass', 'Drums'])
      await expect(mixer).toContainText(track);
    const mute = mixer.getByRole('button', { name: 'Mute Lead Guitar' });
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    const solo = mixer.getByRole('button', { name: 'Solo Bass' });
    await solo.click();
    await expect(solo).toHaveAttribute('aria-pressed', 'true');
    const level = mixer.getByRole('slider', { name: 'Drums level' });
    await level.focus();
    await page.keyboard.press('Home');
    await expect(level).toHaveAttribute('aria-valuenow', '0');
    // Practice mode mutes the tracks on screen (the first track is shown by default).
    const practice = mixer.getByRole('button', { name: 'Practice mode: mute the tracks you are reading' });
    await practice.click();
    await expect(mixer.getByRole('button', { name: 'Mute Rhythm Guitar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
