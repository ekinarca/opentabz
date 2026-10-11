import * as alphaTab from '@coderline/alphatab';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES_DIR, listFixtures } from './helpers.ts';

interface Imported {
  readonly score: alphaTab.model.Score;
  readonly diagnostics: string[];
}

/** Imports alphaTex and returns every diagnostic of warning severity or worse. */
function importTex(path: string): Imported {
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.logErrors = false;
  importer.initFromString(readFileSync(join(FIXTURES_DIR, path), 'utf8'), new alphaTab.Settings());
  const score = importer.readScore();
  const diagnostics = [
    ...importer.lexerDiagnostics.items,
    ...importer.parserDiagnostics.items,
    ...importer.semanticDiagnostics.items,
  ]
    .filter(
      diagnostic => diagnostic.severity >= alphaTab.importer.alphaTex.AlphaTexDiagnosticsSeverity.Warning,
    )
    .map(diagnostic => `AT${diagnostic.code} line ${diagnostic.start?.line ?? '?'}: ${diagnostic.message}`);
  return { score, diagnostics };
}

/** Bars whose voices do not add up to the time signature (alphaTab does not check this). */
function badBars(score: alphaTab.model.Score): string[] {
  const problems: string[] = [];
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        const master = score.masterBars[bar.index];
        if (master === undefined) continue;
        const expected = master.calculateDuration();
        for (const voice of bar.voices) {
          if (voice.isEmpty) continue;
          const actual = voice.beats
            .filter(beat => beat.graceType === alphaTab.model.GraceType.None)
            .reduce((sum, beat) => sum + beat.displayDuration, 0);
          if (master.isAnacrusis ? actual > expected : actual !== expected) {
            problems.push(
              `${track.name} bar ${bar.index + 1} voice ${voice.index + 1}: ${actual} ticks, expected ${expected}`,
            );
          }
        }
      }
    }
  }
  return problems;
}

describe('alphaTex fixtures', () => {
  for (const path of listFixtures('alphatex', /\.atex$/)) {
    it(`${path} imports without diagnostics and with complete bars`, () => {
      const { score, diagnostics } = importTex(path);
      expect(diagnostics).toEqual([]);
      expect(badBars(score)).toEqual([]);
      expect(score.title.length).toBeGreaterThan(0);
    });
  }

  it('the shuffle demo has four tracks, swing feel and chord names', () => {
    const { score } = importTex('alphatex/demos/twelve-bar-shuffle.atex');
    expect(score.tracks.map(track => track.name)).toEqual(['Rhythm Guitar', 'Lead Guitar', 'Bass', 'Drums']);
    expect(score.masterBars).toHaveLength(13);
    expect(score.masterBars[0]?.tripletFeel).toBe(alphaTab.model.TripletFeel.Triplet8th);
    expect(score.tracks[3]?.staves[0]?.isPercussion).toBe(true);
    const lead = score.tracks[1]?.staves[0];
    const bends = lead?.bars.flatMap(bar =>
      bar.voices.flatMap(voice => voice.beats.flatMap(beat => beat.notes.filter(note => note.hasBend))),
    );
    expect(bends?.length).toBeGreaterThan(3);
  });

  it('greensleeves has a pickup bar, two voices and 31 bars', () => {
    const { score } = importTex('alphatex/demos/greensleeves.atex');
    expect(score.masterBars).toHaveLength(31);
    expect(score.masterBars[0]?.isAnacrusis).toBe(true);
    expect(score.tracks[0]?.staves[0]?.bars[1]?.voices.filter(voice => !voice.isEmpty)).toHaveLength(2);
  });

  it('the arpeggio study carries right- and left-hand fingering', () => {
    const { score } = importTex('alphatex/demos/arpeggio-study.atex');
    const notes =
      score.tracks[0]?.staves[0]?.bars.flatMap(
        bar => bar.voices[0]?.beats.flatMap(beat => beat.notes) ?? [],
      ) ?? [];
    expect(notes.some(note => note.rightHandFinger === alphaTab.model.Fingers.Thumb)).toBe(true);
    expect(notes.some(note => note.leftHandFinger === alphaTab.model.Fingers.LittleFinger)).toBe(true);
  });
});
