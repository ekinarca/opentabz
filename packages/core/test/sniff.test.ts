import { gzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { sniffFormat } from '../src/formats/sniff.ts';
import { ascii, concat, gpHeader, listFixtures, readFixture } from './helpers.ts';

describe('sniffFormat — fixtures', () => {
  const expectations: [RegExp, string, RegExp][] = [
    [/\.gp3$/, 'gp3', /^3\.00$/],
    [/\.gp4$/, 'gp4', /^4\.0[06]$/],
    [/\.gp5$/, 'gp5', /^5\.(00|10)$/],
    [/\.gpx$/, 'gpx', /^6$/],
    [/\.gp$/, 'gp', /^[78](\.\d+){0,2}$/],
  ];
  for (const path of listFixtures('alphatab', /\.(gp[345x]?)$/)) {
    it(`detects ${path}`, () => {
      const result = sniffFormat(readFixture(path));
      const expectation = expectations.find(([pattern]) => pattern.test(path));
      expect(expectation).toBeDefined();
      const [, format, version] = expectation ?? [/./, '', /./];
      expect(result.format).toBe(format);
      expect(result.version).toMatch(version);
      expect(result.problem).toBeNull();
    });
  }

  it('detects every MusicXML test-suite file', () => {
    for (const path of listFixtures('musicxml-testsuite', /\.xml$/)) {
      expect(sniffFormat(readFixture(path)).format, path).toBe('musicxml');
    }
  });

  it('reads the Guitar Pro 8 version from score.gpif', () => {
    expect(sniffFormat(readFixture('alphatab/guitarpro8/directions.gp')).version).toBe('8.1.3');
    expect(sniffFormat(readFixture('alphatab/guitarpro7/notes.gp')).version).toBe('7');
  });
});

describe('sniffFormat — Guitar Pro binary headers', () => {
  it('reads 3.x, 4.x and 5.x headers', () => {
    expect(sniffFormat(concat(gpHeader('FICHIER GUITAR PRO v3.00'), new Uint8Array(64)))).toMatchObject({
      format: 'gp3',
      version: '3.00',
    });
    expect(sniffFormat(concat(gpHeader('FICHIER GUITAR PRO v4.06'), new Uint8Array(64)))).toMatchObject({
      format: 'gp4',
      version: '4.06',
    });
    expect(sniffFormat(concat(gpHeader('FICHIER GUITAR PRO v5.10'), new Uint8Array(64)))).toMatchObject({
      format: 'gp5',
      version: '5.10',
    });
  });

  it('recognizes Guitar Pro 1–2 as a legacy version', () => {
    expect(sniffFormat(concat(gpHeader('FICHIER GUITARE PRO v1.02'), new Uint8Array(64)))).toMatchObject({
      format: 'gp-legacy',
      version: '1.02',
    });
  });

  it('recognizes clipboard data', () => {
    expect(sniffFormat(concat(gpHeader('CLIPBOARD GUITAR PRO 5.20'), new Uint8Array(64))).format).toBe(
      'gp-clipboard',
    );
  });

  it('reports a header cut short as truncated', () => {
    const header = gpHeader('FICHIER GUITAR PRO v5.00').subarray(0, 20);
    const result = sniffFormat(header);
    expect(result.format).toBe('gp5');
    expect(result.problem?.kind).toBe('truncated');
  });

  it('recognizes TuxGuitar 1.x files (UTF-16BE header)', () => {
    const name = 'TuxGuitar File Format - 1.5';
    const utf16 = new Uint8Array(name.length * 2);
    for (let i = 0; i < name.length; i++) utf16[i * 2 + 1] = name.charCodeAt(i);
    const bytes = concat(Uint8Array.of(name.length), utf16, new Uint8Array(16));
    expect(sniffFormat(bytes)).toMatchObject({ format: 'tuxguitar', version: '1.5' });
  });

  it('recognizes Guitar Pro 5 clipboard variants', () => {
    expect(sniffFormat(concat(gpHeader('CLIPBOARD GP 5.1'), new Uint8Array(64)))).toMatchObject({
      format: 'gp-clipboard',
      version: '5.1',
    });
  });

  it('recognizes binary Capella and TablEdit 3 documents', () => {
    expect(sniffFormat(concat(ascii('cap3-v:a'), new Uint8Array(64))).format).toBe('capella-binary');
    const tef = new Uint8Array(0x100);
    tef[3] = 0x03;
    tef.set(ascii('tbed'), 0x38);
    expect(sniffFormat(tef).format).toBe('tabledit');
  });
});

describe('sniffFormat — containers', () => {
  it('detects Guitar Pro 6 containers', () => {
    expect(sniffFormat(concat(ascii('BCFZ'), new Uint8Array(32))).format).toBe('gpx');
    expect(sniffFormat(concat(ascii('BCFS'), new Uint8Array(32))).format).toBe('gpx');
  });

  it('classifies ZIP archives by their entries', () => {
    const encode = (text: string) => new TextEncoder().encode(text);
    expect(
      sniffFormat(zipSync({ 'opentabz.json': encode('{}'), 'score.gp': new Uint8Array(4) })).format,
    ).toBe('otz');
    expect(sniffFormat(zipSync({ 'META-INF/container.xml': encode('<container/>') })).format).toBe('mxl');
    expect(sniffFormat(zipSync({ 'score.xml': encode('<score/>') })).format).toBe('capella');
    expect(sniffFormat(zipSync({ 'song.mscx': encode('<museScore/>') })).format).toBe('musescore');
    const other = sniffFormat(zipSync({ 'readme.txt': encode('hi'), 'song.gp5': new Uint8Array(8) }));
    expect(other.format).toBe('archive');
    expect(other.evidence).toContain('song.gp5');
  });

  it('tells MuseScore archives apart from compressed MusicXML', () => {
    const encode = (text: string) => new TextEncoder().encode(text);
    const mscz = zipSync({
      'META-INF/container.xml': encode('<container/>'),
      'song.mscx': encode('<museScore/>'),
    });
    expect(sniffFormat(mscz).format).toBe('musescore');
    const tux = zipSync({
      'version.txt': encode('TuxGuitar_file_format 2.0'),
      'content.xml': encode('<tgsong/>'),
    });
    expect(sniffFormat(tux)).toMatchObject({ format: 'tuxguitar', version: '2' });
  });

  it('unwraps a ZIP holding a single score file, ignoring macOS clutter', () => {
    const gp5 = readFixture('alphatab/guitarpro5/notes.gp5');
    const zipped = zipSync({
      'song/notes.gp5': gp5,
      '__MACOSX/song/._notes.gp5': new Uint8Array(4),
      'song/.DS_Store': new Uint8Array(8),
    });
    const result = sniffFormat(zipped);
    expect(result.format).toBe('gp5');
    expect(result.payload).toEqual(gp5);
    expect(result.evidence).toContain('inside a ZIP archive');
  });

  it('does not unwrap archives with several files', () => {
    const zipped = zipSync({
      'a.gp5': readFixture('alphatab/guitarpro5/notes.gp5'),
      'b.gp5': readFixture('alphatab/guitarpro5/dead.gp5'),
    });
    expect(sniffFormat(zipped).format).toBe('archive');
  });

  it('unwraps gzip-compressed scores and recognizes Power Tab Editor 2', () => {
    const xml = readFixture('musicxml-testsuite/01a-Pitches-Pitches.xml');
    const result = sniffFormat(gzipSync(xml));
    expect(result.format).toBe('musicxml');
    expect(result.payload).toEqual(xml);
    expect(sniffFormat(gzipSync(new TextEncoder().encode('{"song":{}}'))).format).toBe('powertab');
  });

  it('identifies a truncated Guitar Pro 7 archive and reports the truncation', () => {
    const bytes = readFixture('alphatab/guitarpro7/notes.gp');
    const result = sniffFormat(bytes.subarray(0, Math.floor(bytes.length * 0.6)));
    expect(result.format).toBe('gp');
    expect(result.problem?.kind).toBe('truncated');
  });
});

describe('sniffFormat — other files', () => {
  const cases: [string, Uint8Array, string][] = [
    ['MIDI', concat(ascii('MThd'), Uint8Array.of(0, 0, 0, 6, 0, 1, 0, 2, 1, 224)), 'midi'],
    ['RIFF MIDI', concat(ascii('RIFF'), Uint8Array.of(0, 0, 0, 0), ascii('RMID')), 'midi'],
    ['WAV', concat(ascii('RIFF'), Uint8Array.of(0, 0, 0, 0), ascii('WAVE')), 'audio'],
    ['Power Tab', concat(ascii('ptab'), new Uint8Array(32)), 'powertab'],
    ['PDF', ascii('%PDF-1.7\n'), 'pdf'],
    ['PNG', Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image'],
    ['JPEG', Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10), 'image'],
    ['MP3', concat(ascii('ID3'), new Uint8Array(32)), 'audio'],
    ['Ogg', concat(ascii('OggS'), new Uint8Array(32)), 'audio'],
    ['FLAC', concat(ascii('fLaC'), new Uint8Array(32)), 'audio'],
    ['MP4', concat(Uint8Array.of(0, 0, 0, 24), ascii('ftypisom'), new Uint8Array(16)), 'video'],
    ['gzip', Uint8Array.of(0x1f, 0x8b, 8, 0, 0, 0, 0, 0), 'archive'],
    ['RAR', concat(ascii('Rar!'), Uint8Array.of(0x1a, 7, 0)), 'archive'],
    ['empty ZIP', concat(Uint8Array.of(0x50, 0x4b, 5, 6), new Uint8Array(18)), 'archive'],
    ['AppleDouble', Uint8Array.of(0, 5, 22, 7, 0, 2, 0, 0, 77, 97, 99), 'unknown'],
    ['binary', Uint8Array.of(0, 1, 2, 3, 250, 251, 252, 0, 0, 7), 'unknown'],
  ];
  for (const [name, bytes, format] of cases) {
    it(`recognizes ${name}`, () => {
      expect(sniffFormat(bytes).format).toBe(format);
    });
  }
});

describe('sniffFormat — text formats', () => {
  const text = (value: string) => new TextEncoder().encode(value);

  it('detects MusicXML with BOM, doctype and comments', () => {
    const xml =
      '﻿<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<!-- made by hand -->\n<score-partwise version="3.1"><part-list/></score-partwise>';
    expect(sniffFormat(text(xml))).toMatchObject({ format: 'musicxml', version: '3.1' });
  });

  it('detects timewise MusicXML and UTF-16 encodings', () => {
    const xml = '<?xml version="1.0" encoding="UTF-16"?><score-timewise version="2.0"></score-timewise>';
    const utf16 = new Uint8Array(xml.length * 2 + 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < xml.length; i++) utf16[2 + i * 2] = xml.charCodeAt(i);
    expect(sniffFormat(utf16)).toMatchObject({ format: 'musicxml', version: '2.0' });
  });

  it('detects MusicXML opus collections', () => {
    expect(sniffFormat(text('<?xml version="1.0"?><opus><title>Book</title></opus>')).format).toBe(
      'musicxml-opus',
    );
  });

  it('detects a bare score.gpif', () => {
    expect(
      sniffFormat(text('<?xml version="1.0"?>\n<GPIF>\n<GPVersion>8.1.3</GPVersion></GPIF>')),
    ).toMatchObject({
      format: 'gpif',
      version: '8.1.3',
    });
  });

  it('detects Capella, MuseScore and HTML documents', () => {
    expect(
      sniffFormat(text('<?xml version="1.0"?><score xmlns="http://www.capella.de/CapXML/2.0"></score>'))
        .format,
    ).toBe('capella');
    expect(sniffFormat(text('<?xml version="1.0"?><museScore version="4.20"></museScore>')).format).toBe(
      'musescore',
    );
    expect(sniffFormat(text('<!DOCTYPE html><html><head><title>Tab</title></head></html>')).format).toBe(
      'html',
    );
  });

  it('detects alphaTex by tags or by note syntax', () => {
    expect(sniffFormat(text('\\title "Song"\n\\track "Guitar"\n0.6 2.5 2.4')).format).toBe('alphatex');
    expect(sniffFormat(text(':4 0.6 2.5 2.4 0.3 | 3.2.2 5.1.2 |')).format).toBe('alphatex');
  });

  it('detects plain-text tabs and ChordPro', () => {
    const tab = [
      'e|-----0-----|',
      'B|---1---1---|',
      'G|-2-------2-|',
      'D|-----------|',
      'A|-3---------|',
      'E|-----------|',
    ].join('\n');
    expect(sniffFormat(text(tab)).format).toBe('ascii-tab');
    expect(sniffFormat(text('{title: My Song}\n[C]Hello [G]world')).format).toBe('chordpro');
  });

  it('falls back to plain text', () => {
    expect(sniffFormat(text('Just some notes about practising scales slowly.')).format).toBe('text');
  });
});
