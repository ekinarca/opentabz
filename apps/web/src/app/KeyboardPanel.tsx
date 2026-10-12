import { IconButton, Popover, PopoverContent, PopoverTrigger, SegmentedControl, Tooltip } from '@opentabz/ui';
import { Settings2, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import {
  FRETBOARD_SHOWS,
  NOTE_LABELS,
  noteName,
  type FretboardNotes,
  type ViewNote,
} from '../instrument-view/fretboard.ts';
import {
  HANDS,
  instrumentRange,
  keyboardNotes,
  keyboardSpan,
  pitchedStaves,
  playedRange,
} from '../instrument-view/keyboard.ts';
import '../instrument-view/keyboard.css';
import { useTrackNotes } from '../instrument-view/use-track-notes.ts';
import { useViewNotes, useWidth, type NotesAt } from '../instrument-view/use-view-notes.ts';
import type { OpenDocument } from '../state/documents.ts';
import { playPitchAtCaret, useEditing } from '../state/editing.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';
import { TrackSelect } from './TrackSelect.tsx';
import { keyCentre, PianoKeys } from './PianoKeys.tsx';

const s = strings.keyboard;
const f = strings.fretboard;

function describe(track: string, notes: FretboardNotes): string {
  const names = (list: readonly ViewNote[]) => list.map(note => noteName(note.pitch, notes.flats));
  return `${s.keys(track)}. ${s.playing(names(notes.current))}${s.next(names(notes.next))}`;
}

function KeyboardSettings() {
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
          <Field label={f.show} hint={s.showHints[preferences.fretboardShow]}>
            <SegmentedControl
              label={f.show}
              value={preferences.fretboardShow}
              segments={FRETBOARD_SHOWS.map(show => ({ value: show, label: f.shows[show] }))}
              onValueChange={fretboardShow => {
                preferences.set({ fretboardShow });
              }}
            />
          </Field>
          <Field label={f.labels} hint={s.labelHints[preferences.noteLabels]}>
            <SegmentedControl
              label={f.labels}
              value={preferences.noteLabels}
              segments={NOTE_LABELS.map(mode => ({ value: mode, label: f.labelModes[mode] }))}
              onValueChange={noteLabels => {
                preferences.set({ noteLabels });
              }}
            />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A piano keyboard under the score for the active track (VIEW-005): the keys being played (and,
 * as chosen, the next ones or the rest of the bar), the instrument's range (VIEW-019), a piano's
 * hands together or apart (VIEW-023). On narrow screens it scrolls to keep the music in view.
 */
export function KeyboardPanel({ doc }: { readonly doc: OpenDocument }) {
  const show = usePreferences(state => state.fretboardShow);
  const labels = usePreferences(state => state.noteLabels);
  const preferredHand = usePreferences(state => state.keyboardHand);
  const cursorColor = usePreferences(state => state.cursorColor);
  const setPreferences = usePreferences(state => state.set);
  const editing = useEditing(state => state.docs[doc.key]?.on === true);
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const staves = track === undefined ? [] : pitchedStaves(track);
  const rightStaff = staves[0] ?? 0;
  // Only a track on more than one staff has hands to tell apart.
  const hand = staves.length > 1 ? preferredHand : 'both';
  const trackNotes = useTrackNotes(doc.engineId, track?.index ?? 0);
  const notesAt = useCallback<NotesAt>(
    (timeline, notes, rows, tick) => keyboardNotes(timeline, notes, rows, tick, show, hand, rightStaff),
    [show, hand, rightStaff],
  );
  const notes = useViewNotes(doc.key, staves.length === 0 ? null : trackNotes, notesAt);
  const range = track === undefined ? null : instrumentRange(track);
  const span = range === null ? null : keyboardSpan(range, playedRange(trackNotes));
  const [scrollerRef, width] = useWidth();
  const trackName = track === undefined ? '' : track.name.trim().length > 0 ? track.name : track.shortName;
  const leftHand = useCallback(
    (note: ViewNote) => staves.length > 1 && hand === 'both' && note.staff !== rightStaff,
    [hand, rightStaff, staves.length],
  );

  // On a keyboard wider than the screen, keep the keys being played in view.
  const current = notes.current;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null || span === null || current.length === 0) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const xs = current.map(note => keyCentre(span, note.pitch, width));
    const from = Math.min(...xs);
    const to = Math.max(...xs);
    const margin = 32;
    if (from >= scroller.scrollLeft + margin && to <= scroller.scrollLeft + scroller.clientWidth - margin)
      return;
    scroller.scrollTo({ left: (from + to) / 2 - scroller.clientWidth / 2, behavior: 'smooth' });
  }, [current, scrollerRef, span, width]);

  return (
    <section
      aria-label={s.title}
      className="ot-keyboard shrink-0 border-t border-line bg-surface"
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 items-center gap-2 px-3">
        <TrackSelect doc={doc} />
        {staves.length > 1 && (
          <Tooltip label={s.handHints[hand]}>
            <div>
              <SegmentedControl
                label={s.hand}
                value={hand}
                segments={HANDS.map(value => ({ value, label: s.hands[value] }))}
                onValueChange={keyboardHand => {
                  setPreferences({ keyboardHand });
                }}
              />
            </div>
          </Tooltip>
        )}
        {range !== null && staves.length > 0 && (
          <span className="min-w-0 truncate text-[12px] text-ink-muted max-md:hidden">
            {s.range(noteName(range.low, false), noteName(range.high, false))}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <KeyboardSettings />
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setPreferences({ keyboard: false });
            }}
          />
        </div>
      </div>
      <div ref={scrollerRef} className="ot-keyboard-scroll px-2 pb-2">
        {staves.length === 0 || range === null || span === null ? (
          <p className="px-2 pt-2 pb-3 text-[13px] text-ink-muted">{s.noPitches(trackName)}</p>
        ) : (
          width > 0 && (
            <PianoKeys
              span={span}
              range={range}
              notes={notes}
              leftHand={leftHand}
              available={width}
              labels={labels}
              description={describe(trackName, notes)}
              onPlay={
                editing
                  ? pitch => {
                      playPitchAtCaret(doc.key, pitch);
                    }
                  : undefined
              }
            />
          )
        )}
      </div>
    </section>
  );
}
