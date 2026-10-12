/**
 * The music fonts the engine engraves with (REND-241): Bravura's engraving, alphaTab's own, and
 * that of any other font from its SMuFL metadata, registered by the UI before a view uses it; each
 * with its staff lines as thick as the stylesheet asks (REND-228). Engravings are made once and
 * kept: alphaTab only reads them.
 */
import * as alphaTab from '@coderline/alphatab';
import { DEFAULT_MUSIC_FONT, isSmuflMetadata } from '../shared/music-font.ts';

export class MusicFontError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'MusicFontError';
  }
}

const fonts = new Map<string, alphaTab.SmuflMetadata>();
const engravings = new Map<string, alphaTab.EngravingSettings>();

/**
 * Makes a music font's metadata known under its id, in place of what the id had before. What the
 * font lacks (Petaluma has no chord-diagram dots, say) is engraved with Bravura's metrics, as its
 * symbols are drawn from Bravura then.
 */
export function registerMusicFont(id: string, metadata: unknown): void {
  if (id === DEFAULT_MUSIC_FONT) throw new MusicFontError('Bravura is built in.');
  if (!isSmuflMetadata(metadata)) throw new MusicFontError('This is not a SMuFL font metadata file.');
  const font = metadata as unknown as alphaTab.SmuflMetadata;
  const bravura = alphaTab.EngravingSettings.bravuraMetadata;
  fonts.set(id, {
    engravingDefaults: { ...bravura.engravingDefaults, ...font.engravingDefaults },
    glyphBBoxes: { ...bravura.glyphBBoxes, ...font.glyphBBoxes },
    glyphsWithAnchors: { ...bravura.glyphsWithAnchors, ...font.glyphsWithAnchors },
  });
  for (const key of [...engravings.keys()]) if (key.startsWith(`${id}|`)) engravings.delete(key);
}

export function isRegisteredMusicFont(id: string): boolean {
  return id === DEFAULT_MUSIC_FONT || fonts.has(id);
}

/**
 * The engraving of a music font with its staff lines `lineFactor` times as thick; null where
 * alphaTab's own (Bravura as it is) serves. A font not registered is engraved as Bravura.
 */
export function engravingFor(id: string, lineFactor = 1): alphaTab.EngravingSettings | null {
  const metadata = fonts.get(id);
  if (metadata === undefined && lineFactor === 1) return null;
  const key = `${metadata === undefined ? DEFAULT_MUSIC_FONT : id}|${lineFactor}`;
  let engraving = engravings.get(key);
  if (engraving === undefined) {
    engraving = new alphaTab.EngravingSettings();
    engraving.fillFromSmufl(metadata ?? alphaTab.EngravingSettings.bravuraMetadata);
    engraving.staffLineThickness *= lineFactor;
    engravings.set(key, engraving);
  }
  return engraving;
}
