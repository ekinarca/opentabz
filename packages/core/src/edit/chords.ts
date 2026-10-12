/**
 * Chord diagrams written over beats (EDIT-040, EDIT-140, EDIT-143): the chord the builder made, or
 * one named as typed, kept by the staff (a chord it has already, the same name and shape, is used
 * again) and named by the beat; and the diagram's notes written into an empty beat.
 */
import * as alphaTab from '@coderline/alphatab';
import type { BeatAddress, ChordDiagram } from '../shared/edit.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';

/** The longest chord name kept. */
const MAX_NAME = 60;

/** The highest fret a diagram shows. */
const MAX_DIAGRAM_FRET = 24;

function sameShape(chord: alphaTab.model.Chord, diagram: ChordDiagram): boolean {
  return (
    chord.name === diagram.name &&
    chord.firstFret === diagram.firstFret &&
    chord.strings.length === diagram.strings.length &&
    chord.strings.every((fret, index) => fret === diagram.strings[index]) &&
    chord.barreFrets.length === diagram.barres.length &&
    chord.barreFrets.every((fret, index) => fret === diagram.barres[index])
  );
}

/** Writes a chord over a beat, or takes it away; with `writeNotes`, its notes into the beat too. */
export function setChord(
  transaction: Transaction,
  at: BeatAddress,
  diagram: ChordDiagram | null,
  writeNotes: boolean,
): void {
  const staff = transaction.score.tracks[at.track]?.staves[at.staff];
  const beat = staff?.bars[at.bar]?.voices[at.voice]?.beats[at.beat];
  if (staff === undefined || beat === undefined) throw new EditError(`No beat at ${JSON.stringify(at)}.`);
  transaction.touch(staff, at.bar);
  if (diagram === null) {
    beat.chordId = null;
    return;
  }
  const name = diagram.name.trim();
  if (name.length === 0 || name.length > MAX_NAME) throw new EditError('A chord has a name, not too long.');
  const strings = staff.tuning.length;
  if (diagram.strings.length !== 0 && diagram.strings.length !== strings)
    throw new EditError(`A diagram of ${String(strings)} strings is wanted.`);
  if (diagram.strings.some(fret => !Number.isInteger(fret) || fret < -1 || fret > MAX_DIAGRAM_FRET))
    throw new EditError('A diagram’s frets are from 0 to 24, or −1 for a string not played.');
  if (!Number.isInteger(diagram.firstFret) || diagram.firstFret < 1 || diagram.firstFret > MAX_DIAGRAM_FRET)
    throw new EditError(`No diagram from fret ${String(diagram.firstFret)}.`);
  if (diagram.barres.some(fret => !Number.isInteger(fret) || fret < 1 || fret > MAX_DIAGRAM_FRET))
    throw new EditError('A barre is held on a fret.');
  const kept = { ...diagram, name };
  let id = [...(staff.chords ?? [])].find(([, chord]) => sameShape(chord, kept))?.[0];
  if (id === undefined) {
    transaction.journal.keep(staff);
    id = name;
    while (staff.hasChord(id)) id = `${id}'`;
    const chord = new alphaTab.model.Chord();
    chord.name = name;
    chord.firstFret = kept.firstFret;
    chord.strings = [...kept.strings];
    chord.barreFrets = [...kept.barres];
    chord.showDiagram = kept.strings.length > 0;
    staff.addChord(id, chord);
  }
  beat.chordId = id;
  if (!writeNotes) return;
  if (beat.notes.length > 0)
    throw new EditError('The diagram’s notes are written into a beat without notes.');
  if (kept.strings.length === 0) throw new EditError('A chord without a diagram has no notes to write.');
  kept.strings.forEach((fret, index) => {
    if (fret < 0) return;
    const note = new alphaTab.model.Note();
    // Diagrams go from the highest string; alphaTab counts strings from the lowest.
    note.string = strings - index;
    note.fret = fret;
    beat.addNote(note);
  });
  beat.isEmpty = false;
}
