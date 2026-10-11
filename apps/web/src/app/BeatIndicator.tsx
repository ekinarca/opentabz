import { useShallow } from 'zustand/react/shallow';
import { beatInBar, findBarOccurrence, occurrence } from '../score-view/timeline-lookup.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { strings } from '../strings.ts';

export interface Conductor {
  /** 1-based beat of the bar. */
  readonly beat: number;
  readonly beats: number;
  /** Counts each beat change, so a repeated beat number (a one-beat bar) still flashes. */
  readonly pulse: number;
}

/** Which beat of its bar the song is on (positions arrive per audio block, ~20 ms apart). */
export function useSongConductor(doc: OpenDocument): Conductor | null {
  const [beat, beats, bar] = usePlayer(
    useShallow(state => {
      const timeline = state.timeline;
      if (timeline === null) return [0, 0, -1];
      const index = findBarOccurrence(timeline, state.tick);
      const current = occurrence(timeline, index);
      if (current === null) return [0, 0, -1];
      const meter = doc.summary.masterBars[current.masterBarIndex] ?? { numerator: 4, denominator: 4 };
      return [beatInBar(current, state.tick, meter), meter.numerator, index];
    }),
  );
  if (beats === 0) return null;
  return { beat, beats, pulse: bar * 64 + beat };
}

/** Which beat of its bar the metronome on its own is on. */
export function useClickTrackConductor(): Conductor {
  const numerator = usePractice(state => state.toolNumerator);
  const denominator = usePractice(state => state.toolDenominator);
  const beatTicks = (4 * 960) / denominator;
  const position = usePlayer(state => Math.floor(state.tick / beatTicks));
  return { beat: (position % numerator) + 1, beats: numerator, pulse: position };
}

/**
 * The visual metronome: a dot per beat of the bar, the current one lit (accented beats larger),
 * flashing on every beat while playing. Large in the metronome on its own.
 */
export function BeatIndicator({
  conductor,
  playing,
  size = 'small',
}: {
  readonly conductor: Conductor;
  readonly playing: boolean;
  readonly size?: 'small' | 'large';
}) {
  const accent = usePractice(state => state.click.accent);
  const pattern = usePractice(state => state.click.pattern);
  const { beat, beats, pulse } = conductor;
  const accented = (index: number) =>
    accent === 'first' ? index === 0 : accent === 'pattern' && pattern[index % pattern.length] === 'accent';
  const large = size === 'large';
  return (
    <div
      role="img"
      aria-label={strings.practice.beat(beat, beats)}
      className={`flex shrink-0 items-center justify-center ${large ? 'flex-wrap gap-3' : 'gap-1'}`}
    >
      {Array.from({ length: beats }, (_, index) => {
        const current = playing && index === beat - 1;
        const dot = large ? (accented(index) ? 'size-7' : 'size-5') : accented(index) ? 'size-2.5' : 'size-2';
        return (
          <span
            // A dot is the beat at its position; the current one restarts its flash on each pulse.
            key={current ? `pulse-${pulse}` : `beat-${index}`}
            aria-hidden
            className={`rounded-full ${dot} ${
              current
                ? `bg-accent ${large ? 'ot-beat-flash' : ''}`
                : accented(index)
                  ? 'bg-line-strong'
                  : 'bg-line'
            }`}
          />
        );
      })}
    </div>
  );
}
