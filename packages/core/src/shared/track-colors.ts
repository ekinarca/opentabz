/**
 * Colours tracks get when a file gives them none, and tracks put in (REND-036, EDIT-030): Okabe and
 * Ito's colours, told apart with any colour vision, as Guitar Pro gives new tracks a colour each.
 */
export const TRACK_COLORS = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#CC79A7',
  '#56B4E9',
  '#D55E00',
  '#F0E442',
] as const;

/** The colour of the track at a place among the others. */
export function trackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length] ?? TRACK_COLORS[0];
}
