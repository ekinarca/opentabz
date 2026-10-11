import { gzipSync, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, OpenFailure, openScore } from '../src/open/open.ts';
import type { OpenError } from '../src/shared/open-error.ts';
import { ascii, concat, gpHeader, listFixtures, readFixture } from './helpers.ts';

function noteCount(score: {
  tracks: { staves: { bars: { voices: { beats: { notes: unknown[] }[] }[] }[] }[] }[];
}): number {
  let count = 0;
  for (const track of score.tracks)
    for (const staff of track.staves)
      for (const bar of staff.bars)
        for (const voice of bar.voices) for (const beat of voice.beats) count += beat.notes.length;
  return count;
}

function openError(bytes: Uint8Array, name: string): OpenError {
  try {
    openScore(bytes, name);
  } catch (error) {
    if (error instanceof OpenFailure) return error.error;
    throw error;
  }
  throw new Error(`Expected ${name} to fail`);
}

describe('openScore — every public fixture opens', () => {
  const fixtures = [
    ...listFixtures('alphatab', /\.(gp[345x]?)$/),
    ...listFixtures('musicxml-testsuite', /\.xml$/),
  ];
  it.each(fixtures)('%s', path => {
    const opened = openScore(readFixture(path), path.split('/').pop() ?? path);
    expect(opened.score.tracks.length).toBeGreaterThan(0);
    expect(opened.score.masterBars.length).toBeGreaterThan(0);
    expect(opened.extensionMismatch).toBe(false);
  });
});

describe('openScore — content decides, not the extension', () => {
  it('opens a Guitar Pro 7 file named .gp5 and flags the mismatch', () => {
    const opened = openScore(readFixture('alphatab/guitarpro7/notes.gp'), 'song.gp5');
    expect(opened.format).toBe('gp');
    expect(opened.extensionMismatch).toBe(true);
  });

  it('opens files without an extension or with odd names', () => {
    expect(openScore(readFixture('alphatab/guitarpro5/notes.gp5'), 'download').format).toBe('gp5');
    expect(openScore(readFixture('alphatab/guitarpro6/notes.gpx'), 'Ünïcödé ♪ (1).GPX').format).toBe('gpx');
    expect(openScore(readFixture('alphatab/guitarpro5/notes.gp5'), 'notes.gp5.part').extensionMismatch).toBe(
      false,
    );
  });

  it('opens a bare score.gpif extracted from a .gp archive', () => {
    const entries = unzipSync(readFixture('alphatab/guitarpro7/chords.gp'));
    const gpif = entries['Content/score.gpif'];
    expect(gpif).toBeDefined();
    const opened = openScore(gpif ?? new Uint8Array(), 'score.gpif');
    expect(opened.format).toBe('gpif');
    expect(opened.score.tracks.length).toBeGreaterThan(0);
  });

  it('opens a score zipped by the user and a gzip-compressed MusicXML file', () => {
    const zipped = zipSync({ 'effects.gp': readFixture('alphatab/guitarpro7/effects.gp') });
    expect(openScore(zipped, 'effects.zip').format).toBe('gp');
    const gz = gzipSync(readFixture('musicxml-testsuite/01a-Pitches-Pitches.xml'));
    expect(openScore(gz, 'pitches.xml.gz').format).toBe('musicxml');
  });

  it('reads Guitar Pro 5 strings in the Windows code page, and UTF-8 when the bytes say so', () => {
    const original = readFixture('alphatab/guitarpro5/score-info.gp5');
    const latin = original.slice();
    latin.set([0x54, 0xef, 0x74, 0x6c, 0x65], 36); // "Tïtle" in Windows-1252
    expect(openScore(latin, 'latin.gp5').score.title).toBe('Tïtle');
    const utf8 = original.slice();
    utf8.set([0x54, 0xc3, 0xa9, 0x6c, 0x65], 36); // "Téle" in UTF-8
    expect(openScore(utf8, 'utf8.gp5').score.title).toBe('Téle');
    expect(openScore(utf8, 'utf8.gp5', { encoding: 'windows-1252' }).score.title).toBe('TÃ©le');
  });

  it('opens alphaTex text', () => {
    const opened = openScore(new TextEncoder().encode('\\title "Tex"\n:4 0.6 2.5 2.4 0.3 |'), 'tune.txt');
    expect(opened.format).toBe('alphatex');
    expect(opened.score.title).toBe('Tex');
  });
});

describe('openScore — precise errors', () => {
  it('empty files', () => {
    expect(openError(new Uint8Array(), 'x.gp5')).toMatchObject({ code: 'empty', format: null });
  });

  it('files above the size limit', () => {
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    expect(openError(big, 'huge.gp').code).toBe('too-large');
  });

  it('formats OpenTabz does not open, named exactly', () => {
    expect(openError(concat(ascii('MThd'), new Uint8Array(16)), 'song.mid')).toMatchObject({
      code: 'not-supported',
      format: 'midi',
    });
    expect(openError(ascii('%PDF-1.4\n'), 'tab.pdf')).toMatchObject({ code: 'not-supported', format: 'pdf' });
    expect(openError(concat(ascii('ID3'), new Uint8Array(200)), 'song.mp3')).toMatchObject({
      code: 'not-supported',
      format: 'audio',
    });
    expect(openError(new TextEncoder().encode('<!DOCTYPE html><html></html>'), 'tab.gp5')).toMatchObject({
      code: 'not-supported',
      format: 'html',
      extensionMismatch: true,
    });
  });

  it('Guitar Pro 1–2 files as an unsupported version', () => {
    const error = openError(concat(gpHeader('FICHIER GUITARE PRO v1.02'), new Uint8Array(64)), 'old.gtp');
    expect(error).toMatchObject({ code: 'unsupported-version', format: 'gp-legacy', formatVersion: '1.02' });
  });

  it('unrecognized data', () => {
    expect(openError(Uint8Array.of(0, 1, 2, 3, 250, 251, 252, 0, 0, 9, 9, 9), 'mystery.gp')).toMatchObject({
      code: 'unrecognized',
      format: 'unknown',
    });
    expect(
      openError(new TextEncoder().encode('Shopping list: strings, picks, capo.'), 'notes.txt').code,
    ).toBe('unrecognized');
  });

  for (const path of [
    'alphatab/guitarpro3/effects.gp3',
    'alphatab/guitarpro4/effects.gp4',
    'alphatab/guitarpro5/effects.gp5',
  ]) {
    it(`truncated ${path.split('/').pop() ?? path}`, () => {
      const bytes = readFixture(path);
      for (const fraction of [0.1, 0.5, 0.9, 0.99]) {
        const error = openError(bytes.subarray(0, Math.floor(bytes.length * fraction)), 'cut.gp5');
        expect(error.code, `cut at ${fraction}`).toBe('truncated');
        expect(error.format).toMatch(/^gp[345]$/);
      }
    });
  }

  it('truncated Guitar Pro 7/8 files', () => {
    const gp = readFixture('alphatab/guitarpro8/directions.gp');
    for (const fraction of [0.3, 0.7, 0.95]) {
      const error = openError(gp.subarray(0, Math.floor(gp.length * fraction)), 'cut.gp');
      expect(error.code, `gp cut at ${fraction}`).toBe('truncated');
      expect(error.format).toBe('gp');
    }
  });

  it('truncated Guitar Pro 6 files never lose content silently', () => {
    // A GPX container may end with unused space after its compressed stream, so a cut file can
    // still be complete. The invariant: fail precisely, flag the truncation, or be identical.
    const gpx = readFixture('alphatab/guitarpro6/effects.gpx');
    const full = noteCount(openScore(gpx, 'full.gpx').score);
    for (const fraction of [0.3, 0.5, 0.7, 0.95, 0.999]) {
      const cut = gpx.subarray(0, Math.floor(gpx.length * fraction));
      try {
        const opened = openScore(cut, 'cut.gpx');
        if (!opened.truncated) {
          expect(noteCount(opened.score), `gpx cut at ${fraction} lost notes without a truncation flag`).toBe(
            full,
          );
        }
      } catch (error) {
        if (!(error instanceof OpenFailure)) throw error;
        expect(['truncated', 'corrupt'], `gpx cut at ${fraction}: ${error.error.detail}`).toContain(
          error.error.code,
        );
        expect(error.error.format).toBe('gpx');
      }
    }
  });

  it('intact files are never flagged as truncated', () => {
    for (const path of [
      'alphatab/guitarpro6/effects.gpx',
      'alphatab/guitarpro5/effects.gp5',
      'alphatab/guitarpro7/effects.gp',
    ]) {
      expect(openScore(readFixture(path), path).truncated, path).toBe(false);
    }
  });

  it('malformed score XML inside a valid archive', () => {
    const broken = zipSync({
      'Content/score.gpif': new TextEncoder().encode('<GPIF><Score><Title>oops</Score>'),
    });
    const error = openError(broken, 'broken.gp');
    expect(error).toMatchObject({ code: 'corrupt', format: 'gp' });
    expect(error.detail.length).toBeGreaterThan(10);
  });

  it('alphaTex syntax errors report the line', () => {
    const error = openError(
      new TextEncoder().encode('\\title "Bad"\n\\track "A"\n0.6 2.5{zz 3.4'),
      'bad.atex',
    );
    expect(error).toMatchObject({ code: 'corrupt', format: 'alphatex' });
    expect(error.detail).toMatch(/line \d+/);
  });
});
