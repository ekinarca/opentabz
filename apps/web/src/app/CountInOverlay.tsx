import { usePlayer } from '../state/player.ts';
import { strings } from '../strings.ts';

/**
 * The visual count-in (and the rest between loop passes): the beat being counted, large over the
 * score, and a dot per beat. The clicks themselves are what screen-reader users follow, so it is
 * hidden from them.
 */
export function CountInOverlay() {
  const countIn = usePlayer(state => state.countInBeat);
  const rest = usePlayer(state => state.restBeat);
  const shown = countIn ?? rest;
  if (shown === null) return null;
  const { beat, beats, numerator } = shown;
  const resting = countIn === null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[38%] z-30 flex justify-center px-4"
      data-testid={resting ? 'rest' : 'count-in'}
    >
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-panel)] border border-line bg-raised/95 px-8 pt-3 pb-4 shadow-[var(--shadow-popover)]">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
          {resting ? strings.practice.resting : strings.practice.countingIn}
        </span>
        <span
          key={beat}
          className={`ot-beat-flash font-display text-[72px] leading-none tabular-nums ${
            resting ? 'text-ink-muted' : 'text-accent'
          }`}
        >
          {(beat % Math.max(1, numerator)) + 1}
        </span>
        <span className="flex max-w-[280px] flex-wrap justify-center gap-1">
          {Array.from({ length: beats }, (_, index) => (
            <span
              // A dot per beat, in order.
              key={index}
              className={`size-1.5 rounded-full ${
                index <= beat ? (resting ? 'bg-ink-muted' : 'bg-accent') : 'bg-line-strong'
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
