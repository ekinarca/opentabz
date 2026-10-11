/** The note colouring and reading aids the preferences ask for, for the engine. */
import { noteColors, type NoteColoring, type ReadingAids } from '@opentabz/core/shared';
import type { Preferences } from './preferences.ts';

export function noteColoring(
  preferences: Pick<Preferences, 'noteColors' | 'notePalette' | 'stringColors'>,
): NoteColoring | undefined {
  const { noteColors: mode, notePalette, stringColors } = preferences;
  return mode === 'off' ? undefined : { mode, colors: noteColors(mode, notePalette, stringColors) };
}

/** Note names and beat counts, if any are asked for (VIEW-009, REND-317). */
export function readingAids(
  preferences: Pick<Preferences, 'noteNames' | 'beatCounts'>,
): ReadingAids | undefined {
  return preferences.noteNames === 'off' && !preferences.beatCounts
    ? undefined
    : { noteNames: preferences.noteNames, counts: preferences.beatCounts };
}
