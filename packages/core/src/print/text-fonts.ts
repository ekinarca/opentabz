/**
 * The fonts a PDF's text is set in. The score's texts ask for Arial and Georgia (alphaTab's
 * defaults) or other common families; PDFs embed Arimo and Gelasio (SIL Open Font License),
 * which have the same advance widths as Arial and Georgia, so text in the PDF lines up as the
 * score was laid out. Each face comes as several files, each covering some scripts.
 */
import type { TextStyle } from './drawing.ts';

export type TextFamily = 'sans' | 'serif';

export interface TextFace {
  readonly family: TextFamily;
  readonly bold: boolean;
  readonly italic: boolean;
}

export interface TextFontFile {
  /** Unique id of the file (its URL, for instance). */
  readonly id: string;
  /** Code points the file covers, as inclusive ranges. */
  readonly ranges: readonly (readonly [number, number])[];
}

/** Where a PDF's text fonts come from. */
export interface TextFontSource {
  /** The files of a face, in order of preference. */
  files(face: TextFace): readonly TextFontFile[];
  /** A file's bytes: TrueType or WOFF 1.0. */
  load(file: TextFontFile): Promise<Uint8Array>;
}

const SERIF_FAMILIES = new Set([
  'serif',
  'georgia',
  'times',
  'times new roman',
  'garamond',
  'palatino',
  'palatino linotype',
  'book antiqua',
  'cambria',
  'baskerville',
  'gelasio',
  'liberation serif',
]);

const SANS_FAMILIES = new Set([
  'sans-serif',
  'arial',
  'helvetica',
  'helvetica neue',
  'verdana',
  'tahoma',
  'segoe ui',
  'calibri',
  'trebuchet ms',
  'arimo',
  'liberation sans',
  'system-ui',
]);

/** The face a text style is set in: the first family named that is known, else sans-serif. */
export function textFace(style: TextStyle): TextFace {
  let family: TextFamily = 'sans';
  for (const name of style.families) {
    const key = name.toLowerCase();
    if (SERIF_FAMILIES.has(key)) {
      family = 'serif';
      break;
    }
    if (SANS_FAMILIES.has(key)) break;
  }
  return { family, bold: style.bold, italic: style.italic };
}

/**
 * Vertical metrics of the fonts the score shows on screen (Arial and Georgia), in ems: where a
 * text's hanging, middle and ideographic baselines fall, as browsers place them.
 */
export const SCREEN_METRICS: Readonly<
  Record<TextFamily, { readonly ascent: number; readonly descent: number; readonly xHeight: number }>
> = {
  // Arial: hhea ascender 1854 and descender 434, x-height 1062, of 2048 units.
  sans: { ascent: 1854 / 2048, descent: 434 / 2048, xHeight: 1062 / 2048 },
  // Georgia: hhea ascender 1878 and descender 449, x-height 986, of 2048 units.
  serif: { ascent: 1878 / 2048, descent: 449 / 2048, xHeight: 986 / 2048 },
};

/**
 * How far below `y` a text's alphabetic baseline lies, for its dominant baseline: browsers put
 * the hanging baseline at 80 % of the ascent, the middle at half the x-height and the
 * ideographic baseline at the descent.
 */
export function baselineShift(
  baseline: 'alphabetic' | 'hanging' | 'middle' | 'ideographic',
  family: TextFamily,
  size: number,
): number {
  const metrics = SCREEN_METRICS[family];
  switch (baseline) {
    case 'alphabetic':
      return 0;
    case 'hanging':
      return 0.8 * metrics.ascent * size;
    case 'middle':
      return (metrics.xHeight / 2) * size;
    case 'ideographic':
      return -metrics.descent * size;
  }
}

/** Unicode ranges written as in CSS `unicode-range` (`U+0000-00FF,U+0131`). */
export function parseUnicodeRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const part of text.split(',')) {
    const match = /^\s*U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?\s*$/.exec(part);
    if (match === null) continue;
    const start = Number.parseInt(match[1] ?? '', 16);
    const end = match[2] === undefined ? start : Number.parseInt(match[2], 16);
    ranges.push([start, end]);
  }
  return ranges;
}

export function covers(file: TextFontFile, codePoint: number): boolean {
  return file.ranges.some(([start, end]) => codePoint >= start && codePoint <= end);
}
