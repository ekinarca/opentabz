/**
 * The chord builder (EDIT-040, EDIT-041, EDIT-134 … EDIT-141), as Guitar Pro's chord dialog builds
 * chords: a root and a quality, extensions (6, 7, 9, 11, 13 and added tones), altered fifths,
 * ninths, elevenths and thirteenths, tones left out and a bass note (an inversion, or any note
 * after a slash); the chord's name and tones; its voicings on a staff's strings, with a barre
 * where one finger holds several strings; and the chord the notes of a beat make.
 * alphaTab-free.
 */

/** Roots as chords are named: sharps and flats both. */
export const CHORD_ROOTS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
] as const;
export type ChordRoot = (typeof CHORD_ROOTS)[number];

/** The triad a chord is built on: major, minor, diminished, augmented, suspended, or a power chord. */
export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'sus2' | 'sus4' | 'power';
export const CHORD_QUALITIES: readonly ChordQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  'power',
];

/** What is added to the triad: a sixth, a seventh and the tones over it, or a tone added alone. */
export type ChordExtension =
  'none' | '6' | '6/9' | '7' | 'maj7' | '9' | 'maj9' | '11' | '13' | 'add9' | 'add11' | 'dim7';
export const CHORD_EXTENSIONS: readonly ChordExtension[] = [
  'none',
  '6',
  '6/9',
  '7',
  'maj7',
  '9',
  'maj9',
  '11',
  '13',
  'add9',
  'add11',
  'dim7',
];

/** A tone a chord leaves out. */
export type ChordOmission = 'third' | 'fifth';

/** A chord as the builder makes it. */
export interface ChordSpec {
  readonly root: ChordRoot;
  readonly quality: ChordQuality;
  readonly extension: ChordExtension;
  readonly fifth: 'natural' | 'flat' | 'sharp';
  /** A ninth altered: put in if the chord has none. */
  readonly ninth: 'natural' | 'flat' | 'sharp';
  readonly eleventh: 'natural' | 'sharp';
  readonly thirteenth: 'natural' | 'flat';
  readonly omit: readonly ChordOmission[];
  /** The note in the bass, if not the root: a chord tone (an inversion) or any note. */
  readonly bass: ChordRoot | null;
}

/** A plain major chord on a root. */
export function plainChord(root: ChordRoot): ChordSpec {
  return {
    root,
    quality: 'major',
    extension: 'none',
    fifth: 'natural',
    ninth: 'natural',
    eleventh: 'natural',
    thirteenth: 'natural',
    omit: [],
    bass: null,
  };
}

const LETTERS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A root's pitch class, 0 C … 11 B. */
export function pitchClassOf(root: ChordRoot): number {
  const base = LETTERS[root.charAt(0)] ?? 0;
  const accidental = root.endsWith('#') ? 1 : root.endsWith('b') ? -1 : 0;
  return (base + accidental + 12) % 12;
}

/** Roots by pitch class, as chords are most often named. */
const NAMED_ROOTS: readonly ChordRoot[] = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A pitch class named as a chord's root. */
export function rootOf(pitchClass: number): ChordRoot {
  return NAMED_ROOTS[((pitchClass % 12) + 12) % 12] ?? 'C';
}

const TRIADS: Readonly<Record<ChordQuality, readonly number[]>> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  power: [0, 7],
};

const EXTENSIONS: Readonly<Record<ChordExtension, readonly number[]>> = {
  none: [],
  '6': [9],
  '6/9': [9, 14],
  '7': [10],
  maj7: [11],
  '9': [10, 14],
  maj9: [11, 14],
  '11': [10, 14, 17],
  '13': [10, 14, 17, 21],
  add9: [14],
  add11: [17],
  dim7: [9],
};

/** The chord's tones, in semitones above its root (up to two octaves). */
export function chordIntervals(spec: ChordSpec): number[] {
  const tones = new Set<number>(TRIADS[spec.quality]);
  if (spec.quality !== 'power' || spec.fifth !== 'natural') {
    const fifth = [6, 7, 8].find(each => tones.has(each));
    if (fifth !== undefined && spec.fifth !== 'natural') {
      tones.delete(fifth);
      tones.add(spec.fifth === 'flat' ? 6 : 8);
    }
  }
  for (const each of EXTENSIONS[spec.extension]) tones.add(each);
  const alter = (natural: number, altered: number | null) => {
    if (altered === null) return;
    tones.delete(natural);
    tones.add(altered);
  };
  alter(14, spec.ninth === 'flat' ? 13 : spec.ninth === 'sharp' ? 15 : null);
  alter(17, spec.eleventh === 'sharp' ? 18 : null);
  alter(21, spec.thirteenth === 'flat' ? 20 : null);
  if (spec.omit.includes('third')) for (const each of [3, 4]) tones.delete(each);
  if (spec.omit.includes('fifth')) for (const each of [6, 7, 8]) tones.delete(each);
  return [...tones].sort((a, b) => a - b);
}

/** The chord's pitch classes. */
export function chordTones(spec: ChordSpec): number[] {
  const root = pitchClassOf(spec.root);
  return [...new Set(chordIntervals(spec).map(interval => (root + interval) % 12))];
}

/** The tones a voicing must have: all but a perfect fifth, and the ninth and eleventh under a thirteenth. */
function requiredIntervals(spec: ChordSpec): number[] {
  return chordIntervals(spec).filter(
    interval =>
      interval !== 7 &&
      !(spec.extension === '13' && (interval === 14 || interval === 17)) &&
      !(spec.extension === '11' && interval === 14),
  );
}

/** The quality's mark after the root, with a seventh or more where it changes it. */
function qualityMark(spec: ChordSpec): string {
  const { quality, extension } = spec;
  const major7 = extension === 'maj7' || extension === 'maj9';
  switch (quality) {
    case 'major':
      return extension === 'none' ? '' : extension;
    case 'minor':
      if (extension === 'none') return 'm';
      return major7 || extension.startsWith('add') ? `m(${extension})` : `m${extension}`;
    case 'diminished':
      if (extension === 'dim7') return 'dim7';
      if (extension === '7') return 'm7b5';
      return extension === 'none' ? 'dim' : `dim(${extension})`;
    case 'augmented':
      return extension === 'none' ? 'aug' : `aug${extension}`;
    case 'sus2':
    case 'sus4':
      return extension === 'none' ? quality : `${extension}${quality}`;
    case 'power':
      return '5';
  }
}

/** The chord's name, as Guitar Pro writes it: "C7b9", "Am7/G", "Dsus4", "E5". */
export function chordName(spec: ChordSpec): string {
  const marks: string[] = [];
  const hasFifthOf = (quality: ChordQuality) => quality === 'diminished' || quality === 'augmented';
  if (spec.fifth !== 'natural' && !hasFifthOf(spec.quality)) marks.push(spec.fifth === 'flat' ? 'b5' : '#5');
  if (spec.ninth !== 'natural') marks.push(spec.ninth === 'flat' ? 'b9' : '#9');
  if (spec.eleventh === 'sharp') marks.push('#11');
  if (spec.thirteenth === 'flat') marks.push('b13');
  const base = `${spec.root}${qualityMark(spec)}`;
  // Alterations follow a seventh directly ("C7b9"); else in brackets ("C(b5)").
  const seventh = /[0-9]$/.test(base) && spec.extension !== 'none';
  const altered = marks.length === 0 ? '' : seventh ? marks.join('') : `(${marks.join(',')})`;
  const omitted = spec.omit.map(each => (each === 'third' ? '(no3)' : '(no5)')).join('');
  const bass =
    spec.bass === null || pitchClassOf(spec.bass) === pitchClassOf(spec.root) ? '' : `/${spec.bass}`;
  return `${base}${altered}${omitted}${bass}`;
}

/** The chord's tones that can be in its bass for its inversions: root, third, fifth, seventh. */
export function inversionBasses(spec: ChordSpec): ChordRoot[] {
  const root = pitchClassOf(spec.root);
  const intervals = chordIntervals(spec).filter(interval => interval < 12);
  return intervals.slice(0, 4).map(interval => rootOf(root + interval));
}

/** A chord diagram: frets from the highest string to the lowest (0 open, −1 not played). */
export interface Voicing {
  readonly strings: readonly number[];
  /** The fret at the diagram's top (1: the nut). */
  readonly firstFret: number;
  /** Frets one finger holds across strings (a barre). */
  readonly barres: readonly number[];
}

/**
 * The barre a shape needs (EDIT-141): its lowest fret held on two strings or more, the strings
 * between them held at that fret or higher.
 */
export function autoBarres(strings: readonly number[]): number[] {
  const fretted = strings.filter(fret => fret > 0);
  if (fretted.length < 2) return [];
  const lowest = Math.min(...fretted);
  const first = strings.indexOf(lowest);
  const last = strings.lastIndexOf(lowest);
  if (first === last) return [];
  return strings.slice(first, last + 1).every(fret => fret >= lowest) ? [lowest] : [];
}

/** Where a shape's diagram starts: the nut when it reaches the fifth fret or less. */
export function firstFretOf(strings: readonly number[]): number {
  const fretted = strings.filter(fret => fret > 0);
  if (fretted.length === 0 || Math.max(...fretted) <= 5) return 1;
  return Math.min(...fretted);
}

/** How far a hand stretches: the frets a voicing spans, from its lowest fretted to its highest. */
const SPAN = 4;

/**
 * The chord's voicings on strings tuned `tuning` (MIDI notes, highest string first), best first:
 * every tone it must have, its bass (the root, or the bass asked) the lowest note, within a
 * hand's span, few strings left unplayed, low on the neck.
 */
export function chordVoicings(
  spec: ChordSpec,
  tuning: readonly number[],
  { maxFret = 15, count = 24 }: { readonly maxFret?: number; readonly count?: number } = {},
): Voicing[] {
  const strings = tuning.length;
  if (strings < 2) return [];
  const root = pitchClassOf(spec.root);
  const tones = new Set(chordTones(spec));
  const required = new Set(requiredIntervals(spec).map(interval => (root + interval) % 12));
  const bass = spec.bass === null ? root : pitchClassOf(spec.bass);
  if (!tones.has(bass)) tones.add(bass);
  const found = new Map<string, { voicing: Voicing; score: number }>();
  for (let start = 1; start <= maxFret; start++) {
    const options = tuning.map(open => {
      const frets = [-1];
      if (tones.has(open % 12)) frets.push(0);
      for (let fret = start; fret < start + SPAN && fret <= maxFret; fret++)
        if (tones.has((open + fret) % 12)) frets.push(fret);
      return frets;
    });
    const chosen: number[] = new Array<number>(strings).fill(-1);
    const visit = (index: number): void => {
      if (index === strings) {
        consider(chosen);
        return;
      }
      for (const fret of options[index] ?? [-1]) {
        chosen[index] = fret;
        visit(index + 1);
      }
    };
    const consider = (shape: readonly number[]): void => {
      const played = shape.flatMap((fret, index) => (fret < 0 ? [] : [index]));
      if (played.length < Math.min(3, tones.size)) return;
      // The lowest note sounds on the lowest string played.
      const lowest = played[played.length - 1] ?? 0;
      const lowestPitch = (tuning[lowest] ?? 0) + (shape[lowest] ?? 0);
      if (lowestPitch % 12 !== bass) return;
      const sounding = new Set(played.map(index => ((tuning[index] ?? 0) + (shape[index] ?? 0)) % 12));
      for (const tone of required) if (!sounding.has(tone)) return;
      // A tone it may leave out (the fifth) is better kept.
      const missing = [...tones].filter(tone => !sounding.has(tone)).length;
      const fretted = shape.filter(fret => fret > 0);
      if (fretted.length > 0 && Math.max(...fretted) - Math.min(...fretted) >= SPAN) return;
      // Strings left out between those played are hard to keep quiet.
      const top = played[0] ?? 0;
      const inner = shape.slice(top, lowest + 1).filter(fret => fret < 0).length;
      if (fingersFor(shape) > 4) return;
      const score =
        missing * 1.5 +
        (strings - played.length) * 2 +
        inner * 5 +
        (fretted.length > 0 ? Math.min(...fretted) : 0) * 0.6 +
        (fretted.length > 0 ? Math.max(...fretted) - Math.min(...fretted) : 0);
      const key = shape.join(',');
      const previous = found.get(key);
      if (previous === undefined || score < previous.score)
        found.set(key, {
          voicing: { strings: [...shape], firstFret: firstFretOf(shape), barres: autoBarres(shape) },
          score,
        });
    };
    visit(0);
  }
  return [...found.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(each => each.voicing);
}

/** The fingers a shape takes: one a fretted string, one for all the strings a barre holds. */
function fingersFor(shape: readonly number[]): number {
  const fretted = shape.filter(fret => fret > 0).length;
  const [barre] = autoBarres(shape);
  return barre === undefined ? fretted : fretted - shape.filter(fret => fret === barre).length + 1;
}

/** The pitches a voicing sounds, lowest first. */
export function voicingPitches(voicing: Voicing, tuning: readonly number[]): number[] {
  return voicing.strings
    .flatMap((fret, index) => (fret < 0 ? [] : [(tuning[index] ?? 0) + fret]))
    .sort((a, b) => a - b);
}

const ALL_FIFTHS = ['natural', 'flat', 'sharp'] as const;
const ALL_NINTHS = ['natural', 'flat', 'sharp'] as const;
const ALL_ELEVENTHS = ['natural', 'sharp'] as const;
const ALL_THIRTEENTHS = ['natural', 'flat'] as const;
const ALL_OMITS: readonly (readonly ChordOmission[])[] = [[], ['fifth'], ['third']];

/** How plain a chord is, to prefer the plainest of those the notes make. */
function plainness(spec: ChordSpec, bassIsRoot: boolean): number {
  return (
    // An inversion before an altered chord: E G C is C/E, not Em(#5).
    (bassIsRoot ? 0 : 3) +
    CHORD_EXTENSIONS.indexOf(spec.extension) * 0.5 +
    CHORD_QUALITIES.indexOf(spec.quality) * 0.4 +
    (spec.fifth === 'natural' ? 0 : 4) +
    (spec.ninth === 'natural' ? 0 : 4) +
    (spec.eleventh === 'natural' ? 0 : 4) +
    (spec.thirteenth === 'natural' ? 0 : 4) +
    spec.omit.length * 3
  );
}

/**
 * The chord the pitches make (EDIT-041), named as plainly as can be: its root among them, the
 * lowest the bass (after a slash when not the root). Null for fewer than two pitch classes, or
 * notes no chord the builder knows is made of.
 */
export function recognizeChord(pitches: readonly number[]): ChordSpec | null {
  const classes = new Set(pitches.map(pitch => ((pitch % 12) + 12) % 12));
  if (classes.size < 2) return null;
  const lowest = Math.min(...pitches);
  const bass = ((lowest % 12) + 12) % 12;
  let best: { spec: ChordSpec; score: number } | null = null;
  for (const rootClass of classes) {
    const root = rootOf(rootClass);
    for (const quality of CHORD_QUALITIES)
      for (const extension of CHORD_EXTENSIONS)
        for (const fifth of ALL_FIFTHS)
          for (const ninth of ALL_NINTHS)
            for (const eleventh of ALL_ELEVENTHS)
              for (const thirteenth of ALL_THIRTEENTHS)
                for (const omit of ALL_OMITS) {
                  if (extension === 'dim7' && quality !== 'diminished') continue;
                  const spec: ChordSpec = {
                    root,
                    quality,
                    extension,
                    fifth,
                    ninth,
                    eleventh,
                    thirteenth,
                    omit,
                    bass: bass === rootClass ? null : rootOf(bass),
                  };
                  const tones = chordTones(spec);
                  if (tones.length !== classes.size || !tones.every(tone => classes.has(tone))) continue;
                  const score = plainness(spec, bass === rootClass);
                  if (best === null || score < best.score) best = { spec, score };
                }
  }
  return best?.spec ?? null;
}
