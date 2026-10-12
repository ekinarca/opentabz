/**
 * The track dialog (EDIT-030 … EDIT-036, EDIT-067): a track's name, short name, colour, sound,
 * strings and tuning (presets or string by string), capo and how it is written; moving it up or
 * down, deleting it. Adding a track starts from an instrument. What is changed is one edit to undo.
 */
import {
  MAX_CAPO,
  MAX_STRINGS,
  trackColor,
  type TrackProperties,
  type TrackState,
} from '@opentabz/core/shared';
import { Button, Dialog } from '@opentabz/ui';
import { useEffect, useId, useState } from 'react';
import { create } from 'zustand';
import { useDocuments } from '../state/documents.ts';
import { addTrack, editingOf, moveTrack, readTrack, removeTrack, setTrack } from '../state/editing.ts';
import {
  INSTRUMENT_IDS,
  INSTRUMENTS,
  noteName,
  presetOf,
  TUNING_PRESETS,
  type InstrumentId,
} from '../state/instruments.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.trackDialog;
const INPUT_CLASS = `${SELECT_CLASS} w-full`;
const PITCHES = Array.from({ length: 128 }, (_, midi) => midi);
const CAPOS = Array.from({ length: MAX_CAPO + 1 }, (_, fret) => fret);
const STRING_COUNTS = Array.from({ length: MAX_STRINGS + 1 }, (_, count) => count);

type Open =
  | { readonly mode: 'edit'; readonly key: string; readonly track: number }
  | { readonly mode: 'add'; readonly key: string };

export const useTrackDialog = create<{ readonly open: Open | null }>(() => ({ open: null }));

/** Opens the dialog of the document's active track; false when it is not being edited. */
export function openTrackDialog(key: string): boolean {
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  if (doc === undefined || !editingOf(key).on) return false;
  useTrackDialog.setState({ open: { mode: 'edit', key, track: doc.activeTrack } });
  return true;
}

/** Opens the dialog that adds a track. */
export function openAddTrack(key: string): boolean {
  if (!editingOf(key).on) return false;
  useTrackDialog.setState({ open: { mode: 'add', key } });
  return true;
}

/** What changed between two states of a track, to set. */
export function trackChanges(was: TrackState, now: TrackState): TrackProperties {
  const changes: { -readonly [K in keyof TrackProperties]: TrackProperties[K] } = {};
  if (was.name !== now.name) changes.name = now.name;
  if (was.shortName !== now.shortName) changes.shortName = now.shortName;
  if (was.color.toLowerCase() !== now.color.toLowerCase()) changes.color = now.color;
  if (was.program !== now.program) changes.program = now.program;
  if (
    was.tuning.length !== now.tuning.length ||
    was.tuning.some((pitch, index) => pitch !== now.tuning[index])
  )
    changes.tuning = now.tuning;
  if (was.capo !== now.capo) changes.capo = now.capo;
  if (was.transposition !== now.transposition) changes.transposition = now.transposition;
  return changes;
}

function close(): void {
  useTrackDialog.setState({ open: null });
}

/** A track's strings: how many, a preset, and each string's note. */
function TuningFields({
  tuning,
  onChange,
}: {
  readonly tuning: readonly number[];
  readonly onChange: (tuning: number[]) => void;
}) {
  const id = useId();
  const preset = presetOf(tuning);
  const presets = TUNING_PRESETS[tuning.length] ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={s.strings} htmlFor={`${id}-count`}>
          <select
            id={`${id}-count`}
            value={tuning.length}
            onChange={event => {
              const count = Number(event.target.value);
              const preset = TUNING_PRESETS[count]?.[0]?.tuning;
              // A preset of that many strings, or the strings there are, the lowest repeated.
              onChange(
                preset !== undefined
                  ? [...preset]
                  : Array.from(
                      { length: count },
                      (_, index) => tuning[index] ?? tuning.at(-1) ?? 52 - index * 5,
                    ),
              );
            }}
            className={INPUT_CLASS}
          >
            {STRING_COUNTS.map(count => (
              <option key={count} value={count}>
                {s.stringCount(count)}
              </option>
            ))}
          </select>
        </Field>
        {tuning.length > 0 && (
          <Field label={s.tuning} htmlFor={`${id}-preset`}>
            <select
              id={`${id}-preset`}
              value={preset?.id ?? 'custom'}
              onChange={event => {
                const chosen = presets.find(candidate => candidate.id === event.target.value);
                if (chosen !== undefined) onChange([...chosen.tuning]);
              }}
              className={INPUT_CLASS}
            >
              {preset === null && <option value="custom">{s.tunings['custom']}</option>}
              {presets.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {s.tunings[candidate.id] ?? candidate.id}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {tuning.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tuning.map((pitch, index) => (
            <Field key={index} label={s.string(index + 1)} htmlFor={`${id}-string-${String(index)}`}>
              <select
                id={`${id}-string-${String(index)}`}
                value={pitch}
                onChange={event => {
                  onChange(tuning.map((other, at) => (at === index ? Number(event.target.value) : other)));
                }}
                className={INPUT_CLASS}
              >
                {PITCHES.map(midi => (
                  <option key={midi} value={midi}>
                    {noteName(midi)}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}

/** The fields of a track being set or added: names, colour, sound, strings, capo, transposition. */
function TrackFields({
  state,
  onChange,
}: {
  readonly state: TrackState;
  readonly onChange: (patch: Partial<TrackState>) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_7rem_3.5rem] gap-3">
        <Field label={s.name} htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            type="text"
            maxLength={100}
            value={state.name}
            onChange={event => {
              onChange({ name: event.target.value });
            }}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={s.shortName} htmlFor={`${id}-short`}>
          <input
            id={`${id}-short`}
            type="text"
            maxLength={100}
            value={state.shortName}
            onChange={event => {
              onChange({ shortName: event.target.value });
            }}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={s.color} htmlFor={`${id}-color`}>
          <input
            id={`${id}-color`}
            type="color"
            value={state.color}
            onChange={event => {
              onChange({ color: event.target.value });
            }}
            className="h-9 w-full cursor-pointer rounded-[var(--radius-control)] border border-line bg-surface p-1"
          />
        </Field>
      </div>
      {!state.percussion && (
        <Field label={s.sound} htmlFor={`${id}-sound`}>
          <select
            id={`${id}-sound`}
            value={state.program}
            onChange={event => {
              onChange({ program: Number(event.target.value) });
            }}
            className={INPUT_CLASS}
          >
            {strings.mixer.programs.map((name, program) => (
              <option key={program} value={program}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {state.percussion ? (
        <p className="text-[13px] text-ink-muted">{s.drums}</p>
      ) : (
        <>
          <TuningFields
            tuning={state.tuning}
            onChange={tuning => {
              onChange({ tuning, ...(tuning.length === 0 ? { capo: 0 } : {}) });
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            {state.tuning.length > 0 && (
              <Field label={s.capo} htmlFor={`${id}-capo`}>
                <select
                  id={`${id}-capo`}
                  value={state.capo}
                  onChange={event => {
                    onChange({ capo: Number(event.target.value) });
                  }}
                  className={INPUT_CLASS}
                >
                  {CAPOS.map(fret => (
                    <option key={fret} value={fret}>
                      {fret === 0 ? s.noCapo : String(fret)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={s.transposition} htmlFor={`${id}-transposition`}>
              <select
                id={`${id}-transposition`}
                value={String(state.transposition)}
                onChange={event => {
                  onChange({ transposition: Number(event.target.value) });
                }}
                className={INPUT_CLASS}
              >
                {s.transpositions[String(state.transposition)] === undefined && (
                  <option value={String(state.transposition)}>{String(state.transposition)}</option>
                )}
                {Object.entries(s.transpositions).map(([semitones, label]) => (
                  <option key={semitones} value={semitones}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

/** A new track's starting point: an instrument's sound and strings, its name, the next colour. */
function fromInstrument(instrument: InstrumentId, tracks: number): TrackState {
  const [name, shortName] = s.instruments[instrument];
  const { program, tuning, percussion } = INSTRUMENTS[instrument];
  return {
    name,
    shortName,
    color: trackColor(tracks).toLowerCase(),
    program,
    tuning: [...tuning],
    capo: 0,
    transposition: percussion || tuning.length === 0 ? 0 : 12,
    percussion,
  };
}

export function TrackDialog() {
  const open = useTrackDialog(state => state.open);
  const id = useId();
  const doc = useDocuments(state =>
    open === null ? null : (state.docs.find(candidate => candidate.key === open.key) ?? null),
  );
  const [read, setRead] = useState<{
    readonly open: Open;
    readonly was: TrackState;
    readonly now: TrackState;
    readonly instrument: InstrumentId;
  } | null>(null);
  // Adding starts from an electric guitar, until another instrument is chosen.
  const start =
    open?.mode === 'add' ? fromInstrument('electric-guitar', doc?.summary.tracks.length ?? 0) : null;
  const current =
    read !== null && read.open === open
      ? read
      : open !== null && start !== null
        ? { open, was: start, now: start, instrument: 'electric-guitar' as const }
        : null;
  const instrument = current?.instrument ?? 'electric-guitar';

  useEffect(() => {
    if (open?.mode !== 'edit') return undefined;
    let wanted = true;
    void readTrack(open.key, open.track).then(state => {
      if (wanted && state !== null) setRead({ open, was: state, now: state, instrument: 'electric-guitar' });
    });
    return () => {
      wanted = false;
    };
  }, [open]);

  const update = (patch: Partial<TrackState>) => {
    if (current === null) return;
    setRead({ ...current, now: { ...current.now, ...patch } });
  };
  const count = doc?.summary.tracks.length ?? 0;
  const editing = open?.mode === 'edit' ? open : null;
  const title =
    open?.mode === 'add'
      ? s.addTitle
      : s.title(current?.was.name.trim() ? current.was.name : String((editing?.track ?? 0) + 1));

  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) close();
      }}
      title={title}
      description={open?.mode === 'add' ? s.addDescription : s.description}
      closeLabel={s.cancel}
      width="md"
      footer={
        <>
          {editing !== null && (
            <div className="mr-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={editing.track === 0}
                onClick={() => {
                  moveTrack(editing.key, editing.track, editing.track - 1);
                  close();
                }}
              >
                {s.moveUp}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={editing.track >= count - 1}
                onClick={() => {
                  moveTrack(editing.key, editing.track, editing.track + 1);
                  close();
                }}
              >
                {s.moveDown}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={count <= 1}
                onClick={() => {
                  removeTrack(editing.key, editing.track);
                  close();
                }}
              >
                {s.remove}
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={close}>
            {s.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={current === null}
            onClick={() => {
              if (current !== null && open !== null) {
                if (open.mode === 'add') {
                  const { now } = current;
                  addTrack(open.key, {
                    name: now.name,
                    shortName: now.shortName,
                    program: now.program,
                    tuning: now.tuning,
                    percussion: now.percussion,
                    color: now.color,
                  });
                } else {
                  const changes = trackChanges(current.was, current.now);
                  if (Object.keys(changes).length > 0) setTrack(open.key, open.track, changes);
                }
              }
              close();
            }}
          >
            {open?.mode === 'add' ? s.addButton : s.apply}
          </Button>
        </>
      }
    >
      {current !== null && (
        <div className="flex flex-col gap-4">
          {open?.mode === 'add' && (
            <Field label={s.instrument} htmlFor={`${id}-instrument`}>
              <select
                id={`${id}-instrument`}
                value={instrument}
                onChange={event => {
                  const chosen =
                    INSTRUMENT_IDS.find(candidate => candidate === event.target.value) ?? 'electric-guitar';
                  const state = fromInstrument(chosen, doc?.summary.tracks.length ?? 0);
                  setRead({ open, was: state, now: state, instrument: chosen });
                }}
                className={INPUT_CLASS}
              >
                {INSTRUMENT_IDS.map(candidate => (
                  <option key={candidate} value={candidate}>
                    {s.instruments[candidate][0]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <TrackFields state={current.now} onChange={update} />
        </div>
      )}
    </Dialog>
  );
}
