/**
 * Fonts of the score's texts (REND-237, REND-238): a family, a size and a style for each kind of
 * text the stylesheet names, as Guitar Pro's does. Sizes are in layout units (CSS pixels at
 * 100 %), as alphaTab's are.
 */

/** The kinds of text whose font is chosen, from the title block down to the bar numbers. */
export const TEXT_ELEMENTS = [
  'title',
  'subtitle',
  'artist',
  'album',
  'credits',
  'copyright',
  'pageHeader',
  'pageFooter',
  'trackNames',
  'tuning',
  'sections',
  'text',
  'chordNames',
  'chordFrets',
  'lyrics',
  'tab',
  'fingering',
  'techniques',
  'barNumbers',
  'repeats',
  'directions',
  'timer',
] as const;
export type TextElement = (typeof TEXT_ELEMENTS)[number];

export interface TextFont {
  /** A CSS font family list: the font, then what stands in for it. */
  readonly family: string;
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
}

export type TextFonts = Readonly<Record<TextElement, TextFont>>;

export const SERIF = 'Georgia, serif';
export const SANS_SERIF = 'Arial, sans-serif';
export const MONOSPACE = '"Courier New", monospace';

/** The families offered by name; any installed font can be named too. */
export const FONT_FAMILIES = { serif: SERIF, sans: SANS_SERIF, mono: MONOSPACE } as const;

export const FONT_SIZE = { min: 6, max: 72 } as const;

const font = (family: string, size: number, bold = false, italic = false): TextFont => ({
  family,
  size,
  bold,
  italic,
});

/** alphaTab's fonts, and the pages' header and footer as the paged view writes them. */
export const DEFAULT_TEXT_FONTS: TextFonts = {
  title: font(SERIF, 32),
  subtitle: font(SERIF, 20),
  artist: font(SERIF, 20),
  album: font(SERIF, 20),
  credits: font(SERIF, 15),
  copyright: font(SANS_SERIF, 12, true),
  pageHeader: font(SANS_SERIF, 11, false, true),
  pageFooter: font(SANS_SERIF, 11),
  trackNames: font(SERIF, 12, false, true),
  tuning: font(SERIF, 12, false, true),
  sections: font(SERIF, 14, true),
  text: font(SERIF, 12, false, true),
  chordNames: font(SERIF, 12, false, true),
  chordFrets: font(SANS_SERIF, 11),
  lyrics: font(SERIF, 12, false, true),
  tab: font(SANS_SERIF, 14),
  fingering: font(SERIF, 12, false, true),
  techniques: font(SERIF, 12, false, true),
  barNumbers: font(SANS_SERIF, 11),
  repeats: font(SERIF, 15),
  directions: font(SERIF, 14),
  timer: font(SERIF, 12),
};

export function sameTextFont(a: TextFont, b: TextFont): boolean {
  return a.family === b.family && a.size === b.size && a.bold === b.bold && a.italic === b.italic;
}

export function sameTextFonts(a: TextFonts, b: TextFonts): boolean {
  return TEXT_ELEMENTS.every(element => sameTextFont(a[element], b[element]));
}

/** The family lists of a CSS family string, quotes taken off: what the print module reads. */
export function fontFamilies(family: string): string[] {
  return family
    .split(',')
    .map(name => name.trim().replace(/^["']|["']$/g, ''))
    .filter(name => name.length > 0);
}
