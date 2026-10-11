/**
 * The key to the drums (REND-318): off until asked for; then, under the title block, a staff for
 * each drum track shown with every sound the track plays, from the top of the staff down, on the
 * line or space and in the notehead the score writes it with, named as Guitar Pro names it; in
 * rows as wide as the music, each key named after its track when several are shown.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { playedSounds } from '../src/render/drum-key.ts';
import { RenderSession } from '../src/render/session.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { type Mark, readMarks } from './engraving.ts';
import { readFixture } from './helpers.ts';

const shuffle = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex').score;
const DRUMS = 3;
/** alphaTab's staff space at 100 %. */
const SPACE = 9;

function render(options: Partial<ViewOptions>, score = shuffle) {
  const session = new RenderSession(score, {
    trackIndexes: [DRUMS],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 900,
    notationScale: 1,
    ...options,
  });
  try {
    const layout = session.layout();
    const painted = session.paint(layout.partials.map(partial => partial.id));
    const partials = layout.partials.map(partial => ({
      partial,
      marks: readMarks(painted.find(paint => paint.id === partial.id)?.svg ?? '', 0, partial.y, partial.kind),
    }));
    return { layout, partials, key: partials.find(entry => entry.partial.id.startsWith('ot-block-')) };
  } finally {
    session.dispose();
  }
}

/** Middles of the staff lines among the marks: long thin rectangles. */
function staffLines(marks: readonly Mark[]): number[] {
  return marks
    .filter(mark => mark.kind === 'rect' && mark.width > 60 && mark.height < 3)
    .map(mark => mark.y + mark.height / 2)
    .sort((a, b) => a - b);
}

/**
 * The key's names, a sound's lines joined, row by row and left to right: a name's lines are centred
 * on its sound, one under another.
 */
function names(marks: readonly Mark[]): string[] {
  const lines = marks.filter(mark => mark.kind === 'text').sort((a, b) => a.y - b.y);
  const found: { centre: number; top: number; bottom: number; lines: string[] }[] = [];
  for (const line of lines) {
    const centre = Math.round(line.x + line.width / 2);
    const name = found.find(entry => entry.centre === centre && line.y - entry.bottom < line.height * 2);
    if (name === undefined) found.push({ centre, top: line.y, bottom: line.y, lines: [line.name] });
    else {
      name.lines.push(line.name);
      name.bottom = line.y;
    }
  }
  return found
    .sort((a, b) => Math.round(a.top - b.top) || a.centre - b.centre)
    .map(name => name.lines.join(' '));
}

/** Noteheads as "glyph@steps": their glyph and their place in half spaces below the top line. */
function placed(marks: readonly Mark[], top: number): string[] {
  return marks
    .filter(mark => mark.kind === 'glyph' && mark.name.startsWith('Notehead'))
    .map(mark => `${mark.name}@${Math.round(((mark.y - top) / SPACE) * 2)}`);
}

describe('the key to the drums (REND-318)', () => {
  it('lists the sounds a track plays, from the top of the staff down', () => {
    const track = shuffle.tracks[DRUMS];
    expect(track).toBeDefined();
    if (track === undefined) return;
    expect(playedSounds(track).map(sound => sound.name)).toEqual([
      'Crash high (hit)',
      'Hi-Hat (closed)',
      'Hi-Hat (open)',
      'High Tom (hit)',
      'Snare (hit)',
      'Mid Tom (hit)',
      'Low Tom (hit)',
      'Kick (hit)',
    ]);
  });

  it('is left out until asked for', () => {
    expect(render({}).key).toBeUndefined();
    expect(render({ drumKey: false }).key).toBeUndefined();
  });

  it('writes each sound where and as the score writes it, named under the staff', () => {
    const { key, partials, layout } = render({ drumKey: true });
    expect(key).toBeDefined();
    if (key === undefined) return;
    // Under the title block, before the music, which moves down to make room.
    const kinds = layout.partials.map(partial => (partial === key.partial ? 'key' : partial.kind));
    expect(kinds.indexOf('key')).toBe(kinds.indexOf('system') - 1);
    expect(key.marks.some(mark => mark.name === 'UnpitchedPercussionClef1')).toBe(true);

    const lines = staffLines(key.marks);
    expect(lines).toHaveLength(5);
    const top = lines[0] ?? 0;
    expect((lines[4] ?? 0) - top).toBeCloseTo(4 * SPACE, 0);
    const inKey = placed(key.marks, top);
    expect(inKey).toHaveLength(8);
    // The score's noteheads, system by system, are on the key's steps; and but for longer notes'
    // own heads (a whole note's), they are the key's.
    const inScore = new Set(
      partials
        .filter(entry => entry.partial.kind === 'system')
        .flatMap(entry => placed(entry.marks, staffLines(entry.marks)[0] ?? 0)),
    );
    const steps = (heads: Iterable<string>) =>
      [...new Set([...heads].map(head => head.split('@')[1]))].sort();
    expect(steps(inScore)).toEqual(steps(inKey));
    const short = [...inScore].filter(head => !/Whole|Half/.test(head));
    expect(short.length).toBeGreaterThan(5);
    expect(short.filter(head => !inKey.includes(head))).toEqual([]);
    // The crash on a ledger line above the staff: one short line over the staff.
    expect(
      key.marks.filter(mark => mark.kind === 'rect' && mark.width < 30 && mark.y < top - SPACE / 2),
    ).toHaveLength(1);

    // The names, left to right in the key's order, under the staff.
    expect(names(key.marks)).toEqual([
      'Crash high (hit)',
      'Hi-Hat (closed)',
      'Hi-Hat (open)',
      'High Tom (hit)',
      'Snare (hit)',
      'Mid Tom (hit)',
      'Low Tom (hit)',
      'Kick (hit)',
    ]);
    expect(key.marks.filter(mark => mark.kind === 'text').every(mark => mark.y > top + 4 * SPACE)).toBe(true);
  });

  it('runs on in rows as wide as the music, a key per drum track named after it', () => {
    const sounds = [
      'CrashHighHit',
      'ChinaHit',
      'SplashHit',
      'RideMiddle',
      'RideBell',
      'HiHatClosed',
      'HiHatHalf',
      'HiHatOpen',
      'HighTomHit',
      'MidTomHit',
      'SnareHit',
      'SnareSideStick',
      'LowTomHit',
      'HighFloorTomHit',
      'KickHit',
      'PedalHiHatHit',
    ];
    const drums = (name: string) =>
      [
        `\\track "${name}" {instrument percussion}`,
        '\\articulation defaults',
        `:4 ${sounds.join(' ')} |`,
      ].join('\n');
    const two = openScore(
      new TextEncoder().encode(`${drums('Kit')}\n${drums('Second kit')}`),
      'kits.atex',
    ).score;
    const { key } = render({ trackIndexes: [0, 1], drumKey: true, width: 500 }, two);
    expect(key).toBeDefined();
    if (key === undefined) return;
    const clefs = key.marks.filter(mark => mark.name === 'UnpitchedPercussionClef1');
    // Sixteen sounds do not fit across 500 pixels: each key takes several rows.
    expect(clefs.length).toBeGreaterThanOrEqual(4);
    const written = names(key.marks);
    expect(written).toContain('Kit');
    expect(written).toContain('Second kit');
    expect(written.filter(text => text === 'Pedal Hi-Hat (hit)')).toHaveLength(2);
    // Every name fits the width.
    expect(key.marks.filter(mark => mark.kind === 'text').every(mark => mark.x + mark.width <= 500 + 1)).toBe(
      true,
    );
  });

  it('is left out for tracks without drums and in the horizontal layout', () => {
    expect(render({ trackIndexes: [0], drumKey: true }).key).toBeUndefined();
    expect(render({ drumKey: true, layout: 'horizontal' }).key).toBeUndefined();
  });
});
