/**
 * Four voices on a staff (REND-007): the stems of voices 1 and 3 up and of voices 2 and 4 down,
 * as Guitar Pro writes them; a rest of voice 3 that meets the other voices moves above them, the
 * rests of voices 2 and 4 below.
 */
import { describe, expect, it } from 'vitest';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

const TEX = [
  '\\track "Piano" {instrument acousticgrandpiano}',
  '\\staff {score}',
  '\\voice',
  ':4 C5 D5 E5 F5 |',
  '\\voice',
  ':4 E4 r F4 G4 |',
  '\\voice',
  ':4 A4 B4 r C5 |',
  '\\voice',
  ':4 r C4 D4 r |',
].join('\n');

/** Which way a notehead's stem points: up from its right side, or down from its left. */
function stemOf(view: Engraving, head: Mark): 'up' | 'down' | null {
  const stems = view.marks.filter(
    mark => mark.partial === 'system' && mark.kind === 'rect' && mark.width < 2 && mark.height > 15,
  );
  if (
    stems.some(
      stem => stem.x > head.x + 4 && stem.x < head.x + 12 && Math.abs(stem.y + stem.height - head.y) < 4,
    )
  )
    return 'up';
  if (stems.some(stem => Math.abs(stem.x - head.x) < 1 && Math.abs(stem.y - head.y) < 4)) return 'down';
  return null;
}

describe('four voices on a staff (REND-007)', () => {
  const view = engraveTex(TEX);
  const voices = [0, 1, 2, 3].map(voice => view.beats(0, 0, voice));
  const heads = (voice: number) =>
    (voices[voice] ?? []).flatMap(beat => view.drawnBy(beat).filter(mark => mark.name === 'NoteheadBlack'));
  const rests = (voice: number) =>
    (voices[voice] ?? []).flatMap(beat => view.drawnBy(beat).filter(mark => mark.name === 'RestQuarter'));

  it('points the stems of voices 1 and 3 up, of voices 2 and 4 down', () => {
    expect(heads(0).map(head => stemOf(view, head))).toEqual(['up', 'up', 'up', 'up']);
    expect(heads(1).map(head => stemOf(view, head))).toEqual(['down', 'down', 'down']);
    expect(heads(2).map(head => stemOf(view, head))).toEqual(['up', 'up', 'up']);
    expect(heads(3).map(head => stemOf(view, head))).toEqual(['down', 'down']);
  });

  it('moves a rest of voice 3 above the other voices, and the rests of 2 and 4 below', () => {
    const all = [0, 1, 2, 3].flatMap(heads).map(head => head.y);
    const [upper] = rests(2);
    expect(upper).toBeDefined();
    expect(upper?.y).toBeLessThan(Math.min(...all));
    const lower = [...rests(1), ...rests(3)];
    expect(lower).toHaveLength(3);
    for (const rest of lower) expect(rest.y).toBeGreaterThan(Math.max(...all));
  });
});
