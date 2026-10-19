import { readFileSync } from 'node:fs';
import {
  dropFiles,
  expect,
  expectScore,
  fixture,
  measure,
  openFiles,
  openHome,
  primaryModifier,
  test,
} from './support.ts';

test.describe('opening files', () => {
  test('home page is cross-origin isolated and served with the production headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
    expect(response?.headers()['cross-origin-embedder-policy']).toBe('require-corp');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    await expect(page).toHaveTitle(/OpenTabz/);
  });

  for (const demo of ['a blues shuffle', 'Greensleeves', 'an arpeggio study']) {
    test(`demo: ${demo}`, async ({ page }) => {
      await openHome(page);
      await page.getByRole('button', { name: demo }).click();
      await expectScore(page);
    });
  }

  const formats: readonly (readonly [string, string, string])[] = [
    ['Guitar Pro 3', 'alphatab/guitarpro3/effects.gp3', 'Effects'],
    ['Guitar Pro 4', 'alphatab/guitarpro4/effects.gp4', 'Effects'],
    ['Guitar Pro 5', 'alphatab/guitarpro5/effects.gp5', 'Effects'],
    ['Guitar Pro 6', 'alphatab/guitarpro6/effects.gpx', 'Effects'],
    ['Guitar Pro 7+', 'generated/demos/twelve-bar-shuffle.gp', 'Twelve-Bar Shuffle in A'],
    ['MusicXML', 'musicxml-testsuite/01a-Pitches-Pitches.xml', ''],
    ['compressed MusicXML', 'alphatab/musicxml3/compressed.mxl', ''],
    ['Capella', 'capella/original-air.capx', ''],
    ['alphaTex', 'alphatex/demos/greensleeves.atex', 'Greensleeves'],
  ];
  for (const [format, path, title] of formats) {
    test(`format: ${format}`, async ({ page }) => {
      await openHome(page);
      await openFiles(page, [fixture(path)]);
      await expectScore(page);
      if (title.length > 0)
        await expect(page.getByRole('navigation', { name: 'Open documents' })).toContainText(title);
    });
  }

  test('several files open as tabs', async ({ page }) => {
    await openHome(page);
    await openFiles(page, [
      fixture('alphatex/demos/greensleeves.atex'),
      fixture('alphatex/demos/arpeggio-study.atex'),
    ]);
    await expectScore(page);
    await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(
      2,
    );
  });

  test('a broken file explains what went wrong', async ({ page }) => {
    await openHome(page);
    await openFiles(page, [fixture('generated/corrupt/truncated-half.gp')]);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('couldn’t be opened');
    await expect(dialog).toContainText('truncated-half.gp');
  });

  test('pasting a file or score text opens it', async ({ page, browserName }) => {
    await openHome(page);
    const text = readFileSync(fixture('alphatex/demos/arpeggio-study.atex'), 'utf8');
    // Firefox empties the data of paste events a page makes itself: there the text is pasted
    // for real, through the clipboard.
    if (browserName === 'firefox') {
      await page.evaluate(source => navigator.clipboard.writeText(source), text);
      await page.keyboard.press(`${await primaryModifier(page)}+v`);
    } else {
      await page.evaluate(source => {
        const data = new DataTransfer();
        data.setData('text/plain', source);
        document.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
        );
      }, text);
    }
    await expectScore(page);
    // A test cannot put a file on the clipboard, and Firefox empties made-up paste events.
    if (browserName === 'firefox') return;
    const base64 = readFileSync(fixture('alphatab/guitarpro5/effects.gp5')).toString('base64');
    await page.evaluate(encoded => {
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], 'effects.gp5'));
      document.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    }, base64);
    await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(
      2,
    );
  });

  test('opens a score from a link and from a ?url= deep link', async ({ page }) => {
    const url = 'https://scores.example/library/twelve-bar-shuffle.gp';
    await page.route(url, route =>
      route.fulfill({
        status: 200,
        body: readFileSync(fixture('generated/demos/twelve-bar-shuffle.gp')),
        headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' },
      }),
    );
    await page.goto(`/?url=${encodeURIComponent(url)}`);
    await expectScore(page);
    await expect(page.getByRole('navigation', { name: 'Open documents' })).toContainText(
      'Twelve-Bar Shuffle in A',
    );
    // The sounds load once a score is open. Leaving while they still arrive is covered in
    // playback.spec.ts; here the page is left once they are in.
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });

    await openHome(page);
    await page.getByRole('button', { name: /^Open from a link/ }).click();
    await page.getByLabel('File address').fill(url);
    await page.getByRole('dialog').getByRole('button', { name: 'Open', exact: true }).click();
    await expectScore(page);
  });

  test('paints only the systems near the viewport', async ({ page }) => {
    await openHome(page);
    await dropFiles(page, [fixture('generated/perf-5x150.gp')]);
    await expectScore(page);
    const systems = await page.locator('.ot-partial[data-kind="system"]').count();
    const painted = await page.locator('.ot-partial[data-kind="system"]:has(svg)').count();
    expect(systems).toBeGreaterThan(20);
    expect(painted).toBeGreaterThan(0);
    expect(painted).toBeLessThan(systems / 2);
  });

  test('vertical layout reflows when the window narrows', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Phones cannot be resized.');
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    await page.getByRole('radio', { name: 'Vertical' }).click();
    await measure(page, 'ot:layout');
    const wide = await page.locator('.ot-partial[data-kind="system"]').count();
    await page.evaluate(() => {
      performance.clearMeasures('ot:layout');
    });
    await page.setViewportSize({ width: 560, height: 800 });
    await measure(page, 'ot:layout');
    await expect.poll(() => page.locator('.ot-partial[data-kind="system"]').count()).toBeGreaterThan(wide);
    await expectScore(page);
  });
});
