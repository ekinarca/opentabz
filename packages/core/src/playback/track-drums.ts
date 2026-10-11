/**
 * The drums of one track for the drum view (engine worker): every sound its kit can make (the
 * track's own articulations, then the rest of alphaTab's standard kit), named as Guitar Pro names
 * them, and its notes as instrument views read them, a note's pitch naming its sound.
 */
import * as alphaTab from '@coderline/alphatab';
import type { DrumSound, TrackDrums } from '../shared/drums.ts';
import { NOTE_GHOST, TRACK_NOTE_STRIDE } from '../shared/notes.ts';

const { PercussionMapper } = alphaTab.model;

/**
 * An articulation's Guitar Pro name. alphaTab's table lists alternative names first ("Hand
 * (hit)" for "Bongo Low (hit)", some misspelt) and numbers others ("Snare (hit) 2"): the last
 * plain name is the one Guitar Pro shows in its kit.
 */
export function articulationName(articulation: alphaTab.model.InstrumentArticulation): string {
  let plain: string | null = null;
  let numbered: string | null = null;
  for (const [name, key] of PercussionMapper.instrumentArticulationNames) {
    if (key !== articulation.uniqueId) continue;
    if (/\s\d+$/.test(name)) numbered ??= name;
    else plain = name;
  }
  return plain ?? numbered ?? articulation.elementType;
}

function soundOf(articulation: alphaTab.model.InstrumentArticulation): DrumSound {
  const name = articulationName(articulation);
  return {
    key: articulation.uniqueId,
    name,
    // "Kick (hit) 2" is played on the kick.
    piece: name.replace(/\s*\(.*$/, '').replace(/\s+\d+$/, ''),
    midi: articulation.outputMidiNumber,
    staffLine: articulation.staffLine,
  };
}

export function collectTrackDrums(score: alphaTab.model.Score, trackIndex: number): TrackDrums {
  const track = score.tracks[trackIndex];
  const staff = track?.staves.find(candidate => candidate.isPercussion);
  const empty = { trackIndex, staffIndex: null, beats: new Int32Array(0), notes: new Int32Array(0) };
  if (track === undefined || staff === undefined) return { trackIndex, sounds: [], notes: empty };
  // The track's own articulations, then every other sound of a standard kit.
  const kit = [...track.percussionArticulations, ...PercussionMapper.instrumentArticulations.values()];
  const sounds: DrumSound[] = [];
  const index = new Map<string, number>();
  const add = (articulation: alphaTab.model.InstrumentArticulation) => {
    if (index.has(articulation.uniqueId)) return;
    index.set(articulation.uniqueId, sounds.length);
    sounds.push(soundOf(articulation));
  };
  for (const articulation of kit) add(articulation);
  const beats: number[] = [];
  const notes: number[] = [];
  for (const bar of staff.bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        if (beat.isRest || beat.notes.length === 0) continue;
        const first = notes.length / TRACK_NOTE_STRIDE;
        let count = 0;
        for (const note of beat.notes) {
          const articulation = PercussionMapper.getArticulation(note);
          if (articulation === null) continue;
          add(articulation);
          notes.push(0, 0, index.get(articulation.uniqueId) ?? 0, note.isGhost ? NOTE_GHOST : 0);
          count++;
        }
        if (count > 0) beats.push(beat.id, first, count, 0, staff.index);
      }
    }
  }
  // MIDI order, the notes renumbered to match.
  const order = sounds
    .map((_, position) => position)
    .sort((a, b) => {
      const left = sounds[a];
      const right = sounds[b];
      return (left?.midi ?? 0) - (right?.midi ?? 0) || (left?.name ?? '').localeCompare(right?.name ?? '');
    });
  const renumber = new Map(order.map((from, to) => [from, to]));
  for (let base = 2; base < notes.length; base += TRACK_NOTE_STRIDE) {
    notes[base] = renumber.get(notes[base] ?? 0) ?? 0;
  }
  return {
    trackIndex,
    sounds: order.map(from => sounds[from]).filter((sound): sound is DrumSound => sound !== undefined),
    notes: { trackIndex, staffIndex: null, beats: Int32Array.from(beats), notes: Int32Array.from(notes) },
  };
}
