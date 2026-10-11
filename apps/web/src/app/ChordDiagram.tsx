import type { ChordShape } from '@opentabz/core/shared';
import { strings } from '../strings.ts';

/** Frets a diagram shows at least. */
const MIN_FRETS = 4;

/**
 * A chord diagram as players read them: the lowest string on the left, the nut (or the first
 * fret's number) on top, dots on the frets held, open strings as rings and strings not played as
 * crosses, barres as bars.
 */
export function ChordDiagram({
  chord,
  size = 1,
  label,
}: {
  readonly chord: ChordShape;
  /** Scale of the drawing (1: a diagram about 90 pixels wide for six strings). */
  readonly size?: number;
  /** Accessible name; the chord's name and frets if absent. */
  readonly label?: string;
}) {
  const count = chord.strings.length;
  const name = chord.name.trim().length > 0 ? chord.name : '?';
  if (count === 0) {
    return (
      <div
        role="img"
        aria-label={label ?? name}
        className="flex h-[52px] min-w-[52px] items-center justify-center rounded-md border border-line px-2 font-display text-[22px] text-ink"
        style={{ fontSize: 22 * size }}
      >
        {name}
      </div>
    );
  }
  // From the lowest string (left) to the highest.
  const frets = [...chord.strings].reverse();
  const highest = Math.max(0, ...frets);
  const rows = Math.max(MIN_FRETS, highest - chord.firstFret + 1);
  const gap = 14;
  const fretGap = 16;
  const left = chord.firstFret > 1 ? 22 : 12;
  const top = 34;
  const width = left + (count - 1) * gap + 12;
  const height = top + rows * fretGap + 8;
  const x = (string: number) => left + string * gap;
  const y = (fret: number) => top + (fret - chord.firstFret + 0.5) * fretGap;

  const spoken = frets
    .map(fret =>
      fret < 0 ? strings.chords.mutedString : fret === 0 ? strings.chords.openString : String(fret),
    )
    .join(', ');
  return (
    <svg
      role="img"
      aria-label={label ?? strings.chords.diagram(name, spoken)}
      width={width * size}
      height={height * size}
      viewBox={`0 0 ${width} ${height}`}
      className="ot-chord block"
    >
      <text x={width / 2} y={13} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ot-text)">
        {name}
      </text>
      {/* The nut, or the number of the first fret shown. */}
      {chord.firstFret <= 1 ? (
        <rect x={x(0) - 1} y={top - 3} width={x(count - 1) - x(0) + 2} height={3} fill="var(--ot-text)" />
      ) : (
        <text
          x={x(0) - 8}
          y={top + fretGap * 0.5 + 3.5}
          textAnchor="end"
          fontSize={10}
          fill="var(--ot-text-muted)"
        >
          {chord.firstFret}
        </text>
      )}
      {Array.from({ length: rows + 1 }, (_, row) => (
        <line
          key={`fret-${row}`}
          x1={x(0)}
          x2={x(count - 1)}
          y1={top + row * fretGap}
          y2={top + row * fretGap}
          stroke="var(--ot-text-muted)"
          strokeWidth={1}
        />
      ))}
      {frets.map((_, string) => (
        <line
          key={`string-${string}`}
          x1={x(string)}
          x2={x(string)}
          y1={top}
          y2={top + rows * fretGap}
          stroke="var(--ot-text-muted)"
          strokeWidth={1}
        />
      ))}
      {chord.barres.map(barre => {
        const held = frets.flatMap((fret, string) => (fret === barre ? [string] : []));
        if (held.length < 2) return null;
        const from = Math.min(...held);
        const to = Math.max(...held);
        return (
          <rect
            key={`barre-${barre}`}
            x={x(from) - 5}
            y={y(barre) - 5}
            width={x(to) - x(from) + 10}
            height={10}
            rx={5}
            fill="var(--ot-text)"
          />
        );
      })}
      {frets.map((fret, string) =>
        fret < 0 ? (
          <text
            key={`mark-${string}`}
            x={x(string)}
            y={top - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--ot-text-muted)"
          >
            ×
          </text>
        ) : fret === 0 ? (
          <circle
            key={`mark-${string}`}
            cx={x(string)}
            cy={top - 11}
            r={3.5}
            fill="none"
            stroke="var(--ot-text-muted)"
            strokeWidth={1.2}
          />
        ) : (
          <circle key={`mark-${string}`} cx={x(string)} cy={y(fret)} r={5} fill="var(--ot-text)" />
        ),
      )}
    </svg>
  );
}
