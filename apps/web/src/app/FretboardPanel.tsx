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
import { useCallback, useEffect } from 'react';
import {
  FRETBOARD_SHOWS,
  fretboardNotes,
  fretCount,
  NOTE_LABELS,
  noteName,
  type FretboardNotes,
} from '../instrument-view/fretboard.ts';
import '../instrument-view/fretboard.css';
import { useTrackNotes } from '../instrument-view/use-track-notes.ts';
import { useViewNotes, useWidth, type NotesAt } from '../instrument-view/use-view-notes.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { FretboardNeck, neckGeometry } from './FretboardNeck.tsx';
import { Field } from './MetronomeSettingsForm.tsx';
import { TrackSelect } from './TrackSelect.tsx';

const s = strings.fretboard;

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
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const staff = track?.staves.find(candidate => candidate.stringCount > 0 && !candidate.isPercussion) ?? null;
  const capo = staff?.capo ?? 0;
  const trackNotes = useTrackNotes(doc.engineId, track?.index ?? 0);
  const notesAt = useCallback<NotesAt>(
    (timeline, notes, rows, tick) => fretboardNotes(timeline, notes, rows, tick, show, capo),
    [show, capo],
  );
  const notes = useViewNotes(doc.key, staff === null ? null : trackNotes, notesAt);
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
        <TrackSelect doc={doc} />
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
