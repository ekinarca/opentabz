/**
 * Where the lyrics go (REND-239): between a track's staff and its tablature, as alphaTab places
 * them; above all its staves; below all of them; or nowhere.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, type Engraving } from './engraving.ts';

const BODY = [
  '\\lyrics "Morn-ing light a-gain"',
  '\\staff {score tabs}',
  '\\tuning (E4 B3 G3 D3 A2 E2)',
  ':4 0.1 2.1 3.1 0.1 |',
].join('\n');
const TEX = `\\track "Guitar"\n${BODY}`;
const TAB = `\\track "Guitar"\n${BODY.replace('{score tabs}', '{tabs}')}`;

function engrave(tex: string, style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

/** The syllables' heights, and each staff's top and bottom lines, top down. */
function places(view: Engraving) {
  const system = view.marks.filter(mark => mark.partial === 'system');
  const syllables = system.filter(
    mark => mark.kind === 'text' && /^(Morn|ing|light|a|gain)$/.test(mark.name.replace(/-$/, '')),
  );
  // Staff lines, whole or broken around fret numbers; a staff ends where the next gap is wide.
  const ys = [
    ...new Set(
      system
        .filter(mark => mark.kind === 'rect' && mark.height < 2 && mark.width > 5)
        .map(mark => Math.round(mark.y * 10) / 10),
    ),
  ].sort((a, b) => a - b);
  const staves: [number, number][] = [];
  for (const y of ys) {
    const last = staves.at(-1);
    if (last !== undefined && y - last[1] < 20) last[1] = y;
    else staves.push([y, y]);
  }
  return { syllables: syllables.map(mark => mark.y), staves };
}

describe('where the lyrics go (REND-239)', () => {
  it('writes the lyrics between the staff and its tablature, as usual', () => {
    const { syllables, staves } = places(engrave(TEX));
    expect(syllables).toHaveLength(4);
    expect(staves).toHaveLength(2);
    const staffBottom = staves[0]?.[1] ?? 0;
    const tabTop = staves[1]?.[0] ?? 0;
    for (const y of syllables) {
      expect(y).toBeGreaterThan(staffBottom);
      expect(y).toBeLessThan(tabTop);
    }
  });

  it('writes them above all the staves, or below all of them', () => {
    const above = places(engrave(TEX, { lyricsPlace: 'above' }));
    for (const y of above.syllables) expect(y).toBeLessThan(above.staves[0]?.[0] ?? 0);
    const below = places(engrave(TEX, { lyricsPlace: 'below' }));
    // A staff space clear of the last line.
    for (const y of below.syllables) expect(y).toBeGreaterThan((below.staves.at(-1)?.[1] ?? 0) + 5);
    // A tablature alone: below it too.
    const tab = places(engrave(TAB, { lyricsPlace: 'below' }));
    for (const y of tab.syllables) expect(y).toBeGreaterThan(tab.staves.at(-1)?.[1] ?? 0);
  });

  it('writes them nowhere when hidden', () => {
    expect(places(engrave(TEX, { lyrics: false })).syllables).toEqual([]);
  });
});
