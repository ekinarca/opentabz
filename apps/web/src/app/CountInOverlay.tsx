import { usePlayer } from '../state/player.ts';
import { strings } from '../strings.ts';

/**
 * The visual count-in: the beat being counted, large over the score, and a dot per count-in
 * click. The clicks themselves are what screen-reader users follow, so it is hidden from them.
 */
export function CountInOverlay() {
  const countIn = usePlayer(state => state.countInBeat);
  if (countIn === null) return null;
  const { beat, beats, numerator } = countIn;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[38%] z-30 flex justify-center px-4"
      data-testid="count-in"
    >
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-panel)] border border-line bg-raised/95 px-8 pt-3 pb-4 shadow-[var(--shadow-popover)]">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
          {strings.practice.countingIn}
        </span>
        <span
          key={beat}
          className="ot-beat-flash font-display text-[72px] leading-none text-accent tabular-nums"
        >
          {(beat % Math.max(1, numerator)) + 1}
        </span>
        <span className="flex max-w-[280px] flex-wrap justify-center gap-1">
          {Array.from({ length: beats }, (_, index) => (
            <span
              // A dot per count-in click, in order.
              key={index}
              className={`size-1.5 rounded-full ${index <= beat ? 'bg-accent' : 'bg-line-strong'}`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
