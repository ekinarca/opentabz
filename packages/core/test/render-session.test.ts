import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import { SCORE_COLOR_SENTINELS } from '../src/shared/score-colors.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

const BASE: ViewOptions = {
  trackIndexes: [0],
  layout: 'page',
  systemsLayout: 'auto',
  staffDisplay: 'default',
  width: 760,
  notationScale: 1,
};

function sessionFor(path: string, options: Partial<ViewOptions> = {}): RenderSession {
  const { score } = openScore(readFixture(path), path);
  return new RenderSession(score, { ...BASE, ...options });
}

describe('RenderSession', () => {
  it('lays out header blocks, one partial per system and the credit annotation', () => {
    const session = sessionFor('alphatab/guitarpro7/effects.gp');
    const layout = session.layout();
    const kinds = layout.partials.map(p => p.kind);
    expect(kinds[0]).toBe('header');
    expect(kinds.at(-1)).toBe('credit');
    const systems = layout.partials.filter(p => p.kind === 'system');
    expect(systems.length).toBeGreaterThan(3);
    // Systems tile the bars in order without gaps.
    expect(systems[0]?.firstBar).toBe(0);
    for (let i = 1; i < systems.length; i++) {
      expect(systems[i]?.firstBar).toBe((systems[i - 1]?.lastBar ?? -2) + 1);
      expect(systems[i]?.y).toBeGreaterThanOrEqual(
        (systems[i - 1]?.y ?? 0) + (systems[i - 1]?.height ?? 0) - 1,
      );
    }
    expect(layout.width).toBe(760);
    expect(layout.height).toBeGreaterThan(systems.at(-1)?.y ?? 0);
    session.dispose();
  });

  it('EXP-026: lays out only the bars asked for (an export of the selection)', () => {
    const whole = sessionFor('alphatex/demos/twelve-bar-shuffle.atex').layout();
    expect(whole.partials.filter(p => p.kind === 'system').at(-1)?.lastBar).toBe(12);
    const session = sessionFor('alphatex/demos/twelve-bar-shuffle.atex', { bars: { first: 8, last: 11 } });
    const systems = session.layout().partials.filter(p => p.kind === 'system');
    expect(systems[0]?.firstBar).toBe(8);
    expect(systems.at(-1)?.lastBar).toBe(11);
    // Another range lays out again.
    const other = session
      .layout({ ...BASE, bars: { first: 0, last: 1 } })
      .partials.filter(p => p.kind === 'system');
    expect([other[0]?.firstBar, other.at(-1)?.lastBar]).toEqual([0, 1]);
    session.dispose();
  });

  it('paints SVG with themable sentinel colours and nothing hard-coded black for staff lines', () => {
    const session = sessionFor('alphatab/guitarpro7/notes.gp');
    const layout = session.layout();
    const system = layout.partials.find(p => p.kind === 'system');
    expect(system).toBeDefined();
    const [painted] = session.paint([system?.id ?? '']);
    expect(painted?.svg).toMatch(/^<svg/);
    expect(painted?.svg).toContain(`"${SCORE_COLOR_SENTINELS['staff-line']}"`);
    expect(painted?.svg).not.toContain('"#A5A5A5"');
    expect(painted?.svg).not.toContain('"#C80000"');
    session.dispose();
  });

  it('ignores ids from other generations and unknown ids', () => {
    const session = sessionFor('alphatab/guitarpro7/notes.gp');
    const first = session.layout();
    const second = session.layout({ ...BASE, width: 600 });
    expect(second.generation).toBe(first.generation + 1);
    expect(session.paint(['not-a-partial'])).toEqual([]);
    session.dispose();
  });

  it('uses the resize path when only the width changes and re-lays out otherwise', () => {
    const session = sessionFor('alphatab/guitarpro7/effects.gp', { layout: 'scroll' });
    const wide = session.layout();
    const narrow = session.layout({ ...BASE, layout: 'scroll', width: 420 });
    const wideSystems = wide.partials.filter(p => p.kind === 'system').length;
    const narrowSystems = narrow.partials.filter(p => p.kind === 'system').length;
    expect(narrowSystems).toBeGreaterThan(wideSystems);
    expect(narrow.width).toBe(420);
    session.dispose();
  });

  it('renders tablature only when asked and restores the document flags', () => {
    const { score } = openScore(readFixture('alphatab/guitarpro7/notes.gp'), 'notes.gp');
    const staff = score.tracks[0]?.staves[0];
    const before = { standard: staff?.showStandardNotation, tab: staff?.showTablature };
    const both = new RenderSession(score, { ...BASE, staffDisplay: 'score-tab' }).layout();
    const tabOnly = new RenderSession(score, { ...BASE, staffDisplay: 'tab' }).layout();
    const height = (l: typeof both) =>
      l.partials.filter(p => p.kind === 'system').reduce((sum, p) => sum + p.height, 0);
    expect(height(tabOnly)).toBeLessThan(height(both));
    expect({ standard: staff?.showStandardNotation, tab: staff?.showTablature }).toEqual(before);
  });

  it('renders standard notation only when asked: no tablature lines in the painted system', () => {
    const { score } = openScore(readFixture('alphatab/guitarpro7/notes.gp'), 'notes.gp');
    const paintFirstSystem = (staffDisplay: ViewOptions['staffDisplay']) => {
      const session = new RenderSession(score, { ...BASE, staffDisplay });
      const layout = session.layout();
      const first = layout.partials.find(p => p.kind === 'system');
      const svg = first === undefined ? '' : (session.paint([first.id])[0]?.svg ?? '');
      session.dispose();
      return { svg, height: first?.height ?? 0 };
    };
    const both = paintFirstSystem('score-tab');
    const scoreOnly = paintFirstSystem('score');
    const tabOnly = paintFirstSystem('tab');
    expect(scoreOnly.height).toBeLessThan(both.height);
    // Tablature numbers are text; the notation-only system has none of the tab staff's frets.
    const tabTexts = (svg: string) => (svg.match(/<text[^>]*>\d+<\/text>/g) ?? []).length;
    expect(tabTexts(tabOnly.svg)).toBeGreaterThan(0);
    expect(tabTexts(scoreOnly.svg)).toBeLessThan(tabTexts(both.svg));
  });

  it('honours the file systems layout in model mode', () => {
    const session = sessionFor('alphatab/guitarpro7/layout-configuration-multi-track-1.gp', {
      systemsLayout: 'model',
    });
    const layout = session.layout();
    expect(layout.partials.some(p => p.kind === 'system')).toBe(true);
    session.dispose();
  });

  it('lays out the horizontal layout as a single row of chunks', () => {
    const session = sessionFor('alphatab/guitarpro7/effects.gp', { layout: 'horizontal' });
    const layout = session.layout();
    const systems = layout.partials.filter(p => p.kind === 'system');
    expect(systems.length).toBeGreaterThan(1);
    expect(new Set(systems.map(p => p.y)).size).toBe(1);
    expect(layout.width).toBeGreaterThan(760);
    session.dispose();
  });

  it('refuses to work after disposal', () => {
    const session = sessionFor('alphatab/guitarpro7/notes.gp');
    session.dispose();
    expect(() => session.layout()).toThrow(/disposed/);
  });

  it('escapes markup coming from files (titles, texts, lyrics)', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const tex = `\\title "${hostile}"\n\\track "<script>x</script>"\n:4 0.6{txt "${hostile}"} 2.5 2.4 0.3 |`;
    const { score } = openScore(new TextEncoder().encode(tex), 'hostile.atex');
    const session = new RenderSession(score, BASE);
    const layout = session.layout();
    const svg = session
      .paint(layout.partials.map(p => p.id))
      .map(p => p.svg)
      .join('');
    expect(svg).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(svg).not.toContain('<img');
    expect(svg).not.toContain('<script');
    session.dispose();
  });
});
