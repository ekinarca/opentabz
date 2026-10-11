/**
 * File formats OpenTabz recognizes by content. Recognition is broader than support: knowing that
 * a dropped file is a MIDI file, a PDF or an MP3 lets the UI say exactly what happened.
 *
 * This module is alphaTab-free and safe to import on the main thread.
 */

export const FORMAT_IDS = [
  // Openable score formats
  'gp3',
  'gp4',
  'gp5',
  'gpx',
  'gp',
  'gpif',
  'musicxml',
  'mxl',
  'capella',
  'alphatex',
  // Recognized score formats OpenTabz cannot open yet (each is scheduled in FEATURE_MATRIX.md)
  'otz',
  'midi',
  'ascii-tab',
  'chordpro',
  'powertab',
  'tuxguitar',
  // Recognized, never openable
  'gp-legacy',
  'gp-clipboard',
  'tabledit',
  'capella-binary',
  'musicxml-opus',
  'musescore',
  'pdf',
  'image',
  'audio',
  'video',
  'archive',
  'html',
  'text',
  'unknown',
] as const;

export type FormatId = (typeof FORMAT_IDS)[number];

/** Formats this version of OpenTabz can open. */
export const OPENABLE_FORMATS: ReadonlySet<FormatId> = new Set<FormatId>([
  'gp3',
  'gp4',
  'gp5',
  'gpx',
  'gp',
  'gpif',
  'musicxml',
  'mxl',
  'capella',
  'alphatex',
]);

/** File extensions associated with each format, used only to word messages and file pickers. */
export const FORMAT_EXTENSIONS: Readonly<Partial<Record<FormatId, readonly string[]>>> = {
  gp3: ['gp3'],
  gp4: ['gp4'],
  gp5: ['gp5'],
  gpx: ['gpx'],
  gp: ['gp'],
  gpif: ['gpif'],
  musicxml: ['musicxml', 'xml'],
  mxl: ['mxl'],
  capella: ['capx'],
  alphatex: ['atex', 'alphatex', 'tex'],
  otz: ['otz'],
  midi: ['mid', 'midi', 'rmi', 'kar'],
  'ascii-tab': ['txt', 'tab'],
  chordpro: ['cho', 'chopro', 'chordpro', 'crd', 'pro'],
  powertab: ['ptb'],
  tuxguitar: ['tg'],
  'gp-legacy': ['gtp'],
  tabledit: ['tef'],
  'capella-binary': ['cap'],
  musescore: ['mscz', 'mscx'],
  pdf: ['pdf'],
};

/** Extensions offered in the file picker (every openable format). */
export function openableExtensions(): string[] {
  const extensions = new Set<string>();
  for (const format of OPENABLE_FORMATS) {
    for (const extension of FORMAT_EXTENSIONS[format] ?? []) extensions.add(extension);
  }
  return [...extensions].sort();
}

export function isOpenable(format: FormatId): boolean {
  return OPENABLE_FORMATS.has(format);
}

/** Lower-cased extension of a file name without the dot, or `null`. */
export function extensionOf(fileName: string): string | null {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Whether a file name's extension is one normally used for `format`. Files from the wild often
 * carry the wrong extension; this only decides whether a message mentions the mismatch.
 */
export function extensionMatches(format: FormatId, fileName: string): boolean {
  const extension = extensionOf(fileName);
  if (extension === null) return false;
  return (FORMAT_EXTENSIONS[format] ?? []).includes(extension);
}
