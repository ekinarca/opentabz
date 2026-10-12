/** A metronome glyph (Lucide has none): body, pendulum and weight. */
export function MetronomeIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 3h6l4 18H5L9 3Z" />
      <path d="M12 17 17 7" />
      <path d="M7.5 14h9" />
    </svg>
  );
}

/** A tuning fork (Lucide has none): two tines on a stem. */
export function TuningForkIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3v7a4 4 0 0 0 8 0V3" />
      <path d="M12 14v7" />
    </svg>
  );
}

/** A chord diagram: strings, frets and three fingers. */
export function ChordIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 4h14M5 4v16M9.7 4v16M14.3 4v16M19 4v16M5 10h14M5 15h14" />
      <circle cx="9.7" cy="7" r="1.6" fill="currentColor" />
      <circle cx="14.3" cy="12.5" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * A note of a duration (1 a whole note … 64 a sixty-fourth), for the edit bar: hollow heads for the
 * whole and half notes, a stem from the half on, a flag more for each halving from the eighth on.
 */
export function DurationIcon({
  value,
  size = 18,
  dotted = false,
}: {
  readonly value: number;
  readonly size?: number;
  readonly dotted?: boolean;
}) {
  const hollow = value <= 2;
  const flags = value >= 8 ? Math.round(Math.log2(value / 4)) : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <ellipse
        cx="9"
        cy="17.5"
        rx="3.9"
        ry="2.7"
        transform="rotate(-22 9 17.5)"
        fill={hollow ? 'none' : 'currentColor'}
      />
      {value >= 2 && <path d="M12.6 16.6V3" />}
      {Array.from({ length: flags }, (_, flag) => (
        <path key={flag} d={`M12.6 ${String(3 + flag * 3)}c0 2.4 4.6 3 4.6 6.2`} />
      ))}
      {dotted && <circle cx="19.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />}
    </svg>
  );
}
