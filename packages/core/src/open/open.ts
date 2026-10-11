/**
 * The open pipeline: sniff by content → pick the matching importer → map every failure to a
 * typed `OpenError`. Runs in the engine worker (and in Node for tests).
 */
import * as alphaTab from '@coderline/alphatab';
import { zipSync } from 'fflate';
import { sniffFormat, type SniffResult } from '../formats/sniff.ts';
import {
  extensionMatches,
  extensionOf,
  FORMAT_EXTENSIONS,
  isOpenable,
  type FormatId,
} from '../shared/formats.ts';
import type { OpenError, OpenErrorCode } from '../shared/open-error.ts';
import { StrictReader } from './reader.ts';

/** Largest file OpenTabz accepts (Guitar Pro 8 files with embedded audio can be large). */
export const MAX_FILE_BYTES = 256 * 1024 * 1024;

export interface OpenedScore {
  readonly score: alphaTab.model.Score;
  readonly format: FormatId;
  readonly formatVersion: string | null;
  /** The file's extension belongs to a different format than its content. */
  readonly extensionMismatch: boolean;
  /**
   * The file ended early but the importer recovered: everything readable was opened and some
   * trailing content may be missing.
   */
  readonly truncated: boolean;
  readonly sniff: SniffResult;
}

/** Error carrying a typed `OpenError`; the only error `openScore` throws. */
export class OpenFailure extends Error {
  public readonly error: OpenError;

  public constructor(error: OpenError) {
    super(`${error.code}: ${error.detail}`);
    this.name = 'OpenFailure';
    this.error = error;
  }
}

const IMPORTER_NAMES: Partial<Record<FormatId, string>> = {
  gp3: 'Guitar Pro 3-5',
  gp4: 'Guitar Pro 3-5',
  gp5: 'Guitar Pro 3-5',
  gpx: 'Guitar Pro 6',
  gp: 'Guitar Pro 7-8',
  gpif: 'Guitar Pro 7-8',
  musicxml: 'MusicXML',
  mxl: 'MusicXML',
  capella: 'Capella',
};

const UNSUPPORTED_VERSION_FORMATS: ReadonlySet<FormatId> = new Set<FormatId>(['gp-legacy', 'gp-clipboard']);

const UNRECOGNIZED_FORMATS: ReadonlySet<FormatId> = new Set<FormatId>(['unknown', 'text']);

/**
 * Opens a score from raw bytes. Throws `OpenFailure` for every problem; never returns a partial
 * score silently.
 */
export interface OpenOptions {
  /** Text encoding for Guitar Pro 3–5 strings; detected automatically when omitted. */
  readonly encoding?: string;
}

/** Guitar Pro 3–5 ran on Windows and stored strings in the ANSI code page. */
const LEGACY_GUITAR_PRO_ENCODING = 'windows-1252';

export function openScore(
  bytes: Uint8Array,
  fileName: string,
  options: OpenOptions = {},
  settings = createImportSettings(),
): OpenedScore {
  const base = { fileName, byteLength: bytes.length };
  if (bytes.length === 0) {
    throw failure({ ...base, code: 'empty', detail: 'The file contains no data.' });
  }
  if (bytes.length > MAX_FILE_BYTES) {
    throw failure({
      ...base,
      code: 'too-large',
      detail: `The file is ${bytes.length} bytes; the limit is ${MAX_FILE_BYTES}.`,
    });
  }

  const sniff = sniffFormat(bytes);
  const known = {
    ...base,
    format: sniff.format,
    formatVersion: sniff.version,
    extensionMismatch: mismatch(sniff.format, fileName),
  };

  if (!isOpenable(sniff.format)) {
    const code: OpenErrorCode = UNSUPPORTED_VERSION_FORMATS.has(sniff.format)
      ? 'unsupported-version'
      : UNRECOGNIZED_FORMATS.has(sniff.format)
        ? 'unrecognized'
        : 'not-supported';
    throw failure({ ...known, code, detail: `Detected ${sniff.evidence}.` });
  }
  if (sniff.problem?.kind === 'truncated') {
    throw failure({
      ...known,
      code: 'truncated',
      position: sniff.problem.offset,
      detail: sniff.problem.detail,
    });
  }

  const source = sniff.payload ?? bytes;
  const importSource = sniff.format === 'gpif' ? wrapGpif(source) : source;
  const legacyBinary = sniff.format === 'gp3' || sniff.format === 'gp4' || sniff.format === 'gp5';
  if (legacyBinary) settings.importer.encoding = options.encoding ?? LEGACY_GUITAR_PRO_ENCODING;
  let reader = new StrictReader(importSource);
  let score: alphaTab.model.Score;
  try {
    score =
      sniff.format === 'alphatex'
        ? importAlphaTex(source, settings)
        : importBinary(sniff.format, reader, settings);
    // Guitar Pro 3–5 strings carry no encoding. Most files use the Windows code page; a file
    // written as UTF-8 shows tell-tale mojibake and is read again as UTF-8.
    if (legacyBinary && options.encoding === undefined && looksLikeUtf8Mojibake(scoreText(score))) {
      settings.importer.encoding = 'utf-8';
      reader = new StrictReader(importSource);
      score = importBinary(sniff.format, reader, settings);
    }
  } catch (error) {
    if (error instanceof OpenFailure) throw error;
    throw failure({ ...known, ...describeImportError(error, reader, sniff) });
  }

  if (score.tracks.length === 0 || score.masterBars.length === 0) {
    throw failure({
      ...known,
      code: 'corrupt',
      detail: `The ${sniff.evidence} contains ${score.tracks.length} tracks and ${score.masterBars.length} bars.`,
    });
  }

  return {
    score,
    format: sniff.format,
    formatVersion: sniff.version,
    extensionMismatch: known.extensionMismatch,
    truncated: reader.readPastEnd,
    sniff,
  };
}

/** Text a person reads in the score: header fields, track names, beat texts, lyrics and sections. */
function scoreText(score: alphaTab.model.Score): string {
  const parts: string[] = [
    score.title,
    score.subTitle,
    score.artist,
    score.album,
    score.words,
    score.music,
    score.copyright,
    score.tab,
    score.instructions,
    score.notices,
  ];
  for (const master of score.masterBars) if (master.section) parts.push(master.section.text);
  for (const track of score.tracks) {
    parts.push(track.name, track.shortName);
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (beat.text) parts.push(beat.text);
            for (const lyric of beat.lyrics ?? []) parts.push(lyric);
          }
        }
      }
    }
  }
  return parts.join('\n').slice(0, 64 * 1024);
}

/** UTF-8 bytes read as Windows-1252 turn "é" into "Ã©", "’" into "â€™" and so on. */
export function looksLikeUtf8Mojibake(text: string): boolean {
  return /[\u00C3\u00C2][\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]|\u00E2\u20AC/.test(
    text,
  );
}

/** Importer settings used for every document (encoding defaults match Guitar Pro). */
export function createImportSettings(): alphaTab.Settings {
  return new alphaTab.Settings();
}

function importBinary(
  format: FormatId,
  reader: StrictReader,
  settings: alphaTab.Settings,
): alphaTab.model.Score {
  const name = IMPORTER_NAMES[format];
  const importer = alphaTab.Environment.buildImporters().find(candidate => candidate.name === name);
  if (importer === undefined) {
    throw new Error(`No alphaTab importer named "${name ?? format}" is available.`);
  }
  importer.init(reader, settings);
  return importer.readScore();
}

function importAlphaTex(bytes: Uint8Array, settings: alphaTab.Settings): alphaTab.model.Score {
  // TextDecoder drops a leading byte order mark.
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.logErrors = false;
  importer.initFromString(text, settings);
  return importer.readScore();
}

/** A bare `score.gpif` (extracted from a .gp archive) is re-wrapped so the GP7–8 importer can read it. */
function wrapGpif(bytes: Uint8Array): Uint8Array {
  return zipSync({ 'Content/score.gpif': bytes }, { level: 0 });
}

function describeImportError(
  thrown: unknown,
  reader: StrictReader,
  sniff: SniffResult,
): Pick<OpenError, 'code' | 'detail' | 'position'> {
  // alphaTab wraps the interesting error as the cause of a generic one; look through the chain.
  const error = causeChain(thrown).find(isSpecificImportError) ?? thrown;
  if (error instanceof alphaTab.io.EndOfReaderError) {
    return {
      code: 'truncated',
      position: reader.length,
      detail: `The ${sniff.evidence} ends after ${reader.length} bytes while more data was expected.`,
    };
  }
  if (error instanceof alphaTab.importer.AlphaTexErrorWithDiagnostics) {
    const first = firstDiagnostic(error);
    return {
      code: 'corrupt',
      position: first?.start?.line ?? null,
      detail: first
        ? `alphaTex error AT${first.code} at line ${first.start?.line ?? '?'}, column ${first.start?.col ?? '?'}: ${first.message}`
        : error.message,
    };
  }
  if (error instanceof alphaTab.io.OverflowError) {
    return {
      code: 'corrupt',
      position: reader.furthestPosition,
      detail: `${sniff.evidence}: ${error.message}`,
    };
  }
  const message = causeChain(thrown).map(errorMessage).join(' ← ');
  const sniffProblem = sniff.problem ? ` ${sniff.problem.detail}` : '';
  // A parser that runs off the end of a damaged container reports odd errors; treat a read that
  // reached the very end as truncation.
  if (reader.length > 0 && reader.furthestPosition >= reader.length && sniff.format !== 'alphatex') {
    return {
      code: 'truncated',
      position: reader.length,
      detail: `The ${sniff.evidence} ends unexpectedly (${message}).${sniffProblem}`,
    };
  }
  return {
    code: 'corrupt',
    position: reader.furthestPosition > 0 ? reader.furthestPosition : null,
    detail: `Reading the ${sniff.evidence} failed: ${message}.${sniffProblem}`,
  };
}

function firstDiagnostic(
  error: alphaTab.importer.AlphaTexErrorWithDiagnostics,
): alphaTab.importer.alphaTex.AlphaTexDiagnostic | null {
  for (const diagnostic of error.iterateDiagnostics()) {
    if (diagnostic.severity === alphaTab.importer.alphaTex.AlphaTexDiagnosticsSeverity.Error)
      return diagnostic;
  }
  for (const diagnostic of error.iterateDiagnostics()) return diagnostic;
  return null;
}

function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  while (current !== undefined && current !== null && chain.length < 8 && !chain.includes(current)) {
    chain.push(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

function isSpecificImportError(error: unknown): boolean {
  return (
    error instanceof alphaTab.io.EndOfReaderError ||
    error instanceof alphaTab.io.OverflowError ||
    error instanceof alphaTab.importer.AlphaTexErrorWithDiagnostics
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function mismatch(format: FormatId, fileName: string): boolean {
  const extension = extensionOf(fileName);
  if (extension === null) return false;
  if (extensionMatches(format, fileName)) return false;
  // Only report a mismatch when the extension claims another known format.
  return Object.values(FORMAT_EXTENSIONS).some(list => list.includes(extension));
}

function failure(
  error: Omit<OpenError, 'format' | 'formatVersion' | 'extensionMismatch' | 'position'> & Partial<OpenError>,
): OpenFailure {
  return new OpenFailure({
    format: null,
    formatVersion: null,
    extensionMismatch: false,
    position: null,
    ...error,
  });
}
