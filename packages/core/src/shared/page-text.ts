/**
 * Texts made from the score's information (REND-236, REND-237): the title block on the first
 * page, and the running header and footer of the pages, the first page and the later ones apart.
 * Templates name the information with tokens, Guitar Pro's way: %TITLE%, %SUBTITLE%, %ARTIST%,
 * %ALBUM%, %WORDS%, %MUSIC%, %WORDSMUSIC%, %TABBER%, %COPYRIGHT%, and on pages %PAGE% and %PAGES%.
 */
import type { TextFont } from './text-fonts.ts';

export const TEXT_ALIGNS = ['left', 'center', 'right'] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

/** The score's information the tokens stand for. */
export interface ScoreFields {
  readonly title: string;
  readonly subtitle: string;
  readonly artist: string;
  readonly album: string;
  readonly words: string;
  readonly music: string;
  readonly tabber: string;
  readonly copyright: string;
}

export const PAGE_TOKENS = [
  '%TITLE%',
  '%SUBTITLE%',
  '%ARTIST%',
  '%ALBUM%',
  '%WORDS%',
  '%MUSIC%',
  '%WORDSMUSIC%',
  '%TABBER%',
  '%COPYRIGHT%',
  '%PAGE%',
  '%PAGES%',
] as const;

/**
 * A template with its tokens filled in. A text whose information is all missing comes out empty,
 * so "Music by %MUSIC%" is left out for a score without a composer.
 */
export function fillTemplate(
  template: string,
  fields: ScoreFields,
  page?: { readonly number: number; readonly count: number },
): string {
  const values: Readonly<Record<string, string>> = {
    TITLE: fields.title,
    SUBTITLE: fields.subtitle,
    ARTIST: fields.artist,
    ALBUM: fields.album,
    WORDS: fields.words,
    MUSIC: fields.music,
    WORDSMUSIC: fields.words === fields.music ? fields.music : '',
    TABBER: fields.tabber,
    COPYRIGHT: fields.copyright,
    PAGE: page === undefined ? '' : String(page.number),
    PAGES: page === undefined ? '' : String(page.count),
  };
  let named = 0;
  let filled = 0;
  const text = template.replace(/%([A-Z]+)%/g, (token: string, name: string) => {
    const value = values[name];
    if (value === undefined) return token;
    named += 1;
    if (value.trim().length > 0) filled += 1;
    return value;
  });
  return named > 0 && filled === 0 ? '' : text.trim();
}

export interface PageLine {
  readonly template: string;
  readonly align: TextAlign;
}

/** The running header and footer, of the first page and of the pages after it. */
export interface PageFurniture {
  readonly firstHeader: PageLine;
  readonly firstFooter: PageLine;
  readonly laterHeader: PageLine;
  readonly laterFooter: PageLine;
}

export const PAGE_LINES = ['firstHeader', 'firstFooter', 'laterHeader', 'laterFooter'] as const;
export type PageLineId = (typeof PAGE_LINES)[number];

/** The first page has the title block, the later ones the title; each page its number. */
export const DEFAULT_PAGE_FURNITURE: PageFurniture = {
  firstHeader: { template: '', align: 'center' },
  firstFooter: { template: '%PAGE% / %PAGES%', align: 'center' },
  laterHeader: { template: '%TITLE%', align: 'center' },
  laterFooter: { template: '%PAGE% / %PAGES%', align: 'center' },
};

/** A page's header and footer: the texts and where they go, or null where there is none. */
export function pageLines(
  furniture: PageFurniture,
  fields: ScoreFields,
  number: number,
  count: number,
): { readonly header: PageText | null; readonly footer: PageText | null } {
  const line = (template: PageLine): PageText | null => {
    const text = fillTemplate(template.template, fields, { number, count });
    return text.length === 0 ? null : { text, align: template.align };
  };
  return number === 1
    ? { header: line(furniture.firstHeader), footer: line(furniture.firstFooter) }
    : { header: line(furniture.laterHeader), footer: line(furniture.laterFooter) };
}

export interface PageText {
  readonly text: string;
  readonly align: TextAlign;
  /** The font, if not the paged view's own. */
  readonly font?: TextFont;
}

/** The lines of the title block, in Guitar Pro's (and alphaTab's) order. */
export const TITLE_ELEMENTS = [
  'title',
  'subtitle',
  'artist',
  'album',
  'words',
  'music',
  'wordsAndMusic',
  'tabber',
  'copyright',
  'copyright2',
] as const;
export type TitleElement = (typeof TITLE_ELEMENTS)[number];

export interface TitleLine {
  readonly visible: boolean;
  readonly template: string;
  readonly align: TextAlign;
}

export type TitleBlock = Readonly<Record<TitleElement, TitleLine>>;

/** alphaTab's title block: what a score without a stylesheet shows. */
export const DEFAULT_TITLE_BLOCK: TitleBlock = {
  title: { visible: true, template: '%TITLE%', align: 'center' },
  subtitle: { visible: true, template: '%SUBTITLE%', align: 'center' },
  artist: { visible: true, template: '%ARTIST%', align: 'center' },
  album: { visible: true, template: '%ALBUM%', align: 'center' },
  words: { visible: true, template: 'Words by %WORDS%', align: 'left' },
  music: { visible: true, template: 'Music by %MUSIC%', align: 'right' },
  wordsAndMusic: { visible: true, template: 'Words & Music by %MUSIC%', align: 'right' },
  tabber: { visible: false, template: 'Tabbed by %TABBER%', align: 'right' },
  copyright: { visible: true, template: '%COPYRIGHT%', align: 'center' },
  copyright2: {
    visible: true,
    template: 'All Rights Reserved - International Copyright Secured',
    align: 'center',
  },
};

/**
 * Guitar Pro's optional blocks of free text under the title block (REND-041): the score's
 * instructions and its notice, as written in the score's information.
 */
export const TEXT_BLOCKS = ['instructions', 'notices'] as const;
export type TextBlockId = (typeof TEXT_BLOCKS)[number];

export interface TextBlock {
  readonly visible: boolean;
  readonly align: TextAlign;
}

export type TextBlocks = Readonly<Record<TextBlockId, TextBlock>>;

/** Off until the stylesheet shows them, as in Guitar Pro. */
export const DEFAULT_TEXT_BLOCKS: TextBlocks = {
  instructions: { visible: false, align: 'left' },
  notices: { visible: false, align: 'left' },
};

export function sameTextBlocks(a: TextBlocks, b: TextBlocks): boolean {
  return TEXT_BLOCKS.every(id => a[id].visible === b[id].visible && a[id].align === b[id].align);
}

export function samePageFurniture(a: PageFurniture, b: PageFurniture): boolean {
  return PAGE_LINES.every(line => a[line].template === b[line].template && a[line].align === b[line].align);
}

export function sameTitleBlock(a: TitleBlock, b: TitleBlock): boolean {
  return TITLE_ELEMENTS.every(
    element =>
      a[element].visible === b[element].visible &&
      a[element].template === b[element].template &&
      a[element].align === b[element].align,
  );
}
