import { NOTE_DEAD } from '@opentabz/core/shared';
import {
  noteName,
  type FretboardNotes,
  type NoteLabels,
  type ViewNote,
} from '../instrument-view/fretboard.ts';
import { keyPlaces, type KeyRange } from '../instrument-view/keyboard.ts';

/** Below this width a white key does not shrink: the keyboard scrolls sideways instead. */
export const MIN_WHITE_KEY = 18;
const MAX_WHITE_KEY = 34;
const WHITE_HEIGHT = 108;
const BLACK_HEIGHT = 66;
const MIDDLE_C = 60;

type Kind = 'current' | 'next' | 'bar';

interface Marked {
  readonly kind: Kind;
  /** A key of the left hand (shown in its own colour when both hands are). */
  readonly left: boolean;
}

/** Width of a white key for the space there is. */
export function whiteKeyWidth(whites: number, available: number): number {
  return Math.min(MAX_WHITE_KEY, Math.max(MIN_WHITE_KEY, Math.floor(available / whites)));
}

/** x of the middle of a key, for scrolling the played keys into view. */
export function keyCentre(span: KeyRange, pitch: number, available: number): number {
  const { keys, whites } = keyPlaces(span);
  const width = whiteKeyWidth(whites, available);
  const key = keys.find(candidate => candidate.pitch === pitch);
  return key === undefined ? 0 : (key.x + key.width / 2) * width;
}

function marks(notes: FretboardNotes, leftHand: (note: ViewNote) => boolean): Map<number, Marked> {
  const marked = new Map<number, Marked>();
  // Later kinds never cover earlier ones: what sounds now wins over what comes next.
  const add = (list: readonly ViewNote[], kind: Kind) => {
    for (const note of list) {
      if ((note.flags & NOTE_DEAD) !== 0 || marked.has(note.pitch)) continue;
      marked.set(note.pitch, { kind, left: leftHand(note) });
    }
  };
  add(notes.current, 'current');
  add(notes.next, 'next');
  add(notes.bar, 'bar');
  return marked;
}

/**
 * A piano keyboard from `span.low` to `span.high`: keys outside the instrument's range greyed
 * (VIEW-019), the keys played coloured by hand (VIEW-023), the next ones outlined.
 */
export function PianoKeys({
  span,
  range,
  notes,
  leftHand,
  available,
  labels,
  description,
}: {
  readonly span: KeyRange;
  readonly range: KeyRange;
  readonly notes: FretboardNotes;
  readonly leftHand: (note: ViewNote) => boolean;
  readonly available: number;
  readonly labels: NoteLabels;
  readonly description: string;
}) {
  const { keys, whites } = keyPlaces(span);
  const unit = whiteKeyWidth(whites, available);
  const width = whites * unit;
  const marked = marks(notes, leftHand);
  const color = (mark: Marked) => (mark.left ? 'var(--kb-left)' : 'var(--ot-cursor)');

  const key = (place: (typeof keys)[number]) => {
    const { pitch, black } = place;
    const mark = marked.get(pitch);
    const playable = pitch >= range.low && pitch <= range.high;
    const x = place.x * unit;
    const keyWidth = place.width * unit;
    const height = black ? BLACK_HEIGHT : WHITE_HEIGHT;
    const base = black
      ? playable
        ? 'var(--kb-black)'
        : 'var(--kb-black-out)'
      : playable
        ? 'var(--kb-white)'
        : 'var(--kb-white-out)';
    const fill =
      mark?.kind === 'current'
        ? color(mark)
        : mark?.kind === 'bar'
          ? `color-mix(in oklab, ${color(mark)} 30%, ${base})`
          : base;
    const name = noteName(pitch, notes.flats);
    // Always: white keys, and black keys being shown; on hover: the key pointed at.
    const labelled = labels === 'always' && (!black || mark !== undefined);
    return (
      <g
        key={pitch}
        className="ot-key"
        data-pitch={pitch}
        data-kind={mark?.kind ?? 'none'}
        data-hand={mark === undefined ? undefined : mark.left ? 'left' : 'right'}
        data-playable={playable}
      >
        <title>{name}</title>
        <rect
          x={x + (black ? 0 : 0.5)}
          y={0}
          width={keyWidth - (black ? 0 : 1)}
          height={height}
          rx={black ? 2 : 3}
          fill={fill}
          stroke={mark?.kind === 'next' ? color(mark) : black ? 'none' : 'var(--kb-edge)'}
          strokeWidth={mark?.kind === 'next' ? 2.5 : 1}
        />
        {mark?.kind === 'next' && (
          <circle cx={x + keyWidth / 2} cy={height - 10} r={3.5} fill={color(mark)} aria-hidden />
        )}
        {(labelled || labels === 'hover') && (
          <text
            className={labelled ? undefined : 'ot-key-name'}
            x={x + keyWidth / 2}
            y={height - (mark?.kind === 'next' ? 20 : 8)}
            textAnchor="middle"
            fontSize={black ? 8 : 9.5}
            fontWeight={600}
            fill={mark?.kind === 'current' || (black && playable) ? 'var(--kb-on-dark)' : 'var(--ot-text)'}
          >
            {black ? name.slice(0, -1) : name}
          </text>
        )}
        {pitch === MIDDLE_C && !labelled && labels !== 'hover' && (
          <circle cx={x + keyWidth / 2} cy={WHITE_HEIGHT - 8} r={2} fill="var(--ot-text-muted)" aria-hidden />
        )}
      </g>
    );
  };

  return (
    <svg
      width={width}
      height={WHITE_HEIGHT + 1}
      viewBox={`0 0 ${width} ${WHITE_HEIGHT + 1}`}
      role="img"
      aria-label={description}
      className="ot-keys block"
    >
      {keys.filter(place => !place.black).map(key)}
      {keys.filter(place => place.black).map(key)}
    </svg>
  );
}
