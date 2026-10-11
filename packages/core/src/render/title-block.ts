/**
 * The title block on the first page (REND-236, REND-237), in alphaTab's terms: what the file's
 * header and footer settings say (Guitar Pro's, which alphaTab reads but does not fully honour:
 * a line the file hides is drawn anyway), and a block applied around a layout.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  DEFAULT_TITLE_BLOCK,
  TITLE_ELEMENTS,
  type TextAlign,
  type TitleBlock,
  type TitleElement,
  type TitleLine,
} from '../shared/page-text.ts';

const { ScoreStyle, ScoreSubElement, HeaderFooterStyle } = alphaTab.model;
const { NotationElement } = alphaTab;
const PlatformAlign = alphaTab.platform.TextAlign;

const ELEMENTS: Readonly<Record<TitleElement, alphaTab.model.ScoreSubElement>> = {
  title: ScoreSubElement.Title,
  subtitle: ScoreSubElement.SubTitle,
  artist: ScoreSubElement.Artist,
  album: ScoreSubElement.Album,
  words: ScoreSubElement.Words,
  music: ScoreSubElement.Music,
  wordsAndMusic: ScoreSubElement.WordsAndMusic,
  tabber: ScoreSubElement.Transcriber,
  copyright: ScoreSubElement.Copyright,
  copyright2: ScoreSubElement.CopyrightSecondLine,
};

/** The settings that show a line, where alphaTab decides by them rather than by the style. */
const SWITCHES: Readonly<Partial<Record<TitleElement, alphaTab.NotationElement>>> = {
  title: NotationElement.ScoreTitle,
  subtitle: NotationElement.ScoreSubTitle,
  artist: NotationElement.ScoreArtist,
  album: NotationElement.ScoreAlbum,
  words: NotationElement.ScoreWords,
  music: NotationElement.ScoreMusic,
  wordsAndMusic: NotationElement.ScoreWordsAndMusic,
  copyright: NotationElement.ScoreCopyright,
};

const ALIGNS: Readonly<Record<TextAlign, alphaTab.platform.TextAlign>> = {
  left: PlatformAlign.Left,
  center: PlatformAlign.Center,
  right: PlatformAlign.Right,
};

function alignOf(value: alphaTab.platform.TextAlign): TextAlign {
  return value === PlatformAlign.Left ? 'left' : value === PlatformAlign.Right ? 'right' : 'center';
}

/** The title block the file asks for. */
export function readTitleBlock(score: alphaTab.model.Score): TitleBlock {
  const lines = TITLE_ELEMENTS.map(element => {
    const fallback = DEFAULT_TITLE_BLOCK[element];
    const style = score.style?.headerAndFooter.get(ELEMENTS[element]) ?? null;
    const line: TitleLine =
      style === null
        ? fallback
        : {
            visible: style.isVisible ?? fallback.visible,
            template: style.template,
            align: alignOf(style.textAlign),
          };
    return [element, line] as const;
  });
  return Object.fromEntries(lines) as Record<TitleElement, TitleLine>;
}

/** Gives the score the title block's templates and alignments, returning what puts its own back. */
export function applyTitleBlock(score: alphaTab.model.Score, block: TitleBlock): () => void {
  const saved = score.style;
  const style = new ScoreStyle();
  if (saved !== undefined) for (const [element, color] of saved.colors) style.colors.set(element, color);
  for (const element of TITLE_ELEMENTS) {
    const line = block[element];
    style.headerAndFooter.set(
      ELEMENTS[element],
      new HeaderFooterStyle(line.template, line.visible, ALIGNS[line.align]),
    );
  }
  score.style = style;
  return () => {
    if (saved === undefined) Reflect.deleteProperty(score, 'style');
    else score.style = saved;
  };
}

/** Which lines show, for the lines alphaTab shows by its settings. */
export function applyTitleBlockSettings(settings: alphaTab.Settings, block: TitleBlock): void {
  for (const element of TITLE_ELEMENTS) {
    const notationElement = SWITCHES[element];
    if (notationElement !== undefined)
      settings.notation.elements.set(notationElement, block[element].visible);
  }
}
