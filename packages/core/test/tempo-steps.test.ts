/**
 * Tempo changes as Guitar Pro 3–5 and Capella files mean them (PLAY-023, alphaTab patch 0054): a
 * new tempo holds from where it is written on, a step; only Guitar Pro 7+ files ramp, with their
 * linear automations. A tempo change Guitar Pro 5.1 hides stays off the score.
 */
import * as alphaTab from '@coderline/alphatab';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { generatePlayback } from '../src/playback/generate.ts';
import { Engraving } from './engraving.ts';
import { readFixture } from './helpers.ts';
import { tempoChanges } from './playback-helpers.ts';

/** Where effects.gp5 writes bar 22's tempo change: the tempo's name (empty), then 120. */
const MIX_TEMPO = [0x01, 0, 0, 0, 0, 0x78, 0, 0, 0];

function indexOf(bytes: Uint8Array, pattern: readonly number[]): number {
  for (let at = 0; at + pattern.length <= bytes.length; at++) {
    if (pattern.every((byte, offset) => bytes[at + offset] === byte)) return at;
  }
  throw new Error('Pattern not found.');
}

/** effects.gp5, its tempo change edited: after the tempo come its transition and "hide" bytes. */
function effectsGp5(edit: (bytes: Uint8Array, tempoAt: number) => void): alphaTab.model.Score {
  const bytes = readFixture('alphatab/guitarpro5/effects.gp5').slice();
  edit(bytes, indexOf(bytes, MIX_TEMPO) + 5);
  return openScore(bytes, 'effects.gp5').score;
}

/** The tempos played from the start of one bar to the start of another, in score order. */
function temposBetween(score: alphaTab.model.Score, from: number, to: number): number[] {
  const playback = generatePlayback(score, 'tempo');
  const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(playback.midi);
  const start = score.masterBars[from]?.start ?? 0;
  const end = score.masterBars[to]?.start ?? 0;
  return tempoChanges(midi.tracks.flatMap(track => track.events))
    .filter(change => change.tick >= start && change.tick < end)
    .map(change => Math.round(change.bpm));
}

/** A later tempo change, flagged as the file's own was read. */
function changeLater(score: alphaTab.model.Score, from: number, to: number, value: number): void {
  const read = score.masterBars[from]?.tempoAutomations.at(-1);
  if (read === undefined) throw new Error(`No tempo change in bar ${from + 1}.`);
  // A quarter note's tempo (Guitar Pro's reference 2).
  const later = alphaTab.model.Automation.buildTempoAutomation(read.isLinear, 0, value, 2);
  score.masterBars[to]?.tempoAutomations.push(later);
}

describe('tempo changes of Guitar Pro 3–5 and Capella files (patch 0054)', () => {
  it('holds a Guitar Pro 3–5 tempo change from where it is written on', () => {
    for (const path of [
      'alphatab/guitarpro3/effects.gp3',
      'alphatab/guitarpro4/effects.gp4',
      'alphatab/guitarpro5/effects.gp5',
      'alphatab/guitarpro5/other-effects.gp5',
    ]) {
      const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
      const automations = score.masterBars.flatMap(bar => bar.tempoAutomations);
      expect(automations.length, path).toBeGreaterThan(1);
      expect(
        automations.every(automation => !automation.isLinear),
        path,
      ).toBe(true);
    }
    // Bar 22 at 180 and, as another change would be read, bar 26 at 60: 180 until then.
    const score = effectsGp5((bytes, tempoAt) => {
      bytes[tempoAt] = 180;
    });
    changeLater(score, 21, 25, 60);
    expect(new Set(temposBetween(score, 21, 25))).toEqual(new Set([180]));
    expect(temposBetween(score, 25, 26)[0]).toBe(60);
  });

  it('keeps a tempo change Guitar Pro 5.1 hides off the score', () => {
    const tempoMarks = (score: alphaTab.model.Score) =>
      new Engraving(score).marks.filter(mark => mark.kind === 'text' && /=\s*120/.test(mark.name)).length;
    const shown = effectsGp5(() => undefined);
    const hidden = effectsGp5((bytes, tempoAt) => {
      // The tempo's transition, then whether it is hidden.
      bytes[tempoAt + 5] = 1;
    });
    expect(shown.masterBars[21]?.tempoAutomations.at(-1)?.isVisible).toBe(true);
    expect(hidden.masterBars[21]?.tempoAutomations.at(-1)?.isVisible).toBe(false);
    expect(tempoMarks(hidden)).toBe(tempoMarks(shown) - 1);
  });

  it('holds a Capella tempo from where it is written on', () => {
    const archive = unzipSync(readFixture('capella/original-air.capx'));
    const xml = strFromU8(archive['score.xml'] ?? new Uint8Array());
    // The second system at 60: the first one's 96 holds until it.
    const edited = xml.replace(/<system>/, '<system tempo="60">');
    expect(edited).not.toBe(xml);
    const capx = zipSync({ 'score.xml': strToU8(edited) });
    const { score } = openScore(capx, 'original-air.capx');
    const changes = score.masterBars.flatMap(bar =>
      bar.tempoAutomations.map(automation => [bar.index, automation.value, automation.isLinear] as const),
    );
    expect(changes.map(([, value]) => value)).toContain(60);
    expect(changes.every(([, , linear]) => !linear)).toBe(true);
    const second = changes.find(([, value]) => value === 60)?.[0] ?? 0;
    expect(new Set(temposBetween(score, 0, second))).toEqual(new Set([96]));
  });
});
