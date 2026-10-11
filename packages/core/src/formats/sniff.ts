/**
 * Identifies a file's format from its content alone. The file name is never consulted here;
 * the open pipeline only uses it to word messages about mismatched extensions.
 *
 * Detection order follows docs/research/formats.md §1.2: containers first, then the very specific
 * binary headers, then generic signatures, then text classification.
 */
import { gunzipSync, unzipSync } from 'fflate';
import type { FormatId } from '../shared/formats.ts';
import { classifyText, decodeText } from './text.ts';
import {
  isEmptyZip,
  isZip,
  readZipDirectory,
  readZipEntryPrefix,
  type ZipDirectory,
  type ZipProblem,
} from './zip.ts';

export interface SniffResult {
  readonly format: FormatId;
  /** Format version when it can be read cheaply, e.g. "5.10", "8.1.3", "4.0". */
  readonly version: string | null;
  /** Short technical description of what was found (used in error details). */
  readonly evidence: string;
  /** Structural problem found while sniffing a container (e.g. a truncated ZIP). */
  readonly problem: ZipProblem | null;
  /** ZIP directory for container formats, so importers need not read it twice. */
  readonly zip: ZipDirectory | null;
  /** Bytes to import instead of the file itself: unwrapped from gzip or from a single-score ZIP. */
  readonly payload: Uint8Array | null;
}

/** Inflated size limit when unwrapping gzip or a ZIP entry. */
const MAX_UNWRAPPED_BYTES = 64 * 1024 * 1024;
const GP_HEADER_LENGTH = 31;
const GP3_TO_5_PREFIX = 'FICHIER GUITAR PRO ';
const GP_LEGACY_PREFIX = 'FICHIER GUITARE PRO';
const GP_CLIPBOARD_PREFIXES = ['CLIPBOARD GUITAR PRO', 'CLIPBOARD GP'];
const TUXGUITAR_PREFIX = 'TuxGuitar File Format';
/** Entry names that only Guitar Pro 7/8 archives contain (lower case). */
const GP7_ENTRY_NAMES: ReadonlySet<string> = new Set([
  'content/binarystylesheet',
  'content/partconfiguration',
  'content/layoutconfiguration',
  'content/preferences.json',
  'content/stylesheets/score.gpss',
]);

export function sniffFormat(bytes: Uint8Array): SniffResult {
  return sniff(bytes, 0);
}

function sniff(bytes: Uint8Array, depth: number): SniffResult {
  if (isZip(bytes)) return sniffZip(bytes, depth);
  if (isEmptyZip(bytes)) return result('archive', null, 'empty ZIP archive');

  const ascii4 = ascii(bytes, 0, 4);
  if (ascii4 === 'BCFZ' || ascii4 === 'BCFS') return result('gpx', '6', `Guitar Pro 6 container (${ascii4})`);

  const header = sniffLengthPrefixedHeader(bytes);
  if (header !== null) return header;

  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return sniffGzip(bytes, depth);

  if (!startsWithTextBom(bytes)) {
    const binary = sniffBinarySignature(bytes, ascii4);
    if (binary !== null) return binary;
  }

  const decoded = decodeText(bytes);
  if (decoded === null) return result('unknown', null, `binary data starting with ${hex(bytes, 0, 8)}`);
  const kind = classifyText(decoded.text);
  switch (kind.kind) {
    case 'musicxml':
      return result(
        'musicxml',
        kind.version,
        `MusicXML ${kind.version ?? ''} document (${decoded.encoding})`.trim(),
      );
    case 'musicxml-opus':
      return result('musicxml-opus', null, 'MusicXML opus (a collection of scores)');
    case 'gpif':
      return result('gpif', kind.version, 'Guitar Pro GPIF score XML');
    case 'capella':
      return result('capella', null, 'Capella CapXML document');
    case 'musescore':
      return result('musescore', null, 'MuseScore uncompressed score (.mscx)');
    case 'html':
      return result('html', null, 'HTML web page');
    case 'xml':
      return result('unknown', null, `XML document with root element <${kind.root}>`);
    case 'alphatex':
      return result('alphatex', null, `alphaTex text (${decoded.encoding})`);
    case 'ascii-tab':
      return result('ascii-tab', null, 'plain-text guitar tablature');
    case 'chordpro':
      return result('chordpro', null, 'ChordPro chord sheet');
    case 'text':
      return result('text', null, `plain text (${decoded.encoding})`);
  }
}

/**
 * Guitar Pro 1–5, Guitar Pro clipboard data and TuxGuitar ≤ 1.5 all start with a length byte
 * followed by an identifying string (TuxGuitar's in UTF-16BE).
 */
function sniffLengthPrefixedHeader(bytes: Uint8Array): SniffResult | null {
  const length = bytes[0];
  if (length === undefined || length < 10 || length > 40) return null;

  // TuxGuitar ≤ 1.5: length byte + UTF-16BE string.
  if (bytes[1] === 0x00 && bytes[2] === 0x54) {
    const text = utf16be(bytes, 1, Math.min(length, Math.floor((bytes.length - 1) / 2)));
    if (text.startsWith(TUXGUITAR_PREFIX)) {
      const version = /(\d+\.\d+)/.exec(text)?.[1] ?? null;
      return result('tuxguitar', version, `TuxGuitar header "${text}"`);
    }
  }

  const available = Math.min(length, bytes.length - 1);
  if (available < 8 || length > 30) return null;
  const header = ascii(bytes, 1, available);

  if (header.startsWith(GP3_TO_5_PREFIX.slice(0, Math.min(available, GP3_TO_5_PREFIX.length)))) {
    if (available < GP3_TO_5_PREFIX.length + 2) {
      return {
        ...result('gp5', null, 'Guitar Pro 3–5 header'),
        problem: { kind: 'truncated', detail: 'The Guitar Pro header is incomplete.', offset: bytes.length },
      };
    }
    const versionText = header.slice(GP3_TO_5_PREFIX.length + 1);
    const match = /^(\d+)\.(\d+)/.exec(versionText);
    const major = match?.[1] === undefined ? Number.NaN : Number.parseInt(match[1], 10);
    const version = match ? `${match[1]}.${match[2]}` : versionText;
    const format: FormatId = major === 3 ? 'gp3' : major === 4 ? 'gp4' : major === 5 ? 'gp5' : 'gp-legacy';
    const problem: ZipProblem | null =
      bytes.length < GP_HEADER_LENGTH
        ? { kind: 'truncated', detail: 'The file ends inside the Guitar Pro header.', offset: bytes.length }
        : null;
    return { ...result(format, version, `Guitar Pro header "${header}"`), problem };
  }
  if (header.startsWith(GP_LEGACY_PREFIX)) {
    const match = /v?(\d+(?:\.\d+)?)/.exec(header.slice(GP_LEGACY_PREFIX.length));
    return result('gp-legacy', match?.[1] ?? null, `Guitar Pro 1 header "${header}"`);
  }
  if (GP_CLIPBOARD_PREFIXES.some(prefix => header.startsWith(prefix))) {
    return result(
      'gp-clipboard',
      /(\d+\.\d+)/.exec(header)?.[1] ?? null,
      `Guitar Pro clipboard header "${header}"`,
    );
  }
  return null;
}

function sniffZip(bytes: Uint8Array, depth: number): SniffResult {
  const zip = readZipDirectory(bytes);
  const names = zip.entries.map(entry => entry.name);
  const lower = names.map(name => name.toLowerCase());
  const withZip = (format: FormatId, version: string | null, evidence: string): SniffResult => ({
    format,
    version,
    evidence,
    problem: zip.problem,
    zip,
    payload: null,
  });

  if (lower.includes('opentabz.json')) return withZip('otz', null, 'OpenTabz project archive');
  const gpifIndex = lower.indexOf('content/score.gpif');
  if (gpifIndex >= 0) {
    const entry = zip.entries[gpifIndex];
    const prefix = entry ? readZipEntryPrefix(bytes, entry, 2048) : null;
    const text = prefix ? new TextDecoder('utf-8', { fatal: false }).decode(prefix) : '';
    const version = /<GPVersion>([^<]+)<\/GPVersion>/.exec(text)?.[1]?.trim() ?? null;
    return withZip('gp', version, `Guitar Pro 7/8 archive (${names.length} entries)`);
  }
  if (lower.some(name => GP7_ENTRY_NAMES.has(name))) {
    // Guitar Pro 7/8 structure without its score: truncated before score.gpif, or damaged.
    return {
      ...withZip('gp', null, `Guitar Pro 7/8 archive without score.gpif (${names.length} entries)`),
      problem: zip.problem ?? {
        kind: 'corrupt',
        detail: 'The archive contains no Content/score.gpif.',
        offset: null,
      },
    };
  }
  if (lower.includes('version.txt') && lower.includes('content.xml')) {
    return withZip('tuxguitar', '2', 'TuxGuitar 2 archive');
  }
  // MuseScore also uses META-INF/container.xml, so it must be ruled out before MusicXML.
  if (lower.some(name => name.endsWith('.mscx')))
    return withZip('musescore', null, 'MuseScore archive (.mscz)');
  if (lower.includes('meta-inf/container.xml')) return withZip('mxl', null, 'compressed MusicXML archive');
  if (lower.includes('score.xml')) return withZip('capella', null, 'Capella archive (score.xml)');

  const candidates = zip.entries.filter(entry => isUserFile(entry.name));
  const only = candidates[0];
  if (
    depth === 0 &&
    candidates.length === 1 &&
    only !== undefined &&
    only.uncompressedSize <= MAX_UNWRAPPED_BYTES
  ) {
    const inner = extractEntry(bytes, only.name);
    if (inner !== null) {
      const nested = sniff(inner, depth + 1);
      if (nested.format !== 'unknown' && nested.format !== 'text' && nested.format !== 'archive') {
        return {
          ...nested,
          evidence: `${nested.evidence} inside a ZIP archive (${only.name})`,
          payload: nested.payload ?? inner,
        };
      }
    }
  }
  const listing =
    candidates
      .map(entry => entry.name)
      .slice(0, 5)
      .join(', ') + (candidates.length > 5 ? ', …' : '');
  return withZip(
    'archive',
    null,
    `ZIP archive with ${candidates.length} files${candidates.length > 0 ? `: ${listing}` : ''}`,
  );
}

function sniffGzip(bytes: Uint8Array, depth: number): SniffResult {
  if (depth > 0) return result('archive', null, 'gzip-compressed data');
  let inflated: Uint8Array;
  try {
    inflated = gunzipSync(bytes);
  } catch {
    return result('archive', null, 'damaged gzip-compressed data');
  }
  if (inflated.length > MAX_UNWRAPPED_BYTES)
    return result('archive', null, 'gzip-compressed data (too large to unpack)');
  const nested = sniff(inflated, depth + 1);
  if (nested.format === 'text' && inflated[0] === 0x7b) {
    // Power Tab Editor 2 (.pt2) stores gzip-compressed JSON.
    return result('powertab', '2', 'Power Tab Editor 2 document (gzip-compressed JSON)');
  }
  if (nested.format === 'unknown' || nested.format === 'text')
    return result('archive', null, 'gzip-compressed data');
  return { ...nested, evidence: `gzip-compressed ${nested.evidence}`, payload: nested.payload ?? inflated };
}

function sniffBinarySignature(bytes: Uint8Array, ascii4: string): SniffResult | null {
  if (ascii4 === 'MThd') return result('midi', null, 'Standard MIDI File');
  if (ascii4 === 'RIFF') {
    const kind = ascii(bytes, 8, 4);
    if (kind === 'RMID') return result('midi', null, 'RIFF MIDI file');
    if (kind === 'WAVE') return result('audio', null, 'WAV audio');
    if (kind === 'WEBP') return result('image', null, 'WebP image');
    if (kind === 'AVI ') return result('video', null, 'AVI video');
  }
  if (ascii4 === 'ptab') return result('powertab', null, 'Power Tab document');
  if (ascii(bytes, 0, 7) === 'cap3-v:')
    return result('capella-binary', null, 'Capella binary document (.cap)');
  if (bytes[3] === 0x03 && ascii(bytes, 0x38, 4) === 'tbed')
    return result('tabledit', '3', 'TablEdit 3 document');
  if (ascii4 === '%PDF') return result('pdf', null, 'PDF document');
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return result('image', null, 'PNG image');
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return result('image', null, 'JPEG image');
  if (ascii4 === 'GIF8') return result('image', null, 'GIF image');
  if (ascii(bytes, 0, 2) === 'BM' && bytes.length > 26) return result('image', null, 'BMP image');
  if (ascii4 === 'II*\u0000' || ascii4 === 'MM\u0000*') return result('image', null, 'TIFF image');
  if (ascii(bytes, 0, 3) === 'ID3') return result('audio', null, 'MP3 audio (ID3)');
  if (ascii4 === 'OggS') return result('audio', null, 'Ogg audio');
  if (ascii4 === 'fLaC') return result('audio', null, 'FLAC audio');
  if (isMpegFrameHeader(bytes) && bytes.length > 128) return result('audio', null, 'MPEG audio frame');
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    return result(brand.startsWith('M4A') ? 'audio' : 'video', null, `ISO media (${brand.trim()})`);
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return result('video', null, 'Matroska / WebM media');
  }
  if (ascii4 === 'Rar!') return result('archive', null, 'RAR archive');
  if (bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf) {
    return result('archive', null, '7-Zip archive');
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x05 && bytes[2] === 0x16 && bytes[3] === 0x07) {
    return result('unknown', null, 'macOS AppleDouble metadata file');
  }
  return null;
}

/** Entries a person put into an archive (not directories or operating-system clutter). */
function isUserFile(name: string): boolean {
  if (name.endsWith('/')) return false;
  if (name.startsWith('__MACOSX/')) return false;
  const base = name.split('/').pop() ?? name;
  return !base.startsWith('._') && base !== '.DS_Store' && base !== 'Thumbs.db' && base !== 'desktop.ini';
}

function extractEntry(bytes: Uint8Array, name: string): Uint8Array | null {
  try {
    return unzipSync(bytes, { filter: file => file.name === name })[name] ?? null;
  } catch {
    return null;
  }
}

function startsWithTextBom(bytes: Uint8Array): boolean {
  return (
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff)
  );
}

/** An MPEG audio frame header with no reserved field values. */
function isMpegFrameHeader(bytes: Uint8Array): boolean {
  const [b0, b1, b2] = [bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0];
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return false;
  const version = (b1 >> 3) & 0x03;
  const layer = (b1 >> 1) & 0x03;
  const bitrate = b2 >> 4;
  const sampleRate = (b2 >> 2) & 0x03;
  return version !== 0x01 && layer !== 0x00 && bitrate !== 0x0f && sampleRate !== 0x03;
}

function result(format: FormatId, version: string | null, evidence: string): SniffResult {
  return { format, version, evidence, problem: null, zip: null, payload: null };
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = '';
  const end = Math.min(bytes.length, offset + length);
  for (let i = offset; i < end; i++) text += String.fromCharCode(bytes[i] ?? 0);
  return text;
}

function utf16be(bytes: Uint8Array, offset: number, characters: number): string {
  let text = '';
  for (let i = 0; i < characters; i++) {
    const index = offset + i * 2;
    if (index + 1 >= bytes.length) break;
    text += String.fromCharCode(((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0));
  }
  return text;
}

function hex(bytes: Uint8Array, offset: number, length: number): string {
  const end = Math.min(bytes.length, offset + length);
  const parts: string[] = [];
  for (let i = offset; i < end; i++) parts.push((bytes[i] ?? 0).toString(16).padStart(2, '0'));
  return parts.join(' ');
}
