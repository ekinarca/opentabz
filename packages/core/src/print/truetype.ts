/**
 * TrueType fonts, as plain files or wrapped in WOFF 1.0 (zlib-compressed tables): what embedding
 * them in a PDF takes. That is, the glyph of a character, glyph advances, vertical metrics and a
 * subset of the font holding only the glyphs used (glyph ids unchanged, other glyphs emptied).
 */
import { unzlibSync } from 'fflate';

export class FontFormatError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'FontFormatError';
  }
}

export interface TrueTypeFont {
  readonly postScriptName: string;
  readonly unitsPerEm: number;
  /** Vertical metrics in font units (the descender is negative). */
  readonly ascender: number;
  readonly descender: number;
  readonly capHeight: number;
  readonly xHeight: number;
  /** Degrees, negative for fonts leaning right. */
  readonly italicAngle: number;
  readonly bold: boolean;
  readonly bbox: readonly [number, number, number, number];
  readonly glyphCount: number;
  /** The glyph drawing a code point, or 0 (the missing glyph). */
  glyphOf(codePoint: number): number;
  /** A glyph's advance width in font units. */
  advanceOf(glyph: number): number;
  /** A TrueType file with the outlines of only these glyphs (and the parts of composite glyphs). */
  subset(glyphs: Iterable<number>): Uint8Array;
}

export type Tables = Map<string, Uint8Array>;

export const tag = (bytes: Uint8Array, at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
export const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

export function sfntTables(bytes: Uint8Array): Tables {
  const data = view(bytes);
  const count = data.getUint16(4);
  const tables: Tables = new Map();
  for (let index = 0; index < count; index++) {
    const record = 12 + index * 16;
    const offset = data.getUint32(record + 8);
    const length = data.getUint32(record + 12);
    if (offset + length > bytes.length)
      throw new FontFormatError('A font table runs past the end of the file.');
    tables.set(tag(bytes, record), bytes.subarray(offset, offset + length));
  }
  return tables;
}

/** A WOFF 1.0 file's tables; PostScript-flavoured ones only if asked (they cannot be embedded). */
export function woffTables(bytes: Uint8Array, postScript = false): Tables {
  const data = view(bytes);
  if (tag(bytes, 4) === 'OTTO' && !postScript)
    throw new FontFormatError('PostScript-flavoured fonts are not supported.');
  const count = data.getUint16(12);
  const tables: Tables = new Map();
  for (let index = 0; index < count; index++) {
    const entry = 44 + index * 20;
    const offset = data.getUint32(entry + 4);
    const compressed = data.getUint32(entry + 8);
    const original = data.getUint32(entry + 12);
    const stored = bytes.subarray(offset, offset + compressed);
    const table = compressed < original ? unzlibSync(stored) : stored;
    if (table.length !== original) throw new FontFormatError('A WOFF table has the wrong size.');
    tables.set(tag(bytes, entry), table);
  }
  return tables;
}

export function required(tables: Tables, name: string): Uint8Array {
  const table = tables.get(name);
  if (table === undefined) throw new FontFormatError(`The font has no ${name} table.`);
  return table;
}

/** The character-to-glyph map: Windows Unicode (full or BMP), else any Unicode subtable. */
export function readCmap(cmap: Uint8Array): (codePoint: number) => number {
  const data = view(cmap);
  const count = data.getUint16(2);
  let best: { offset: number; rank: number } | null = null;
  for (let index = 0; index < count; index++) {
    const platform = data.getUint16(4 + index * 8);
    const encoding = data.getUint16(6 + index * 8);
    const offset = data.getUint32(8 + index * 8);
    const format = data.getUint16(offset);
    const rank =
      platform === 3 && encoding === 10 && format === 12
        ? 4
        : platform === 0 && format === 12
          ? 3
          : platform === 3 && encoding === 1 && format === 4
            ? 2
            : platform === 0 && format === 4
              ? 1
              : 0;
    if (rank > 0 && (best === null || rank > best.rank)) best = { offset, rank };
  }
  if (best === null) throw new FontFormatError('The font maps no Unicode characters.');
  const at = best.offset;
  if (data.getUint16(at) === 12) {
    const groups = data.getUint32(at + 12);
    return codePoint => {
      let low = 0;
      let high = groups - 1;
      while (low <= high) {
        const middle = (low + high) >> 1;
        const group = at + 16 + middle * 12;
        const start = data.getUint32(group);
        const end = data.getUint32(group + 4);
        if (codePoint < start) high = middle - 1;
        else if (codePoint > end) low = middle + 1;
        else return data.getUint32(group + 8) + codePoint - start;
      }
      return 0;
    };
  }
  const segments = data.getUint16(at + 6) / 2;
  const ends = at + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const rangeOffsets = deltas + segments * 2;
  return codePoint => {
    if (codePoint > 0xffff) return 0;
    for (let segment = 0; segment < segments; segment++) {
      if (codePoint > data.getUint16(ends + segment * 2)) continue;
      const start = data.getUint16(starts + segment * 2);
      if (codePoint < start) return 0;
      const delta = data.getInt16(deltas + segment * 2);
      const rangeOffset = data.getUint16(rangeOffsets + segment * 2);
      if (rangeOffset === 0) return (codePoint + delta) & 0xffff;
      const glyphAt = rangeOffsets + segment * 2 + rangeOffset + (codePoint - start) * 2;
      const glyph = data.getUint16(glyphAt);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

function readPostScriptName(name: Uint8Array | undefined): string {
  if (name === undefined) return 'Font';
  const data = view(name);
  const count = data.getUint16(2);
  const strings = data.getUint16(4);
  for (let index = 0; index < count; index++) {
    const record = 6 + index * 12;
    if (data.getUint16(record + 6) !== 6) continue;
    const platform = data.getUint16(record);
    const length = data.getUint16(record + 8);
    const offset = strings + data.getUint16(record + 10);
    const bytes = name.subarray(offset, offset + length);
    const text =
      platform === 3 || platform === 0
        ? String.fromCharCode(
            ...Array.from(
              { length: length / 2 },
              (_, at) => (bytes[at * 2] ?? 0) * 256 + (bytes[at * 2 + 1] ?? 0),
            ),
          )
        : String.fromCharCode(...bytes);
    const clean = text.replace(/[^\x21-\x7e]/g, '').replace(/[()<>[\]{}/%]/g, '');
    if (clean.length > 0) return clean;
  }
  return 'Font';
}

const ARG_1_AND_2_ARE_WORDS = 0x0001;
const WE_HAVE_A_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;

/** Tables a TrueType font embedded in a PDF needs (ISO 32000 9.9). */
const EMBEDDED_TABLES = ['cvt ', 'fpgm', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'prep'];

function checksum(bytes: Uint8Array): number {
  const padded = new Uint8Array((bytes.length + 3) & ~3);
  padded.set(bytes);
  const data = view(padded);
  let sum = 0;
  for (let at = 0; at < padded.length; at += 4) sum = (sum + data.getUint32(at)) >>> 0;
  return sum;
}

/** Reads a TrueType font from a .ttf file or a WOFF 1.0 file. */
export function readTrueType(bytes: Uint8Array): TrueTypeFont {
  if (bytes.length < 12) throw new FontFormatError('The font file is too short.');
  const signature = tag(bytes, 0);
  let tables: Tables;
  if (signature === 'wOFF') tables = woffTables(bytes);
  else if (signature === '\0\x01\0\0' || signature === 'true') tables = sfntTables(bytes);
  else if (signature === 'OTTO') throw new FontFormatError('PostScript-flavoured fonts are not supported.');
  else throw new FontFormatError('This is not a TrueType or WOFF font.');

  const head = view(required(tables, 'head'));
  const hhea = view(required(tables, 'hhea'));
  const maxp = view(required(tables, 'maxp'));
  const hmtx = view(required(tables, 'hmtx'));
  const loca = view(required(tables, 'loca'));
  const glyf = required(tables, 'glyf');
  const os2 = tables.get('OS/2');
  const post = tables.get('post');

  const unitsPerEm = head.getUint16(18);
  const longOffsets = head.getInt16(50) === 1;
  const glyphCount = maxp.getUint16(4);
  const metrics = hhea.getUint16(34);
  // Subsets made for PDFs carry no character map: their glyphs are named by id.
  const cmap = tables.get('cmap');
  const glyphOf = cmap === undefined ? () => 0 : readCmap(cmap);
  const ascender = hhea.getInt16(4);
  const descender = hhea.getInt16(6);
  const os2View = os2 === undefined ? null : view(os2);
  const os2Version = os2View?.getUint16(0) ?? 0;
  const xHeight = os2View !== null && os2Version >= 2 ? os2View.getInt16(86) : Math.round(ascender / 2);
  const capHeight = os2View !== null && os2Version >= 2 ? os2View.getInt16(88) : ascender;
  const weight = os2View?.getUint16(4) ?? 400;

  const glyphRange = (glyph: number): [number, number] =>
    longOffsets
      ? [loca.getUint32(glyph * 4), loca.getUint32(glyph * 4 + 4)]
      : [loca.getUint16(glyph * 2) * 2, loca.getUint16(glyph * 2 + 2) * 2];

  /** The glyphs a composite glyph is made of. */
  const components = (glyph: number): number[] => {
    const [start, end] = glyphRange(glyph);
    if (end - start < 10) return [];
    const data = view(glyf.subarray(start, end));
    if (data.getInt16(0) >= 0) return [];
    const parts: number[] = [];
    let at = 10;
    for (;;) {
      const flags = data.getUint16(at);
      parts.push(data.getUint16(at + 2));
      at += 4 + (flags & ARG_1_AND_2_ARE_WORDS ? 4 : 2);
      if (flags & WE_HAVE_A_SCALE) at += 2;
      else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) at += 4;
      else if (flags & WE_HAVE_A_TWO_BY_TWO) at += 8;
      if (!(flags & MORE_COMPONENTS) || at + 4 > data.byteLength) return parts;
    }
  };

  return {
    postScriptName: readPostScriptName(tables.get('name')),
    unitsPerEm,
    ascender,
    descender,
    capHeight,
    xHeight,
    italicAngle: post === undefined ? 0 : view(post).getInt32(4) / 65536,
    bold: weight >= 600,
    bbox: [head.getInt16(36), head.getInt16(38), head.getInt16(40), head.getInt16(42)],
    glyphCount,
    glyphOf: codePoint => {
      const glyph = glyphOf(codePoint);
      return glyph < glyphCount ? glyph : 0;
    },
    advanceOf: glyph => hmtx.getUint16(Math.min(glyph, metrics - 1) * 4),
    subset: glyphs => {
      const keep = new Set<number>([0]);
      const pending = [...glyphs];
      for (let glyph = pending.pop(); glyph !== undefined; glyph = pending.pop()) {
        if (glyph >= glyphCount || keep.has(glyph)) continue;
        keep.add(glyph);
        pending.push(...components(glyph));
      }
      // Outlines of the kept glyphs only; every glyph keeps its id.
      const offsets = new Uint32Array(glyphCount + 1);
      let size = 0;
      for (let glyph = 0; glyph < glyphCount; glyph++) {
        offsets[glyph] = size;
        if (keep.has(glyph)) {
          const [start, end] = glyphRange(glyph);
          size += (end - start + 3) & ~3;
        }
      }
      offsets[glyphCount] = size;
      const newGlyf = new Uint8Array(size);
      for (const glyph of keep) {
        const [start, end] = glyphRange(glyph);
        newGlyf.set(glyf.subarray(start, end), offsets[glyph] ?? 0);
      }
      const newLoca = new Uint8Array((glyphCount + 1) * 4);
      const locaView = view(newLoca);
      offsets.forEach((offset, index) => {
        locaView.setUint32(index * 4, offset);
      });
      const newHead = required(tables, 'head').slice();
      const headView = view(newHead);
      headView.setInt16(50, 1);
      headView.setUint32(8, 0);

      const out = new Map<string, Uint8Array>();
      for (const name of EMBEDDED_TABLES) {
        const table =
          name === 'glyf'
            ? newGlyf
            : name === 'loca'
              ? newLoca
              : name === 'head'
                ? newHead
                : tables.get(name);
        if (table !== undefined) out.set(name, table);
      }
      return writeSfnt(out);
    },
  };
}

/** Tables written out as a TrueType file, with checksums. */
function writeSfnt(tables: Map<string, Uint8Array>): Uint8Array {
  const names = [...tables.keys()].sort();
  const count = names.length;
  let offset = 12 + count * 16;
  const placed = names.map(name => {
    const table = tables.get(name) ?? new Uint8Array();
    const at = offset;
    offset += (table.length + 3) & ~3;
    return { name, table, at };
  });
  const file = new Uint8Array(offset);
  const data = view(file);
  const power = 2 ** Math.floor(Math.log2(count));
  data.setUint32(0, 0x00010000);
  data.setUint16(4, count);
  data.setUint16(6, power * 16);
  data.setUint16(8, Math.log2(power));
  data.setUint16(10, count * 16 - power * 16);
  placed.forEach(({ name, table, at }, index) => {
    const record = 12 + index * 16;
    for (let char = 0; char < 4; char++) data.setUint8(record + char, name.charCodeAt(char));
    data.setUint32(record + 4, checksum(table));
    data.setUint32(record + 8, at);
    data.setUint32(record + 12, table.length);
    file.set(table, at);
  });
  const head = placed.find(({ name }) => name === 'head');
  if (head !== undefined) data.setUint32(head.at + 8, (0xb1b0afba - checksum(file)) >>> 0);
  return file;
}
