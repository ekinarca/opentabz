/**
 * What the engraving contains: score header, tuning, track names, footer and track selection.
 * Texts are read from the painted SVG of each partial.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

const SHUFFLE = 'alphatex/demos/twelve-bar-shuffle.atex';

function render(trackIndexes: number[], options: Partial<ViewOptions> = {}) {
  const { score } = openScore(readFixture(SHUFFLE), 'shuffle.atex');
  const session = new RenderSession(score, {
    trackIndexes,
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 720,
    notationScale: 1,
    ...options,
  });
  const layout = session.layout();
  const texts = (kind: string, index = 0): string[] => {
    const partial = layout.partials.filter(p => p.kind === kind)[index];
    if (partial === undefined) return [];
    const svg = session.paint([partial.id])[0]?.svg ?? '';
    return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(match => (match[1] ?? '').trim());
  };
  return {
    layout,
    texts,
    dispose: () => {
      session.dispose();
    },
  };
}

describe('engraved content', () => {
  it('draws the score header: title, subtitle, artist and composer', () => {
    const view = render([0]);
    expect(view.texts('header', 0)).toEqual([
      'Twelve-Bar Shuffle in A',
      'OpenTabz demo',
      'OpenTabz',
      'Music by OpenTabz contributors',
    ]);
    view.dispose();
  });

  it('draws the tuning of every shown track', () => {
    const view = render([0, 2]);
    expect(view.texts('header', 1)).toEqual(['Rhythm Guitar', 'Standard', 'Bass', 'Standard']);
    view.dispose();
  });

  it('names the tracks on their staves', () => {
    const view = render([0, 1]);
    const system = view.texts('system', 0);
    expect(system).toContain('R.Gt.');
    expect(system).toContain('Ld.Gt.');
    view.dispose();
  });

  it('draws both copyright lines in the footer', () => {
    const view = render([0]);
    expect(view.texts('footer', 0)).toEqual([
      'Original music for OpenTabz · AGPL-3.0-or-later',
      'Free to play, share and adapt.',
    ]);
    view.dispose();
  });

  it('shows exactly the selected tracks', () => {
    const one = render([1]);
    const two = render([0, 1]);
    const all = render([0, 1, 2, 3]);
    const height = (view: ReturnType<typeof render>) =>
      view.layout.partials.filter(p => p.kind === 'system').reduce((sum, p) => sum + p.height, 0);
    expect(one.texts('system', 0)).not.toContain('R.Gt.');
    expect(height(one)).toBeLessThan(height(two));
    expect(height(two)).toBeLessThan(height(all));
    for (const view of [one, two, all]) view.dispose();
  });
});
