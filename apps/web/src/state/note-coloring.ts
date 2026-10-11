/** The note colouring the preferences ask for, for the engine (REND-300…REND-303). */
import { noteColors, type NoteColoring } from '@opentabz/core/shared';
import type { Preferences } from './preferences.ts';

export function noteColoring(
  preferences: Pick<Preferences, 'noteColors' | 'notePalette' | 'stringColors'>,
): NoteColoring | undefined {
  const { noteColors: mode, notePalette, stringColors } = preferences;
  return mode === 'off' ? undefined : { mode, colors: noteColors(mode, notePalette, stringColors) };
}
