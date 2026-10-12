/**
 * Guitar Pro's assistants (EDIT-125, EDIT-126): palm muting or let ring set on, or taken off, the
 * notes of a selection that are on chosen strings, as one edit.
 */
import type { Selection } from '../shared/edit.ts';
import { beatsOf } from './clip.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';

/** Marks the selection's notes on `strings` (1 the lowest) palm-muted or let ring, or not. */
export function markStrings(
  transaction: Transaction,
  selection: Selection,
  strings: readonly number[],
  technique: 'palm-mute' | 'let-ring',
  on: boolean,
): void {
  if (technique !== 'palm-mute' && technique !== 'let-ring')
    throw new EditError(`No assistant for "${String(technique)}".`);
  if (strings.length === 0) throw new EditError('Choose the strings first.');
  if (strings.some(string => !Number.isInteger(string) || string < 1))
    throw new EditError(`No strings ${strings.join(', ')}.`);
  const chosen = new Set(strings);
  for (const beat of beatsOf(transaction.score, selection)) {
    const staff = beat.voice.bar.staff;
    const notes = beat.notes.filter(note => note.isStringed && chosen.has(note.string));
    if (notes.length === 0) continue;
    transaction.touch(staff, beat.voice.bar.index);
    for (const note of notes) {
      if (technique === 'palm-mute') note.isPalmMute = on;
      else note.isLetRing = on;
    }
  }
}
