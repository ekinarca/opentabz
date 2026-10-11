/**
 * Exports: the score saved as a Standard MIDI File (EXP-004, EXP-024), named after it, every
 * track named in it, muted tracks left out on request; and as WAV audio (EXP-005, EXP-029), the
 * whole song or the selected bars. What the files hold is proved in
 * packages/core/test/export-midi.test.ts and packages/audio/test/export-render.test.ts.
 */
import { readFileSync } from 'node:fs';
import type { Download, Page } from '@playwright/test';
import { expect, expectScore, openHome, test, transportText } from './support.ts';

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

interface Wav {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bits: number;
  readonly seconds: number;
  readonly peak: number;
}

function readWav(bytes: Buffer): Wav {
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('latin1')).toBe('WAVE');
  const sampleRate = bytes.readUInt32LE(24);
  const channels = bytes.readUInt16LE(22);
  const bits = bytes.readUInt16LE(34);
  const data = bytes.readUInt32LE(40);
  let peak = 0;
  for (let at = 44; at + 1 < 44 + data; at += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(at)));
  return {
    sampleRate,
    channels,
    bits,
    seconds: data / (sampleRate * channels * (bits / 8)),
    peak: peak / 32768,
  };
}

async function exportWav(page: Page): Promise<{ file: Download; wav: Wav }> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  const downloading = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export WAV' }).click();
  const file = await downloading;
  const wav = readWav(readFileSync(await file.path()));
  await expect(dialog.getByRole('button', { name: 'Export WAV' })).toBeVisible();
  await page.keyboard.press('Escape');
  return { file, wav };
}

test('exports the audio as WAV: the whole song, or the selected bars', async ({ page }) => {
  await openShuffle(page);
  const whole = await exportWav(page);
  expect(whole.file.suggestedFilename()).toBe('Twelve-Bar Shuffle in A.wav');
  expect([whole.wav.sampleRate, whole.wav.channels, whole.wav.bits]).toEqual([44100, 2, 16]);
  // The song plays for half a minute, then its last notes ring out.
  expect(whole.wav.seconds).toBeGreaterThan(30);
  expect(whole.wav.seconds).toBeLessThan(33);
  expect(whole.wav.peak).toBeGreaterThan(0.05);

  // Bars 9 to 12 only: a third of the song.
  await page.getByRole('button', { name: /^Go to: / }).click();
  await page
    .getByRole('dialog', { name: 'Go to' })
    .getByRole('button', { name: 'Select Turnaround (bars 9–12)' })
    .click();
  await expect.poll(() => transportText(page)).toMatch(/Bars 9–12 selected/);
  const part = await exportWav(page);
  expect(part.wav.seconds).toBeGreaterThan(whole.wav.seconds / 4);
  expect(part.wav.seconds).toBeLessThan(whole.wav.seconds / 2);
  expect(part.wav.peak).toBeGreaterThan(0.05);
});
