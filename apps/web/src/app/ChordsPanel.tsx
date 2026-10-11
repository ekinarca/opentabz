import { IconButton, cx } from '@opentabz/ui';
import { X } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import type { ChordShape } from '@opentabz/core/shared';
import { beatsUntil, chordChanges, chordsAt, type ChordChange } from '../instrument-view/chords.ts';
import { useTrackChords } from '../instrument-view/use-track-notes.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { ChordDiagram } from './ChordDiagram.tsx';
import { TrackSelect } from './TrackSelect.tsx';

const s = strings.chords;

interface Shown {
  /** Indexes into the track's chords. */
  readonly current: number | null;
  readonly next: number | null;
  /** Beats until the next chord, or null without one. */
  readonly countdown: number | null;
}

const NOTHING: Shown = { current: null, next: null, countdown: null };

/**
 * Reads the chords to show at the playback position, for useSyncExternalStore: the same object
 * comes back until the chord, the next one or the count of beats changes.
 */
function chordsReader(doc: OpenDocument, changes: readonly ChordChange[]): () => Shown {
  let cached = NOTHING;
  return () => {
    const player = usePlayer.getState();
    if (player.docKey !== doc.key || player.timeline === null || changes.length === 0) return NOTHING;
    const { current, next } = chordsAt(changes, player.tick);
    const countdown =
      next === null ? null : beatsUntil(player.timeline, doc.summary.masterBars, player.tick, next.tick);
    const value: Shown = { current: current?.chord ?? null, next: next?.chord ?? null, countdown };
    if (
      value.current !== cached.current ||
      value.next !== cached.next ||
      value.countdown !== cached.countdown
    )
      cached = value;
    return cached;
  };
}

/**
 * The chords of the active track under the score (VIEW-007): the chord sounding, the next one
 * with the beats left until it (VIEW-027), and every chord of the track; a chord clicked plays
 * from where it comes next.
 */
export function ChordsPanel({ doc }: { readonly doc: OpenDocument }) {
  const cursorColor = usePreferences(state => state.cursorColor);
  const setPreferences = usePreferences(state => state.set);
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const trackChords = useTrackChords(doc.engineId, track?.index ?? 0);
  const timeline = usePlayer(state => (state.docKey === doc.key ? state.timeline : null));
  const changes = useMemo(
    () => (timeline === null || trackChords === null ? [] : chordChanges(timeline, trackChords)),
    [timeline, trackChords],
  );
  const read = useMemo(() => chordsReader(doc, changes), [doc, changes]);
  const shown = useSyncExternalStore(usePlayer.subscribe, read);
  const chords = trackChords?.chords ?? [];
  const trackName = track === undefined ? '' : track.name.trim().length > 0 ? track.name : track.shortName;
  const chordAt = (index: number | null): ChordShape | null =>
    index === null ? null : (chords[index] ?? null);
  const current = chordAt(shown.current);
  const next = chordAt(shown.next);

  /** Plays from where the chord comes next (or first). */
  const goTo = (index: number) => {
    const tick = usePlayer.getState().tick;
    const target =
      changes.find(change => change.chord === index && change.tick > tick) ??
      changes.find(change => change.chord === index);
    if (target !== undefined) usePlayer.getState().seek(target.tick);
  };

  return (
    <section
      aria-label={s.title}
      className="ot-chords shrink-0 border-t border-line bg-surface"
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 items-center gap-2 px-3">
        <TrackSelect doc={doc} />
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setPreferences({ chords: false });
            }}
          />
        </div>
      </div>
      {trackChords !== null && chords.length === 0 ? (
        <p className="px-4 pt-1 pb-3 text-[13px] text-ink-muted">{s.none(trackName)}</p>
      ) : (
        <div className="flex items-stretch gap-4 overflow-x-auto px-3 pb-3 [scrollbar-width:thin]">
          <div className="flex shrink-0 flex-col items-center gap-1" data-testid="chord-now">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
              {s.now}
            </span>
            {current === null ? (
              <span className="flex h-[118px] w-[90px] items-center justify-center text-[22px] text-ink-faint">
                –
              </span>
            ) : (
              <ChordDiagram chord={current} size={1.15} />
            )}
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1" data-testid="chord-next">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
              {s.next}
            </span>
            {next === null ? (
              <span className="flex h-[96px] w-[76px] items-center justify-center text-[22px] text-ink-faint">
                –
              </span>
            ) : (
              <>
                <ChordDiagram chord={next} size={0.9} />
                {shown.countdown !== null && (
                  <span
                    className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-ink tabular-nums"
                    data-testid="chord-countdown"
                  >
                    {s.inBeats(shown.countdown)}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="mx-1 w-px shrink-0 bg-line" aria-hidden />
          <ul aria-label={s.all} className="flex items-start gap-2">
            {chords.map((chord, index) => (
              <li key={`${index}-${chord.name}`}>
                <button
                  type="button"
                  aria-label={s.goTo(chord.name)}
                  aria-current={shown.current === index ? 'true' : undefined}
                  onClick={() => {
                    goTo(index);
                  }}
                  className={cx(
                    'rounded-[var(--radius-control)] border p-1 hover:bg-sunken',
                    shown.current === index ? 'border-[var(--ot-cursor)] bg-sunken' : 'border-transparent',
                  )}
                >
                  <ChordDiagram chord={chord} size={0.7} label={chord.name} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
