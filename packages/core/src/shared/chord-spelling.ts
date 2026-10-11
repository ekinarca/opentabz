/**
 * Chord-symbol spelling (REND-226): a chord name read as root, quality and bass, and written
 * again in a classic, jazz or rock style. Names it cannot read are left as written.
 */

export const CHORD_SPELLINGS = ['written', 'classic', 'jazz', 'rock'] as const;
export type ChordSpelling = (typeof CHORD_SPELLINGS)[number];

/** The qualities spelled differently by style; the rest keep the name's own suffix. */
const QUALITIES = [
  'major',
  'minor',
  'maj7',
  'm7',
  'mMaj7',
  'dim',
  'dim7',
  'm7b5',
  'aug',
  'm6',
  'maj9',
  'm9',
] as const;
type Quality = (typeof QUALITIES)[number];

/** How each style writes a quality after the root. */
const SPELLINGS: Readonly<Record<Exclude<ChordSpelling, 'written'>, Readonly<Record<Quality, string>>>> = {
  classic: {
    major: '',
    minor: 'm',
    maj7: 'maj7',
    m7: 'm7',
    mMaj7: 'm(maj7)',
    dim: 'dim',
    dim7: 'dim7',
    m7b5: 'm7b5',
    aug: 'aug',
    m6: 'm6',
    maj9: 'maj9',
    m9: 'm9',
  },
  jazz: {
    major: '',
    minor: '-',
    maj7: 'Δ7',
    m7: '-7',
    mMaj7: '-Δ7',
    dim: '°',
    dim7: '°7',
    m7b5: 'ø7',
    aug: '+',
    m6: '-6',
    maj9: 'Δ9',
    m9: '-9',
  },
  rock: {
    major: '',
    minor: 'm',
    maj7: 'M7',
    m7: 'm7',
    mMaj7: 'mM7',
    dim: 'dim',
    dim7: 'dim7',
    m7b5: 'm7(b5)',
    aug: '+',
    m6: 'm6',
    maj9: 'M9',
    m9: 'm9',
  },
};

/** The ways chord names are commonly written, for each quality. */
const ALIASES: Readonly<Record<Quality, readonly string[]>> = {
  major: ['', 'M', 'maj', 'Maj', 'major'],
  minor: ['m', 'min', 'mi', '-', 'minor'],
  maj7: ['maj7', 'Maj7', 'M7', 'Δ7', 'Δ', 'ma7', 'j7', '7M'],
  m7: ['m7', 'min7', 'mi7', '-7'],
  mMaj7: ['mMaj7', 'mmaj7', 'mM7', 'm(maj7)', 'm(Maj7)', 'min(maj7)', '-Δ7', '-maj7', 'm/maj7'],
  dim: ['dim', '°', 'o'],
  dim7: ['dim7', '°7', 'o7'],
  m7b5: ['m7b5', 'm7(b5)', 'm7-5', 'min7b5', '-7b5', 'ø', 'ø7'],
  aug: ['aug', '+', '#5', '(#5)'],
  m6: ['m6', 'min6', '-6'],
  maj9: ['maj9', 'Maj9', 'M9', 'Δ9'],
  m9: ['m9', 'min9', '-9'],
};

const QUALITY_OF_SUFFIX = new Map<string, Quality>(
  QUALITIES.flatMap(quality => ALIASES[quality].map(alias => [alias, quality] as const)),
);

export interface ChordName {
  /** C, F#, Bb… */
  readonly root: string;
  /** The quality, if one the styles spell; otherwise the suffix as written. */
  readonly quality: Quality | null;
  readonly suffix: string;
  /** The bass note of a slash chord, or null. */
  readonly bass: string | null;
}

const NAME = /^([A-G](?:#|b|♯|♭)?)([^/]*)(?:\/([A-G](?:#|b|♯|♭)?))?$/;

/** A chord name read as root, quality and bass, or null when it is not one. */
export function readChordName(name: string): ChordName | null {
  const match = NAME.exec(name.trim());
  if (match === null) return null;
  const [, root = '', suffix = '', bass] = match;
  return {
    root: root.replace('♯', '#').replace('♭', 'b'),
    quality: QUALITY_OF_SUFFIX.get(suffix) ?? null,
    suffix,
    bass: bass === undefined ? null : bass.replace('♯', '#').replace('♭', 'b'),
  };
}

/** A chord name written in a style; as written when the style is `written` or the name unreadable. */
export function spellChord(name: string, spelling: ChordSpelling): string {
  if (spelling === 'written') return name;
  const chord = readChordName(name);
  if (chord === null) return name;
  const suffix = chord.quality === null ? chord.suffix : SPELLINGS[spelling][chord.quality];
  return `${chord.root}${suffix}${chord.bass === null ? '' : `/${chord.bass}`}`;
}
