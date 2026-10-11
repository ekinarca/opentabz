/** The score's information the pages' texts are made from (REND-236). */
import type { ScoreFields } from '@opentabz/core/shared';
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
