/**
 * Harmonics (EDIT-113): where a string is touched for one — a fret's node for a natural harmonic,
 * frets above the note held for the others — and how far above the open string, or the note held,
 * it then sounds, as Guitar Pro (and alphaTab) reckon it.
 */

/** The nodes a harmonic is touched at, as Guitar Pro lists them (3.2: just above the third fret). */
export const HARMONIC_NODES = [
  2.4, 2.7, 3.2, 4, 5, 5.8, 7, 8.2, 9, 9.6, 12, 14.7, 16, 17, 19, 21.7, 24,
] as const;
export type HarmonicNode = (typeof HARMONIC_NODES)[number];

/** The semitones a harmonic touched at a node sounds above the string (or the note held), as alphaTab has them. */
export function harmonicPitch(node: number): number {
  if (Math.abs(node - 2.4) < 0.01) return 36;
  if (Math.abs(node - 2.7) < 0.01) return 34;
  if (node < 3) return 0;
  if (node <= 3.5) return 31;
  if (node <= 4) return 28;
  if (node <= 5) return 24;
  if (node <= 6) return 34;
  if (node <= 7) return 19;
  if (node <= 8.5) return 36;
  if (node <= 9) return 28;
  if (node <= 10) return 34;
  if (node <= 11) return 0;
  if (node <= 12) return 12;
  if (node < 14) return 0;
  if (node <= 15) return 34;
  if (node <= 16) return 28;
  if (node <= 17) return 36;
  if (node <= 18) return 0;
  if (node <= 19) return 19;
  if (node <= 21) return 0;
  if (node <= 22) return 36;
  if (node <= 24) return 24;
  return 0;
}

/** The node a natural harmonic written at a fret is touched at, as Guitar Pro files have it (3: 3.2). */
export function nodeOfFret(fret: number): HarmonicNode {
  switch (fret) {
    case 2:
      return 2.4;
    case 3:
      return 3.2;
    case 4:
    case 5:
    case 7:
    case 9:
    case 12:
    case 16:
    case 17:
    case 19:
    case 24:
      return fret;
    case 8:
      return 8.2;
    case 10:
      return 9.6;
    case 14:
    case 15:
      return 14.7;
    case 21:
    case 22:
      return 21.7;
    default:
      return 12;
  }
}
