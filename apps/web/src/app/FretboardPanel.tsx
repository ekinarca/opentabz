import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Switch,
  Tooltip,
} from '@opentabz/ui';
import { Settings2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type { TrackNotes } from '@opentabz/core/shared';
import {
  FRETBOARD_SHOWS,
  fretboardNotes,
  fretCount,
  indexTrackNotes,
  NO_NOTES,
  NOTE_LABELS,
  noteName,
  type FretboardNotes,
  type FretboardShow,
} from '../instrument-view/fretboard.ts';
import '../instrument-view/fretboard.css';
import { useTrackNotes } from '../instrument-view/use-track-notes.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { FretboardNeck, neckGeometry } from './FretboardNeck.tsx';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.fretboard;

function signature(notes: FretboardNotes): string {
  const part = (list: FretboardNotes['current']) =>
    list.map(note => `${note.string}:${note.fret}:${note.flags}`).join(',');
  return `${part(notes.current)}|${part(notes.next)}|${part(notes.bar)}|${notes.flats ? 'b' : '#'}`;
}

/**
 * Reads the notes to show at the playback position, for useSyncExternalStore: the same object
 * comes back until the notes shown change.
 */
function fretboardReader(
  docKey: string,
  notes: TrackNotes | null,
  show: FretboardShow,
  capo: number,
): () => FretboardNotes {
  if (notes === null) return () => NO_NOTES;
  const rows = indexTrackNotes(notes);
  let cached = { signature: signature(NO_NOTES), value: NO_NOTES };
  return () => {
    const player = usePlayer.getState();
    const value =
      player.docKey === docKey && player.timeline !== null
        ? fretboardNotes(player.timeline, notes, rows, player.tick, show, capo)
        : NO_NOTES;
    const next = signature(value);
    if (next !== cached.signature) cached = { signature: next, value };
    return cached.value;
  };
}

/** The notes to show, following the playback position (playing, paused or stepping). */
function useFretboardNotes(
  docKey: string,
  notes: TrackNotes | null,
  show: FretboardShow,
  capo: number,
): FretboardNotes {
  const read = useMemo(() => fretboardReader(docKey, notes, show, capo), [docKey, notes, show, capo]);
  return useSyncExternalStore(usePlayer.subscribe, read);
}

function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

function describe(track: string, notes: FretboardNotes): string {
  const name = (list: FretboardNotes['current']) =>
    list.map(note => `${noteName(note.pitch, notes.flats)} (${s.place(note.string, note.fret)})`);
  return `${s.neck(track)}. ${s.playing(name(notes.current))}${s.next(name(notes.next))}`;
}

function FretboardSettings() {
  const preferences = usePreferences();
  return (
    <Popover>
      <Tooltip label={s.settings}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.settings}
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <Settings2 size={16} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={s.settings}
        align="end"
        side="top"
        className="w-[min(340px,calc(100vw-16px))] p-4"
      >
        <div className="flex flex-col gap-4">
          <Field label={s.show} hint={s.showHints[preferences.fretboardShow]}>
            <SegmentedControl
              label={s.show}
              value={preferences.fretboardShow}
              segments={FRETBOARD_SHOWS.map(show => ({ value: show, label: s.shows[show] }))}
              onValueChange={fretboardShow => {
                preferences.set({ fretboardShow });
              }}
            />
          </Field>
          <Field label={s.labels} hint={s.labelHints[preferences.noteLabels]}>
            <SegmentedControl
              label={s.labels}
              value={preferences.noteLabels}
              segments={NOTE_LABELS.map(mode => ({ value: mode, label: s.labelModes[mode] }))}
              onValueChange={noteLabels => {
                preferences.set({ noteLabels });
              }}
            />
          </Field>
          <Switch
            label={s.leftHanded}
            checked={preferences.leftHanded}
            onCheckedChange={leftHanded => {
              preferences.set({ leftHanded });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The fretboard of the active track, under the score: the notes being played (and, as chosen,
 * the next ones or the rest of the bar), any number of strings and tunings, a capo, note names,
 * left- or right-handed. On narrow screens the neck scrolls to keep the music in view.
 */
export function FretboardPanel({ doc }: { readonly doc: OpenDocument }) {
  const show = usePreferences(state => state.fretboardShow);
  const labels = usePreferences(state => state.noteLabels);
  const leftHanded = usePreferences(state => state.leftHanded);
  const cursorColor = usePreferences(state => state.cursorColor);
  const setPreferences = usePreferences(state => state.set);
  const setActiveTrack = useDocuments(state => state.setActiveTrack);
  const selectId = useId();
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const staff = track?.staves.find(candidate => candidate.stringCount > 0 && !candidate.isPercussion) ?? null;
  const capo = staff?.capo ?? 0;
  const trackNotes = useTrackNotes(doc.engineId, track?.index ?? 0);
  const notes = useFretboardNotes(doc.key, staff === null ? null : trackNotes, show, capo);
  const frets = fretCount(trackNotes, capo);
  const [scrollerRef, width] = useWidth();
  const trackName = track === undefined ? '' : track.name.trim().length > 0 ? track.name : track.shortName;

  // On a neck wider than the screen, keep the notes being played in view.
  const current = notes.current;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null || staff === null || current.length === 0) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const geometry = neckGeometry(staff.stringCount, frets, width, leftHanded);
    const xs = current.map(note => geometry.noteX(note.fret));
    const from = Math.min(...xs);
    const to = Math.max(...xs);
    const margin = 32;
    if (from >= scroller.scrollLeft + margin && to <= scroller.scrollLeft + scroller.clientWidth - margin)
      return;
    scroller.scrollTo({ left: (from + to) / 2 - scroller.clientWidth / 2, behavior: 'smooth' });
  }, [current, frets, leftHanded, scrollerRef, staff, width]);

  return (
    <section
      aria-label={s.title}
      className="ot-fretboard shrink-0 border-t border-line bg-surface"
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 items-center gap-2 px-3">
        <label htmlFor={selectId} className="sr-only">
          {s.track}
        </label>
        <select
          id={selectId}
          value={track?.index ?? 0}
          onChange={event => {
            setActiveTrack(doc.key, Number(event.target.value));
          }}
          className={`${SELECT_CLASS} h-8 max-w-[min(260px,50vw)]`}
        >
          {doc.summary.tracks.map(candidate => (
            <option key={candidate.index} value={candidate.index}>
              {s.trackOption(
                candidate.index + 1,
                candidate.name.trim().length > 0 ? candidate.name : candidate.shortName,
              )}
            </option>
          ))}
        </select>
        {staff !== null && (
          <span className="min-w-0 truncate text-[12px] text-ink-muted">
            {s.tuning(staff.tuningName, capo)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <FretboardSettings />
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setPreferences({ fretboard: false });
            }}
          />
        </div>
      </div>
      <div ref={scrollerRef} className="ot-fretboard-scroll pb-2">
        {staff === null ? (
          <p className="px-4 pt-2 pb-3 text-[13px] text-ink-muted">{s.noStrings(trackName)}</p>
        ) : (
          width > 0 && (
            <FretboardNeck
              stringCount={staff.stringCount}
              tuning={staff.tuning}
              capo={capo}
              frets={frets}
              available={width}
              leftHanded={leftHanded}
              labels={labels}
              notes={notes}
              description={describe(trackName, notes)}
            />
          )
        )}
      </div>
    </section>
  );
}
