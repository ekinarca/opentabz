/** A blank score (COMP-001): ready to write in, and the same once saved and opened again. */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { BLANK_BARS, blankScore } from '../src/document/blank.ts';
import { ScoreEditor } from '../src/edit/editor.ts';
import { EngineHost } from '../src/engine/host.ts';
import { openScore } from '../src/open/open.ts';

describe('a blank score', () => {
  it('is a guitar in standard tuning, in notation and tablature, with empty bars of 4/4 at 120', () => {
    const host = new EngineHost();
    const { bytes } = host.blankDocument({ title: 'Untitled' });
    const opened = host.open({ name: 'Untitled.gp', bytes });
    if (!opened.ok) throw new Error(opened.error.detail);
    const { summary } = opened;
    expect(summary.title).toBe('Untitled');
    expect(summary.tracks).toHaveLength(1);
    expect(summary.tracks[0]?.staves[0]).toMatchObject({ stringCount: 6, isPercussion: false });
    expect(summary.masterBars).toHaveLength(BLANK_BARS);
    const { score } = openScore(
      new Uint8Array(host.blankDocument({ title: 'Untitled' }).bytes),
      'Untitled.gp',
    );
    expect(score.tempo).toBe(120);
    expect(score.tracks[0]?.staves[0]?.tuning).toEqual([64, 59, 55, 50, 45, 40]);
    expect(score.tracks[0]?.staves[0]?.showTablature).toBe(true);
    expect(score.tracks[0]?.staves[0]?.showStandardNotation).toBe(true);
    for (const bar of score.tracks[0]?.staves[0]?.bars ?? []) {
      expect(bar.masterBar.timeSignatureNumerator).toBe(4);
      expect(bar.masterBar.timeSignatureDenominator).toBe(4);
      expect(bar.isEmpty).toBe(true);
    }
  });

  it('takes the first note written in it', () => {
    const score = blankScore('Untitled');
    const editor = new ScoreEditor(score, new alphaTab.Settings());
    editor.apply([
      { kind: 'set-fret', at: { track: 0, staff: 0, bar: 0, voice: 0, beat: 0, string: 1 }, fret: 3 },
    ]);
    const beat = score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[0];
    expect(beat?.isEmpty).toBe(false);
    expect(beat?.getNoteOnString(1)?.fret).toBe(3);
    expect(beat?.duration).toBe(alphaTab.model.Duration.Quarter);
  });
});
