/**
 * Minimal, defensive ZIP directory reader used for format sniffing.
 *
 * It lists entry names without decompressing anything, reads the central directory when the
 * archive is intact and falls back to walking local file headers when the end of the archive is
 * missing, so a truncated Guitar Pro 7/8 file can still be identified (and reported as truncated).
 */
import { Inflate } from 'fflate';

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;

export const ZIP_METHOD_STORED = 0;
export const ZIP_METHOD_DEFLATE = 8;

export interface ZipEntry {
  readonly name: string;
  readonly method: number;
  readonly flags: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
}

export interface ZipDirectory {
  readonly entries: readonly ZipEntry[];
  /** True when the central directory was found and every entry lies inside the file. */
  readonly complete: boolean;
  /** First structural problem found, when not complete. */
  readonly problem: ZipProblem | null;
}

export interface ZipProblem {
  readonly kind: 'truncated' | 'corrupt';
  readonly detail: string;
  readonly offset: number | null;
}

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && readU32(bytes, 0) === LOCAL_FILE_HEADER;
}

/** Whether the bytes are an empty ZIP archive (only an end-of-central-directory record). */
export function isEmptyZip(bytes: Uint8Array): boolean {
  return bytes.length >= EOCD_MIN_SIZE && readU32(bytes, 0) === END_OF_CENTRAL_DIRECTORY;
}

export function readZipDirectory(bytes: Uint8Array): ZipDirectory {
  const eocd = findEndOfCentralDirectory(bytes);
  if (eocd !== null) {
    const central = readCentralDirectory(bytes, eocd);
    if (central.problem === null) return central;
    // A damaged central directory: the local headers may still tell us what the archive holds.
    const local = walkLocalHeaders(bytes);
    return {
      entries: local.entries.length > 0 ? local.entries : central.entries,
      complete: false,
      problem: central.problem,
    };
  }
  const local = walkLocalHeaders(bytes);
  return {
    entries: local.entries,
    complete: false,
    problem: local.problem ?? {
      kind: 'truncated',
      detail: 'The ZIP end-of-central-directory record is missing.',
      offset: bytes.length,
    },
  };
}

/**
 * Inflates at most `maxBytes` of an entry's content. Returns `null` when the entry's data is not
 * available (truncated archive) or uses an unsupported compression method.
 */
export function readZipEntryPrefix(bytes: Uint8Array, entry: ZipEntry, maxBytes: number): Uint8Array | null {
  const dataStart = localDataStart(bytes, entry.localHeaderOffset);
  if (dataStart === null) return null;
  const available = Math.min(entry.compressedSize, bytes.length - dataStart);
  if (available <= 0) return null;
  const compressed = bytes.subarray(dataStart, dataStart + available);

  if (entry.method === ZIP_METHOD_STORED) return compressed.slice(0, maxBytes);
  if (entry.method !== ZIP_METHOD_DEFLATE) return null;

  const chunks: Uint8Array[] = [];
  let produced = 0;
  const inflate = new Inflate(chunk => {
    chunks.push(chunk);
    produced += chunk.length;
  });
  const step = 1024;
  try {
    for (let offset = 0; offset < compressed.length && produced < maxBytes; offset += step) {
      const end = Math.min(offset + step, compressed.length);
      inflate.push(compressed.subarray(offset, end), end === compressed.length);
    }
  } catch {
    if (produced === 0) return null;
  }
  const out = new Uint8Array(Math.min(produced, maxBytes));
  let written = 0;
  for (const chunk of chunks) {
    if (written >= out.length) break;
    const take = Math.min(chunk.length, out.length - written);
    out.set(chunk.subarray(0, take), written);
    written += take;
  }
  return out;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number | null {
  const lowest = Math.max(0, bytes.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  for (let offset = bytes.length - EOCD_MIN_SIZE; offset >= lowest; offset--) {
    if (readU32(bytes, offset) === END_OF_CENTRAL_DIRECTORY) {
      const commentLength = readU16(bytes, offset + 20);
      if (offset + EOCD_MIN_SIZE + commentLength <= bytes.length) return offset;
    }
  }
  return null;
}

function readCentralDirectory(bytes: Uint8Array, eocd: number): ZipDirectory {
  const entryCount = readU16(bytes, eocd + 10);
  const size = readU32(bytes, eocd + 12);
  const start = readU32(bytes, eocd + 16);
  if (entryCount === 0xffff || size === 0xffffffff || start === 0xffffffff) {
    return {
      entries: [],
      complete: false,
      problem: { kind: 'corrupt', detail: 'ZIP64 archives are not used by score formats.', offset: eocd },
    };
  }
  if (start + size > eocd) {
    return {
      entries: [],
      complete: false,
      problem: {
        kind: 'truncated',
        detail: `The ZIP central directory (offset ${start}, ${size} bytes) lies outside the file.`,
        offset: start,
      },
    };
  }

  const entries: ZipEntry[] = [];
  let offset = start;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > bytes.length || readU32(bytes, offset) !== CENTRAL_DIRECTORY_HEADER) {
      return {
        entries,
        complete: false,
        problem: { kind: 'corrupt', detail: `ZIP central directory entry ${index} is damaged.`, offset },
      };
    }
    const nameLength = readU16(bytes, offset + 28);
    const extraLength = readU16(bytes, offset + 30);
    const commentLength = readU16(bytes, offset + 32);
    const entry: ZipEntry = {
      flags: readU16(bytes, offset + 8),
      method: readU16(bytes, offset + 10),
      compressedSize: readU32(bytes, offset + 20),
      uncompressedSize: readU32(bytes, offset + 24),
      localHeaderOffset: readU32(bytes, offset + 42),
      name: decodeName(bytes.subarray(offset + 46, offset + 46 + nameLength)),
    };
    entries.push(entry);
    const dataStart = localDataStart(bytes, entry.localHeaderOffset);
    if (dataStart === null || dataStart + entry.compressedSize > bytes.length) {
      return {
        entries,
        complete: false,
        problem: {
          kind: 'truncated',
          detail: `The data of ZIP entry "${entry.name}" extends beyond the end of the file.`,
          offset: entry.localHeaderOffset,
        },
      };
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { entries, complete: true, problem: null };
}

function walkLocalHeaders(bytes: Uint8Array): { entries: ZipEntry[]; problem: ZipProblem | null } {
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset + 30 <= bytes.length && readU32(bytes, offset) === LOCAL_FILE_HEADER) {
    const flags = readU16(bytes, offset + 6);
    const nameLength = readU16(bytes, offset + 26);
    const extraLength = readU16(bytes, offset + 28);
    const entry: ZipEntry = {
      flags,
      method: readU16(bytes, offset + 8),
      compressedSize: readU32(bytes, offset + 18),
      uncompressedSize: readU32(bytes, offset + 22),
      localHeaderOffset: offset,
      name: decodeName(bytes.subarray(offset + 30, Math.min(bytes.length, offset + 30 + nameLength))),
    };
    entries.push(entry);
    const dataStart = offset + 30 + nameLength + extraLength;
    if ((flags & 0x08) !== 0) {
      // Bit 3: sizes follow the data in a descriptor. Scan for the next header instead.
      const next = findNextHeader(bytes, dataStart);
      if (next < 0) {
        return {
          entries,
          problem: {
            kind: 'truncated',
            detail: `The file ends inside ZIP entry "${entry.name}".`,
            offset: bytes.length,
          },
        };
      }
      offset = next;
      continue;
    }
    const next = dataStart + entry.compressedSize;
    if (next > bytes.length) {
      return {
        entries,
        problem: {
          kind: 'truncated',
          detail: `The file ends inside ZIP entry "${entry.name}".`,
          offset: bytes.length,
        },
      };
    }
    offset = next;
  }
  return { entries, problem: null };
}

/** Offset of the next local file header or central directory header at or after `from`, or -1. */
function findNextHeader(bytes: Uint8Array, from: number): number {
  for (let offset = from; offset + 4 <= bytes.length; offset++) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b) continue;
    const signature = readU32(bytes, offset);
    if (signature === LOCAL_FILE_HEADER || signature === CENTRAL_DIRECTORY_HEADER) return offset;
  }
  return -1;
}

function localDataStart(bytes: Uint8Array, localHeaderOffset: number): number | null {
  if (localHeaderOffset + 30 > bytes.length || readU32(bytes, localHeaderOffset) !== LOCAL_FILE_HEADER)
    return null;
  const nameLength = readU16(bytes, localHeaderOffset + 26);
  const extraLength = readU16(bytes, localHeaderOffset + 28);
  return localHeaderOffset + 30 + nameLength + extraLength;
}

function decodeName(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function readU16(bytes: Uint8Array, offset: number): number {
  if (offset + 2 > bytes.length) return -1;
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) return -1;
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}
