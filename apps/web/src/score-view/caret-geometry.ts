/**
 * Where the editor's caret is drawn (EDIT-004), and which beat and string a click on the music
 * means (EDIT-002), from the bounds the engine gives with each layout: the beats, and each staff's
 * lines (alphaTab patch 0058). In engine coordinates, like the bounds.
 */
import {
  BOUNDS_BAR_INDEX_STRIDE,
  BOUNDS_BAR_RECT_STRIDE,
  BOUNDS_BEAT_INDEX_STRIDE,
  BOUNDS_BEAT_RECT_STRIDE,
  BOUNDS_STAFF_LINES_STRIDE,
  BOUNDS_SYSTEM_STRIDE,
  STAFF_KIND,
  type ScoreBounds,
} from '@opentabz/core/shared';

/** A beat and a string of a track's staff, as the caret marks them. */
export interface CaretSpot {
  readonly track: number;
  readonly staff: number;
  readonly beatId: number;
  /** 1 the lowest string, as alphaTab numbers them; null where no tablature was clicked. */
  readonly string: number | null;
}

export interface CaretBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** On a string of the tablature, or over the beat on a staff without strings shown. */
  readonly on: 'string' | 'beat';
}

/** One staff drawn in a system, with its lines from the top. */
interface StaffRow {
  readonly system: number;
  readonly track: number;
  readonly staff: number;
  readonly kind: number;
  readonly lines: readonly number[];
}

function staffRows(bounds: ScoreBounds): StaffRow[] {
  const rows: StaffRow[] = [];
  const count = bounds.staffLines.length / BOUNDS_STAFF_LINES_STRIDE;
  for (let index = 0; index < count; index++) {
    const at = index * BOUNDS_STAFF_LINES_STRIDE;
    const first = bounds.staffLines[at + 4] ?? 0;
    const lineCount = bounds.staffLines[at + 5] ?? 0;
    rows.push({
      system: bounds.staffLines[at] ?? -1,
      track: bounds.staffLines[at + 1] ?? -1,
      staff: bounds.staffLines[at + 2] ?? -1,
      kind: bounds.staffLines[at + 3] ?? -1,
      lines: Array.from(bounds.lines.subarray(first, first + lineCount)),
    });
  }
  return rows;
}

/** The space between a staff's lines (a guess for a staff of one line). */
function spacing(lines: readonly number[]): number {
  const first = lines[0];
  const second = lines[1];
  return first === undefined || second === undefined ? 10 : Math.abs(second - first);
}

/** The line a string is drawn on, from the top: the highest string on top, or the lowest (REND-315). */
export function lineOfString(string: number, lineCount: number, inverted: boolean): number {
  const line = inverted ? string - 1 : lineCount - string;
  return Math.min(lineCount - 1, Math.max(0, line));
}

function stringOfLine(line: number, lineCount: number, inverted: boolean): number {
  return inverted ? line + 1 : lineCount - line;
}

function systemOfBeat(bounds: ScoreBounds, beatBoundsIndex: number): number {
  const barBoundsIndex = bounds.beatIndex[beatBoundsIndex * BOUNDS_BEAT_INDEX_STRIDE + 3] ?? -1;
  return bounds.barIndex[barBoundsIndex * BOUNDS_BAR_INDEX_STRIDE + 1] ?? -1;
}

/**
 * The caret's box: around the beat's place on the string's line of the tablature; over the beat,
 * from the staff's top line to its bottom one, where the track's tablature is not shown; null
 * where the beat is not drawn.
 */
export function caretBox(
  bounds: ScoreBounds,
  spot: { readonly track: number; readonly staff: number; readonly beatId: number; readonly string: number },
  inverted: boolean,
): CaretBox | null {
  const rows = staffRows(bounds);
  const beatCount = bounds.beatIndex.length / BOUNDS_BEAT_INDEX_STRIDE;
  let fallback: CaretBox | null = null;
  for (let index = 0; index < beatCount; index++) {
    const at = index * BOUNDS_BEAT_INDEX_STRIDE;
    if (
      bounds.beatIndex[at] !== spot.beatId ||
      bounds.beatIndex[at + 1] !== spot.track ||
      bounds.beatIndex[at + 2] !== spot.staff
    )
      continue;
    const x = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE] ?? 0;
    const system = systemOfBeat(bounds, index);
    const staves = rows.filter(
      row => row.system === system && row.track === spot.track && row.staff === spot.staff,
    );
    const tab = staves.find(row => row.kind === STAFF_KIND.tablature && row.lines.length > 0);
    if (tab !== undefined) {
      const gap = spacing(tab.lines);
      const y = tab.lines[lineOfString(spot.string, tab.lines.length, inverted)] ?? 0;
      const w = Math.max(12, gap * 1.6);
      return { x: x - w / 2, y: y - gap / 2, w, h: gap, on: 'string' };
    }
    const staff = staves.find(row => row.lines.length > 0);
    if (staff !== undefined && fallback === null) {
      const gap = spacing(staff.lines);
      const top = staff.lines[0] ?? 0;
      const bottom = staff.lines.at(-1) ?? top;
      const w = Math.max(12, gap * 1.6);
      fallback = { x: x - w / 2, y: top - gap / 2, w, h: bottom - top + gap, on: 'beat' };
    }
  }
  return fallback;
}

/** A box over the music, in engine coordinates. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** What the editor's selection covers (EDIT-020): beats of a track's staff, or bars of tracks. */
export type SelectionSpan =
  | {
      readonly kind: 'beats';
      readonly track: number;
      readonly staff: number;
      readonly beatIds: ReadonlySet<number>;
    }
  | {
      readonly kind: 'bars';
      readonly fromTrack: number;
      readonly toTrack: number;
      readonly fromBar: number;
      readonly toBar: number;
    };

/** From the top line of the staves drawn in a system to the bottom one, with half a space around. */
function stavesHeight(rows: readonly StaffRow[]): { top: number; bottom: number } | null {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (row.lines.length === 0) continue;
    const gap = spacing(row.lines);
    top = Math.min(top, (row.lines[0] ?? 0) - gap / 2);
    bottom = Math.max(bottom, (row.lines.at(-1) ?? 0) + gap / 2);
  }
  return Number.isFinite(top) && Number.isFinite(bottom) ? { top, bottom } : null;
}

/**
 * The boxes the editor's selection is drawn as, one a system: over the beats selected, on the
 * staves of their track's staff; or over the bars selected, on the staves of the tracks selected.
 */
export function selectionBoxes(bounds: ScoreBounds, span: SelectionSpan): Box[] {
  const rows = staffRows(bounds);
  const spans = new Map<number, { left: number; right: number }>();
  const widen = (system: number, left: number, right: number) => {
    const known = spans.get(system);
    spans.set(
      system,
      known === undefined
        ? { left, right }
        : { left: Math.min(known.left, left), right: Math.max(known.right, right) },
    );
  };
  if (span.kind === 'beats') {
    const beatCount = bounds.beatIndex.length / BOUNDS_BEAT_INDEX_STRIDE;
    for (let index = 0; index < beatCount; index++) {
      const at = index * BOUNDS_BEAT_INDEX_STRIDE;
      if (
        !span.beatIds.has(bounds.beatIndex[at] ?? -1) ||
        bounds.beatIndex[at + 1] !== span.track ||
        bounds.beatIndex[at + 2] !== span.staff
      )
        continue;
      const x = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 1] ?? 0;
      const w = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 2] ?? 0;
      widen(systemOfBeat(bounds, index), x, x + w);
    }
  } else {
    const [fromBar, toBar] = [Math.min(span.fromBar, span.toBar), Math.max(span.fromBar, span.toBar)];
    const barCount = bounds.barIndex.length / BOUNDS_BAR_INDEX_STRIDE;
    for (let index = 0; index < barCount; index++) {
      const bar = bounds.barIndex[index * BOUNDS_BAR_INDEX_STRIDE] ?? -1;
      if (bar < fromBar || bar > toBar) continue;
      const x = bounds.barRect[index * BOUNDS_BAR_RECT_STRIDE] ?? 0;
      const w = bounds.barRect[index * BOUNDS_BAR_RECT_STRIDE + 2] ?? 0;
      widen(bounds.barIndex[index * BOUNDS_BAR_INDEX_STRIDE + 1] ?? -1, x, x + w);
    }
  }
  const [fromTrack, toTrack] =
    span.kind === 'beats'
      ? [span.track, span.track]
      : [Math.min(span.fromTrack, span.toTrack), Math.max(span.fromTrack, span.toTrack)];
  const boxes: Box[] = [];
  for (const [system, { left, right }] of [...spans].sort(([a], [b]) => a - b)) {
    const height = stavesHeight(
      rows.filter(
        row =>
          row.system === system &&
          row.track >= fromTrack &&
          row.track <= toTrack &&
          (span.kind === 'bars' || row.staff === span.staff),
      ),
    );
    if (height !== null)
      boxes.push({ x: left, y: height.top, w: right - left, h: height.bottom - height.top });
  }
  return boxes;
}

/**
 * The beat and string a click at (x, y) means: on a staff of a track shown, the beat drawn
 * nearest along it; on the tablature, the string nearest. Null outside the staves.
 */
export function spotAtPoint(
  bounds: ScoreBounds,
  tracks: ReadonlySet<number>,
  x: number,
  y: number,
  inverted: boolean,
): CaretSpot | null {
  const systemCount = bounds.systems.length / BOUNDS_SYSTEM_STRIDE;
  let system = -1;
  for (let index = 0; index < systemCount; index++) {
    const top = bounds.systems[index * BOUNDS_SYSTEM_STRIDE + 1] ?? 0;
    const height = bounds.systems[index * BOUNDS_SYSTEM_STRIDE + 3] ?? 0;
    if (y >= top && y <= top + height) system = index;
  }
  if (system < 0) return null;
  // The staff whose lines (with half a space around them, and a space on the tablature) hold y.
  let staff: StaffRow | null = null;
  let nearest = Number.POSITIVE_INFINITY;
  for (const row of staffRows(bounds)) {
    if (row.system !== system || !tracks.has(row.track) || row.lines.length === 0) continue;
    const gap = spacing(row.lines);
    const top = (row.lines[0] ?? 0) - gap;
    const bottom = (row.lines.at(-1) ?? 0) + gap;
    const distance = y < top ? top - y : y > bottom ? y - bottom : 0;
    if (distance < nearest || (distance === nearest && row.kind === STAFF_KIND.tablature)) {
      nearest = distance;
      staff = row;
    }
  }
  if (staff === null || nearest > spacing(staff.lines) * 2) return null;
  const beatId = nearestBeat(bounds, system, staff.track, staff.staff, x);
  if (beatId === null) return null;
  let string: number | null = null;
  if (staff.kind === STAFF_KIND.tablature) {
    const gap = spacing(staff.lines);
    const line = Math.round((y - (staff.lines[0] ?? 0)) / gap);
    string = stringOfLine(Math.min(staff.lines.length - 1, Math.max(0, line)), staff.lines.length, inverted);
  }
  return { track: staff.track, staff: staff.staff, beatId, string };
}

function nearestBeat(
  bounds: ScoreBounds,
  system: number,
  track: number,
  staff: number,
  x: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const beatCount = bounds.beatIndex.length / BOUNDS_BEAT_INDEX_STRIDE;
  for (let index = 0; index < beatCount; index++) {
    const at = index * BOUNDS_BEAT_INDEX_STRIDE;
    if (bounds.beatIndex[at + 1] !== track || bounds.beatIndex[at + 2] !== staff) continue;
    if (systemOfBeat(bounds, index) !== system) continue;
    const realX = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 1] ?? 0;
    const realW = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 2] ?? 0;
    const distance = x < realX ? realX - x : x > realX + realW ? x - (realX + realW) : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = bounds.beatIndex[at] ?? null;
    }
  }
  return best;
}
