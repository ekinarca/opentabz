import type * as alphaTab from '@coderline/alphatab';
import type { StaffDisplay, TrackStaves } from '../shared/view.ts';

interface StaffFlags {
  readonly staff: alphaTab.model.Staff;
  readonly showStandardNotation: boolean;
  readonly showTablature: boolean;
  readonly showSlash: boolean;
  readonly showNumbered: boolean;
}

/**
 * Applies a view's staff display choice to the rendered tracks' staves, then the kinds of staff
 * chosen for single tracks (REND-031: standard, tablature, slash, numbered), and returns a
 * function that restores the document's own flags. Layout reads these flags synchronously, so a
 * render session applies them around each layout pass without affecting other views.
 */
export function applyStaffDisplay(
  tracks: readonly alphaTab.model.Track[],
  display: StaffDisplay,
  staves: readonly TrackStaves[] = [],
): () => void {
  if (display === 'default' && staves.length === 0) return () => undefined;
  const saved: StaffFlags[] = [];
  for (const track of tracks) {
    const chosen = staves.find(entry => entry.trackIndex === track.index);
    for (const staff of track.staves) {
      saved.push({
        staff,
        showStandardNotation: staff.showStandardNotation,
        showTablature: staff.showTablature,
        showSlash: staff.showSlash,
        showNumbered: staff.showNumbered,
      });
      const tablatureAvailable = staff.isStringed && !staff.isPercussion;
      if (chosen !== undefined) {
        staff.showStandardNotation = chosen.standard;
        staff.showTablature = chosen.tablature && tablatureAvailable;
        staff.showSlash = chosen.slash;
        staff.showNumbered = chosen.numbered && !staff.isPercussion;
        // A staff shows something: standard notation when nothing else is left.
        if (!staff.showTablature && !staff.showSlash && !staff.showNumbered)
          staff.showStandardNotation = true;
        continue;
      }
      if (display === 'default') continue;
      if (!tablatureAvailable) {
        staff.showStandardNotation = true;
        staff.showTablature = false;
        continue;
      }
      staff.showStandardNotation = display === 'score-tab' || display === 'score';
      staff.showTablature = display === 'score-tab' || display === 'tab';
    }
  }
  return () => {
    for (const flags of saved) {
      flags.staff.showStandardNotation = flags.showStandardNotation;
      flags.staff.showTablature = flags.showTablature;
      flags.staff.showSlash = flags.showSlash;
      flags.staff.showNumbered = flags.showNumbered;
    }
  };
}
