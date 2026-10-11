import { IconButton, SegmentedControl, cx } from '@opentabz/ui';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { lyricLines, nextTickOf, sungAt, syllableAt } from '../instrument-view/lyrics.ts';
import { useTrackLyrics } from '../instrument-view/use-track-notes.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { TrackSelect } from './TrackSelect.tsx';

const s = strings.lyrics;

/**
 * The lyrics of the active track (VIEW-010), line by line as written, the syllable being sung
 * lit as the song plays; a syllable clicked plays from there. On request they fill the window in
 * large type, the score hidden (VIEW-022).
 */
export function LyricsPanel({ doc }: { readonly doc: OpenDocument }) {
  const only = useUi(state => state.lyricsOnly);
  const setOnly = useUi(state => state.setLyricsOnly);
  const setPreferences = usePreferences(state => state.set);
  const cursorColor = usePreferences(state => state.cursorColor);
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const lyrics = useTrackLyrics(doc.engineId, track?.index ?? 0);
  const [chosen, setChosen] = useState(0);
  const verses = useMemo(
    () => (lyrics?.verses ?? []).flatMap((verse, index) => (verse.length > 0 ? [index] : [])),
    [lyrics],
  );
  const verseIndex = verses.includes(chosen) ? chosen : (verses[0] ?? 0);
  const verse = useMemo(() => lyrics?.verses[verseIndex] ?? [], [lyrics, verseIndex]);
  const timeline = usePlayer(state => (state.docKey === doc.key ? state.timeline : null));
  const sung = useMemo(
    () => (timeline === null || lyrics === null ? [] : sungAt(timeline, lyrics.trackIndex, verse)),
    [timeline, lyrics, verse],
  );
  const lines = useMemo(() => lyricLines(verse), [verse]);
  const read = useMemo(
    () => () => {
      const player = usePlayer.getState();
      return player.docKey === doc.key ? syllableAt(sung, player.tick) : null;
    },
    [doc.key, sung],
  );
  const current = useSyncExternalStore(usePlayer.subscribe, read);
  const scroller = useRef<HTMLDivElement>(null);
  const trackName = track === undefined ? '' : track.name.trim().length > 0 ? track.name : track.shortName;

  // The line being sung stays in the middle of the pane.
  useEffect(() => {
    const pane = scroller.current;
    const line = pane?.querySelector<HTMLElement>('[data-sung="true"]');
    if (pane === null || line === null || line === undefined) return;
    const top = line.offsetTop - pane.clientHeight / 2 + line.clientHeight / 2;
    if (Math.abs(pane.scrollTop - top) > line.clientHeight / 2) pane.scrollTo({ top, behavior: 'smooth' });
  }, [current]);

  return (
    <section
      aria-label={s.title}
      className={cx(
        'ot-lyrics flex flex-col border-t border-line bg-surface',
        only ? 'min-h-0 flex-1' : 'h-[min(32vh,240px)] shrink-0',
      )}
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <TrackSelect doc={doc} />
        {verses.length > 1 && (
          <SegmentedControl
            label={s.verse}
            value={String(verseIndex)}
            segments={verses.map(index => ({ value: String(index), label: s.verseOption(index + 1) }))}
            onValueChange={value => {
              setChosen(Number(value));
            }}
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            size="sm"
            label={s.only}
            pressed={only}
            icon={only ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
            onClick={() => {
              setOnly(!only);
            }}
          />
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setOnly(false);
              setPreferences({ lyrics: false });
            }}
          />
        </div>
      </div>
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {lyrics !== null && lines.length === 0 ? (
          <p className="pt-1 text-[13px] text-ink-muted">{s.none(trackName)}</p>
        ) : (
          lines.map((line, number) => {
            const sungHere = current !== null && line.syllables.includes(current);
            return (
              <div key={number} data-sung={sungHere} className={cx(only ? 'py-2' : 'py-1')}>
                {line.heading !== null && (
                  <p className="mt-2 text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
                    {line.heading}
                  </p>
                )}
                <p
                  className={cx(
                    'leading-snug',
                    only ? 'text-[clamp(24px,4.5vw,44px)] font-medium' : 'text-[17px]',
                  )}
                >
                  {line.syllables.map(index => {
                    const syllable = verse[index];
                    if (syllable === undefined) return null;
                    const state =
                      index === current ? 'current' : current !== null && index < current ? 'past' : 'future';
                    return (
                      <span key={index}>
                        <button
                          type="button"
                          data-state={state}
                          aria-label={s.sing(syllable.text)}
                          aria-current={state === 'current' ? 'true' : undefined}
                          onClick={() => {
                            const tick = nextTickOf(sung, index, usePlayer.getState().tick);
                            if (tick !== null) usePlayer.getState().seek(tick);
                          }}
                          className={cx(
                            // The highlight reaches past the letters without moving them.
                            'rounded-[4px] transition-colors duration-100',
                            state === 'current'
                              ? '-mx-[3px] bg-[var(--ot-cursor)] px-[3px] text-[var(--ot-on-cursor)]'
                              : state === 'past'
                                ? 'text-ink'
                                : 'text-ink-muted',
                          )}
                        >
                          {syllable.text}
                        </button>
                        {syllable.continues ? '' : ' '}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
