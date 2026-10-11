import type * as alphaTab from '@coderline/alphatab';
import type { StaffDisplay } from '../shared/view.ts';

interface StaffFlags {
  readonly staff: alphaTab.model.Staff;
  readonly showStandardNotation: boolean;
  readonly showTablature: boolean;
}

/**
 * Applies a view's staff display choice to the rendered tracks' staves and returns a function
 * that restores the document's own flags. Layout reads these flags synchronously, so a render
 * session applies them around each layout pass without affecting other views of the document.
 */
export function applyStaffDisplay(
  tracks: readonly alphaTab.model.Track[],
  display: StaffDisplay,
): () => void {
  if (display === 'default') return () => undefined;
  const saved: StaffFlags[] = [];
  for (const track of tracks) {
    for (const staff of track.staves) {
      saved.push({
        staff,
        showStandardNotation: staff.showStandardNotation,
        showTablature: staff.showTablature,
      });
      const tablatureAvailable = staff.isStringed && !staff.isPercussion;
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
    }
  };
}
