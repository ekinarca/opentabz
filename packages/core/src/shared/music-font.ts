/**
 * The music font a score is engraved in (REND-241): Bravura, engraved, as alphaTab draws it;
 * Petaluma, handwritten; or any SMuFL font of one's own. Plain data for the UI and the engine.
 */

export const BUILT_IN_MUSIC_FONTS = ['bravura', 'petaluma'] as const;
export type BuiltInMusicFont = (typeof BUILT_IN_MUSIC_FONTS)[number];

/** alphaTab's own: needs nothing loaded. */
export const DEFAULT_MUSIC_FONT: BuiltInMusicFont = 'bravura';

/** The prefix of the ids of one's own fonts, followed by a hash of the font file. */
export const OWN_MUSIC_FONT_PREFIX = 'own:';

export function isBuiltInMusicFont(id: string): id is BuiltInMusicFont {
  return (BUILT_IN_MUSIC_FONTS as readonly string[]).includes(id);
}

/** Whether an id names a music font: a built-in one or one of one's own. */
export function isMusicFontId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    (isBuiltInMusicFont(id) || new RegExp(`^${OWN_MUSIC_FONT_PREFIX}[0-9a-f]{16,64}$`).test(id))
  );
}

/** The CSS font family a music font's symbols are set in on screen. */
export function musicFontFamily(id: string): string {
  switch (id) {
    case 'bravura':
      return 'Bravura';
    case 'petaluma':
      return 'Petaluma';
    default:
      return `OpenTabz music ${id.slice(OWN_MUSIC_FONT_PREFIX.length, OWN_MUSIC_FONT_PREFIX.length + 12)}`;
  }
}

/** The CSS font stack a music font's symbols are set in: Bravura stands in for what it lacks. */
export function musicFontStack(id: string): string {
  return id === DEFAULT_MUSIC_FONT ? "'Bravura'" : `'${musicFontFamily(id)}', 'Bravura'`;
}

/**
 * The part of a SMuFL font's metadata file (font_metadata.json) the engraving reads: its
 * engraving defaults, the glyphs' bounding boxes and their anchors, in staff spaces.
 */
export interface SmuflMetadataJson {
  readonly engravingDefaults: Readonly<Record<string, unknown>>;
  readonly glyphBBoxes?: Readonly<Record<string, unknown>>;
  readonly glyphsWithAnchors: Readonly<Record<string, unknown>>;
}

/** Whether a parsed JSON file is a SMuFL metadata file the engraving can use. */
export function isSmuflMetadata(value: unknown): value is SmuflMetadataJson {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const object = (entry: unknown) => typeof entry === 'object' && entry !== null && !Array.isArray(entry);
  return (
    object(record['engravingDefaults']) &&
    object(record['glyphBBoxes']) &&
    object(record['glyphsWithAnchors']) &&
    typeof (record['engravingDefaults'] as Record<string, unknown>)['staffLineThickness'] === 'number'
  );
}
