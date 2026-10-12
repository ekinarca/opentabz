/**
 * The installed app (PLAT-001, PLAT-002, PLAT-004, PLAT-045): the manifest that installs it, the
 * service worker that keeps it, so that after the first visit it opens and plays a score with no
 * network; files shared to it, opened as if dropped; and a new version, which waits until asked
 * and then takes over with the scores open again. Playwright drives service workers in Chromium.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

test.use({ serviceWorkers: 'allow' });

/** Waits until the service worker keeps the app and serves this page. */
async function kept(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 30_000 })
    .toBe(true);
}

test('installs, and opens and plays a score without a network after the first visit', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Playwright drives service workers in Chromium.');
  await openHome(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');
  const manifest = (await (await page.request.get(href ?? '')).json()) as { name: string; display: string };
  expect(manifest).toMatchObject({ name: 'OpenTabz', display: 'standalone' });
  await kept(page);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Still isolated, as the audio engine needs: the page comes with its headers.
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await expectScore(page);
    // The sound bank too.
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  } finally {
    await context.setOffline(false);
  }
});

test('opens files shared to the installed app', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright drives service workers in Chromium.');
  await openHome(page);
  await kept(page);
  // As the system's share sheet sends them: a form posted to the share target.
  const landing = await page.evaluate(async () => {
    const form = new FormData();
    form.append('title', 'A shared score');
    form.append(
      'files',
      new File(['\\title "Shared Riff"\n.\n:4 0.6 2.6 3.6 5.6 |'], 'shared-riff.atex', {
        type: 'text/plain',
      }),
    );
    const response = await fetch('/share-target', { method: 'POST', body: form });
    return response.url;
  });
  expect(new URL(landing).search).toBe('?shared=1');
  await page.goto(landing);
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Shared Riff', exact: true })).toBeVisible();
  // The address is clean again.
  expect(new URL(page.url()).search).toBe('');
});

test('a new version waits until asked, then takes over with the scores open again', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Playwright drives service workers in Chromium.');
  await openHome(page);
  await kept(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
  // Kept to open again (recent scores are remembered unless turned off).
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('opentabz.session.v1') ?? ''))
    .toContain('"active":0');

  // A new version on the server: the built service worker, changed.
  const worker = join(import.meta.dirname, '..', 'dist', 'sw.js');
  const built = readFileSync(worker, 'utf8');
  try {
    writeFileSync(worker, `${built}\n// A new version, for the test.\n`);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    const notice = page.getByText('A new version of OpenTabz is ready', { exact: true });
    await expect(notice).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('Reload to use it; the scores open now open again.', { exact: true }),
    ).toBeVisible();
    // Taken when asked: the page reloads with it, the score open again.
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    await reloaded;
    await expectScore(page);
    await expect(page.getByRole('button', { name: 'Twelve-Bar Shuffle in A', exact: true })).toBeVisible();
    await expect(notice).toBeHidden();
  } finally {
    writeFileSync(worker, built);
  }
});
