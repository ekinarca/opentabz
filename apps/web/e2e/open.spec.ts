import { expect, expectScore, fixture, openFiles, openHome, test } from './support.ts';

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
});
