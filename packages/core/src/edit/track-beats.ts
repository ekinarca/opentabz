/**
 * Every beat of one track for the editor (EDIT-004), in score order (engine worker): where each
 * beat is and what it holds.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  BEAT_BAR_VIBRATO,
  BEAT_EMPTY,
  BEAT_FADE_IN,
  BEAT_FADE_OUT,
  BEAT_GRACE,
  BEAT_POP,
  BEAT_REST,
  BEAT_SLAP,
  BEAT_STROKE_DOWN,
  BEAT_STROKE_UP,
  BEAT_TAP,
  BEAT_TREMOLO,
  BEAT_TRIPLET,
  BEAT_TUPLET,
  TECHNIQUE_ACCENT,
  TECHNIQUE_BEND,
  TECHNIQUE_DEAD,
  TECHNIQUE_GHOST,
  TECHNIQUE_HAMMER,
  TECHNIQUE_HEAVY_ACCENT,
  TECHNIQUE_LET_RING,
  TECHNIQUE_NATURAL_HARMONIC,
  TECHNIQUE_PALM_MUTE,
  TECHNIQUE_SLIDE,
  TECHNIQUE_STACCATO,
  TECHNIQUE_TIE,
  TECHNIQUE_VIBRATO,
  TRACK_BEAT_NOTE_STRIDE,
  BEAMING_ORDER,
  SPELLING_ORDER,
  type TrackBeats,
} from '../shared/beats.ts';
import { DYNAMICS, FINGERS } from '../shared/edit.ts';
import { BEAMINGS, DYNAMIC_VALUES, FINGER_VALUES, SPELLINGS } from './techniques.ts';

const { AccentuationType, FadeType, HarmonicType, PickStroke, SlideOutType, VibratoType } = alphaTab.model;

/** A beat's flags (BEAT_…). */
function beatFlags(beat: alphaTab.model.Beat): number {
  return (
    (beat.isEmpty ? BEAT_EMPTY : 0) |
    (beat.isRest ? BEAT_REST : 0) |
    (beat.graceType === alphaTab.model.GraceType.None ? 0 : BEAT_GRACE) |
    (beat.hasTuplet ? BEAT_TUPLET : 0) |
    (beat.tupletNumerator === 3 && beat.tupletDenominator === 2 ? BEAT_TRIPLET : 0) |
    (beat.vibrato === VibratoType.None ? 0 : BEAT_BAR_VIBRATO) |
    (beat.slap ? BEAT_SLAP : 0) |
    (beat.pop ? BEAT_POP : 0) |
    (beat.tap ? BEAT_TAP : 0) |
    (beat.fade === FadeType.FadeIn ? BEAT_FADE_IN : 0) |
    (beat.fade === FadeType.FadeOut ? BEAT_FADE_OUT : 0) |
    (beat.pickStroke === PickStroke.Up ? BEAT_STROKE_UP : 0) |
    (beat.pickStroke === PickStroke.Down ? BEAT_STROKE_DOWN : 0) |
    (beat.isTremolo ? BEAT_TREMOLO : 0)
  );
}

/** A note's flags (NOTE_…). */
function noteFlags(note: alphaTab.model.Note): number {
  return (
    (note.isTieDestination ? TECHNIQUE_TIE : 0) |
    (note.isHammerPullOrigin ? TECHNIQUE_HAMMER : 0) |
    (note.slideOutType === SlideOutType.Legato ? TECHNIQUE_SLIDE : 0) |
    (note.vibrato === VibratoType.None ? 0 : TECHNIQUE_VIBRATO) |
    (note.isPalmMute ? TECHNIQUE_PALM_MUTE : 0) |
    (note.isLetRing ? TECHNIQUE_LET_RING : 0) |
    (note.isDead ? TECHNIQUE_DEAD : 0) |
    (note.isGhost ? TECHNIQUE_GHOST : 0) |
    (note.harmonicType === HarmonicType.Natural ? TECHNIQUE_NATURAL_HARMONIC : 0) |
    (note.accentuated === AccentuationType.Normal ? TECHNIQUE_ACCENT : 0) |
    (note.accentuated === AccentuationType.Heavy ? TECHNIQUE_HEAVY_ACCENT : 0) |
    (note.isStaccato ? TECHNIQUE_STACCATO : 0) |
    (note.hasBend ? TECHNIQUE_BEND : 0)
  );
}

/** Where a value is in a list of names, by the table that names them; −1 when none does. */
function indexIn<K extends string, V>(order: readonly K[], table: Readonly<Record<K, V>>, value: V): number {
  return order.findIndex(name => table[name] === value);
}

export function collectTrackBeats(score: alphaTab.model.Score, trackIndex: number): TrackBeats {
  const track = score.tracks[trackIndex];
  const beats: number[] = [];
  const notes: number[] = [];
  const beatMarks: number[] = [];
  const noteMarks: number[] = [];
  const texts: [number, string][] = [];
  for (const staff of track?.staves ?? []) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          beats.push(
            beat.id,
            staff.index,
            bar.index,
            voice.index,
            beat.index,
            beat.duration,
            beat.dots,
            beatFlags(beat),
            notes.length / TRACK_BEAT_NOTE_STRIDE,
            beat.notes.length,
            beat.displayStart + beat.displayDuration,
            bar.masterBar.calculateDuration(),
          );
          beatMarks.push(
            indexIn(DYNAMICS, DYNAMIC_VALUES, beat.dynamics),
            indexIn(BEAMING_ORDER, BEAMINGS, beat.beamingMode),
          );
          if (beat.text !== null && beat.text.length > 0) texts.push([beat.id, beat.text]);
          for (const note of beat.notes) {
            notes.push(note.isStringed ? note.string : 0, note.fret, noteFlags(note));
            noteMarks.push(
              Math.max(0, indexIn(FINGERS, FINGER_VALUES, note.leftHandFinger)),
              Math.max(0, indexIn(FINGERS, FINGER_VALUES, note.rightHandFinger)),
              indexIn(SPELLING_ORDER, SPELLINGS, note.accidentalMode),
            );
          }
        }
      }
    }
  }
  return {
    trackIndex,
    beats: Int32Array.from(beats),
    notes: Int32Array.from(notes),
    beatMarks: Int32Array.from(beatMarks),
    noteMarks: Int32Array.from(noteMarks),
    texts,
  };
}
