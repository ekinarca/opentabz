/**
 * Music fonts for the score (REND-241). Bravura is always there. Petaluma's files are the app's
 * own assets, and one's own fonts are kept in the browser (own-music-fonts.ts); either is loaded
 * only when a score asks for it: its symbols for the screen (a FontFace), its SMuFL metadata for
 * the engine (registered with each engine worker, again after a restart), and its outlines for
 * exports and printing (read by the sheets worker).
 */
import {
  DEFAULT_MUSIC_FONT,
  isBuiltInMusicFont,
  isSmuflMetadata,
  musicFontFamily,
  OWN_MUSIC_FONT_PREFIX,
  type SmuflMetadataJson,
} from '@opentabz/core/shared';
import petalumaMetadata from '@vexflow-fonts/petaluma/metadata.json?url';
import petalumaOtf from '@vexflow-fonts/petaluma/petaluma.otf?url';
import petalumaWoff2 from '@vexflow-fonts/petaluma/petaluma.woff2?url';
import { getEngine } from '../engine/instance.ts';
import { getOwnMusicFont } from './own-music-fonts.ts';

/** Where exports read a music font's outlines from (an .otf, .ttf or WOFF 1.0 file). */
export interface MusicFontSource {
  readonly id: string;
  readonly url: string;
}

interface LoadedFont {
  readonly metadata: SmuflMetadataJson;
  /** The font file exports draw from. */
  readonly outlines: string;
}

const loaded = new Map<string, Promise<LoadedFont>>();
/** The outlines' files of the fonts loaded, for exports. */
const outlines = new Map<string, string>();
/** The fonts each engine worker knows, by the promise that its start resolved. */
const registered = new WeakMap<object, Set<string>>();

async function fetchMetadata(url: string): Promise<SmuflMetadataJson> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The music font's metadata could not be loaded (${response.status}).`);
  const json: unknown = await response.json();
  if (!isSmuflMetadata(json)) throw new Error('The music font has no SMuFL metadata.');
  return json;
}

async function addFace(id: string, source: string | ArrayBuffer): Promise<void> {
  const face = new FontFace(musicFontFamily(id), typeof source === 'string' ? `url(${source})` : source, {
    display: 'block',
  });
  document.fonts.add(face);
  await face.load();
}

async function loadPetaluma(): Promise<LoadedFont> {
  const [metadata] = await Promise.all([fetchMetadata(petalumaMetadata), addFace('petaluma', petalumaWoff2)]);
  return { metadata, outlines: petalumaOtf };
}

async function loadOwn(id: string): Promise<LoadedFont> {
  const font = await getOwnMusicFont(id);
  if (font === null) throw new Error('The music font is no longer kept in this browser.');
  await addFace(id, font.font);
  return { metadata: font.metadata, outlines: URL.createObjectURL(new Blob([font.font])) };
}

function load(id: string): Promise<LoadedFont> {
  let loading = loaded.get(id);
  if (loading === undefined) {
    loading = (id === 'petaluma' ? loadPetaluma() : loadOwn(id)).then(font => {
      outlines.set(id, font.outlines);
      return font;
    });
    loaded.set(id, loading);
    loading.catch(() => loaded.delete(id));
  }
  return loading;
}

/** Whether a music font needs loading: Bravura and ids of nothing known do not. */
function loadable(id: string): boolean {
  return id !== DEFAULT_MUSIC_FONT && (isBuiltInMusicFont(id) || id.startsWith(OWN_MUSIC_FONT_PREFIX));
}

/**
 * Makes a music font ready for a view: its symbols loaded for the screen and its metrics known to
 * the engine worker. Bravura needs nothing.
 */
export async function prepareMusicFont(id: string): Promise<void> {
  if (!loadable(id)) return;
  const engine = getEngine();
  const ready = engine.ready;
  const { metadata } = await load(id);
  const known = registered.get(ready) ?? new Set<string>();
  if (known.has(id)) return;
  await engine.call('registerMusicFont', { id, metadata });
  known.add(id);
  registered.set(ready, known);
}

/** Where exports read a music font's outlines (once it is prepared), or null for Bravura. */
export function musicFontSource(id: string): MusicFontSource | null {
  const url = outlines.get(id);
  return url === undefined ? null : { id, url };
}
