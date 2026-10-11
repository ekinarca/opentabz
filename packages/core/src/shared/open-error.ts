import type { FormatId } from './formats.ts';

/**
 * Closed set of reasons a file can fail to open. Each maps to a specific explanation in the UI
 * (apps/web/src/strings.ts); nothing is reported as a generic failure.
 */
export const OPEN_ERROR_CODES = [
  /** Zero bytes. */
  'empty',
  /** Larger than the size OpenTabz accepts. */
  'too-large',
  /** No known signature: not a score file or not a format we know. */
  'unrecognized',
  /** A recognized format that this version of OpenTabz cannot open. */
  'not-supported',
  /** A recognized format in a version OpenTabz cannot read (e.g. Guitar Pro 1–2). */
  'unsupported-version',
  /** The file ends before its structure is complete. */
  'truncated',
  /** The structure is invalid (bad container, malformed XML, impossible values). */
  'corrupt',
  /** Reading took longer than the watchdog allows. */
  'timeout',
  /** The browser could not read the file from disk. */
  'read-failed',
  /** Downloading a file from a URL failed. */
  'network',
  /** An unexpected internal error (a bug in OpenTabz or its engine). */
  'internal',
] as const;

export type OpenErrorCode = (typeof OPEN_ERROR_CODES)[number];

export interface OpenError {
  readonly code: OpenErrorCode;
  readonly fileName: string;
  readonly byteLength: number;
  /** Format detected by content, when known. */
  readonly format: FormatId | null;
  /** Format version detected by content, e.g. "5.10", "8.1.3" or "4.0". */
  readonly formatVersion: string | null;
  /** True when the extension of `fileName` does not match the detected format. */
  readonly extensionMismatch: boolean;
  /** Byte offset (or line number for text formats) at which reading failed, when known. */
  readonly position: number | null;
  /** Technical detail for bug reports. Not localized; shown under "Technical details". */
  readonly detail: string;
}

export function isOpenError(value: unknown): value is OpenError {
  if (typeof value !== 'object' || value === null) return false;
  const code = (value as { code?: unknown }).code;
  return typeof code === 'string' && (OPEN_ERROR_CODES as readonly string[]).includes(code);
}
