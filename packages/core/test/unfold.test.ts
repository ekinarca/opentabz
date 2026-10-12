/**
 * Scores with their repeats and jumps written out (REND-319): every bar as often and in the order
 * playback visits it, with no repeat signs, endings or jumps left, sections going with each pass,
 * every beat a beat of its own; as a Guitar Pro 7 file the engine opens as a document of its own.
 */
import { describe, expect, it } from 'vitest';
import { hasRepeats, unfoldScore } from '../src/document/unfold.ts';
import { EngineHost } from '../src/engine/host.ts';
import { openScore } from '../src/open/open.ts';
import { generatePlayback } from '../src/playback/generate.ts';
import { TIMELINE_BAR_STRIDE } from '../src/shared/playback.ts';

/** A flute playing one whole note a bar, its pitch naming the bar (C4 for the first…). */
const PITCHES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
function flute(...bars: string[]) {
  const body = bars.map((tags, index) => `${tags} ${PITCHES[index] ?? 'C4'}.1`).join(' |\n');
  const tex = `\\title "Form"\n\\track "Flute" {instrument flute}\n\\staff {score}\n${body}`;
  return openScore(new TextEncoder().encode(tex), 'form.atex').score;
}

function order(score: ReturnType<typeof flute>): number[] {
  const { bars } = generatePlayback(score, 'unfold').timeline;
  const indexes: number[] = [];
  for (let at = 2; at < bars.length; at += TIMELINE_BAR_STRIDE) indexes.push(bars[at] ?? 0);
  return indexes;
}

/** The pitch each bar of a score plays. */
function pitches(score: ReturnType<typeof flute>): number[] {
  return (
    score.tracks[0]?.staves[0]?.bars.map(bar => bar.voices[0]?.beats[0]?.notes[0]?.realValue ?? -1) ?? []
  );
}

describe('scores with their repeats written out (REND-319)', () => {
  it('knows which scores have something to write out', () => {
    expect(hasRepeats(flute('', '', ''))).toBe(false);
    expect(hasRepeats(flute('\\ro', '\\rc 2', ''))).toBe(true);
    expect(hasRepeats(flute('', '\\jump fine', '\\jump daCapoAlFine'))).toBe(true);
  });

  it('writes out repeats and endings as they are played', () => {
    const score = flute('\\ro', '\\ae 1 \\rc 2', '\\ae 2', '');
    const played = order(score);
    expect(played).toEqual([0, 1, 0, 2, 3]);
    const unfolded = unfoldScore(score, played);
    expect(unfolded.masterBars).toHaveLength(5);
    expect(pitches(unfolded)).toEqual(played.map(index => pitches(score)[index]));
    // Nothing left to repeat or jump, and playback goes straight through.
    expect(hasRepeats(unfolded)).toBe(false);
    expect(order(unfolded)).toEqual([0, 1, 2, 3, 4]);
    // Every beat is a beat of its own.
    const ids = unfolded.tracks[0]?.staves[0]?.bars.flatMap(
      bar => bar.voices[0]?.beats.map(beat => beat.id) ?? [],
    );
    expect(new Set(ids).size).toBe(ids?.length);
    // The score as written is left as it was.
    expect(score.masterBars).toHaveLength(4);
    expect(score.masterBars[0]?.isRepeatStart).toBe(true);
  });

  it('follows jumps, and sections go with each pass', () => {
    const score = flute('\\section V "Verse"', '\\jump fine', '\\section B "Bridge"', '\\jump daCapoAlFine');
    const played = order(score);
    expect(played).toEqual([0, 1, 2, 3, 0, 1]);
    const unfolded = unfoldScore(score, played);
    expect(unfolded.masterBars.map(bar => bar.section?.text ?? null)).toEqual([
      'Verse',
      null,
      'Bridge',
      null,
      'Verse',
      null,
    ]);
    expect(unfolded.masterBars.every(bar => bar.directions === null || bar.directions.size === 0)).toBe(true);
  });

  it('gives the written-out score as a Guitar Pro file to open as a document', () => {
    const host = new EngineHost();
    const tex = `\\title "Form"\n\\track "Flute" {instrument flute}\n\\staff {score}\n\\ro C4.1 | \\rc 3 D4.1 | E4.1 |`;
    const opened = host.open({ name: 'form.atex', bytes: new TextEncoder().encode(tex).buffer });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.summary.hasRepeats).toBe(true);
    const { bytes } = host.unfoldDocument({ docId: opened.summary.id });
    const reopened = host.open({ name: 'form (unfolded).gp', bytes });
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.summary.format).toBe('gp');
    expect(reopened.summary.barCount).toBe(7);
    expect(reopened.summary.hasRepeats).toBe(false);
    expect(reopened.summary.title).toBe('Form');
  });
});
