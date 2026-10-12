/**
 * Tracks put in, taken away, moved and set (EDIT-030 … EDIT-036): a track's name, colour,
 * instrument, tuning, capo and transposition. A track put in has a staff with a bar, empty, for
 * every bar of the score; it plays on MIDI channels no other track uses.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  MAX_CAPO,
  MAX_STRINGS,
  type NewTrack,
  type TrackProperties,
  type TrackState,
} from '../shared/edit.ts';
import { TRACK_COLORS } from '../document/track-colors.ts';
import { EditError } from './error.ts';

const { Clef, Ottavia } = alphaTab.model;

/** The MIDI channel drums play on. */
const DRUM_CHANNEL = 9;

/** Longest track name kept. */
const MAX_NAME = 100;

export function trackAt(score: alphaTab.model.Score, index: number): alphaTab.model.Track {
  const track = score.tracks[index];
  if (track === undefined) throw new EditError(`No track ${String(index)}.`);
  return track;
}

function color(css: string): alphaTab.model.Color {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css);
  if (match === null) throw new EditError(`No colour "${css}".`);
  return new alphaTab.model.Color(
    Number.parseInt(match[1] ?? '0', 16),
    Number.parseInt(match[2] ?? '0', 16),
    Number.parseInt(match[3] ?? '0', 16),
  );
}

function hex(value: alphaTab.model.Color): string {
  return `#${[value.r, value.g, value.b].map(part => part.toString(16).padStart(2, '0')).join('')}`;
}

function checkTuning(tuning: readonly number[]): void {
  if (tuning.length > MAX_STRINGS) throw new EditError(`A staff has at most ${String(MAX_STRINGS)} strings.`);
  if (tuning.some(pitch => !Number.isInteger(pitch) || pitch < 0 || pitch > 127))
    throw new EditError('A string is tuned to a MIDI note, 0 to 127.');
}

/** The clef a new staff is written in: a bass's, a guitar's (an octave lower), drums', a piano's. */
function clefFor(track: NewTrack): [alphaTab.model.Clef, alphaTab.model.Ottavia] {
  if (track.percussion) return [Clef.Neutral, Ottavia.Regular];
  const lowest = Math.min(...track.tuning);
  if (track.tuning.length === 0) return [Clef.G2, Ottavia.Regular];
  return lowest < 40 ? [Clef.F4, Ottavia._8vb] : [Clef.G2, Ottavia._8vb];
}

/** Two MIDI channels no other track plays on (the same one twice when one only is left). */
function freeChannels(score: alphaTab.model.Score): [number, number] {
  const used = new Set<number>([DRUM_CHANNEL]);
  for (const track of score.tracks) {
    used.add(track.playbackInfo.primaryChannel);
    used.add(track.playbackInfo.secondaryChannel);
  }
  const free = Array.from({ length: 16 }, (_, channel) => channel).filter(channel => !used.has(channel));
  const first = free[0] ?? 0;
  return [first, free[1] ?? first];
}

/** The score's tracks numbered again; the stylesheet's track settings follow them. */
export function reindexTracks(score: alphaTab.model.Score, origins: readonly number[]): void {
  score.tracks.forEach((track, index) => {
    track.index = index;
  });
  const sheet = score.stylesheet;
  const remap = (map: Map<number, boolean> | null): Map<number, boolean> | null => {
    if (map === null) return null;
    const next = new Map<number, boolean>();
    origins.forEach((from, to) => {
      const value = from >= 0 ? map.get(from) : undefined;
      if (value !== undefined) next.set(to, value);
    });
    return next;
  };
  sheet.perTrackDisplayTuning = remap(sheet.perTrackDisplayTuning);
  sheet.perTrackChordDiagramsOnTop = remap(sheet.perTrackChordDiagramsOnTop);
  const tracks = sheet.perTrackMultiBarRest;
  if (tracks !== null)
    sheet.perTrackMultiBarRest = new Set(
      origins.flatMap((from, to) => (from >= 0 && tracks.has(from) ? [to] : [])),
    );
}

/** A new track, its staff with an empty bar for every bar of the score. */
export function newTrack(score: alphaTab.model.Score, spec: NewTrack): alphaTab.model.Track {
  if (spec.name.length > MAX_NAME || spec.shortName.length > MAX_NAME)
    throw new EditError('A track name is too long.');
  if (!Number.isInteger(spec.program) || spec.program < 0 || spec.program > 127)
    throw new EditError(`No MIDI program ${String(spec.program)}.`);
  checkTuning(spec.tuning);
  const track = new alphaTab.model.Track();
  track.name = spec.name;
  track.shortName = spec.shortName;
  track.score = score;
  // Else the next of the colours tracks get when a file gives them none.
  track.color = color(spec.color ?? TRACK_COLORS[score.tracks.length % TRACK_COLORS.length] ?? '#0072B2');
  track.playbackInfo.program = spec.program;
  const [primary, secondary] = spec.percussion ? [DRUM_CHANNEL, DRUM_CHANNEL] : freeChannels(score);
  track.playbackInfo.primaryChannel = primary;
  track.playbackInfo.secondaryChannel = secondary;
  track.ensureStaveCount(1);
  const staff = track.staves[0];
  if (staff === undefined) throw new Error('alphaTab made no staff for the track.');
  staff.isPercussion = spec.percussion;
  staff.stringTuning = new alphaTab.model.Tuning('', [...spec.tuning], false);
  staff.showTablature = spec.tuning.length > 0 && !spec.percussion;
  staff.showStandardNotation = true;
  const [clef, ottava] = clefFor(spec);
  const first = score.tracks[0]?.staves[0];
  for (const masterBar of score.masterBars) {
    const bar = new alphaTab.model.Bar();
    bar.clef = clef;
    bar.clefOttava = ottava;
    // In the key the score is in at that bar.
    const like = first?.bars[masterBar.index];
    if (like !== undefined && !spec.percussion) {
      bar.keySignature = like.keySignature;
      bar.keySignatureType = like.keySignatureType;
    }
    staff.addBar(bar);
    const voice = new alphaTab.model.Voice();
    bar.addVoice(voice);
    const beat = new alphaTab.model.Beat();
    beat.isEmpty = true;
    voice.addBeat(beat);
  }
  return track;
}

/** Sets a track's properties (its first staff's tuning, capo and transposition). */
export function setTrackProperties(track: alphaTab.model.Track, properties: TrackProperties): void {
  const { name, shortName, color: css, program, tuning, capo, transposition } = properties;
  const staff = track.staves[0];
  if (name !== undefined) {
    if (name.length > MAX_NAME) throw new EditError('A track name is too long.');
    track.name = name;
  }
  if (shortName !== undefined) {
    if (shortName.length > MAX_NAME) throw new EditError('A track name is too long.');
    track.shortName = shortName;
  }
  if (css !== undefined) track.color = color(css);
  if (program !== undefined) {
    if (!Number.isInteger(program) || program < 0 || program > 127)
      throw new EditError(`No MIDI program ${String(program)}.`);
    track.playbackInfo.program = program;
  }
  if (staff === undefined) return;
  if (tuning !== undefined) {
    checkTuning(tuning);
    if (staff.isPercussion) throw new EditError('Drums have no tuning.');
    // A note on a string the new tuning no longer has would be lost: it is moved first.
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          for (const note of beat.notes) {
            if (note.isStringed && note.string > tuning.length)
              throw new EditError(
                'Notes are written on a string the new tuning does not have: move them first.',
              );
          }
        }
      }
    }
    staff.stringTuning = new alphaTab.model.Tuning('', [...tuning], false);
    staff.showTablature = tuning.length > 0;
  }
  if (capo !== undefined) {
    if (!Number.isInteger(capo) || capo < 0 || capo > MAX_CAPO)
      throw new EditError(`No capo on fret ${String(capo)}.`);
    staff.capo = capo;
  }
  if (transposition !== undefined) {
    if (!Number.isInteger(transposition) || Math.abs(transposition) > 48)
      throw new EditError(`No transposition of ${String(transposition)} semitones.`);
    staff.displayTranspositionPitch = -transposition;
  }
}

/** A track's properties as they are. */
export function readTrackProperties(track: alphaTab.model.Track): TrackState {
  const staff = track.staves[0];
  return {
    name: track.name,
    shortName: track.shortName,
    color: hex(track.color),
    program: track.playbackInfo.program,
    tuning: staff === undefined ? [] : [...staff.tuning],
    capo: staff?.capo ?? 0,
    transposition: -(staff?.displayTranspositionPitch ?? 0),
    percussion: staff?.isPercussion ?? false,
  };
}
