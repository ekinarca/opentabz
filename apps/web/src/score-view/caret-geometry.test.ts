/** Where the editor's caret is drawn, and what a click on the music means (EDIT-002, EDIT-004). */
import { STAFF_KIND, type ScoreBounds } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { caretBox, lineOfString, spotAtPoint } from './caret-geometry.ts';

/**
 * One system (y 100–300) of track 0, staff 0: standard notation (lines at 120…160) above six-line
 * tablature (lines at 200…250); two bars, beats 11 and 12 in the first, 13 in the second.
 */
function bounds(): ScoreBounds {
  return {
    systems: Float32Array.of(0, 100, 600, 200),
    barIndex: Int32Array.of(0, 0, 1, 0),
    barRect: Float32Array.of(0, 120, 300, 130, 300, 120, 300, 130),
    // [beatId, track, staff, barBoundsIndex], once for each staff drawn.
    beatIndex: Int32Array.of(11, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 1, 11, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 1),
    // [onNotesX, realX, realWidth]
    beatRect: Float32Array.of(
      ...[50, 40, 100],
      ...[150, 140, 100],
      ...[350, 340, 100],
      ...[50, 40, 100],
      ...[150, 140, 100],
      ...[350, 340, 100],
    ),
    staffLines: Int32Array.of(0, 0, 0, STAFF_KIND.notation, 0, 5, 0, 0, 0, STAFF_KIND.tablature, 5, 6),
    lines: Float32Array.of(120, 130, 140, 150, 160, 200, 210, 220, 230, 240, 250),
  };
}

const TRACKS = new Set([0]);

describe('caret', () => {
  it('numbers lines from the top: the highest string first, or the lowest on inverted tablature', () => {
    expect(lineOfString(6, 6, false)).toBe(0);
    expect(lineOfString(1, 6, false)).toBe(5);
    expect(lineOfString(1, 6, true)).toBe(0);
    expect(lineOfString(9, 6, false)).toBe(0);
  });

  it('is drawn on the string of the beat, on the tablature', () => {
    const box = caretBox(bounds(), { track: 0, staff: 0, beatId: 12, string: 6 }, false);
    expect(box?.on).toBe('string');
    // Centred on the beat's notes and on the top line.
    expect((box?.x ?? 0) + (box?.w ?? 0) / 2).toBe(150);
    expect((box?.y ?? 0) + (box?.h ?? 0) / 2).toBe(200);
    const low = caretBox(bounds(), { track: 0, staff: 0, beatId: 12, string: 1 }, false);
    expect((low?.y ?? 0) + (low?.h ?? 0) / 2).toBe(250);
    const inverted = caretBox(bounds(), { track: 0, staff: 0, beatId: 12, string: 1 }, true);
    expect((inverted?.y ?? 0) + (inverted?.h ?? 0) / 2).toBe(200);
  });

  it('spans the staff where no tablature is shown, and is not drawn for a beat not shown', () => {
    const notation = bounds();
    const only: ScoreBounds = {
      ...notation,
      staffLines: notation.staffLines.slice(0, 6),
      lines: notation.lines.slice(0, 5),
    };
    const box = caretBox(only, { track: 0, staff: 0, beatId: 13, string: 3 }, false);
    expect(box?.on).toBe('beat');
    expect(box?.y).toBe(115);
    expect(box?.h).toBe(50);
    expect(caretBox(bounds(), { track: 0, staff: 0, beatId: 99, string: 3 }, false)).toBeNull();
    expect(caretBox(bounds(), { track: 1, staff: 0, beatId: 12, string: 3 }, false)).toBeNull();
  });

  it('a click on the tablature means the nearest beat and string', () => {
    expect(spotAtPoint(bounds(), TRACKS, 160, 211, false)).toEqual({
      track: 0,
      staff: 0,
      beatId: 12,
      string: 5,
    });
    expect(spotAtPoint(bounds(), TRACKS, 360, 252, false)?.string).toBe(1);
    expect(spotAtPoint(bounds(), TRACKS, 360, 252, true)?.string).toBe(6);
    // Between beats: the nearest.
    expect(spotAtPoint(bounds(), TRACKS, 139, 230, false)?.beatId).toBe(11);
  });

  it('a click on the standard notation means the beat, not a string; outside the staves nothing', () => {
    expect(spotAtPoint(bounds(), TRACKS, 50, 140, false)).toEqual({
      track: 0,
      staff: 0,
      beatId: 11,
      string: null,
    });
    expect(spotAtPoint(bounds(), TRACKS, 50, 20, false)).toBeNull();
    expect(spotAtPoint(bounds(), new Set([1]), 50, 210, false)).toBeNull();
  });
});
