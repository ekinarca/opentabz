/**
 * Saving as a Guitar Pro 7/8 file (EDIT-064): every public fixture, saved and opened again, has the
 * same music — tracks and tunings, bars and their meters, repeats and endings, every beat's length
 * and every note's fret or pitch and techniques, bends and whammy bars at the same height (a longer
 * curve of Guitar Pro 3–5 written as the nearest of Guitar Pro 7's, alphaTab patch 0059). A key
 * signature is the bar's, for every track, as Guitar Pro keeps it. Saving leaves the document as it
 * was, and an edited score opens again as edited.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { ScoreEditor } from '../src/edit/editor.ts';
import { saveGuitarPro } from '../src/export/guitar-pro.ts';
import { openScore } from '../src/open/open.ts';
import { fingerprint } from './fingerprint.ts';
import { listFixtures, readFixture } from './helpers.ts';

const FIXTURES = [
  ...listFixtures('alphatab', /\.(gp[345x]?|mxl|xml)$/),
  ...listFixtures('musicxml', /\.(xml|musicxml)$/),
  ...listFixtures('capella', /\.(capx|capxml)$/),
  ...listFixtures('alphatex', /\.atex$/),
];

/** The farthest a curve goes from where it starts, or null without one. */
function peak(points: readonly alphaTab.model.BendPoint[] | null): number | null {
  const origin = points?.[0];
  if (points === null || origin === undefined) return null;
  return points.reduce(
    (far, point) => (Math.abs(point.value - origin.value) > Math.abs(far - origin.value) ? point.value : far),
    origin.value,
  );
}

/** The music of a score, as lines to compare. */
function music(score: alphaTab.model.Score): string[] {
  const lines = [
    JSON.stringify(['score', score.title, score.artist, score.album, score.tempo]),
    ...score.masterBars.map(bar =>
      JSON.stringify([
        'bar',
        bar.index,
        bar.timeSignatureNumerator,
        bar.timeSignatureDenominator,
        bar.isRepeatStart,
        bar.repeatCount,
        bar.alternateEndings,
        bar.tripletFeel,
        bar.section?.text ?? null,
        bar.isAnacrusis,
        bar.tempoAutomations.map(tempo => tempo.value),
        // The key, as the first track writes it: Guitar Pro keeps one for every track.
        score.tracks[0]?.staves[0]?.bars[bar.index]?.keySignature ?? null,
      ]),
    ),
  ];
  for (const track of score.tracks) {
    lines.push(JSON.stringify(['track', track.index, track.name, track.playbackInfo.program]));
    for (const staff of track.staves) {
      lines.push(
        JSON.stringify([
          'staff',
          track.index,
          staff.index,
          staff.tuning,
          staff.capo,
          staff.transpositionPitch,
          staff.isPercussion,
          staff.showTablature,
          staff.showStandardNotation,
        ]),
      );
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const at = [track.index, staff.index, bar.index, voice.index, beat.index];
            lines.push(
              JSON.stringify([
                'beat',
                ...at,
                beat.duration,
                beat.dots,
                beat.tupletNumerator,
                beat.tupletDenominator,
                beat.isRest,
                beat.isEmpty,
                beat.graceType,
                beat.text,
                beat.dynamics,
                beat.slashed,
                beat.vibrato,
                beat.brushType,
                beat.pickStroke,
                peak(beat.whammyBarPoints),
              ]),
            );
            for (const note of beat.notes) {
              lines.push(
                JSON.stringify([
                  'note',
                  ...at,
                  note.isStringed
                    ? `${String(note.string)}:${String(note.fret)}`
                    : note.isPiano
                      ? `${String(note.octave)}:${String(note.tone)}`
                      : `drum ${String(note.percussionArticulation)}`,
                  note.isTieDestination,
                  note.isDead,
                  note.isGhost,
                  note.harmonicType,
                  note.vibrato,
                  note.slideOutType,
                  note.slideInType,
                  note.isHammerPullOrigin,
                  note.isLetRing,
                  note.isPalmMute,
                  note.accentuated,
                  note.isStaccato,
                  note.isTrill,
                  peak(note.bendPoints),
                ]),
              );
            }
          }
        }
      }
    }
  }
  return lines;
}

function saved(score: alphaTab.model.Score): alphaTab.model.Score {
  return openScore(saveGuitarPro(score), 'saved.gp').score;
}

describe('saving as a Guitar Pro file (EDIT-064)', () => {
  it.each(FIXTURES)('keeps the music of %s', path => {
    const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
    expect(music(saved(score))).toEqual(music(score));
  });

  it('keeps long bends and whammy bars at the height they reach (alphaTab patch 0059)', () => {
    const { score } = openScore(readFixture('alphatab/guitarpro5/bends.gp5'), 'bends.gp5');
    const long = score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[1]?.notes[0];
    expect(long?.bendPoints?.length).toBeGreaterThan(4);
    const again = saved(score).tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[1]?.notes[0];
    expect(again?.hasBend).toBe(true);
    expect(peak(again?.bendPoints ?? null)).toBe(peak(long?.bendPoints ?? null));
  });

  it('leaves the document as it was', () => {
    const { score } = openScore(readFixture('alphatab/guitarpro5/effects.gp5'), 'effects.gp5');
    const before = fingerprint(score);
    saveGuitarPro(score);
    expect(fingerprint(score)).toBe(before);
  });

  it('opens an edited score again as it was edited', () => {
    const { score } = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex');
    const editor = new ScoreEditor(score, new alphaTab.Settings());
    const at = { track: 0, staff: 0, bar: 2, voice: 0, beat: 1 };
    editor.apply([{ kind: 'set-fret', at: { ...at, string: 6 }, fret: 23 }]);
    editor.apply([{ kind: 'set-duration', at, duration: 16, dots: 1 }]);
    editor.apply([{ kind: 'remove-beat', at: { ...at, bar: 3, beat: 0 } }]);
    editor.apply([{ kind: 'insert-beat', at: { ...at, bar: 4, beat: 2 } }]);
    const again = saved(score);
    expect(music(again)).toEqual(music(score));
    expect(again.tracks[0]?.staves[0]?.bars[2]?.voices[0]?.beats[1]?.getNoteOnString(6)?.fret).toBe(23);
  });
});
