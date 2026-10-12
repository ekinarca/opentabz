/**
 * Capos and tunings in the written notes (REND-232): as they sound, in one key, as usual; or
 * guitars written as if in standard tuning without a capo, in their own key, the tablature
 * unchanged. Another instrument with as many strings keeps its own tuning.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import { engraveTex, type Engraving } from './engraving.ts';

function guitar(tuning: string, extra: string, body: string): string {
  return ['\\track "Guitar"', '\\staff {score tabs}', `\\tuning (${tuning})`, extra, body].join('\n');
}
const STANDARD = 'E4 B3 G3 D3 A2 E2';
const RIFF = ':4 0.5 2.4 0.3 2.2 |';

function engrave(tex: string, capoAndTuningInNotation = true): Engraving {
  return engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, capoAndTuningInNotation } });
}

/**
 * What the standard staff writes: its key's sharps and flats, and its notes and accidentals, by
 * height above the staff's top line (the title block above may differ).
 */
function written(view: Engraving) {
  const system = view.marks.filter(mark => mark.partial === 'system');
  const top = Math.min(
    ...system.filter(mark => mark.kind === 'rect' && mark.width > 100 && mark.height < 3).map(mark => mark.y),
  );
  const glyphs = system.filter(mark => mark.kind === 'glyph');
  const firstHead = Math.min(...glyphs.filter(mark => mark.name.startsWith('Notehead')).map(mark => mark.x));
  return {
    key: glyphs
      .filter(mark => mark.name.startsWith('Accidental') && mark.x < firstHead - 12)
      .map(mark => mark.name),
    notes: glyphs
      .filter(
        mark =>
          mark.name.startsWith('Notehead') || (mark.name.startsWith('Accidental') && mark.x > firstHead - 12),
      )
      .map(mark => `${mark.name}@${(mark.y - top).toFixed(1)}`),
  };
}

const tab = (view: Engraving) =>
  view.marks
    .filter(mark => mark.kind === 'text' && /^\d+$/.test(mark.name) && mark.partial === 'system')
    .map(mark => mark.name);

describe('capos and tunings in the written notes (REND-232)', () => {
  it('writes a capo’s notes as they sound in the song’s key, or as fingered in their own', () => {
    const capo = guitar(STANDARD, '\\capo 2\n\\ks A', RIFF);
    const sounding = written(engrave(capo));
    expect(sounding.key).toHaveLength(3);
    const fingered = written(engrave(capo, false));
    // As the same frets without a capo, in G.
    expect(fingered).toEqual(written(engrave(guitar(STANDARD, '\\ks G', RIFF))));
    expect(fingered.key).toHaveLength(1);
    expect(tab(engrave(capo, false))).toEqual(tab(engrave(capo)));
  });

  it('writes a drop tuning’s notes as they sound, or as if in standard tuning', () => {
    const drop = guitar('E4 B3 G3 D3 A2 D2', '', ':4 0.6 0.5 2.6 r |');
    const asStandard = written(engrave(drop, false));
    expect(asStandard).not.toEqual(written(engrave(drop)));
    expect(asStandard).toEqual(written(engrave(guitar(STANDARD, '', ':4 0.6 0.5 2.6 r |'))));
  });

  it('keeps the tuning of another instrument with as many strings', () => {
    // A ukulele is not a retuned bass.
    const ukulele = [
      '\\track "Ukulele"',
      '\\staff {score tabs}',
      '\\tuning (A4 E4 C4 G4)',
      ':4 0.1 0.2 0.3 0.4 |',
    ].join('\n');
    expect(written(engrave(ukulele, false))).toEqual(written(engrave(ukulele)));
  });
});
