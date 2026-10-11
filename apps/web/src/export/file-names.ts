/**
 * Names of exported files from a template (EXP-028), with Guitar Pro's tokens: %T the title, %t
 * the track's name, %n its number, %N how many tracks the score has, %d the date and %h the time.
 * The extension is added for each format.
 */
import type { OpenDocument } from '../state/documents.ts';

export const FILE_NAME_TOKENS = ['%T', '%t', '%n', '%N', '%d', '%h'] as const;

export interface FileNameContext {
  readonly title: string;
  readonly trackName: string;
  /** From 1. */
  readonly trackNumber: number;
  readonly trackCount: number;
  readonly now: Date;
}

const two = (value: number) => String(value).padStart(2, '0');

/** The template with its tokens filled in; `%%` is a percent sign. */
export function expandFileName(template: string, context: FileNameContext): string {
  return template.replace(/%([TtnNdh%])/g, (_: string, token: string) => {
    const { now } = context;
    switch (token) {
      case 'T':
        return context.title;
      case 't':
        return context.trackName;
      case 'n':
        return String(context.trackNumber);
      case 'N':
        return String(context.trackCount);
      case 'd':
        return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
      case 'h':
        return `${two(now.getHours())}-${two(now.getMinutes())}`;
      default:
        return '%';
    }
  });
}

/** The document's names: the title without the file's extension, and the (first) track shown. */
export function fileNameContext(doc: OpenDocument, now = new Date()): FileNameContext {
  const index = doc.view.trackIndexes[0] ?? 0;
  const title =
    doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name.replace(/\.[^.]*$/, '');
  return {
    title,
    trackName: doc.summary.tracks[index]?.name ?? '',
    trackNumber: index + 1,
    trackCount: doc.summary.tracks.length,
    now,
  };
}
