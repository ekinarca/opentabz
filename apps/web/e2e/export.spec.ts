/**
 * Exports (EXP-004, EXP-024): the score saved as a Standard MIDI File, named after it, every
 * track named in it; muted tracks left out on request. What the file holds is proved in
 * packages/core/test/export-midi.test.ts.
 */
import { readFileSync } from 'node:fs';
import type { Download, Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

async function exportMidi(page: Page): Promise<{ file: Download; bytes: Buffer }> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export MIDI' }).click();
  const file = await downloading;
  const bytes = readFileSync(await file.path());
  await page.keyboard.press('Escape');
  return { file, bytes };
}

/** Track names (meta event 0x03) in a MIDI file, in order. */
function trackNames(bytes: Buffer): string[] {
  const names: string[] = [];
  for (let at = 0; at + 3 < bytes.length; at++) {
    if (bytes[at] !== 0xff || bytes[at + 1] !== 0x03) continue;
    const length = bytes[at + 2] ?? 0;
    names.push(bytes.subarray(at + 3, at + 3 + length).toString('utf8'));
  }
  return names;
}

test('exports the score as a MIDI file named after it, leaving out muted tracks', async ({ page }) => {
  await openShuffle(page);
  const { file, bytes } = await exportMidi(page);
  expect(file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.mid');
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('MThd');
  // The song's title on the conductor track, then each instrument.
  expect(trackNames(bytes)).toEqual([
    'Twelve-Bar Shuffle in A',
    'Rhythm Guitar',
    'Lead Guitar',
    'Bass',
    'Drums',
  ]);

  await page.getByRole('button', { name: 'Mixer' }).click();
  const mixer = page.getByRole('dialog', { name: 'Mixer' });
  await mixer.getByRole('button', { name: 'Mute Lead Guitar' }).click();
  await page.keyboard.press('Escape');
  expect(trackNames((await exportMidi(page)).bytes)).toEqual([
    'Twelve-Bar Shuffle in A',
    'Rhythm Guitar',
    'Bass',
    'Drums',
  ]);
});
