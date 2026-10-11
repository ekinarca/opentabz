/**
 * The outlines of a font's glyphs as SVG path data, in 1000 units per em with y up (as the music
 * glyph table keeps Bravura's), from an OpenType font with PostScript (CFF) or TrueType outlines,
 * plain or in WOFF 1.0: what exports draw a music font other than Bravura with (REND-241).
 */
import type { MusicGlyph } from './glyphs.ts';
import {
  FontFormatError,
  readCmap,
  required,
  sfntTables,
  tag,
  view,
  woffTables,
  type Tables,
} from './truetype.ts';

/** The units the outlines are given in, whatever the font's own. */
export const OUTLINE_UNITS_PER_EM = 1000;

export interface FontOutlines {
  /** The glyph a code point is drawn with, or undefined where the font has none. */
  glyph(codePoint: number): MusicGlyph | undefined;
}

/** Reads a font's outlines from an .otf or .ttf file, or a WOFF 1.0 file. */
export function readOutlines(bytes: Uint8Array): FontOutlines {
  if (bytes.length < 12) throw new FontFormatError('The font file is too short.');
  const signature = tag(bytes, 0);
  let tables: Tables;
  if (signature === 'wOFF') tables = woffTables(bytes, true);
  else if (signature === 'OTTO' || signature === '\0\x01\0\0' || signature === 'true')
    tables = sfntTables(bytes);
  else if (signature === 'wOF2')
    throw new FontFormatError('WOFF 2 fonts are not supported: use the .otf or .ttf.');
  else throw new FontFormatError('This is not an OpenType, TrueType or WOFF font.');

  const head = view(required(tables, 'head'));
  const hhea = view(required(tables, 'hhea'));
  const maxp = view(required(tables, 'maxp'));
  const hmtx = view(required(tables, 'hmtx'));
  const unitsPerEm = head.getUint16(18);
  if (unitsPerEm === 0) throw new FontFormatError('The font has no units per em.');
  const glyphCount = maxp.getUint16(4);
  const metrics = hhea.getUint16(34);
  const glyphOf = readCmap(required(tables, 'cmap'));
  const advanceOf = (glyph: number) => hmtx.getUint16(Math.min(glyph, metrics - 1) * 4);
  const scale = OUTLINE_UNITS_PER_EM / unitsPerEm;

  const cff = tables.get('CFF ');
  const outline: (glyph: number) => string =
    cff === undefined
      ? glyfOutlines(required(tables, 'glyf'), required(tables, 'loca'), head.getInt16(50) === 1, scale)
      : cffOutlines(cff, scale);
  const cache = new Map<number, MusicGlyph | undefined>();
  return {
    glyph(codePoint) {
      if (cache.has(codePoint)) return cache.get(codePoint);
      const glyph = glyphOf(codePoint);
      const found =
        glyph === 0 || glyph >= glyphCount
          ? undefined
          : { advance: advanceOf(glyph) * scale, d: outline(glyph) };
      cache.set(codePoint, found);
      return found;
    },
  };
}

/** Writes path commands with coordinates rounded to hundredths. */
class PathWriter {
  private readonly parts: string[] = [];
  private open = false;

  public constructor(private readonly scale: number) {}

  private n(value: number): string {
    return String(Math.round(value * this.scale * 100) / 100);
  }

  public move(x: number, y: number): void {
    this.close();
    this.parts.push(`M${this.n(x)} ${this.n(y)}`);
    this.open = true;
  }

  public line(x: number, y: number): void {
    this.parts.push(`L${this.n(x)} ${this.n(y)}`);
  }

  public curve(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    this.parts.push(`C${this.n(x1)} ${this.n(y1)} ${this.n(x2)} ${this.n(y2)} ${this.n(x)} ${this.n(y)}`);
  }

  public quad(x1: number, y1: number, x: number, y: number): void {
    this.parts.push(`Q${this.n(x1)} ${this.n(y1)} ${this.n(x)} ${this.n(y)}`);
  }

  public close(): void {
    if (this.open) this.parts.push('Z');
    this.open = false;
  }

  public toString(): string {
    this.close();
    return this.parts.join('');
  }
}

// --- CFF (Type 2 charstrings) ------------------------------------------------------------------

interface Index {
  readonly count: number;
  item(index: number): Uint8Array;
  /** Where the INDEX ends. */
  readonly end: number;
}

function readIndex(bytes: Uint8Array, at: number): Index {
  const data = view(bytes);
  const count = data.getUint16(at);
  if (count === 0) return { count, item: () => new Uint8Array(0), end: at + 2 };
  const offSize = bytes[at + 2] ?? 0;
  if (offSize < 1 || offSize > 4) throw new FontFormatError('A CFF INDEX has a bad offset size.');
  const offset = (index: number) => {
    let value = 0;
    for (let byte = 0; byte < offSize; byte++)
      value = value * 256 + (bytes[at + 3 + index * offSize + byte] ?? 0);
    return value;
  };
  // Offsets count from 1, from the byte before the data.
  const base = at + 3 + (count + 1) * offSize - 1;
  return {
    count,
    item: index => bytes.subarray(base + offset(index), base + offset(index + 1)),
    end: base + offset(count),
  };
}

/** A DICT's operators and their operands; two-byte operators are 1200 + their second byte. */
function readDict(bytes: Uint8Array): Map<number, number[]> {
  const dict = new Map<number, number[]>();
  let operands: number[] = [];
  let at = 0;
  while (at < bytes.length) {
    const b0 = bytes[at] ?? 0;
    if (b0 <= 21) {
      let operator = b0;
      at++;
      if (b0 === 12) {
        operator = 1200 + (bytes[at] ?? 0);
        at++;
      }
      dict.set(operator, operands);
      operands = [];
    } else if (b0 === 28) {
      operands.push((((bytes[at + 1] ?? 0) << 24) >> 16) | (bytes[at + 2] ?? 0));
      at += 3;
    } else if (b0 === 29) {
      operands.push(view(bytes).getInt32(at + 1));
      at += 5;
    } else if (b0 === 30) {
      // A real number in nibbles, ending with 0xf.
      let text = '';
      at++;
      for (let done = false; !done && at < bytes.length; at++) {
        const byte = bytes[at] ?? 0xff;
        for (const nibble of [byte >> 4, byte & 0xf]) {
          if (nibble === 0xf) {
            done = true;
            break;
          }
          text += ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', '', '-'][nibble] ?? '';
        }
      }
      operands.push(Number(text));
    } else if (b0 >= 32 && b0 <= 246) {
      operands.push(b0 - 139);
      at++;
    } else if (b0 >= 247 && b0 <= 250) {
      operands.push((b0 - 247) * 256 + (bytes[at + 1] ?? 0) + 108);
      at += 2;
    } else if (b0 >= 251 && b0 <= 254) {
      operands.push(-(b0 - 251) * 256 - (bytes[at + 1] ?? 0) - 108);
      at += 2;
    } else {
      throw new FontFormatError('A CFF DICT holds an unknown value.');
    }
  }
  return dict;
}

const CHARSTRINGS = 17;
const PRIVATE = 18;
const SUBRS = 19;
const FD_ARRAY = 1236;
const FD_SELECT = 1237;

/** The bias added to a subroutine's number (Type 2 charstrings). */
function bias(subrs: Index): number {
  return subrs.count < 1240 ? 107 : subrs.count < 33900 ? 1131 : 32768;
}

function cffOutlines(cff: Uint8Array, scale: number): (glyph: number) => string {
  const headerSize = cff[2] ?? 4;
  const names = readIndex(cff, headerSize);
  const topDicts = readIndex(cff, names.end);
  const strings = readIndex(cff, topDicts.end);
  const globalSubrs = readIndex(cff, strings.end);
  const top = readDict(topDicts.item(0));
  const charStringsAt = top.get(CHARSTRINGS)?.[0];
  if (charStringsAt === undefined) throw new FontFormatError('The CFF font has no charstrings.');
  const charStrings = readIndex(cff, charStringsAt);

  /** A Private DICT's local subroutines. */
  const localSubrs = (privateDict: readonly number[] | undefined): Index => {
    const [size, offset] = privateDict ?? [];
    if (size === undefined || offset === undefined) return readIndex(new Uint8Array(2), 0);
    const dict = readDict(cff.subarray(offset, offset + size));
    const subrs = dict.get(SUBRS)?.[0];
    return subrs === undefined ? readIndex(new Uint8Array(2), 0) : readIndex(cff, offset + subrs);
  };

  // CID-keyed fonts choose a Private DICT (and its subroutines) per glyph.
  let subrsOf: (glyph: number) => Index;
  const fdArrayAt = top.get(FD_ARRAY)?.[0];
  const fdSelectAt = top.get(FD_SELECT)?.[0];
  if (fdArrayAt !== undefined && fdSelectAt !== undefined) {
    const fdArray = readIndex(cff, fdArrayAt);
    const fonts = Array.from({ length: fdArray.count }, (_, index) =>
      localSubrs(readDict(fdArray.item(index)).get(PRIVATE)),
    );
    const select = fdSelect(cff, fdSelectAt, charStrings.count);
    subrsOf = glyph => fonts[select(glyph)] ?? readIndex(new Uint8Array(2), 0);
  } else {
    const subrs = localSubrs(top.get(PRIVATE));
    subrsOf = () => subrs;
  }
  return glyph => charstringPath(charStrings.item(glyph), globalSubrs, subrsOf(glyph), scale);
}

function fdSelect(cff: Uint8Array, at: number, glyphs: number): (glyph: number) => number {
  const data = view(cff);
  const format = cff[at] ?? 0;
  if (format === 0) return glyph => cff[at + 1 + glyph] ?? 0;
  if (format === 3) {
    const ranges = data.getUint16(at + 1);
    return glyph => {
      for (let range = 0; range < ranges; range++) {
        const first = data.getUint16(at + 3 + range * 3);
        const next = range + 1 < ranges ? data.getUint16(at + 3 + (range + 1) * 3) : glyphs;
        if (glyph >= first && glyph < next) return cff[at + 5 + range * 3] ?? 0;
      }
      return 0;
    };
  }
  throw new FontFormatError('The CFF font selects its fonts in an unknown way.');
}

/** Draws a Type 2 charstring (Adobe Technical Note #5177). */
function charstringPath(code: Uint8Array, globalSubrs: Index, localSubrs: Index, scale: number): string {
  const path = new PathWriter(scale);
  const stack: number[] = [];
  let x = 0;
  let y = 0;
  let stems = 0;
  let widthTaken = false;
  let ended = false;

  // The first stack-clearing operator may carry the glyph's width first: it is not needed (the
  // advance comes from hmtx), only skipped.
  const takeWidth = (expected: number | 'even') => {
    if (widthTaken) return;
    widthTaken = true;
    const extra = expected === 'even' ? stack.length % 2 === 1 : stack.length > expected;
    if (extra) stack.shift();
  };
  const curveTo = (dx1: number, dy1: number, dx2: number, dy2: number, dx3: number, dy3: number) => {
    const x1 = x + dx1;
    const y1 = y + dy1;
    const x2 = x1 + dx2;
    const y2 = y1 + dy2;
    x = x2 + dx3;
    y = y2 + dy3;
    path.curve(x1, y1, x2, y2, x, y);
  };
  const lineTo = (dx: number, dy: number) => {
    x += dx;
    y += dy;
    path.line(x, y);
  };
  const arg = (index: number) => stack[index] ?? 0;

  const run = (bytes: Uint8Array, depth: number): void => {
    if (depth > 10) throw new FontFormatError('A charstring calls itself too deeply.');
    let at = 0;
    while (at < bytes.length && !ended) {
      const b0 = bytes[at] ?? 0;
      at++;
      if (b0 >= 32 || b0 === 28) {
        if (b0 === 28) {
          stack.push((((bytes[at] ?? 0) << 24) >> 16) | (bytes[at + 1] ?? 0));
          at += 2;
        } else if (b0 <= 246) stack.push(b0 - 139);
        else if (b0 <= 250) {
          stack.push((b0 - 247) * 256 + (bytes[at] ?? 0) + 108);
          at++;
        } else if (b0 <= 254) {
          stack.push(-(b0 - 251) * 256 - (bytes[at] ?? 0) - 108);
          at++;
        } else {
          stack.push(view(bytes).getInt32(at) / 65536);
          at += 4;
        }
        continue;
      }
      switch (b0) {
        case 1: // hstem
        case 3: // vstem
        case 18: // hstemhm
        case 23: // vstemhm
          takeWidth('even');
          stems += stack.length >> 1;
          stack.length = 0;
          break;
        case 19: // hintmask
        case 20: // cntrmask
          takeWidth('even');
          // Stems given right before a mask are vstems.
          stems += stack.length >> 1;
          stack.length = 0;
          at += (stems + 7) >> 3;
          break;
        case 21: // rmoveto
          takeWidth(2);
          x += arg(0);
          y += arg(1);
          path.move(x, y);
          stack.length = 0;
          break;
        case 22: // hmoveto
          takeWidth(1);
          x += arg(0);
          path.move(x, y);
          stack.length = 0;
          break;
        case 4: // vmoveto
          takeWidth(1);
          y += arg(0);
          path.move(x, y);
          stack.length = 0;
          break;
        case 5: // rlineto
          for (let i = 0; i + 1 < stack.length; i += 2) lineTo(arg(i), arg(i + 1));
          stack.length = 0;
          break;
        case 6: // hlineto
        case 7: // vlineto
          for (let i = 0; i < stack.length; i++) {
            const horizontal = (i % 2 === 0) === (b0 === 6);
            if (horizontal) lineTo(arg(i), 0);
            else lineTo(0, arg(i));
          }
          stack.length = 0;
          break;
        case 8: // rrcurveto
          for (let i = 0; i + 5 < stack.length; i += 6)
            curveTo(arg(i), arg(i + 1), arg(i + 2), arg(i + 3), arg(i + 4), arg(i + 5));
          stack.length = 0;
          break;
        case 24: {
          // rcurveline
          let i = 0;
          for (; i + 5 < stack.length - 2; i += 6)
            curveTo(arg(i), arg(i + 1), arg(i + 2), arg(i + 3), arg(i + 4), arg(i + 5));
          lineTo(arg(i), arg(i + 1));
          stack.length = 0;
          break;
        }
        case 25: {
          // rlinecurve
          let i = 0;
          for (; i + 1 < stack.length - 6; i += 2) lineTo(arg(i), arg(i + 1));
          curveTo(arg(i), arg(i + 1), arg(i + 2), arg(i + 3), arg(i + 4), arg(i + 5));
          stack.length = 0;
          break;
        }
        case 26: {
          // vvcurveto
          let i = 0;
          let dx1 = 0;
          if (stack.length % 4 === 1) dx1 = arg(i++);
          for (; i + 3 < stack.length; i += 4) {
            curveTo(dx1, arg(i), arg(i + 1), arg(i + 2), 0, arg(i + 3));
            dx1 = 0;
          }
          stack.length = 0;
          break;
        }
        case 27: {
          // hhcurveto
          let i = 0;
          let dy1 = 0;
          if (stack.length % 4 === 1) dy1 = arg(i++);
          for (; i + 3 < stack.length; i += 4) {
            curveTo(arg(i), dy1, arg(i + 1), arg(i + 2), arg(i + 3), 0);
            dy1 = 0;
          }
          stack.length = 0;
          break;
        }
        case 30: // vhcurveto
        case 31: {
          // hvcurveto: curves alternately starting horizontally and vertically.
          let horizontal = b0 === 31;
          for (let i = 0; i + 3 < stack.length; i += 4) {
            const last = i + 4 >= stack.length - 1 && stack.length - (i + 4) === 1;
            const extra = last ? arg(i + 4) : 0;
            if (horizontal) curveTo(arg(i), 0, arg(i + 1), arg(i + 2), extra, arg(i + 3));
            else curveTo(0, arg(i), arg(i + 1), arg(i + 2), arg(i + 3), extra);
            horizontal = !horizontal;
          }
          stack.length = 0;
          break;
        }
        case 10: // callsubr
        case 29: {
          // callgsubr
          const subrs = b0 === 10 ? localSubrs : globalSubrs;
          const index = (stack.pop() ?? 0) + bias(subrs);
          if (index < 0 || index >= subrs.count)
            throw new FontFormatError('A charstring calls a missing subroutine.');
          run(subrs.item(index), depth + 1);
          break;
        }
        case 11: // return
          return;
        case 14: // endchar
          takeWidth(0);
          path.close();
          ended = true;
          stack.length = 0;
          return;
        case 12: {
          const b1 = bytes[at] ?? 0;
          at++;
          flex(b1);
          stack.length = 0;
          break;
        }
        default:
          throw new FontFormatError(`A charstring uses an unknown operator (${b0}).`);
      }
    }
  };

  const flex = (operator: number) => {
    switch (operator) {
      case 35: // flex
        curveTo(arg(0), arg(1), arg(2), arg(3), arg(4), arg(5));
        curveTo(arg(6), arg(7), arg(8), arg(9), arg(10), arg(11));
        break;
      case 34: {
        // hflex
        const startY = y;
        curveTo(arg(0), 0, arg(1), arg(2), arg(3), 0);
        curveTo(arg(4), 0, arg(5), startY - y, arg(6), 0);
        break;
      }
      case 36: {
        // hflex1
        const startY = y;
        curveTo(arg(0), arg(1), arg(2), arg(3), arg(4), 0);
        curveTo(arg(5), 0, arg(6), arg(7), arg(8), startY - (y + arg(7)));
        break;
      }
      case 37: {
        // flex1: the last point comes back to the start along the lesser of the two directions.
        const dx = arg(0) + arg(2) + arg(4) + arg(6) + arg(8);
        const dy = arg(1) + arg(3) + arg(5) + arg(7) + arg(9);
        const horizontal = Math.abs(dx) > Math.abs(dy);
        curveTo(arg(0), arg(1), arg(2), arg(3), arg(4), arg(5));
        curveTo(arg(6), arg(7), arg(8), arg(9), horizontal ? arg(10) : -dx, horizontal ? -dy : arg(10));
        break;
      }
      default:
        throw new FontFormatError(`A charstring uses an unknown operator (12 ${operator}).`);
    }
  };

  run(code, 0);
  return path.toString();
}

// --- TrueType (glyf) ---------------------------------------------------------------------------

const ON_CURVE = 0x01;
const X_SHORT = 0x02;
const Y_SHORT = 0x04;
const REPEAT = 0x08;
const X_SAME = 0x10;
const Y_SAME = 0x20;
const ARG_1_AND_2_ARE_WORDS = 0x0001;
const ARGS_ARE_XY_VALUES = 0x0002;
const WE_HAVE_A_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly on: boolean;
}

function glyfOutlines(
  glyf: Uint8Array,
  loca: Uint8Array,
  longOffsets: boolean,
  scale: number,
): (glyph: number) => string {
  const locaData = view(loca);
  const span = (glyph: number): [number, number] =>
    longOffsets
      ? [locaData.getUint32(glyph * 4), locaData.getUint32(glyph * 4 + 4)]
      : [locaData.getUint16(glyph * 2) * 2, locaData.getUint16(glyph * 2 + 2) * 2];

  /** A glyph's contours, components placed (affine: a b c d e f). */
  const contours = (glyph: number, depth: number): Point[][] => {
    if (depth > 8) throw new FontFormatError('A composite glyph nests too deeply.');
    const [start, end] = span(glyph);
    if (end <= start) return [];
    const data = view(glyf.subarray(start, end));
    const count = data.getInt16(0);
    if (count >= 0) return simple(data, count);
    const result: Point[][] = [];
    let at = 10;
    for (let more = true; more;) {
      const flags = data.getUint16(at);
      const component = data.getUint16(at + 2);
      at += 4;
      let dx = 0;
      let dy = 0;
      if (flags & ARG_1_AND_2_ARE_WORDS) {
        dx = data.getInt16(at);
        dy = data.getInt16(at + 2);
        at += 4;
      } else {
        dx = data.getInt8(at);
        dy = data.getInt8(at + 1);
        at += 2;
      }
      if (!(flags & ARGS_ARE_XY_VALUES)) {
        // Point matching is rare in fonts; the component is placed as is.
        dx = 0;
        dy = 0;
      }
      let [a, b, c, d] = [1, 0, 0, 1];
      const f2dot14 = (offset: number) => data.getInt16(offset) / 16384;
      if (flags & WE_HAVE_A_SCALE) {
        a = d = f2dot14(at);
        at += 2;
      } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
        a = f2dot14(at);
        d = f2dot14(at + 2);
        at += 4;
      } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
        a = f2dot14(at);
        b = f2dot14(at + 2);
        c = f2dot14(at + 4);
        d = f2dot14(at + 6);
        at += 8;
      }
      for (const contour of contours(component, depth + 1)) {
        result.push(
          contour.map(point => ({
            x: a * point.x + c * point.y + dx,
            y: b * point.x + d * point.y + dy,
            on: point.on,
          })),
        );
      }
      more = (flags & MORE_COMPONENTS) !== 0;
    }
    return result;
  };

  return glyph => {
    const path = new PathWriter(scale);
    for (const contour of contours(glyph, 0)) drawQuadratic(path, contour);
    return path.toString();
  };
}

function simple(data: DataView, count: number): Point[][] {
  const ends = Array.from({ length: count }, (_, index) => data.getUint16(10 + index * 2));
  const points = (ends.at(-1) ?? -1) + 1;
  let at = 10 + count * 2;
  at += 2 + data.getUint16(at);
  const flags: number[] = [];
  while (flags.length < points) {
    const flag = data.getUint8(at++);
    flags.push(flag);
    if (flag & REPEAT) {
      for (let repeat = data.getUint8(at++); repeat > 0; repeat--) flags.push(flag);
    }
  }
  const coordinates = (short: number, same: number): number[] => {
    let value = 0;
    return flags.map(flag => {
      if (flag & short) {
        const delta = data.getUint8(at++);
        value += flag & same ? delta : -delta;
      } else if (!(flag & same)) {
        value += data.getInt16(at);
        at += 2;
      }
      return value;
    });
  };
  const xs = coordinates(X_SHORT, X_SAME);
  const ys = coordinates(Y_SHORT, Y_SAME);
  const result: Point[][] = [];
  let first = 0;
  for (const end of ends) {
    const contour: Point[] = [];
    for (let index = first; index <= end; index++)
      contour.push({ x: xs[index] ?? 0, y: ys[index] ?? 0, on: ((flags[index] ?? 0) & ON_CURVE) !== 0 });
    result.push(contour);
    first = end + 1;
  }
  return result;
}

/** A TrueType contour: on-curve points joined by lines, off-curve ones by quadratic curves. */
function drawQuadratic(path: PathWriter, contour: readonly Point[]): void {
  if (contour.length === 0) return;
  // Start on a point on the curve, or half way between two off it.
  const startIndex = contour.findIndex(point => point.on);
  const points =
    startIndex >= 0 ? [...contour.slice(startIndex), ...contour.slice(0, startIndex)] : [...contour];
  const firstPoint = points[0] ?? { x: 0, y: 0, on: true };
  const lastPoint = points.at(-1) ?? firstPoint;
  const start = firstPoint.on
    ? firstPoint
    : { x: (firstPoint.x + lastPoint.x) / 2, y: (firstPoint.y + lastPoint.y) / 2, on: true };
  path.move(start.x, start.y);
  let control: Point | null = null;
  const rest = firstPoint.on ? points.slice(1) : points;
  for (const point of [...rest, start]) {
    if (point.on) {
      if (control === null) path.line(point.x, point.y);
      else path.quad(control.x, control.y, point.x, point.y);
      control = null;
    } else if (control === null) {
      control = point;
    } else {
      const middle = { x: (control.x + point.x) / 2, y: (control.y + point.y) / 2 };
      path.quad(control.x, control.y, middle.x, middle.y);
      control = point;
    }
  }
  path.close();
}
