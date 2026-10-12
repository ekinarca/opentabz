/**
 * Track colours (REND-036). Guitar Pro files give every track its colour, which the overview, the
 * tracks menu, the mixer and the instrument views mark tracks with. MusicXML, capella and alphaTex
 * without colours leave alphaTab's one default red on every track, so each of those tracks gets a
 * colour of its own instead, as Guitar Pro gives new tracks: Okabe and Ito's colours, told apart
 * with any colour vision. Exports keep them.
 */
import * as alphaTab from '@coderline/alphatab';
import type { FormatId } from '../shared/formats.ts';

/** Formats whose files give each track its colour. */
const COLORED_FORMATS: ReadonlySet<FormatId> = new Set<FormatId>(['gp3', 'gp4', 'gp5', 'gpx', 'gp', 'gpif']);

/** The colour alphaTab gives a track that no file coloured. */
const UNCOLORED = new alphaTab.model.Color(200, 0, 0, 255).rgba;

/** Colours for tracks the file did not colour, by track. */
export const TRACK_COLORS = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#CC79A7',
  '#56B4E9',
  '#D55E00',
  '#F0E442',
] as const;

/** Gives the tracks a file left uncoloured a colour each, by their place in the score. */
export function colorTracks(score: alphaTab.model.Score, format: FormatId): void {
  if (COLORED_FORMATS.has(format)) return;
  score.tracks.forEach((track, index) => {
    if (track.color.rgba !== UNCOLORED) return;
    track.color = alphaTab.model.Color.fromJson(TRACK_COLORS[index % TRACK_COLORS.length]) ?? track.color;
  });
}
