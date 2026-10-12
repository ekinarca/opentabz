/**
 * The editor's commands (EDIT-001) and their undo and redo (EDIT-060). Each command is checked for
 * what it writes; then, in every public fixture, runs of edits made at random places are undone
 * and redone one by one, and each time the score must be written exactly as it was (its
 * fingerprint) and alphaTab must have worked out the same from it (its links) — the same, too, as
 * when the edited score is opened afresh.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { copySelection } from '../src/edit/clip.ts';
import { moveChordName } from '../src/edit/transpose.ts';
import { harmonyOf } from '../src/edit/harmonize.ts';
import { byDegrees, byInterval, fifthsOf, movedKey, spell } from '../src/edit/spelling.ts';
import { readStaffBar } from '../src/edit/staff-bars.ts';
import { readBarProperties } from '../src/edit/bar-properties.ts';
import { collectTrackBeats } from '../src/edit/track-beats.ts';
import { SPELLING_ORDER } from '../src/shared/beats.ts';
import { EditError } from '../src/edit/commands.ts';
import { ScoreEditor } from '../src/edit/editor.ts';
import { openScore } from '../src/open/open.ts';
import {
  BAR_DIRECTIONS,
  CLEF_OTTAVAS,
  CLEFS,
  DURATION_VALUES,
  DYNAMICS,
  FINGERS,
  HARMONIES,
  SIMILES,
  STEMS,
  TUPLETS,
  type BarProperties,
  type BeatAddress,
  type BeatTechniques,
  type Clip,
  type EditCommand,
  type NoteTechniques,
  type Selection,
} from '../src/shared/edit.ts';
import { fingerprint } from './fingerprint.ts';
import { listFixtures, readFixture } from './helpers.ts';
import { links } from './score-links.ts';

function texScore(tex: string): alphaTab.model.Score {
  return openScore(new TextEncoder().encode(tex), 'edit.atex').score;
}

function editorOf(score: alphaTab.model.Score): ScoreEditor {
  return new ScoreEditor(score, new alphaTab.Settings());
}

const AT: BeatAddress = { track: 0, staff: 0, bar: 0, voice: 0, beat: 0 };

/** alphaTex's string (1 the highest) as alphaTab's model numbers it (1 the lowest), on six strings. */
function tex(string: number): number {
  return 7 - string;
}

function beat(score: alphaTab.model.Score, bar: number, index: number): alphaTab.model.Beat {
  const found = score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats[index];
  if (found === undefined) throw new Error(`No beat ${String(index)} in bar ${String(bar)}.`);
  return found;
}

/** A bar's beats: notes as fret.string (strings as alphaTex numbers them), "r" a rest, "-" empty. */
function written(score: alphaTab.model.Score, bar: number): string[] {
  return (score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats ?? []).map(each =>
    each.isEmpty
      ? '-'
      : each.notes.length === 0
        ? `r${String(each.duration)}`
        : [...each.notes]
            .sort((a, b) => b.string - a.string)
            .map(note => `${String(note.fret)}.${String(tex(note.string))}`)
            .join(' ') + `:${String(each.duration)}${'.'.repeat(each.dots)}`,
  );
}

describe('commands', () => {
  it('writes a note on a fret, moves it, takes it away', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 | r.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(2) }, fret: 7 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '7.2 5.3:4']);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 12 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '7.2 12.3:4']);
    editor.apply([{ kind: 'remove-note', at: { ...AT, string: tex(3) } }]);
    expect(written(score, 0)).toEqual(['r4', '7.2 12.3:4']);
    expect(beat(score, 0, 0).isRest).toBe(true);
  });

  it('writes the first note of an empty bar', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1');
    // alphaTex writes an empty bar as a bar without beats in its other voices; the first is ours.
    const editor = editorOf(score);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['-']);
    expect(score.tracks[0]?.staves[0]?.bars[1]?.isEmpty).toBe(true);
    editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 1, string: tex(6) }, fret: 0 }]);
    expect(written(score, 1)).toEqual(['0.6:4']);
    expect(score.tracks[0]?.staves[0]?.bars[1]?.isEmpty).toBe(false);
  });

  it('sets durations and dots', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-duration', at: { ...AT, beat: 1 }, duration: 8, dots: 1 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:8.', '7.3:4', '8.3:4']);
    expect(beat(score, 0, 2).playbackStart).toBe(960 + 720);
  });

  it('puts in a rest before a beat, or after the last, and in an empty bar', () => {
    const score = texScore('\\track "Guitar" 3.3.8 5.3.2 | 7.3.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 1 } }]);
    expect(written(score, 0)).toEqual(['3.3:8', 'r2', '5.3:2']);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 3 } }]);
    expect(written(score, 0)).toEqual(['3.3:8', 'r2', '5.3:2', 'r2']);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['r4']);
  });

  it('takes a beat away, and the only beat of a bar leaves it empty', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3 | 0.6.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, beat: 2 } }]);
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:4', '8.3:4']);
    expect(beat(score, 0, 2).playbackStart).toBe(1920);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['-']);
  });

  it('parts the notes joined to one taken away: a tied note sounds as written', () => {
    const score = texScore('\\track "Guitar" 5.3 -.3 7.3{h} 8.3');
    const editor = editorOf(score);
    expect(beat(score, 0, 1).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
    editor.apply([{ kind: 'remove-note', at: { ...AT, string: tex(3) } }]);
    const held = beat(score, 0, 1).notes[0];
    expect(held?.isTieDestination).toBe(false);
    expect(held?.tieOrigin).toBeNull();
    expect(held?.fret).toBe(5);
    // A hammer-on whose destination goes now reaches nothing; undone, it is back.
    editor.apply([{ kind: 'remove-beat', at: { ...AT, beat: 3 } }]);
    expect(beat(score, 0, 2).notes[0]?.isHammerPullOrigin).toBe(false);
    editor.undo();
    expect(beat(score, 0, 2).notes[0]?.isHammerPullOrigin).toBe(true);
    expect(beat(score, 0, 2).notes[0]?.hammerPullDestination).toBe(beat(score, 0, 3).notes[0]);
    editor.undo();
    expect(beat(score, 0, 1).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
  });

  it('a tied note written on a fret is played, no longer held', () => {
    const score = texScore('\\track "Guitar" 5.3 -.3');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 9 }]);
    const note = beat(score, 0, 1).notes[0];
    expect(note?.isTieDestination).toBe(false);
    expect(note?.fret).toBe(9);
    expect(beat(score, 0, 0).notes[0]?.tieDestination).toBeNull();
  });

  it('a note written between a tie joins the held note to it, as Guitar Pro ties to the note before', () => {
    const score = texScore('\\track "Guitar" 5.3.2 -.3.2');
    const editor = editorOf(score);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 1 } }]);
    expect(beat(score, 0, 2).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 7 }]);
    expect(beat(score, 0, 2).notes[0]?.tieOrigin).toBe(beat(score, 0, 1).notes[0]);
    expect(beat(score, 0, 2).notes[0]?.fret).toBe(7);
  });

  it('refuses what cannot be written, leaving the score as it was', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    const before = fingerprint(score);
    const refused: EditCommand[] = [
      { kind: 'set-fret', at: { ...AT, string: tex(7) }, fret: 3 },
      { kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 100 },
      { kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 1.5 },
      { kind: 'remove-note', at: { ...AT, string: tex(1) } },
      { kind: 'set-duration', at: AT, duration: 4, dots: 3 },
      { kind: 'insert-beat', at: { ...AT, beat: 5 } },
      { kind: 'remove-beat', at: { ...AT, bar: 1 } },
      { kind: 'set-fret', at: { ...AT, track: 1, string: tex(1) }, fret: 0 },
    ];
    for (const command of refused) {
      // One command made, the next refused: the edit is made whole or not at all.
      expect(() =>
        editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(1) }, fret: 3 }, command]),
      ).toThrow(EditError);
      expect(fingerprint(score)).toBe(before);
    }
    expect(editor.canUndo).toBe(false);
  });

  it('puts in an empty bar in every track, in the meter, clef and key of the bar it goes before', () => {
    const score = texScore(
      '\\track "Guitar" \\ts 3 4 \\ks D 3.3 5.3 7.3 | \\ts 4 4 8.3 8.3 8.3 8.3 \\track "Bass" 3.4.2 | 5.4.1',
    );
    const editor = editorOf(score);
    editor.apply([{ kind: 'insert-bar', bar: 1 }]);
    expect(score.masterBars).toHaveLength(3);
    expect(score.masterBars.map(bar => [bar.index, bar.timeSignatureNumerator])).toEqual([
      [0, 3],
      [1, 4],
      [2, 4],
    ]);
    expect(score.masterBars[1]?.start).toBe(3 * 960);
    for (const track of score.tracks) {
      const bars = track.staves[0]?.bars ?? [];
      expect(bars.map(bar => bar.index)).toEqual([0, 1, 2]);
      expect(bars[1]?.isEmpty).toBe(true);
      expect(bars[1]?.previousBar).toBe(bars[0]);
      expect(bars[1]?.nextBar).toBe(bars[2]);
      expect(bars[1]?.keySignature).toBe(bars[2]?.keySignature);
    }
    expect(written(score, 2)).toEqual(['8.3:4', '8.3:4', '8.3:4', '8.3:4']);
    // After the last: in the last bar's meter.
    editor.apply([{ kind: 'insert-bar', bar: 3 }]);
    expect(score.masterBars.map(bar => bar.timeSignatureNumerator)).toEqual([3, 4, 4, 4]);
    expect(() => editor.apply([{ kind: 'insert-bar', bar: 9 }])).toThrow(EditError);
  });

  it('takes a bar away from every track; the last one stays', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1 | 7.3.1 \\track "Bass" 3.4.1 | 5.4.1 | 7.4.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'remove-bar', bar: 1 }]);
    expect(score.masterBars).toHaveLength(2);
    expect(written(score, 1)).toEqual(['7.3:1']);
    expect(score.tracks[1]?.staves[0]?.bars.map(bar => bar.index)).toEqual([0, 1]);
    editor.apply([{ kind: 'remove-bar', bar: 0 }]);
    expect(() => editor.apply([{ kind: 'remove-bar', bar: 0 }])).toThrow('A score keeps at least one bar.');
    expect(written(score, 0)).toEqual(['7.3:1']);
    editor.undo();
    editor.undo();
    expect(score.masterBars).toHaveLength(3);
    expect(written(score, 1)).toEqual(['5.3:1']);
  });

  it('keeps repeats where they were as bars come and go', () => {
    const score = texScore('\\track "Guitar" \\ro 3.3.1 | \\rc 2 5.3.1 | 7.3.1');
    const editor = editorOf(score);
    // [repeat start, repeat count, bars in its repeat group], bar by bar.
    const repeats = () =>
      score.masterBars.map(bar => [bar.isRepeatStart, bar.repeatCount, bar.repeatGroup.masterBars.length]);
    expect(repeats()).toEqual([
      [true, 0, 3],
      [false, 2, 3],
      [false, 0, 3],
    ]);
    editor.apply([{ kind: 'insert-bar', bar: 1 }]);
    expect(repeats()).toEqual([
      [true, 0, 4],
      [false, 0, 4],
      [false, 2, 4],
      [false, 0, 4],
    ]);
    expect(score.masterBars.every(bar => bar.repeatGroup.masterBars.includes(bar))).toBe(true);
    editor.apply([{ kind: 'remove-bar', bar: 0 }]);
    expect(repeats()).toEqual([
      [false, 0, 3],
      [false, 2, 3],
      [false, 0, 3],
    ]);
    editor.undo();
    expect(repeats()).toEqual([
      [true, 0, 4],
      [false, 0, 4],
      [false, 2, 4],
      [false, 0, 4],
    ]);
  });

  it('sets a note’s techniques, and a tie on an empty string holds the note before on', () => {
    const score = texScore('\\track "Guitar" 5.3 7.3 7.3 r');
    const editor = editorOf(score);
    const note = (index: number) => beat(score, 0, index).getNoteOnString(tex(3));
    editor.apply([
      { kind: 'set-note', at: { ...AT, string: tex(3) }, techniques: { hammer: true, vibrato: 'slight' } },
    ]);
    expect(note(0)?.isHammerPullOrigin).toBe(true);
    expect(note(0)?.vibrato).toBe(alphaTab.model.VibratoType.Slight);
    // Joined to the next note on the string, as a hammer-on.
    expect(note(1)?.isHammerPullDestination).toBe(true);
    editor.apply([
      {
        kind: 'set-note',
        at: { ...AT, beat: 1, string: tex(3) },
        techniques: { palmMute: true, dead: true, harmonic: 'natural', accent: 'heavy', bend: 'full' },
      },
    ]);
    expect(note(1)).toMatchObject({
      isPalmMute: true,
      isDead: true,
      harmonicType: alphaTab.model.HarmonicType.Natural,
      accentuated: alphaTab.model.AccentuationType.Heavy,
      bendType: alphaTab.model.BendType.Bend,
    });
    expect(note(1)?.maxBendPoint?.value).toBe(4);
    editor.apply([{ kind: 'set-note', at: { ...AT, beat: 3, string: tex(3) }, techniques: { tie: true } }]);
    expect(note(3)?.isTieDestination).toBe(true);
    expect(note(3)?.tieOrigin).toBe(note(2));
    expect(note(3)?.fret).toBe(7);
    editor.apply([
      { kind: 'set-note', at: { ...AT, beat: 1, string: tex(3) }, techniques: { bend: 'none' } },
    ]);
    expect(note(1)?.hasBend).toBe(false);
    expect(() =>
      editor.apply([
        { kind: 'set-note', at: { ...AT, beat: 1, string: tex(1) }, techniques: { dead: true } },
      ]),
    ).toThrow('No note on string 6.');
  });

  it('sets a beat’s techniques: a triplet, strokes, tremolo picking', () => {
    const score = texScore('\\track "Guitar" 5.3.8 7.3.8 7.3.8 r.8 r.2');
    const editor = editorOf(score);
    for (const index of [0, 1, 2])
      editor.apply([{ kind: 'set-beat', at: { ...AT, beat: index }, techniques: { tuplet: 'triplet' } }]);
    expect(beat(score, 0, 0).tupletGroup?.beats).toHaveLength(3);
    editor.apply([{ kind: 'set-beat', at: AT, techniques: { stroke: 'down', tremolo: 3, slap: true } }]);
    expect(beat(score, 0, 0)).toMatchObject({
      pickStroke: alphaTab.model.PickStroke.Down,
      slap: true,
      isTremolo: true,
    });
    editor.apply([{ kind: 'set-beat', at: AT, techniques: { tremolo: 0 } }]);
    expect(beat(score, 0, 0).isTremolo).toBe(false);
    editor.undo();
    expect(beat(score, 0, 0).isTremolo).toBe(true);
    expect(() => editor.apply([{ kind: 'set-beat', at: AT, techniques: { tremolo: 9 } }])).toThrow(EditError);
  });

  it('sets a beat’s text, dynamics and beaming, and a note’s fingers and spelling (EDIT-012, EDIT-013, EDIT-043)', () => {
    const score = texScore('\\track "Guitar" 5.3.8 7.3.8 8.3.4 r.2');
    const editor = editorOf(score);
    editor.apply([
      {
        kind: 'set-beat',
        at: AT,
        techniques: { text: '  let it breathe ', dynamics: 'pp', beaming: 'split' },
      },
      {
        kind: 'set-note',
        at: { ...AT, beat: 2, string: tex(3) },
        techniques: { leftFinger: 'ring', rightFinger: 'index', spelling: 'flat' },
      },
    ]);
    expect(beat(score, 0, 0)).toMatchObject({
      text: 'let it breathe',
      dynamics: alphaTab.model.DynamicValue.PP,
      beamingMode: alphaTab.model.BeatBeamingMode.ForceSplitToNext,
    });
    // The beat's dynamics are its notes'.
    expect(beat(score, 0, 0).notes[0]?.dynamics).toBe(alphaTab.model.DynamicValue.PP);
    expect(beat(score, 0, 2).notes[0]).toMatchObject({
      leftHandFinger: alphaTab.model.Fingers.AnnularFinger,
      rightHandFinger: alphaTab.model.Fingers.IndexFinger,
      accidentalMode: alphaTab.model.NoteAccidentalMode.ForceFlat,
    });
    const listed = collectTrackBeats(score, 0);
    expect([...listed.beatMarks.slice(0, 2)]).toEqual([1, 1]);
    expect([...listed.noteMarks.slice(6, 9)]).toEqual([4, 2, 2]);
    expect(listed.texts).toEqual([[beat(score, 0, 0).id, 'let it breathe']]);
    editor.apply([{ kind: 'set-beat', at: AT, techniques: { text: '' } }]);
    expect(beat(score, 0, 0).text).toBeNull();
    expect(() => editor.apply([{ kind: 'set-beat', at: AT, techniques: { text: 'x'.repeat(201) } }])).toThrow(
      'A beat’s text is too long.',
    );
  });

  it('writes tuplets of three to thirteen, and stems up or down (EDIT-010, EDIT-106)', () => {
    const score = texScore('\\track "Guitar" 5.3.16 5.3.16 5.3.16 5.3.16 5.3.16 r.4 r.2');
    const editor = editorOf(score);
    editor.apply(
      [0, 1, 2, 3, 4].map(index => ({
        kind: 'set-beat' as const,
        at: { ...AT, beat: index },
        techniques: { tuplet: '5:4' as const, stem: 'down' as const },
      })),
    );
    expect(beat(score, 0, 0).tupletGroup?.beats).toHaveLength(5);
    expect(beat(score, 0, 0)).toMatchObject({
      tupletNumerator: 5,
      tupletDenominator: 4,
      preferredBeamDirection: alphaTab.rendering.BeamDirection.Down,
    });
    // Five sixteenths in the time of four: the rest after them starts on the second beat.
    expect(beat(score, 0, 5).playbackStart).toBe(960);
    const listed = collectTrackBeats(score, 0);
    expect([...listed.beatMarks.slice(2, 4)]).toEqual([2, 2]);
  });

  it('repeats the beat before over a beat, across the bar line (EDIT-094)', () => {
    const score = texScore('\\track "Guitar" 3.3.4 (5.2 7.3).8 r.8 r.2 | r.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'repeat-beat', at: { ...AT, beat: 2 } }]);
    expect(written(score, 0)).toEqual(['3.3:4', '5.2 7.3:8', '5.2 7.3:8', 'r2']);
    editor.apply([{ kind: 'repeat-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['r2']);
    expect(() => editor.apply([{ kind: 'repeat-beat', at: AT }])).toThrow('No beat before to repeat.');
  });

  it('retunes a track keeping its notes’ pitches: to drop D, and to a bass (EDIT-054)', () => {
    const score = texScore('\\track "Guitar" (3.6 2.5).4 (0.6 2.4).4 5.1.4 -.1.4 | 22.1.1');
    const editor = editorOf(score);
    const pitches = () =>
      score.tracks[0]?.staves[0]?.bars.flatMap(bar =>
        bar.voices[0]?.beats.map(each => each.notes.map(note => note.realValue).sort((a, b) => a - b)),
      );
    const before = pitches();
    // Drop D: the low E string a tone lower; its notes two frets higher.
    const dropD = [64, 59, 55, 50, 45, 38];
    editor.apply([{ kind: 'set-track', track: 0, properties: { tuning: dropD, keepPitches: true } }]);
    expect(pitches()).toEqual(before);
    expect(written(score, 0)[0]).toBe('2.5 5.6:4');
    expect(written(score, 0)[1]).toBe('2.4 2.6:4');
    // The tied note follows the note it holds on.
    expect(beat(score, 0, 3).notes[0]?.tieOrigin).toBe(beat(score, 0, 2).notes[0]);
    // A bass, four strings an octave down: the high notes go as far up the neck as they must.
    editor.undo();
    editor.apply([
      { kind: 'set-track', track: 0, properties: { tuning: [43, 38, 33, 28], keepPitches: true } },
    ]);
    expect(pitches()).toEqual(before);
    expect(
      score.tracks[0]?.staves[0]?.bars.every(bar =>
        bar.voices[0]?.beats.every(each => each.notes.every(note => note.string <= 4)),
      ),
    ).toBe(true);
    // Too high for any string: refused, as it was.
    const piccolo = texScore('\\track "Guitar" 99.1.1');
    expect(() =>
      editorOf(piccolo).apply([
        { kind: 'set-track', track: 0, properties: { tuning: [43, 38, 33, 28], keepPitches: true } },
      ]),
    ).toThrow('A note has no string to be played on in the new tuning.');
  });

  it('moves, copies and swaps the contents of voices in bars (EDIT-102)', () => {
    const score = texScore('\\track "Guitar" 3.3.2 5.3.2 | 7.3.1');
    const editor = editorOf(score);
    const contents = (bar: number, voice: number) =>
      (score.tracks[0]?.staves[0]?.bars[bar]?.voices[voice]?.beats ?? []).map(each =>
        each.isEmpty ? '-' : each.notes.map(note => note.fret).join(' '),
      );
    const move = {
      kind: 'voice-contents' as const,
      track: 0,
      staff: 0,
      fromBar: 0,
      toBar: 0,
      from: 0,
      to: 1,
    };
    editor.apply([{ ...move, mode: 'move' }]);
    expect(contents(0, 0)).toEqual(['-']);
    expect(contents(0, 1)).toEqual(['3', '5']);
    editor.apply([{ ...move, from: 1, to: 0, fromBar: 0, toBar: 1, mode: 'copy' }]);
    expect(contents(0, 0)).toEqual(['3', '5']);
    expect(contents(1, 0)).toEqual(['-']);
    editor.undo();
    editor.apply([{ ...move, toBar: 1, mode: 'swap' }]);
    expect(contents(0, 0)).toEqual(['3', '5']);
    expect(contents(0, 1)).toEqual(['-']);
    expect(contents(1, 1)).toEqual(['7']);
    expect(() => editor.apply([{ ...move, to: 4, mode: 'move' }])).toThrow('No voice 5.');
  });

  it('writes a track without strings and back, keeping pitches; names its tuning (EDIT-073, EDIT-076)', () => {
    const score = texScore('\\track "Guitar" (3.6 2.5).4 5.1.4 r.2');
    const editor = editorOf(score);
    const pitches = () =>
      score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats.map(each =>
        each.notes.map(note => note.realValue).sort((a, b) => a - b),
      );
    const before = pitches();
    editor.apply([{ kind: 'set-track', track: 0, properties: { tuning: [], keepPitches: true } }]);
    expect(pitches()).toEqual(before);
    expect(beat(score, 0, 0).notes.every(note => !note.isStringed && note.isPiano)).toBe(true);
    // Back on strings: the highest string that plays each note.
    editor.apply([
      {
        kind: 'set-track',
        track: 0,
        properties: { tuning: [64, 59, 55, 50, 45, 38], keepPitches: true, tuningName: 'Drop D' },
      },
    ]);
    expect(pitches()).toEqual(before);
    expect(beat(score, 0, 1).notes.map(note => [note.string, note.fret])).toEqual([[6, 5]]);
    expect(score.tracks[0]?.staves[0]?.stringTuning.name).toBe('Drop D');
    editor.apply([{ kind: 'set-track', track: 0, properties: { tuningName: 'Dropped' } }]);
    expect(score.tracks[0]?.staves[0]?.stringTuning.name).toBe('Dropped');
    editor.undo();
    expect(score.tracks[0]?.staves[0]?.stringTuning.name).toBe('Drop D');
  });

  it('puts voices in a staff, empty, to write in (EDIT-011)', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1');
    const editor = editorOf(score);
    const before = fingerprint(score);
    editor.apply([{ kind: 'add-voices', track: 0, staff: 0, count: 2 }]);
    const bars = score.tracks[0]?.staves[0]?.bars ?? [];
    expect(bars.map(bar => bar.voices.length)).toEqual([2, 2]);
    expect(bars.every(bar => bar.voices[1]?.beats[0]?.isEmpty === true)).toBe(true);
    // Written in the second voice, its beat is one.
    editor.apply([{ kind: 'set-fret', at: { ...AT, voice: 1, string: tex(5) }, fret: 2 }]);
    expect(bars[0]?.voices[1]?.beats[0]?.notes[0]?.fret).toBe(2);
    // Nothing to put in: no edit.
    expect(editor.apply([{ kind: 'add-voices', track: 0, staff: 0, count: 2 }])).toBeNull();
    expect(() => editor.apply([{ kind: 'add-voices', track: 0, staff: 0, count: 5 }])).toThrow(
      'A staff has 1 to 4 voices.',
    );
    editor.undo();
    editor.undo();
    expect(fingerprint(score)).toBe(before);
  });

  it('puts drum sounds on a beat and takes them off, by id or General MIDI key (EDIT-034, EDIT-115)', () => {
    const score = texScore(
      '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:4 KickHit r r r\n' +
        '\\track "Guitar" 3.3.1',
    );
    const editor = editorOf(score);
    const sounds = (index: number) =>
      (score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[index]?.notes ?? []).map(
        note => alphaTab.model.PercussionMapper.getArticulation(note)?.outputMidiNumber,
      );
    // GP5's way: the snare's key, 38; then the closed hi-hat by its id.
    editor.apply([{ kind: 'set-drum', at: AT, sound: 38, on: true }]);
    // The kick alphaTex writes is GM's 35.
    expect(sounds(0)).toEqual([35, 38]);
    const hiHat = [...alphaTab.model.PercussionMapper.instrumentArticulations.values()].find(
      articulation => articulation.outputMidiNumber === 42,
    );
    editor.apply([{ kind: 'set-drum', at: { ...AT, beat: 1 }, sound: hiHat?.uniqueId ?? '', on: true }]);
    expect(sounds(1)).toEqual([42]);
    expect(beat(score, 0, 1).isRest).toBe(false);
    // Taken off; already off, nothing to do.
    editor.apply([{ kind: 'set-drum', at: AT, sound: 35, on: false }]);
    expect(sounds(0)).toEqual([38]);
    expect(editor.apply([{ kind: 'set-drum', at: AT, sound: 35, on: false }])).toBeNull();
    const listed = collectTrackBeats(score, 0);
    expect(listed.drumNames.map(([, name]) => name).sort()).toEqual(['Hi-Hat (closed)', 'Snare (hit)']);
    expect(listed.drumSounds.filter(sound => sound !== '')).toHaveLength(2);
    expect(() => editor.apply([{ kind: 'set-drum', at: { ...AT, track: 1 }, sound: 38, on: true }])).toThrow(
      'The staff is not a drum staff.',
    );
    expect(() => editor.apply([{ kind: 'set-drum', at: AT, sound: 'Cowbell.999', on: true }])).toThrow(
      'No drum sound "Cowbell.999".',
    );
  });

  it('writes directions at bars: Segno, Coda, Fine, D.S. al Coda (EDIT-025)', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 3.3.1 | 3.3.1 | 3.3.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-bar', bar: 1, properties: { directions: ['segno'] } }]);
    editor.apply([{ kind: 'set-bar', bar: 3, properties: { directions: ['dal-segno-al-fine', 'fine'] } }]);
    expect(readBarProperties(score, 1).directions).toEqual(['segno']);
    expect(readBarProperties(score, 3).directions).toEqual(['fine', 'dal-segno-al-fine']);
    editor.apply([{ kind: 'set-bar', bar: 1, properties: { directions: [] } }]);
    expect(score.masterBars[1]?.directions).toBeNull();
    editor.undo();
    expect(readBarProperties(score, 1).directions).toEqual(['segno']);
  });

  it('sets a bar’s meter and key to the next bar with its own, and its tempo, repeats and section', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 3.3.1 | 3.3.1 | \\ts 3 4 3.3.2 {d} | 3.3.2 {d}');
    const editor = editorOf(score);
    editor.apply([
      {
        kind: 'set-bar',
        bar: 1,
        properties: { meter: { numerator: 6, denominator: 8 }, key: { signature: -3, minor: true } },
      },
    ]);
    expect(
      score.masterBars.map(
        bar => `${String(bar.timeSignatureNumerator)}/${String(bar.timeSignatureDenominator)}`,
      ),
    ).toEqual(['4/4', '6/8', '6/8', '3/4', '3/4']);
    expect(score.tracks[0]?.staves[0]?.bars.map(bar => bar.keySignature)).toEqual([0, -3, -3, -3, -3]);
    expect(score.tracks[0]?.staves[0]?.bars[2]?.keySignatureType).toBe(alphaTab.model.KeySignatureType.Minor);
    editor.apply([
      {
        kind: 'set-bar',
        bar: 2,
        properties: {
          tempo: 90,
          repeatStart: true,
          section: { marker: 'B', text: 'Chorus' },
          barLine: 'double',
        },
      },
    ]);
    editor.apply([{ kind: 'set-bar', bar: 3, properties: { repeatCount: 3, tripletFeel: 'triplet-8th' } }]);
    const bar = score.masterBars[2];
    expect(bar?.tempoAutomations[0]?.value).toBe(90);
    expect(bar?.section?.text).toBe('Chorus');
    expect(bar?.repeatGroup.masterBars.map(each => each.index)).toEqual([2, 3, 4]);
    expect(score.masterBars[3]?.repeatCount).toBe(3);
    expect(score.tracks[0]?.staves[0]?.bars[2]?.barLineRight).toBe(alphaTab.model.BarLineStyle.LightLight);
    expect(() => editor.apply([{ kind: 'set-bar', bar: 1, properties: { anacrusis: true } }])).toThrow(
      EditError,
    );
    expect(() => editor.apply([{ kind: 'set-bar', bar: 1, properties: { repeatCount: 1 } }])).toThrow(
      'A repeat is played at least twice.',
    );
    expect(() =>
      editor.apply([{ kind: 'set-bar', bar: 1, properties: { meter: { numerator: 4, denominator: 3 } } }]),
    ).toThrow(EditError);
    editor.undo();
    editor.undo();
    expect(score.masterBars[2]?.tempoAutomations).toHaveLength(0);
    expect(score.masterBars[2]?.isRepeatStart).toBe(false);
  });

  it('puts tracks in, moves them and takes them away, saying where each was', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1 \\track "Bass" 3.4.1 | 5.4.1');
    const editor = editorOf(score);
    const names = () => score.tracks.map(track => `${String(track.index)}:${track.name}`);
    const bass = {
      name: 'Bass 2',
      shortName: 'B2',
      program: 33,
      tuning: [43, 38, 33, 28],
      percussion: false,
    };
    expect(editor.apply([{ kind: 'add-track', at: 1, track: bass }])?.trackOrigins).toEqual([0, -1, 1]);
    expect(names()).toEqual(['0:Guitar', '1:Bass 2', '2:Bass']);
    const added = score.tracks[1];
    expect(added?.staves[0]?.bars).toHaveLength(2);
    expect(added?.staves[0]?.bars.every(bar => bar.isEmpty)).toBe(true);
    expect(added?.staves[0]?.tuning).toEqual([43, 38, 33, 28]);
    // On MIDI channels of its own.
    const channels = score.tracks.flatMap(track => [track.playbackInfo.primaryChannel]);
    expect(new Set(channels).size).toBe(3);
    expect(editor.apply([{ kind: 'move-track', track: 0, to: 2 }])?.trackOrigins).toEqual([1, 2, 0]);
    expect(names()).toEqual(['0:Bass 2', '1:Bass', '2:Guitar']);
    expect(editor.apply([{ kind: 'remove-track', track: 1 }])?.trackOrigins).toEqual([0, 2]);
    expect(names()).toEqual(['0:Bass 2', '1:Guitar']);
    expect(editor.undo()?.trackOrigins).toEqual([0, -1, 1]);
    expect(names()).toEqual(['0:Bass 2', '1:Bass', '2:Guitar']);
    editor.undo();
    editor.undo();
    expect(names()).toEqual(['0:Guitar', '1:Bass']);
    expect(() => editor.apply([{ kind: 'remove-track', track: 9 }])).toThrow(EditError);
  });

  it('puts in a track written in its clef and transposed: a cello, a B♭ clarinet (EDIT-067)', () => {
    const score = texScore('\\track "Guitar" 3.3.1');
    const editor = editorOf(score);
    editor.apply([
      {
        kind: 'add-track',
        at: 1,
        track: {
          name: 'Cello',
          shortName: 'Vc.',
          program: 42,
          tuning: [57, 50, 43, 36],
          percussion: false,
          clef: 'bass',
        },
      },
      {
        kind: 'add-track',
        at: 2,
        track: {
          name: 'Clarinet',
          shortName: 'Cl.',
          program: 71,
          tuning: [],
          percussion: false,
          transposition: 2,
        },
      },
    ]);
    const [cello, clarinet] = [score.tracks[1]?.staves[0], score.tracks[2]?.staves[0]];
    expect(cello?.bars[0]?.clef).toBe(alphaTab.model.Clef.F4);
    expect(cello?.bars[0]?.clefOttava).toBe(alphaTab.model.Ottavia.Regular);
    expect(clarinet?.bars[0]?.clef).toBe(alphaTab.model.Clef.G2);
    expect(clarinet?.displayTranspositionPitch).toBe(-2);
    // Written as tablature alone, then as standard notation alone (EDIT-066).
    editor.apply([{ kind: 'set-track', track: 0, properties: { notation: 'tablature' } }]);
    expect([
      score.tracks[0]?.staves[0]?.showStandardNotation,
      score.tracks[0]?.staves[0]?.showTablature,
    ]).toEqual([false, true]);
    editor.apply([{ kind: 'set-track', track: 0, properties: { notation: 'standard' } }]);
    expect([
      score.tracks[0]?.staves[0]?.showStandardNotation,
      score.tracks[0]?.staves[0]?.showTablature,
    ]).toEqual([true, false]);
    // A clarinet has no tablature to write.
    editor.apply([{ kind: 'set-track', track: 2, properties: { notation: 'tablature' } }]);
    expect(clarinet?.showStandardNotation).toBe(true);
  });

  it('sets a track’s name, colour, sound, tuning, capo and transposition', () => {
    const score = texScore('\\track "Guitar" 3.1.1 | 5.6.1');
    const editor = editorOf(score);
    editor.apply([
      {
        kind: 'set-track',
        track: 0,
        properties: {
          name: 'Lead',
          shortName: 'Ld.',
          color: '#336699',
          program: 30,
          tuning: [64, 59, 55, 50, 45, 38],
          capo: 2,
          transposition: 12,
        },
      },
    ]);
    const track = score.tracks[0];
    expect(track?.name).toBe('Lead');
    expect(track?.color.r).toBe(0x33);
    expect(track?.playbackInfo.program).toBe(30);
    expect(track?.staves[0]?.tuning).toEqual([64, 59, 55, 50, 45, 38]);
    expect(track?.staves[0]?.capo).toBe(2);
    // The note on the lowest string sounds a tone lower in drop D.
    const low = score.tracks[0]?.staves[0]?.bars[1]?.voices[0]?.beats[0]?.notes[0];
    expect(low?.realValue).toBe(38 + 5 + 2);
    // Fewer strings than notes are written on: refused.
    expect(() =>
      editor.apply([{ kind: 'set-track', track: 0, properties: { tuning: [64, 59, 55, 50] } }]),
    ).toThrow('Notes are written on a string the new tuning does not have: move them first.');
    editor.undo();
    expect(score.tracks[0]?.name).toBe('Guitar');
    expect(score.tracks[0]?.staves[0]?.tuning).toEqual([64, 59, 55, 50, 45, 40]);
  });

  it('refuses frets on a drum staff', () => {
    const score = texScore(
      '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:4 (KickHit HiHatClosed) HiHatClosed',
    );
    expect(() =>
      editorOf(score).apply([{ kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 3 }]),
    ).toThrow('The staff has no strings.');
  });
});

/** Beats of the first track's first voice, from one place to another. */
function beats(from: [number, number], to: [number, number], track = 0): Selection {
  return {
    kind: 'beats',
    track,
    staff: 0,
    voice: 0,
    from: { bar: from[0], beat: from[1] },
    to: { bar: to[0], beat: to[1] },
  };
}

const EIGHTHS = '\\track "Guitar" 1.1.8 2.1.8 3.1.8 4.1.8 5.1.8 6.1.8 7.1.8 8.1.8 | 0.6.1';

describe('copy and paste (EDIT-020)', () => {
  it('pastes beats over as many beats as they last', () => {
    const score = texScore(EIGHTHS);
    const editor = editorOf(score);
    const before = fingerprint(score);
    const clip = copySelection(score, beats([0, 0], [0, 1]));
    editor.apply([{ kind: 'paste', at: { ...AT, beat: 4 }, clip }]);
    expect(written(score, 0)).toEqual([
      '1.1:8',
      '2.1:8',
      '3.1:8',
      '4.1:8',
      '1.1:8',
      '2.1:8',
      '7.1:8',
      '8.1:8',
    ]);
    editor.undo();
    expect(fingerprint(score)).toBe(before);
    // The copy is the score's as it was when copied, and can be pasted again.
    editor.apply([{ kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 9 }]);
    editor.apply([{ kind: 'paste', at: { ...AT, beat: 2 }, clip }]);
    expect(written(score, 0).slice(0, 4)).toEqual(['9.1:8', '2.1:8', '1.1:8', '2.1:8']);
  });

  it('pastes across a bar line, filling what the beats leave of a bar with rests', () => {
    const score = texScore(EIGHTHS);
    const editor = editorOf(score);
    const clip = copySelection(score, beats([0, 0], [0, 3]));
    editor.apply([{ kind: 'paste', at: { ...AT, beat: 6 }, clip }]);
    expect(written(score, 0).slice(6)).toEqual(['1.1:8', '2.1:8']);
    expect(written(score, 1)).toEqual(['3.1:8', '4.1:8', 'r2', 'r4']);
    expect(score.masterBars).toHaveLength(2);
  });

  it('puts bars in at the end when the score is too short', () => {
    const score = texScore(EIGHTHS);
    const editor = editorOf(score);
    const clip = copySelection(score, beats([0, 0], [0, 7]));
    editor.apply([{ kind: 'paste', at: { ...AT, bar: 1 }, clip }]);
    expect(written(score, 1)).toEqual(written(score, 0));
    editor.apply([{ kind: 'paste', at: { ...AT, bar: 1, beat: 4 }, clip }]);
    expect(score.masterBars).toHaveLength(3);
    expect(written(score, 1).slice(4)).toEqual(['1.1:8', '2.1:8', '3.1:8', '4.1:8']);
    expect(written(score, 2)).toEqual(['5.1:8', '6.1:8', '7.1:8', '8.1:8', 'r2']);
    editor.undo();
    expect(score.masterBars).toHaveLength(2);
  });

  it('pastes bars of every track over the bars from the caret’s on', () => {
    const score = texScore('\\track "Guitar" 1.1.1 | 2.1.1 | 3.1.1 \\track "Bass" 1.4.1 | 2.4.1 | 3.4.1');
    const editor = editorOf(score);
    const clip = copySelection(score, { kind: 'bars', fromTrack: 0, toTrack: 1, fromBar: 0, toBar: 1 });
    editor.apply([{ kind: 'paste', at: { ...AT, bar: 2 }, clip }]);
    expect(score.masterBars).toHaveLength(4);
    const frets = (track: number) =>
      score.tracks[track]?.staves[0]?.bars.map(bar => bar.voices[0]?.beats[0]?.notes[0]?.fret);
    expect(frets(0)).toEqual([1, 2, 1, 2]);
    expect(frets(1)).toEqual([1, 2, 1, 2]);
    // Pasted in the second track, the bass's bars go there; the guitar's have no track after it.
    editor.undo();
    const bass = copySelection(score, { kind: 'bars', fromTrack: 1, toTrack: 1, fromBar: 2, toBar: 2 });
    editor.apply([{ kind: 'paste', at: { ...AT, track: 1, bar: 0 }, clip: bass }]);
    expect(frets(1)).toEqual([3, 2, 3]);
    expect(frets(0)).toEqual([1, 2, 3]);
  });

  it('pastes across instruments: by pitch on other strings, the rhythm alone between drums and notes', () => {
    const score = texScore(
      '\\track "Guitar" 1.1.4 2.6.4 r.2\n\\track "Bass"\n\\tuning (G2 D2 A1 E1) 3.4.1\n' +
        '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:1 KickHit',
    );
    const editor = editorOf(score);
    const first = (track: number, index = 0) =>
      score.tracks[track]?.staves[0]?.bars[0]?.voices[0]?.beats[index];
    // The guitar's F4 (high E string, 1st fret) on the bass: its G string's 22nd fret.
    const high = copySelection(score, beats([0, 0], [0, 0]));
    editor.apply([{ kind: 'paste', at: { ...AT, track: 1 }, clip: high }]);
    expect(first(1)?.notes.map(note => [note.string, note.fret])).toEqual([[4, 22]]);
    expect(first(1)?.notes[0]?.realValue).toBe(first(0)?.notes[0]?.realValue);
    // The guitar's F♯2 on the bass's E string, as high as its own string was low.
    const low = copySelection(score, beats([0, 1], [0, 1]));
    editor.apply([{ kind: 'paste', at: { ...AT, track: 1 }, clip: low }]);
    expect(first(1)?.notes.map(note => [note.string, note.fret])).toEqual([[1, 14]]);
    // On drums, the rhythm alone: a quarter rest, and rests to the end of the bar it took.
    editor.apply([{ kind: 'paste', at: { ...AT, track: 2 }, clip: low }]);
    const drums = score.tracks[2]?.staves[0]?.bars[0]?.voices[0]?.beats ?? [];
    expect(drums.map(each => [each.isRest, each.duration])).toEqual([
      [true, alphaTab.model.Duration.Quarter],
      [true, alphaTab.model.Duration.Half],
      [true, alphaTab.model.Duration.Quarter],
    ]);
    const unreadable = { ...low, score: { tracks: 'none' } };
    expect(() => editor.apply([{ kind: 'paste', at: AT, clip: unreadable }])).toThrow(
      'What was copied cannot be read.',
    );
  });

  it('clears a selection’s notes, leaving rests, and takes beats and bars away', () => {
    const score = texScore(
      '\\track "Guitar" 1.1.4 2.1.4 3.1.4 4.1.4 | 5.1.1 | 6.1.1 \\track "Bass" 1.4.1 | 2.4.1 | 3.4.1',
    );
    const editor = editorOf(score);
    editor.apply([{ kind: 'clear', selection: beats([0, 1], [0, 2]) }]);
    expect(written(score, 0)).toEqual(['1.1:4', 'r4', 'r4', '4.1:4']);
    editor.apply([{ kind: 'remove', selection: beats([0, 3], [1, 0]) }]);
    expect(written(score, 0)).toEqual(['1.1:4', 'r4', 'r4']);
    expect(written(score, 1)).toEqual(['-']);
    // Bars of one track are emptied; of every track, taken away.
    editor.apply([
      { kind: 'remove', selection: { kind: 'bars', fromTrack: 1, toTrack: 1, fromBar: 0, toBar: 0 } },
    ]);
    expect(score.tracks[1]?.staves[0]?.bars[0]?.isEmpty).toBe(true);
    expect(score.masterBars).toHaveLength(3);
    editor.apply([
      { kind: 'remove', selection: { kind: 'bars', fromTrack: 0, toTrack: 1, fromBar: 0, toBar: 1 } },
    ]);
    expect(score.masterBars).toHaveLength(1);
    expect(written(score, 0)).toEqual(['6.1:1']);
    // Every bar of the score: they are emptied, a score keeping its bars.
    editor.apply([
      { kind: 'remove', selection: { kind: 'bars', fromTrack: 0, toTrack: 1, fromBar: 0, toBar: 0 } },
    ]);
    expect(score.masterBars).toHaveLength(1);
    expect(written(score, 0)).toEqual(['-']);
  });

  it('duplicates a track, notes and all, on channels of its own', () => {
    const score = texScore('\\track "Guitar" 1.1.4 2.1.4 3.1.2 | 5.1.1 \\track "Bass" 1.4.1 | 2.4.1');
    const editor = editorOf(score);
    const before = fingerprint(score);
    expect(editor.apply([{ kind: 'duplicate-track', track: 0 }])?.trackOrigins).toEqual([0, -1, 1]);
    expect(score.tracks.map(track => track.name)).toEqual(['Guitar', 'Guitar', 'Bass']);
    const [guitar, copy] = score.tracks;
    expect(copy?.staves[0]?.tuning).toEqual(guitar?.staves[0]?.tuning);
    const frets = (track: alphaTab.model.Track | undefined) =>
      track?.staves[0]?.bars.flatMap(bar => bar.voices[0]?.beats.map(each => each.notes[0]?.fret));
    expect(frets(copy)).toEqual(frets(guitar));
    expect(copy?.playbackInfo.primaryChannel).not.toBe(guitar?.playbackInfo.primaryChannel);
    // The copy is its own: writing in it leaves the track it came from as it was.
    editor.apply([{ kind: 'set-fret', at: { ...AT, track: 1, string: tex(1) }, fret: 12 }]);
    expect(frets(guitar)?.[0]).toBe(1);
    editor.undo();
    editor.undo();
    expect(fingerprint(score)).toBe(before);
  });
});

describe('transposing and moving notes from string to string (EDIT-050 … EDIT-052)', () => {
  it('moves notes by semitones on their strings, to another string past the 24th fret', () => {
    const score = texScore('\\track "Guitar" 3.3.4 (5.5 7.4).4 20.6.4 r.4 | 0.6.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'transpose', selection: beats([0, 0], [0, 1]), semitones: 2 }]);
    expect(written(score, 0)).toEqual(['5.3:4', '9.4 7.5:4', '20.6:4', 'r4']);
    // The 32nd fret is no place to play: the nearest string with room takes the note (the A
    // string would need the 27th).
    editor.apply([{ kind: 'transpose', selection: beats([0, 2], [0, 3]), semitones: 12 }]);
    expect(written(score, 0)[2]).toBe('22.4:4');
    // Down from the open low E there is nowhere to go: refused, as it was.
    const before = fingerprint(score);
    expect(() =>
      editor.apply([{ kind: 'transpose', selection: beats([1, 0], [1, 0]), semitones: -1 }]),
    ).toThrow('A note would go below the lowest string: transpose less.');
    expect(fingerprint(score)).toBe(before);
    editor.apply([{ kind: 'transpose', selection: beats([1, 0], [1, 0]), semitones: 12 }]);
    expect(written(score, 1)).toEqual(['12.6:1']);
  });

  it('moves a tied note with the note it holds on, and leaves drums as they are', () => {
    const score = texScore('\\track "Guitar" 20.3.2 -.3.2 | r.1');
    const editor = editorOf(score);
    // The 27th fret of the G string: the B string's 23rd (the D string would need the 32nd).
    editor.apply([{ kind: 'transpose', selection: beats([0, 0], [0, 1]), semitones: 7 }]);
    expect(written(score, 0)).toEqual(['23.2:2', '23.2:2']);
    expect(beat(score, 0, 1).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
    const drums = texScore(
      '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:4 KickHit HiHatClosed',
    );
    const before = fingerprint(drums);
    editorOf(drums).apply([{ kind: 'transpose', selection: beats([0, 0], [0, 1]), semitones: 3 }]);
    expect(fingerprint(drums)).toBe(before);
  });

  it('transposes every track, whole bars, and an octave at once', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1 \\track "Bass" 3.4.1 | 5.4.1');
    const editor = editorOf(score);
    const all: Selection = { kind: 'bars', fromTrack: 0, toTrack: 1, fromBar: 0, toBar: 1 };
    editor.apply([{ kind: 'transpose', selection: all, semitones: 12 }]);
    const frets = (track: number) =>
      score.tracks[track]?.staves[0]?.bars.map(bar => bar.voices[0]?.beats[0]?.notes[0]?.fret);
    expect(frets(0)).toEqual([15, 17]);
    expect(frets(1)).toEqual([15, 17]);
    expect(() => editor.apply([{ kind: 'transpose', selection: all, semitones: 49 }])).toThrow(
      'No transposition of 49 semitones.',
    );
  });

  it('finds harmonies in the key: thirds, sixths and octaves, above and below (EDIT-055)', () => {
    // C major: C's third is E, its sixth A; below, A and E.
    expect(harmonyOf(60, 0, 'third', false)).toBe(64);
    expect(harmonyOf(60, 0, 'sixth', false)).toBe(69);
    expect(harmonyOf(60, 0, 'third', true)).toBe(57);
    expect(harmonyOf(60, 0, 'octave', true)).toBe(48);
    // G major (one sharp): F♯'s third is A; E♭ (three flats): G's third is B♭.
    expect(harmonyOf(66, 1, 'third', false)).toBe(69);
    expect(harmonyOf(67, -3, 'third', false)).toBe(70);
    // Out of the key: as far from the key's third as the note is from its own degree.
    expect(harmonyOf(61, 0, 'third', false)).toBe(65);
    expect(harmonyOf(127, 0, 'octave', false)).toBeNull();
  });

  it('harmonizes notes on the nearest free string, a tied note’s harmony held too (EDIT-055)', () => {
    const score = texScore('\\track "Guitar" 5.3.2 -.3.2 | 0.6.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'harmonize', selection: beats([0, 0], [0, 1]), harmony: 'third', below: false }]);
    expect(written(score, 0)).toEqual(['5.2 5.3:2', '5.2 5.3:2']);
    expect(beat(score, 0, 1).notes.find(note => note.string === tex(2))?.tieOrigin).toBe(
      beat(score, 0, 0).notes.find(note => note.string === tex(2)),
    );
    // The low E open, a third below: no string goes lower; refused, as it was.
    expect(() =>
      editor.apply([{ kind: 'harmonize', selection: beats([1, 0], [1, 0]), harmony: 'third', below: true }]),
    ).toThrow('No string has room for the notes’ harmonies.');
    editor.apply([{ kind: 'harmonize', selection: beats([1, 0], [1, 0]), harmony: 'octave', below: false }]);
    expect(written(score, 1)).toEqual(['7.5 0.6:1']);
  });

  it('moves chord names: the root and the bass, not a name of one’s own', () => {
    expect(moveChordName('A7', 2)).toBe('B7');
    expect(moveChordName('D/F#', 2)).toBe('E/G#');
    expect(moveChordName('Bb', 2)).toBe('C');
    expect(moveChordName('Em7', -2)).toBe('Dm7');
    expect(moveChordName('C♯m', -1)).toBe('Cm');
    expect(moveChordName('Intro riff', 3)).toBe('Intro riff');
  });

  it('moves the chord diagrams the beats name, a copy when other beats name them too (EDIT-144)', () => {
    const score = texScore(
      '\\track "Guitar"\n\\chord ("A7" 0 2 0 2 0 x)\n(0.5 2.4).2{ch "A7"} r.2 | (0.5 2.4).2{ch "A7"} r.2',
    );
    const editor = editorOf(score);
    const staff = score.tracks[0]?.staves[0];
    const chordOf = (bar: number) => {
      const id = beat(score, bar, 0).chordId;
      return id === null ? null : (staff?.getChord(id) ?? null);
    };
    // Only the first bar: the second keeps its A7, the first names a copy, two frets up.
    editor.apply([{ kind: 'transpose', selection: beats([0, 0], [0, 1]), semitones: 2, chords: true }]);
    expect(chordOf(0)?.name).toBe('B7');
    expect(chordOf(0)?.strings).toEqual([2, 4, 2, 4, 2, -1]);
    expect(chordOf(1)?.name).toBe('A7');
    // Both bars, down: the shape goes up the neck an octave rather than off it.
    editor.undo();
    const both: Selection = { kind: 'bars', fromTrack: 0, toTrack: 0, fromBar: 0, toBar: 1 };
    editor.apply([{ kind: 'transpose', selection: both, semitones: -2, chords: true }]);
    expect(chordOf(0)?.name).toBe('G7');
    expect(chordOf(1)).toBe(chordOf(0));
    expect(chordOf(0)?.strings).toEqual([10, 12, 10, 12, 10, -1]);
    expect(chordOf(0)?.firstFret).toBe(10);
    editor.undo();
    expect(chordOf(0)?.name).toBe('A7');
    expect(chordOf(0)?.strings).toEqual([0, 2, 0, 2, 0, -1]);
  });

  it('moves a note to the next string higher or lower at its pitch, passing strings played', () => {
    const score = texScore('\\track "Guitar" (5.5 2.3).4 r.4 r.2');
    const editor = editorOf(score);
    const at = { ...AT, string: tex(5) };
    // Up from the A string: the D string is free, open.
    editor.apply([{ kind: 'move-string', at, higher: true }]);
    expect(written(score, 0)[0]).toBe('2.3 0.4:4');
    // Up again: the G string is played, the B string takes it, past the fret before.
    expect(() =>
      editor.apply([{ kind: 'move-string', at: { ...AT, string: tex(4) }, higher: true }]),
    ).toThrow('No higher string to play the note on.');
    editor.apply([{ kind: 'move-string', at: { ...AT, string: tex(4) }, higher: false }]);
    editor.apply([{ kind: 'move-string', at, higher: false }]);
    expect(written(score, 0)[0]).toBe('2.3 10.6:4');
    expect(() =>
      editor.apply([{ kind: 'move-string', at: { ...AT, beat: 1, string: tex(1) }, higher: true }]),
    ).toThrow('No note on string 6.');
  });
});

const { NoteAccidentalMode: Mode } = alphaTab.model;

/** A staff's notes as pitches, bar by bar, beat by beat, lowest first. */
function pitches(score: alphaTab.model.Score, bar: number): number[][] {
  return (score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats ?? []).map(each =>
    each.notes.map(note => note.realValue).sort((a, b) => a - b),
  );
}

describe('notes spelled and moved by letters (EDIT-107, EDIT-116, EDIT-117)', () => {
  it('spells a pitch as alphaTab does: the key’s accidental, else sharps, else as asked', () => {
    // C♯4 in C major; D♭4 in F major (a key with flats); as a flat when asked.
    expect(spell(61, 0, Mode.Default)).toEqual({ step: 35, accidental: 1 });
    expect(spell(61, -1, Mode.Default)).toEqual({ step: 36, accidental: -1 });
    expect(spell(61, 0, Mode.ForceFlat)).toEqual({ step: 36, accidental: -1 });
    // F in C♯ major (seven sharps) is E♯; B in C♭ major is C♭ — in the octave above.
    expect(spell(65, 7, Mode.Default)).toEqual({ step: 37, accidental: 1 });
    expect(spell(59, -7, Mode.Default)).toEqual({ step: 35, accidental: -1 });
  });

  it('moves by steps of the key, keeping the accidentals written', () => {
    // C major: C up two steps is E; C♯ is E♯, spelled with a sharp; B♭ down one is A♭.
    expect(byDegrees(60, 0, Mode.Default, 2)).toEqual({ value: 64, mode: Mode.Default });
    expect(byDegrees(61, 0, Mode.Default, 2)).toEqual({ value: 65, mode: Mode.ForceSharp });
    expect(byDegrees(70, 0, Mode.ForceFlat, -1)).toEqual({ value: 68, mode: Mode.ForceFlat });
    // A major: A up a sixth is F♯, down a step G♯; an octave is seven steps.
    expect(byDegrees(57, 3, Mode.Default, 5).value).toBe(66);
    expect(byDegrees(57, 3, Mode.Default, -1).value).toBe(56);
    expect(byDegrees(57, 3, Mode.Default, 7).value).toBe(69);
  });

  it('moves by an interval, spelled by its letters, and keys by its fifths', () => {
    // A major third up from C♯ is E♯, a diminished fourth F.
    expect(byInterval(61, 0, Mode.Default, 4, 2, 0)).toEqual({ value: 65, mode: Mode.ForceSharp });
    expect(byInterval(61, 0, Mode.Default, 4, 3, 0)).toEqual({ value: 65, mode: Mode.Default });
    expect(fifthsOf(2, 1)).toBe(2);
    expect(fifthsOf(3, 2)).toBe(-3);
    expect(fifthsOf(6, 3)).toBe(6);
    expect(fifthsOf(6, 4)).toBe(-6);
    expect(fifthsOf(-2, -1)).toBe(-2);
    expect(movedKey(5, 4)).toBe(-3);
    expect(movedKey(-6, -3)).toBe(3);
  });

  it('transposes notes by steps of each bar’s scale (EDIT-117)', () => {
    const score = texScore('\\track "Guitar" 0.3.4 2.4.4 1.3.4 r.4 | 2.3.1');
    const bars = score.tracks[0]?.staves[0]?.bars ?? [];
    // The second bar in A major.
    const second = bars[1];
    if (second !== undefined) second.keySignature = alphaTab.model.KeySignature.A;
    const editor = editorOf(score);
    const all: Selection = { kind: 'bars', fromTrack: 0, toTrack: 0, fromBar: 0, toBar: 1 };
    editor.apply([{ kind: 'transpose', selection: all, semitones: 0, degrees: 2 }]);
    // G3 → B3, E3 → G3, G♯3 → B♯3 (written with its sharp); A3 in A major → C♯4.
    expect(pitches(score, 0)).toEqual([[59], [55], [60], []]);
    expect(beat(score, 0, 2).notes[0]?.accidentalMode).toBe(Mode.ForceSharp);
    expect(pitches(score, 1)).toEqual([[61]]);
    expect(() => editor.apply([{ kind: 'transpose', selection: all, semitones: 2, degrees: 1 }])).toThrow(
      'Notes move by steps of their scale alone, in their keys.',
    );
  });

  it('transposes by an interval, spelling the notes and moving the keys (EDIT-116)', () => {
    const score = texScore('\\track "Guitar" 2.2.2 6.3.2 | 3.2.1');
    const editor = editorOf(score);
    const all: Selection = { kind: 'bars', fromTrack: 0, toTrack: 0, fromBar: 0, toBar: 1 };
    // C♯4 a major third up: E♯4, with its sharp; C major's key goes to E major.
    editor.apply([{ kind: 'transpose', selection: all, semitones: 4, letters: 2, keys: true }]);
    expect(pitches(score, 0)).toEqual([[65], [65]]);
    expect(beat(score, 0, 0).notes[0]?.accidentalMode).toBe(Mode.ForceSharp);
    expect(score.tracks[0]?.staves[0]?.bars.map(bar => bar.keySignature)).toEqual([4, 4]);
    editor.undo();
    // A semitone up with no interval named: the key with fewer accidentals, D♭ major.
    editor.apply([{ kind: 'transpose', selection: all, semitones: 1, keys: true }]);
    expect(score.tracks[0]?.staves[0]?.bars.map(bar => bar.keySignature)).toEqual([-5, -5]);
    // Keys move with whole bars only.
    expect(() =>
      editor.apply([{ kind: 'transpose', selection: beats([0, 0], [0, 0]), semitones: 2, keys: true }]),
    ).toThrow('Keys move with whole bars.');
  });
});

describe('clefs and simile marks (EDIT-107, EDIT-108)', () => {
  const at = { track: 0, staff: 0 };

  it('changes a clef to the next change of clef, the notes keeping their pitches or places', () => {
    const score = texScore('\\track "Guitar" 12.1.1 | 12.1.1 | 12.1.1');
    const bars = score.tracks[0]?.staves[0]?.bars ?? [];
    const third = bars[2];
    if (third !== undefined) third.clef = alphaTab.model.Clef.C3;
    const editor = editorOf(score);
    expect(readStaffBar(score, 0, 0, 0)).toEqual({ clef: 'treble', clefOttava: 'none', simile: 'none' });
    editor.apply([{ kind: 'set-staff-bar', ...at, bar: 0, properties: { clef: 'bass' } }]);
    expect(bars.map(bar => readStaffBar(score, 0, 0, bar.index).clef)).toEqual(['bass', 'bass', 'alto']);
    expect(pitches(score, 0)).toEqual([[76]]);
    editor.undo();
    // Their places kept: the high E's line in the treble clef is the bass clef's G, two octaves
    // down, on the G string.
    editor.apply([{ kind: 'set-staff-bar', ...at, bar: 0, properties: { clef: 'bass', keepPlaces: true } }]);
    expect(pitches(score, 0)).toEqual([[55]]);
    expect(written(score, 0)).toEqual(['0.3:1']);
    expect(pitches(score, 2)).toEqual([[76]]);
    editor.undo();
    // An octave clef, places kept: the notes sound an octave lower.
    editor.apply([
      { kind: 'set-staff-bar', ...at, bar: 1, properties: { clefOttava: '8vb', keepPlaces: true } },
    ]);
    expect([pitches(score, 0), pitches(score, 1)]).toEqual([[[76]], [[64]]]);
    expect(() =>
      editor.apply([{ kind: 'set-staff-bar', ...at, bar: 0, properties: { clef: 'soprano' as 'alto' } }]),
    ).toThrow('No clef "soprano".');
  });

  it('marks a bar, or two, as played as those before them, their notes taken away', () => {
    const score = texScore('\\track "Guitar" 1.1.1 | 2.1.1 | 3.1.1 | 4.1.1 | 5.1.1');
    const editor = editorOf(score);
    const marks = () => [0, 1, 2, 3, 4].map(bar => readStaffBar(score, 0, 0, bar).simile);
    expect(() =>
      editor.apply([{ kind: 'set-staff-bar', ...at, bar: 0, properties: { simile: 'one-bar' } }]),
    ).toThrow('A simile mark repeats the bar before it: the first bar has none.');
    editor.apply([{ kind: 'set-staff-bar', ...at, bar: 1, properties: { simile: 'one-bar' } }]);
    expect(marks()).toEqual(['none', 'one-bar', 'none', 'none', 'none']);
    expect(written(score, 1)).toEqual(['-']);
    editor.apply([{ kind: 'set-staff-bar', ...at, bar: 3, properties: { simile: 'two-bar' } }]);
    expect(marks()).toEqual(['none', 'one-bar', 'none', 'two-bar', 'two-bar']);
    expect(written(score, 4)).toEqual(['-']);
    // The second bar of a two-bar mark takes the whole mark away; the notes stay taken.
    editor.apply([{ kind: 'set-staff-bar', ...at, bar: 4, properties: { simile: 'none' } }]);
    expect(marks()).toEqual(['none', 'one-bar', 'none', 'none', 'none']);
    expect(() =>
      editor.apply([{ kind: 'set-staff-bar', ...at, bar: 4, properties: { simile: 'two-bar' } }]),
    ).toThrow('A two-bar simile mark repeats the two bars before it, over two bars.');
    editor.undo();
    editor.undo();
    editor.undo();
    expect(marks()).toEqual(['none', 'none', 'none', 'none', 'none']);
    expect(written(score, 1)).toEqual(['2.1:1']);
  });
});

describe('undo and redo', () => {
  it('undoes and redoes edits in turn; a new edit forgets what was undone', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    expect([editor.canUndo, editor.canRedo, editor.undo(), editor.redo()]).toEqual([
      false,
      false,
      null,
      null,
    ]);
    editor.apply([{ kind: 'set-fret', at: { ...AT, string: tex(3) }, fret: 1 }]);
    editor.apply([
      { kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 2 },
      { kind: 'set-fret', at: { ...AT, beat: 2, string: tex(3) }, fret: 3 },
    ]);
    expect(written(score, 0)).toEqual(['1.3:4', '2.3:4', '3.3:4', '8.3:4']);
    expect(editor.undo()).toEqual({ firstChangedMasterBar: 0 });
    expect(written(score, 0)).toEqual(['1.3:4', '5.3:4', '7.3:4', '8.3:4']);
    editor.undo();
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:4', '7.3:4', '8.3:4']);
    expect([editor.canUndo, editor.canRedo]).toEqual([false, true]);
    editor.redo();
    expect(written(score, 0)).toEqual(['1.3:4', '5.3:4', '7.3:4', '8.3:4']);
    editor.apply([{ kind: 'remove-beat', at: AT }]);
    expect([editor.canUndo, editor.canRedo]).toEqual([true, false]);
    expect(editor.redo()).toBeNull();
  });

  it('lays out again from three bars before the first bar edited', () => {
    const score = texScore(`\\track "Guitar" ${'3.3.1 | '.repeat(9)}3.3.1`);
    const editor = editorOf(score);
    expect(editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 7, string: tex(3) }, fret: 5 }])).toEqual({
      firstChangedMasterBar: 4,
    });
    expect(editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 1, string: tex(3) }, fret: 5 }])).toEqual({
      firstChangedMasterBar: 0,
    });
  });
});

/** A small random number generator, seeded, so that every run edits the same places. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
  return hash >>> 0;
}

/** A command at a random place of a random string staff, of a random kind. */
function randomCommand(score: alphaTab.model.Score, random: () => number): EditCommand | null {
  const pick = (count: number): number => Math.floor(random() * count);
  const staves = score.tracks.flatMap(track =>
    track.staves.filter(staff => !staff.isPercussion && staff.tuning.length > 0),
  );
  const staff = staves[pick(staves.length)];
  if (staff === undefined) return null;
  const bar = staff.bars[pick(staff.bars.length)];
  const voice = bar?.voices[pick(bar.voices.length)];
  if (bar === undefined || voice === undefined) return null;
  const index = pick(voice.beats.length);
  const at: BeatAddress = {
    track: staff.track.index,
    staff: staff.index,
    bar: bar.index,
    voice: voice.index,
    beat: index,
  };
  const string = 1 + pick(staff.tuning.length);
  const notes = voice.beats[index]?.notes.filter(note => note.isStringed) ?? [];
  switch (pick(12)) {
    case 0:
      return { kind: 'set-fret', at: { ...at, string }, fret: pick(25) };
    case 1: {
      const note = notes[pick(notes.length)];
      return note === undefined
        ? { kind: 'set-fret', at: { ...at, string }, fret: pick(25) }
        : { kind: 'set-fret', at: { ...at, string: note.string }, fret: pick(25) };
    }
    case 2: {
      const note = notes[pick(notes.length)];
      return note === undefined
        ? { kind: 'remove-beat', at }
        : { kind: 'remove-note', at: { ...at, string: note.string } };
    }
    case 3:
      return {
        kind: 'set-duration',
        at,
        duration: DURATION_VALUES[pick(DURATION_VALUES.length)] ?? 4,
        dots: pick(2),
      };
    case 4:
      return { kind: 'insert-beat', at: { ...at, beat: pick(voice.beats.length + 1) } };
    case 5:
      return { kind: 'remove-beat', at };
    case 6:
      return { kind: 'insert-bar', bar: pick(score.masterBars.length + 1) };
    case 8: {
      const note = notes[pick(notes.length)];
      const techniques: NoteTechniques[] = [
        { tie: random() < 0.5 },
        { hammer: random() < 0.5 },
        { slide: random() < 0.5 ? 'legato' : 'none' },
        { vibrato: random() < 0.5 ? 'slight' : 'none' },
        { palmMute: random() < 0.5 },
        { letRing: random() < 0.5 },
        { dead: random() < 0.5 },
        { ghost: random() < 0.5 },
        { harmonic: random() < 0.5 ? 'natural' : 'none' },
        { accent: random() < 0.5 ? 'heavy' : 'none' },
        { staccato: random() < 0.5 },
        { bend: random() < 0.5 ? 'full' : 'none' },
        {
          leftFinger: FINGERS[pick(FINGERS.length)] ?? 'none',
          rightFinger: FINGERS[pick(FINGERS.length)] ?? 'none',
        },
        { spelling: SPELLING_ORDER[pick(SPELLING_ORDER.length)] ?? 'auto' },
      ];
      const chosen = techniques[pick(techniques.length)] ?? {};
      return note === undefined
        ? { kind: 'set-note', at: { ...at, string }, techniques: { tie: true } }
        : { kind: 'set-note', at: { ...at, string: note.string }, techniques: chosen };
    }
    case 11: {
      const count = score.tracks.length;
      const kind = pick(3);
      if (kind === 0)
        return {
          kind: 'add-track',
          at: pick(count + 1),
          track: {
            name: 'Added',
            shortName: 'Add.',
            program: 25,
            tuning: [64, 59, 55, 50, 45, 40],
            percussion: false,
          },
        };
      if (kind === 1 && count > 1) return { kind: 'remove-track', track: pick(count) };
      return { kind: 'move-track', track: pick(count), to: pick(count) };
    }
    case 10: {
      const properties: BarProperties[] = [
        { meter: { numerator: 1 + pick(7), denominator: [2, 4, 8][pick(3)] ?? 4 } },
        { key: { signature: pick(15) - 7, minor: random() < 0.5 } },
        { tempo: random() < 0.3 ? null : 40 + pick(200) },
        { repeatStart: random() < 0.5 },
        { repeatCount: random() < 0.5 ? 0 : 2 + pick(3) },
        { alternateEndings: pick(4) },
        { section: random() < 0.5 ? null : { marker: 'A', text: 'Verse' } },
        { barLine: random() < 0.5 ? 'double' : 'automatic' },
        { freeTime: random() < 0.5 },
        { tripletFeel: random() < 0.5 ? 'triplet-8th' : 'none' },
        { directions: BAR_DIRECTIONS.filter(() => random() < 0.15) },
        { systemBreak: random() < 0.5 },
      ];
      return {
        kind: 'set-bar',
        bar: pick(score.masterBars.length),
        properties: properties[pick(properties.length)] ?? {},
      };
    }
    case 9: {
      const techniques: BeatTechniques[] = [
        { tuplet: TUPLETS[pick(TUPLETS.length)] ?? 'none' },
        { stem: STEMS[pick(STEMS.length)] ?? 'auto' },
        { barVibrato: random() < 0.5 ? 'wide' : 'none' },
        { slap: random() < 0.5 },
        { tap: random() < 0.5 },
        { fade: random() < 0.5 ? 'in' : 'none' },
        { stroke: random() < 0.5 ? 'down' : 'none' },
        { tremolo: pick(4) },
        { text: random() < 0.3 ? null : 'a tempo' },
        { dynamics: DYNAMICS[pick(DYNAMICS.length)] ?? 'mf' },
        { beaming: (['auto', 'split', 'join'] as const)[pick(3)] ?? 'auto' },
      ];
      return { kind: 'set-beat', at, techniques: techniques[pick(techniques.length)] ?? {} };
    }
    default:
      return score.masterBars.length > 1
        ? { kind: 'remove-bar', bar: pick(score.masterBars.length) }
        : { kind: 'insert-bar', bar: 0 };
  }
}

/**
 * A selection command at a random place (EDIT-020): what is selected copied and pasted somewhere,
 * cleared or taken away, or a track duplicated. A copy is kept in `clip`.
 */
function randomSelectionCommand(score: alphaTab.model.Score, random: () => number): EditCommand | null {
  const pick = (count: number): number => Math.floor(random() * count);
  const staves = score.tracks.flatMap(track => track.staves);
  const staff = staves[pick(staves.length)];
  const bar = staff?.bars[pick(staff.bars.length)];
  const voice = bar?.voices[pick(bar.voices.length)];
  if (staff === undefined || bar === undefined || voice === undefined) return null;
  const bars = score.masterBars.length;
  const toBar = Math.min(bars - 1, bar.index + pick(3));
  const last = staff.bars[toBar]?.voices[voice.index];
  const selection: Selection =
    random() < 0.6 && last !== undefined
      ? {
          kind: 'beats',
          track: staff.track.index,
          staff: staff.index,
          voice: voice.index,
          from: { bar: bar.index, beat: pick(voice.beats.length) },
          to: { bar: toBar, beat: pick(last.beats.length) },
        }
      : {
          kind: 'bars',
          fromTrack: staff.track.index,
          toTrack: Math.min(score.tracks.length - 1, staff.track.index + pick(2)),
          fromBar: bar.index,
          toBar,
        };
  switch (pick(14)) {
    case 12:
      return { kind: 'set-score', info: { title: random() < 0.5 ? '' : 'Retitled', artist: 'Someone' } };
    case 11:
      return staff.isPercussion
        ? {
            kind: 'set-drum',
            at: {
              track: staff.track.index,
              staff: staff.index,
              bar: bar.index,
              voice: voice.index,
              beat: pick(voice.beats.length),
            },
            sound: 35 + pick(47),
            on: random() < 0.7,
          }
        : null;
    case 10:
      return {
        kind: 'harmonize',
        selection,
        harmony: HARMONIES[pick(HARMONIES.length)] ?? 'third',
        below: random() < 0.5,
      };
    case 9:
      return {
        kind: 'voice-contents',
        track: staff.track.index,
        staff: staff.index,
        fromBar: bar.index,
        toBar: Math.min(staff.bars.length - 1, bar.index + pick(3)),
        from: pick(4),
        to: pick(4),
        mode: (['move', 'copy', 'swap'] as const)[pick(3)] ?? 'move',
      };
    case 8: {
      if (staff.isPercussion || staff.tuning.length === 0 || staff.index !== 0) return null;
      const tunings = [
        [],
        [64, 59, 55, 50, 45, 38],
        [62, 57, 55, 50, 45, 38],
        [43, 38, 33, 28],
        [64, 59, 55, 50, 45, 40, 35],
      ];
      return {
        kind: 'set-track',
        track: staff.track.index,
        properties: { tuning: tunings[pick(tunings.length)] ?? [], keepPitches: true },
      };
    }
    case 7:
      return random() < 0.5
        ? { kind: 'add-voices', track: staff.track.index, staff: staff.index, count: 1 + pick(4) }
        : {
            kind: 'repeat-beat',
            at: {
              track: staff.track.index,
              staff: staff.index,
              bar: bar.index,
              voice: voice.index,
              beat: pick(voice.beats.length),
            },
          };
    case 5: {
      const how = pick(3);
      if (how === 0) return { kind: 'transpose', selection, semitones: 0, degrees: pick(15) - 7 };
      if (how === 1)
        return {
          kind: 'transpose',
          selection,
          semitones: pick(25) - 12,
          letters: pick(15) - 7,
          keys: selection.kind === 'bars' && random() < 0.5,
        };
      return { kind: 'transpose', selection, semitones: pick(25) - 12, chords: random() < 0.5 };
    }
    case 13:
      return {
        kind: 'set-staff-bar',
        track: staff.track.index,
        staff: staff.index,
        bar: bar.index,
        properties:
          random() < 0.5
            ? { simile: SIMILES[pick(SIMILES.length)] ?? 'none' }
            : {
                clef: CLEFS[pick(CLEFS.length)] ?? 'treble',
                clefOttava: CLEF_OTTAVAS[pick(CLEF_OTTAVAS.length)] ?? 'none',
                keepPlaces: random() < 0.5,
              },
      };
    case 6: {
      const notes = voice.beats.flatMap(each => each.notes.filter(note => note.isStringed));
      const note = notes[pick(notes.length)];
      if (note === undefined) return null;
      const { beat: owner } = note;
      return {
        kind: 'move-string',
        at: {
          track: staff.track.index,
          staff: staff.index,
          bar: bar.index,
          voice: voice.index,
          beat: owner.index,
          string: note.string,
        },
        higher: random() < 0.5,
      };
    }
    case 0:
      return { kind: 'clear', selection };
    case 1:
      return { kind: 'remove', selection };
    case 2:
      return score.tracks.length < 6 ? { kind: 'duplicate-track', track: staff.track.index } : null;
    default: {
      let clip: Clip;
      try {
        clip = copySelection(score, selection);
      } catch (error) {
        if (error instanceof EditError) return null;
        throw error;
      }
      // Pasted somewhere, in the same staff or another (another instrument, drums), as plain
      // data, as the page keeps it.
      const other = random() < 0.3 ? (staves[pick(staves.length)] ?? staff) : staff;
      const target = other.bars[pick(other.bars.length)];
      const into = target?.voices[0] ?? voice;
      const at = {
        track: other.track.index,
        staff: other.index,
        bar: into.bar.index,
        voice: other === staff ? voice.index : 0,
        beat: pick((other === staff ? (target?.voices[voice.index] ?? into) : into).beats.length),
      };
      return { kind: 'paste', at, clip: structuredClone(clip) };
    }
  }
}

interface ScoreState {
  readonly written: string;
  readonly links: string;
}

function stateOf(score: alphaTab.model.Score): ScoreState {
  return { written: fingerprint(score), links: links(score) };
}

/** The score opened afresh from what is written in it. */
function reopened(score: alphaTab.model.Score): alphaTab.model.Score {
  const settings = new alphaTab.Settings();
  return alphaTab.model.JsonConverter.jsObjectToScore(
    alphaTab.model.JsonConverter.scoreToJsObject(score),
    settings,
  );
}

const FIXTURES = [
  ...listFixtures('alphatab', /\.(gp[345x]?|mxl|xml)$/),
  ...listFixtures('musicxml', /\.(xml|musicxml)$/),
  ...listFixtures('capella', /\.(capx|capxml)$/),
  ...listFixtures('alphatex', /\.atex$/),
];

/** How many edits each fixture gets. */
const EDITS = 24;

describe('every edit is undone and redone exactly, in every fixture', () => {
  it.each(FIXTURES)('%s', path => {
    const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
    const editor = editorOf(score);
    const random = randomFrom(seedOf(path));
    const states = [stateOf(score)];
    for (let edit = 0; edit < EDITS; edit++) {
      const command = random() < 0.25 ? randomSelectionCommand(score, random) : randomCommand(score, random);
      if (command === null) continue;
      let result;
      try {
        result = editor.apply([command]);
      } catch (error) {
        // A paste a staff cannot take (drums on strings), notes moved past the frets or the
        // strings: refused, the score as it was.
        if (
          !(error instanceof EditError) ||
          ![
            'paste',
            'transpose',
            'move-string',
            'repeat-beat',
            'set-track',
            'harmonize',
            'set-drum',
            'set-staff-bar',
          ].includes(command.kind)
        )
          throw error;
        expect(stateOf(score), `refused ${JSON.stringify(command)}`).toEqual(states.at(-1));
        continue;
      }
      // An edit that changes nothing (a track moved to where it is) is not one to undo.
      if (result === null) continue;
      const state = stateOf(score);
      expect(state.links, `edit ${String(edit)}: ${JSON.stringify(command)}`).not.toContain('detached');
      expect(links(reopened(score)), `edit ${String(edit)} opened afresh: ${JSON.stringify(command)}`).toBe(
        state.links,
      );
      states.push(state);
    }
    for (let step = states.length - 2; step >= 0; step--) {
      editor.undo();
      expect(stateOf(score), `undo to ${String(step)}`).toEqual(states[step]);
    }
    for (let step = 1; step < states.length; step++) {
      editor.redo();
      expect(stateOf(score), `redo to ${String(step)}`).toEqual(states[step]);
    }
  });
});
