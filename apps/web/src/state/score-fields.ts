/** The score's information the pages' texts are made from (REND-236), and those texts. */
import { pageLines, type PageText, type ScoreFields, type ScoreStyle } from '@opentabz/core/shared';
import type { OpenDocument } from './documents.ts';

export function scoreFields(doc: OpenDocument): ScoreFields {
  const { summary } = doc;
  return {
    // A score without a title goes by its file's name.
    title: summary.title.trim().length > 0 ? summary.title : doc.source.name,
    subtitle: summary.subtitle,
    artist: summary.artist,
    album: summary.album,
    words: summary.words,
    music: summary.music,
    tabber: summary.tab,
    copyright: summary.copyright,
  };
}

/** A page's header and footer as the style writes them: its templates, alignments and fonts. */
export function pagesTexts(
  style: ScoreStyle,
  fields: ScoreFields,
  number: number,
  count: number,
): { readonly header: PageText | null; readonly footer: PageText | null } {
  const { header, footer } = pageLines(style.pages, fields, number, count);
  return {
    header: header === null ? null : { ...header, font: style.fonts.pageHeader },
    footer: footer === null ? null : { ...footer, font: style.fonts.pageFooter },
  };
}
