/**
 * The printed words of techniques (REND-242): let ring, palm mute, slide, hammer-on, pull-off,
 * slap, pop, pick scrape, rasgueado and the whammy bar, each written as the stylesheet asks, and
 * as usual where it leaves one empty.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, sameScoreStyle } from '../src/shared/style.ts';
import {
  DEFAULT_TECHNIQUE_LABELS,
  USUAL_TECHNIQUE_LABELS,
  type TechniqueLabels,
} from '../src/shared/technique-labels.ts';
import { engraveTex, GUITAR } from './engraving.ts';

/** Every technique with a word: palm mute, let ring, a legato slide, hammer-ons and pull-offs,
 * slap and pop, a pick scrape, a rasgueado and the whammy bar. */
const TEX = [
  GUITAR,
  ':8 5.6{pm} 5.6{pm} 5.4{lr} 5.4{lr} 5.3{sl} 7.3 5.3{h} 7.3 |',
  ':8 7.3{h} 5.3 3.4{s} 5.4{p} 5.5{psd} 7.5 (0.5 2.4 2.3){rasg ii} r |',
  ':4 3.3{tb (0 -4 0)} 3.3 r r |',
].join('\n');

const OWN: TechniqueLabels = {
  letRing: 'ring',
  palmMute: 'mute',
  slide: 'gliss.',
  hammerOn: 'hammer',
  pullOff: 'pull',
  slap: 'thumb',
  pop: 'snap',
  pickScrape: 'scrape',
  rasgueado: 'strum',
  whammyBar: 'bar',
};

/** The words written over the music. */
function words(techniqueLabels: TechniqueLabels): string[] {
  const view = engraveTex(TEX, { style: { ...DEFAULT_SCORE_STYLE, techniqueLabels } });
  return view.marks.filter(mark => mark.kind === 'text' && mark.partial === 'system').map(mark => mark.name);
}

describe('the printed words of techniques (REND-242)', () => {
  it('writes the usual words when the stylesheet leaves them', () => {
    const written = words(DEFAULT_TECHNIQUE_LABELS);
    for (const word of Object.values(USUAL_TECHNIQUE_LABELS)) expect(written).toContain(word);
  });

  it('writes each technique’s word as asked, on the staff and in the tablature', () => {
    const written = words(OWN);
    for (const word of Object.values(OWN)) expect(written).toContain(word);
    for (const word of Object.values(USUAL_TECHNIQUE_LABELS)) expect(written).not.toContain(word);
    // The slide's and the hammer-on's words over both staves.
    expect(written.filter(word => word === 'gliss.')).toHaveLength(2);
    expect(written.filter(word => word === 'hammer').length).toBeGreaterThanOrEqual(2);
  });

  it('writes the usual word where one is left empty', () => {
    const written = words({ ...DEFAULT_TECHNIQUE_LABELS, palmMute: 'mute', slap: '   ' });
    expect(written).toContain('mute');
    expect(written).not.toContain('P.M.');
    expect(written).toContain('S');
    expect(written).toContain('let ring');
  });

  it('tells styles apart by their words', () => {
    const own = { ...DEFAULT_SCORE_STYLE, techniqueLabels: OWN };
    expect(sameScoreStyle(own, { ...DEFAULT_SCORE_STYLE, techniqueLabels: { ...OWN } })).toBe(true);
    expect(sameScoreStyle(own, DEFAULT_SCORE_STYLE)).toBe(false);
  });
});
