import type { StaffSummary, TrackSummary } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { shownStaves } from './TrackStavesDialog.tsx';

function track(index: number, staff: Partial<StaffSummary>): TrackSummary {
  return {
    index,
    name: `Track ${index + 1}`,
    shortName: `T${index + 1}`,
    color: '#336699',
    isPercussion: staff.isPercussion ?? false,
    program: 25,
    channels: [0],
    mix: { volume: 8, balance: 8, mute: false, solo: false },
    staves: [
      {
        index: 0,
        showStandardNotation: true,
        showTablature: true,
        showSlash: false,
        showNumbered: false,
        isPercussion: false,
        stringCount: 6,
        tuning: [64, 59, 55, 50, 45, 40],
        tuningName: 'Standard',
        capo: 0,
        displayTransposition: 0,
        ...staff,
      },
    ],
  };
}

describe('the staves a track shows', () => {
  const guitar = track(0, {});
  const piano = track(1, { stringCount: 0, tuning: [], showTablature: false });

  it('follows the file, then the Staves menu for tracks with strings', () => {
    expect(shownStaves(guitar, 'default', [])).toMatchObject({
      standard: true,
      tablature: true,
      slash: false,
    });
    expect(shownStaves(guitar, 'tab', [])).toMatchObject({ standard: false, tablature: true });
    expect(shownStaves(piano, 'tab', [])).toMatchObject({ standard: true, tablature: false });
  });

  it('takes what was chosen for the track over both', () => {
    const chosen = [{ trackIndex: 0, standard: false, tablature: false, slash: true, numbered: true }];
    expect(shownStaves(guitar, 'score-tab', chosen)).toEqual(chosen[0]);
    expect(shownStaves(piano, 'score-tab', chosen)).toMatchObject({ trackIndex: 1, standard: true });
  });
});
