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
