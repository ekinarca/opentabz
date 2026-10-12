import { useMemo, useState, type MouseEvent, type PointerEvent } from 'react';
import { NOTE_DEAD, NOTE_GHOST, NOTE_HARMONIC } from '@opentabz/core/shared';
import {
  DOUBLE_INLAYS,
  fretCentre,
  noteName,
  pitchAt,
  SINGLE_INLAYS,
  wirePosition,
  type FretboardNotes,
  type FretNote,
  type NoteLabels,
} from '../instrument-view/fretboard.ts';

/** Room left of the nut for the open strings' names and open notes. */
const NUT_ZONE = 46;
const END_PAD = 14;
/** Below this length the neck scrolls sideways rather than squeezing its frets. */
const MIN_NECK = 560;
const TOP = 16;
const NUMBERS = 18;

function stringGap(strings: number): number {
  if (strings <= 4) return 22;
  if (strings <= 6) return 19;
  if (strings <= 8) return 16;
  return 14;
}

export interface NeckGeometry {
  readonly width: number;
  readonly height: number;
  readonly gap: number;
  /** x of a note at `fret` (0: open, in front of the nut). */
  readonly noteX: (fret: number) => number;
  readonly stringY: (string: number) => number;
}

export function neckGeometry(
  strings: number,
  frets: number,
  available: number,
  leftHanded: boolean,
): NeckGeometry & { readonly nutX: number; readonly length: number; readonly mirror: (x: number) => number } {
  const gap = stringGap(strings);
  const length = Math.max(MIN_NECK, available - NUT_ZONE - END_PAD);
  const width = NUT_ZONE + length + END_PAD;
  const nutX = NUT_ZONE;
  const mirror = (x: number) => (leftHanded ? width - x : x);
  return {
    width,
    height: TOP + (strings - 1) * gap + 10 + NUMBERS,
    gap,
    nutX,
    length,
    mirror,
    noteX: fret => mirror(fret === 0 ? nutX - 13 : nutX + length * fretCentre(fret, frets)),
    stringY: string => TOP + (string - 1) * gap,
  };
}

type Kind = 'current' | 'next' | 'bar';

function NoteMark({
  note,
  kind,
  x,
  y,
  radius,
  label,
}: {
  readonly note: FretNote;
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly label: string | null;
}) {
  const fill =
    kind === 'current'
      ? 'var(--ot-cursor)'
      : kind === 'bar'
        ? 'color-mix(in oklab, var(--ot-cursor) 26%, var(--ot-surface))'
        : 'var(--ot-surface)';
  const ink =
    kind === 'current' ? 'var(--ot-on-cursor)' : kind === 'next' ? 'var(--ot-cursor)' : 'var(--ot-text)';
  const stroke = kind === 'next' ? 'var(--ot-cursor)' : 'none';
  const dead = (note.flags & NOTE_DEAD) !== 0;
  const harmonic = (note.flags & NOTE_HARMONIC) !== 0;
  const ghost = (note.flags & NOTE_GHOST) !== 0;
  return (
    <g
      className="ot-fret-note"
      data-kind={kind}
      data-string={note.string}
      data-fret={note.fret}
      opacity={ghost ? 0.6 : 1}
    >
      {dead ? (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={radius * 2}
          fontWeight={700}
          fill={kind === 'current' ? 'var(--ot-cursor)' : ink}
        >
          ×
        </text>
      ) : harmonic ? (
        <rect
          x={x - radius * 0.82}
          y={y - radius * 0.82}
          width={radius * 1.64}
          height={radius * 1.64}
          transform={`rotate(45 ${x} ${y})`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      ) : (
        // A ring for the next note is a little larger, so a note played again shows around it.
        <circle
          cx={x}
          cy={y}
          r={kind === 'next' ? radius + 2.5 : radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      )}
      {label !== null && !dead && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={label.length > 2 ? 7.5 : 8.5}
          fontWeight={600}
          fill={ink}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** The name of the place pointed at, in a tag above it (below it on the top strings). */
function PointedNote({
  name,
  x,
  y,
  radius,
}: {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}) {
  const tagY = y - radius - 19 >= 0 ? y - radius - 19 : y + radius + 3;
  return (
    <g data-pointed={name} pointerEvents="none">
      <circle cx={x} cy={y} r={radius} fill="none" stroke="var(--ot-text)" strokeDasharray="2 2" />
      <rect x={x - 17} y={tagY} width={34} height={16} rx={4} fill="var(--ot-text)" />
      <text
        x={x}
        y={tagY + 8}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
        fill="var(--ot-surface)"
      >
        {name}
      </text>
    </g>
  );
}

/**
 * A neck with any number of strings: the highest on top as in tablature, the nut on the left
 * (on the right for left-handed players), the capo, and the notes as marks.
 */
export function FretboardNeck({
  stringCount,
  tuning,
  capo,
  frets,
  available,
  leftHanded,
  labels,
  notes,
  description,
  onPlay,
}: {
  /** While the score is edited, a click writes the string and fret clicked (1 the highest string, frets from the nut). */
  readonly onPlay?: ((string: number, fret: number) => void) | undefined;
  readonly stringCount: number;
  readonly tuning: readonly number[];
  readonly capo: number;
  readonly frets: number;
  readonly available: number;
  readonly leftHanded: boolean;
  readonly labels: NoteLabels;
  readonly notes: FretboardNotes;
  readonly description: string;
}) {
  const geometry = useMemo(
    () => neckGeometry(stringCount, frets, available, leftHanded),
    [stringCount, frets, available, leftHanded],
  );
  const { width, height, gap, nutX, length, mirror, noteX, stringY } = geometry;
  const [pointed, setPointed] = useState<{ readonly string: number; readonly fret: number } | null>(null);
  const top = stringY(1);
  const bottom = stringY(stringCount);
  const radius = Math.min(9.5, gap * 0.48);
  const flats = notes.flats;

  const neck = useMemo(() => {
    const wires = Array.from({ length: frets + 1 }, (_, fret) =>
      mirror(nutX + length * wirePosition(fret, frets)),
    );
    const middle = (top + bottom) / 2;
    const fretWidth = length * (wirePosition(frets, frets) - wirePosition(frets - 1, frets));
    return (
      <g aria-hidden>
        <rect
          x={Math.min(mirror(nutX), mirror(nutX + length))}
          y={top - 9}
          width={length}
          height={bottom - top + 18}
          rx={3}
          fill="var(--fb-wood)"
          stroke="var(--fb-wood-edge)"
        />
        {SINGLE_INLAYS.filter(fret => fret <= frets).map(fret => (
          <circle key={fret} cx={noteX(fret)} cy={middle} r={4} fill="var(--fb-inlay)" />
        ))}
        {DOUBLE_INLAYS.filter(fret => fret <= frets).map(fret => (
          <g key={fret}>
            <circle cx={noteX(fret)} cy={top + (bottom - top) * 0.25} r={4} fill="var(--fb-inlay)" />
            <circle cx={noteX(fret)} cy={top + (bottom - top) * 0.75} r={4} fill="var(--fb-inlay)" />
          </g>
        ))}
        {wires.map((x, fret) => (
          <line
            key={fret}
            x1={x}
            x2={x}
            y1={top - 9}
            y2={bottom + 9}
            stroke={fret === 0 ? 'var(--fb-nut)' : 'var(--fb-fret)'}
            strokeWidth={fret === 0 ? 4 : 1.5}
          />
        ))}
        {Array.from({ length: stringCount }, (_, index) => (
          <line
            key={index}
            x1={mirror(nutX - 26)}
            x2={mirror(nutX + length)}
            y1={stringY(index + 1)}
            y2={stringY(index + 1)}
            stroke="var(--fb-string)"
            strokeWidth={0.8 + (1.6 * index) / Math.max(1, stringCount - 1)}
          />
        ))}
        {Array.from({ length: stringCount }, (_, index) => {
          const open = tuning[index];
          return open === undefined ? null : (
            <text
              key={index}
              x={mirror(13)}
              y={stringY(index + 1)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={600}
              fill="var(--ot-text-muted)"
            >
              {noteName(open, false).replace(/-?\d+$/, '')}
            </text>
          );
        })}
        {Array.from({ length: frets }, (_, index) => index + 1)
          .filter(fret => fretWidth >= 18 || SINGLE_INLAYS.includes(fret) || DOUBLE_INLAYS.includes(fret))
          .map(fret => (
            <text
              key={fret}
              x={noteX(fret)}
              y={bottom + 9 + NUMBERS / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9.5}
              fill="var(--ot-text-faint)"
            >
              {fret}
            </text>
          ))}
        {capo > 0 && (
          <g>
            <rect
              x={noteX(capo) - 4}
              y={top - 11}
              width={8}
              height={bottom - top + 22}
              rx={3}
              fill="var(--fb-capo)"
            />
          </g>
        )}
      </g>
    );
  }, [bottom, capo, frets, length, mirror, noteX, nutX, stringCount, stringY, top, tuning]);

  const marks: { note: FretNote; kind: Kind }[] = [
    ...notes.bar.map(note => ({ note, kind: 'bar' as const })),
    ...notes.next.map(note => ({ note, kind: 'next' as const })),
    ...notes.current.map(note => ({ note, kind: 'current' as const })),
  ];

  /** The string and fret under a point of the neck, or null off the strings. */
  const placeAt = (
    event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>,
  ): { string: number; fret: number } | null => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = mirror(event.clientX - box.left);
    const y = event.clientY - box.top;
    const string = Math.round((y - TOP) / gap) + 1;
    if (string < 1 || string > stringCount || x < 0) return null;
    let fret = 0;
    if (x >= nutX) {
      const share = (x - nutX) / length;
      fret = 1;
      while (fret < frets && wirePosition(fret, frets) < share) fret += 1;
    }
    return { string, fret };
  };
  const point = (event: PointerEvent<SVGSVGElement>) => {
    if (labels === 'off') return;
    const place = placeAt(event);
    setPointed(current =>
      place === null
        ? null
        : current?.string === place.string && current.fret === place.fret
          ? current
          : place,
    );
  };
  const pointedPitch = pointed === null ? null : pitchAt(tuning, pointed.string, pointed.fret, capo);

  return (
    <svg
      role="img"
      aria-label={description}
      data-strings={stringCount}
      data-frets={frets}
      data-left-handed={leftHanded}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      onPointerMove={point}
      onPointerDown={point}
      {...(onPlay === undefined
        ? {}
        : {
            onClick: (event: MouseEvent<SVGSVGElement>) => {
              const place = placeAt(event);
              if (place !== null) onPlay(place.string, place.fret);
            },
            'data-editing': '',
          })}
      onPointerLeave={event => {
        // A finger lifted leaves too: on touch screens the name stays until the next touch.
        if (event.pointerType === 'mouse') setPointed(null);
      }}
    >
      {neck}
      {marks.map(({ note, kind }, index) => (
        <NoteMark
          key={`${kind}-${note.string}-${note.fret}-${index}`}
          note={note}
          kind={kind}
          x={noteX(note.fret)}
          y={stringY(note.string)}
          radius={radius}
          label={labels === 'always' ? noteName(note.pitch, flats) : null}
        />
      ))}
      {pointed !== null && pointedPitch !== null && (
        <PointedNote
          name={noteName(pointedPitch, flats)}
          x={noteX(pointed.fret)}
          y={stringY(pointed.string)}
          radius={radius}
        />
      )}
    </svg>
  );
}
