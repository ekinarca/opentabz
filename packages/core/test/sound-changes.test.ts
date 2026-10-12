/**
 * Sound-change labels (REND-206): where a Guitar Pro 7+ sound automation changes a track's sound,
 * the score writes the sound's label (its own text, which need not be its name) over the beat it
 * fires on; not for the sound the track starts with, nor where the file hides it. A Guitar Pro
 * export keeps the label and whether it is shown.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { Engraving } from './engraving.ts';
import { readFixture } from './helpers.ts';

function open(path: string): alphaTab.model.Score {
  return openScore(readFixture(path), path.split('/').at(-1) ?? path).score;
}

/** Each text drawn among `names`, with the bar it starts in. */
function labels(view: Engraving, names: readonly string[]): [string, number][] {
  return view.marks
    .filter(mark => mark.kind === 'text' && names.includes(mark.name.trim()))
    .map(mark => {
      const system = view.systemOf(mark);
      const bar = view.bars.find(
        place => place.system === system && mark.x >= place.left - 1 && mark.x < place.right,
      );
      return [mark.name.trim(), bar?.index ?? -1];
    });
}

/** The sound change on a bar's first beat of the first track. */
function soundChange(score: alphaTab.model.Score, bar: number): alphaTab.model.Automation | null {
  return (
    score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats[0]?.getAutomation(
      alphaTab.model.AutomationType.Instrument,
    ) ?? null
  );
}

describe('sound-change labels (REND-206)', () => {
  it('writes the new sound’s label where it changes, not the sound the track starts with', () => {
    const view = new Engraving(open('alphatab/guitarpro7/program-change.gp'));
    expect(labels(view, ['Steel Mart', 'Overdriven Guitar'])).toEqual([['Overdriven Guitar', 2]]);
  });

  it('writes the label the file gives, which need not be the sound’s name', () => {
    // The second sound is named "Steel Mart(1)" and labelled "Steel Mart".
    const view = new Engraving(open('alphatab/guitarpro8/bank-change.gp'));
    expect(labels(view, ['Steel Mart', 'Steel Mart(1)'])).toEqual([['Steel Mart', 1]]);
  });

  it('leaves out a change the file hides, and keeps both through a Guitar Pro export', () => {
    const score = open('alphatab/guitarpro7/program-change.gp');
    const change = soundChange(score, 2);
    expect(change?.text).toBe('Overdriven Guitar');
    const exported = () =>
      openScore(new alphaTab.exporter.Gp7Exporter().export(score, new alphaTab.Settings()), 'export.gp')
        .score;
    expect(soundChange(exported(), 2)).toMatchObject({ text: 'Overdriven Guitar', isVisible: true });

    if (change !== null) change.isVisible = false;
    expect(labels(new Engraving(score), ['Overdriven Guitar'])).toEqual([]);
    expect(soundChange(exported(), 2)).toMatchObject({ text: 'Overdriven Guitar', isVisible: false });
  });
});
