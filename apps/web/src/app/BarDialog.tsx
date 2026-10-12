/**
 * The bar dialog (EDIT-021 … EDIT-024, EDIT-026, EDIT-027): the caret's bar's time signature, key,
 * tempo (and a ramp to the next), repeats and alternate endings, section, the bar line at its end,
 * free time, triplet feel and a pickup bar, for every track; and the caret's staff's own clef and
 * simile mark (EDIT-107, EDIT-108). Only what is changed is set, as one edit to undo.
 */
import {
  BAR_LINES,
  BEAM_UNITS,
  CLEF_OTTAVAS,
  CLEFS,
  MAX_ENDINGS,
  MAX_REPEATS,
  MAX_TEMPO,
  METER_DENOMINATORS,
  MIN_TEMPO,
  TRIPLET_FEELS,
  type BarDirection,
  type BarLine,
  type BarProperties,
  type BarState,
  type BeamGroups,
  type BeamUnit,
  type Clef,
  type ClefOttava,
  type Simile,
  type StaffBarProperties,
  type StaffBarState,
  type TripletFeel,
} from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { useEffect, useId, useState } from 'react';
import { create } from 'zustand';
import { useDocuments } from '../state/documents.ts';
import { caretBar, editingOf, readBar, readStaffBar, setBar } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.barDialog;

/** The bar whose dialog is open, its document, and the staff the caret is in. */
interface OpenBar {
  readonly key: string;
  readonly bar: number;
  readonly track: number;
  readonly staff: number;
}

export const useBarDialog = create<{ readonly open: OpenBar | null }>(() => ({ open: null }));

/** Opens the dialog of the caret's bar; false when the document is not being edited. */
export function openBarDialog(key: string): boolean {
  const editing = editingOf(key);
  const bar = caretBar(editing);
  const { caret } = editing;
  if (!editing.on || bar === null || caret === null) return false;
  useBarDialog.setState({ open: { key, bar, track: caret.track, staff: caret.staff } });
  return true;
}

/** What changed of a staff's own properties at a bar, to set; places kept with a new clef if asked. */
export function staffBarChanges(
  was: StaffBarState,
  now: StaffBarState,
  keepPlaces: boolean,
): StaffBarProperties {
  const changes: { -readonly [K in keyof StaffBarProperties]: StaffBarProperties[K] } = {};
  if (was.clef !== now.clef) changes.clef = now.clef;
  if (was.clefOttava !== now.clefOttava) changes.clefOttava = now.clefOttava;
  if (keepPlaces && (changes.clef !== undefined || changes.clefOttava !== undefined))
    changes.keepPlaces = true;
  if (was.simile !== now.simile) changes.simile = now.simile;
  return changes;
}

/** The places a jump goes to, written at a bar (EDIT-025). */
const PLACES = ['segno', 'segno-segno', 'coda', 'double-coda', 'fine'] as const;
type Place = (typeof PLACES)[number];

/** The jumps written at the end of a bar: at most one a bar. */
const JUMPS = [
  'da-capo',
  'da-capo-al-coda',
  'da-capo-al-double-coda',
  'da-capo-al-fine',
  'dal-segno',
  'dal-segno-al-coda',
  'dal-segno-al-double-coda',
  'dal-segno-al-fine',
  'dal-segno-segno',
  'dal-segno-segno-al-coda',
  'dal-segno-segno-al-double-coda',
  'dal-segno-segno-al-fine',
  'da-coda',
  'da-double-coda',
] as const;

function isPlace(direction: BarDirection): direction is Place {
  return (PLACES as readonly string[]).includes(direction);
}

/** The note value a meter's beats are, as beams count them: its denominator's, at least a quarter. */
function beamUnitOf(denominator: number): BeamUnit {
  return BEAM_UNITS.find(unit => unit === denominator) ?? (denominator < 4 ? 4 : 32);
}

/** Simile marks, offered where they can be (EDIT-108). */
const SIMILE_CHOICES: readonly Simile[] = ['none', 'one-bar', 'two-bar'];

const NUMERATORS = Array.from({ length: 32 }, (_, index) => index + 1);
const SIGNATURES = Array.from({ length: 15 }, (_, index) => index - 7);
const ENDINGS = Array.from({ length: MAX_ENDINGS }, (_, index) => index + 1);
const INPUT_CLASS = `${SELECT_CLASS} w-full`;

/** What changed between two states of a bar, to set. */
export function barChanges(was: BarState, now: BarState): BarProperties {
  const changes: { -readonly [K in keyof BarProperties]: BarProperties[K] } = {};
  if (was.meter.numerator !== now.meter.numerator || was.meter.denominator !== now.meter.denominator)
    changes.meter = now.meter;
  if (was.key.signature !== now.key.signature || was.key.minor !== now.key.minor) changes.key = now.key;
  if (was.tempo !== now.tempo) changes.tempo = now.tempo;
  if (was.tempoRamp !== now.tempoRamp && now.tempo !== null) changes.tempoRamp = now.tempoRamp;
  if (was.repeatStart !== now.repeatStart) changes.repeatStart = now.repeatStart;
  if (was.repeatCount !== now.repeatCount) changes.repeatCount = now.repeatCount;
  if (was.alternateEndings !== now.alternateEndings) changes.alternateEndings = now.alternateEndings;
  if (was.section?.marker !== now.section?.marker || was.section?.text !== now.section?.text)
    changes.section = now.section;
  if (was.barLine !== now.barLine) changes.barLine = now.barLine;
  if (was.freeTime !== now.freeTime) changes.freeTime = now.freeTime;
  if (was.tripletFeel !== now.tripletFeel) changes.tripletFeel = now.tripletFeel;
  if (was.anacrusis !== now.anacrusis) changes.anacrusis = now.anacrusis;
  if (was.systemBreak !== now.systemBreak) changes.systemBreak = now.systemBreak;
  if ([...was.directions].sort().join() !== [...now.directions].sort().join())
    changes.directions = now.directions;
  if (JSON.stringify(was.beamGroups) !== JSON.stringify(now.beamGroups)) changes.beamGroups = now.beamGroups;
  return changes;
}

/** Beam groups typed ("2+2+3"), or none when nothing is; undefined when they cannot be read. */
export function beamGroupsOf(text: string, unit: BeamUnit): BeamGroups | null | undefined {
  if (text.trim() === '') return null;
  const groups = text.split('+').map(part => Number(part.trim()));
  return groups.every(group => Number.isInteger(group) && group > 0) ? { unit, groups } : undefined;
}

/** Whether beam groups fill a bar of a meter. */
export function fillsBar(beams: BeamGroups, meter: BarState['meter']): boolean {
  return (
    beams.groups.reduce((sum, group) => sum + group, 0) * meter.denominator === meter.numerator * beams.unit
  );
}

/** A whole number typed, within limits, or the fallback. */
function whole(text: string, min: number, max: number, fallback: number): number {
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function BarDialog() {
  const open = useBarDialog(state => state.open);
  const docKey = open?.key ?? '';
  const bar = open?.bar ?? null;
  const onClose = () => {
    useBarDialog.setState({ open: null });
  };
  const id = useId();
  /** The bar as it is, and as the dialog changes it, for the bar it was read for. */
  const [read, setRead] = useState<{
    readonly open: OpenBar;
    readonly was: BarState;
    readonly now: BarState;
    readonly staffWas: StaffBarState;
    readonly staffNow: StaffBarState;
    /** With a new clef, the notes keep their places rather than their pitches. */
    readonly keepPlaces: boolean;
    /** The beam groups as typed, and the note value they count. */
    readonly beamText: string;
    readonly beamUnit: BeamUnit;
  } | null>(null);
  const current = read !== null && open !== null && read.open === open ? read : null;
  const was = current?.was ?? null;
  const now = current?.now ?? null;
  const staffNow = current?.staffNow ?? null;
  const bars = useDocuments(
    state => state.docs.find(doc => doc.key === docKey)?.summary.masterBars.length ?? 0,
  );
  const trackName = useDocuments(
    state => state.docs.find(doc => doc.key === docKey)?.summary.tracks[open?.track ?? 0]?.name ?? '',
  );

  useEffect(() => {
    if (open === null) return undefined;
    let wanted = true;
    void Promise.all([
      readBar(open.key, open.bar),
      readStaffBar(open.key, open.track, open.staff, open.bar),
    ]).then(([state, staff]) => {
      if (wanted && state !== null && staff !== null)
        setRead({
          open,
          was: state,
          now: state,
          staffWas: staff,
          staffNow: staff,
          keepPlaces: false,
          beamText: state.beamGroups?.groups.join('+') ?? '',
          beamUnit: state.beamGroups?.unit ?? beamUnitOf(state.meter.denominator),
        });
    });
    return () => {
      wanted = false;
    };
  }, [open]);

  // The beam groups typed: read, and whether they fill the bar.
  const beams = current === null ? null : beamGroupsOf(current.beamText, current.beamUnit);
  const beamsWrong =
    current !== null && (beams === undefined || (beams !== null && !fillsBar(beams, current.now.meter)));
  const update = (patch: Partial<BarState>) => {
    setRead(state => (state === null ? null : { ...state, now: { ...state.now, ...patch } }));
  };
  const updateStaff = (patch: Partial<StaffBarState>) => {
    setRead(state => (state === null ? null : { ...state, staffNow: { ...state.staffNow, ...patch } }));
  };
  const clefChanged =
    current !== null &&
    (current.staffWas.clef !== current.staffNow.clef ||
      current.staffWas.clefOttava !== current.staffNow.clefOttava);
  const names = now?.key.minor === true ? s.minorKeys : s.majorKeys;

  return (
    <Dialog
      open={bar !== null}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title={s.title((bar ?? 0) + 1)}
      description={s.description}
      closeLabel={s.cancel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {s.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={was === null || now === null || beamsWrong}
            onClick={() => {
              if (current !== null && bar !== null) {
                const changes = barChanges(current.was, { ...current.now, beamGroups: beams ?? null });
                const staff = staffBarChanges(current.staffWas, current.staffNow, current.keepPlaces);
                if (Object.keys(changes).length > 0 || Object.keys(staff).length > 0)
                  setBar(docKey, bar, changes, {
                    track: current.open.track,
                    staff: current.open.staff,
                    properties: staff,
                  });
              }
              onClose();
            }}
          >
            {s.apply}
          </Button>
        </>
      }
    >
      {now !== null && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={s.numerator} htmlFor={`${id}-numerator`}>
              <select
                id={`${id}-numerator`}
                value={now.meter.numerator}
                onChange={event => {
                  update({ meter: { ...now.meter, numerator: Number(event.target.value) } });
                }}
                className={INPUT_CLASS}
              >
                {NUMERATORS.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={s.denominator} htmlFor={`${id}-denominator`}>
              <select
                id={`${id}-denominator`}
                value={now.meter.denominator}
                onChange={event => {
                  update({ meter: { ...now.meter, denominator: Number(event.target.value) } });
                }}
                className={INPUT_CLASS}
              >
                {METER_DENOMINATORS.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {current !== null && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={s.beamGroups}
                hint={beamsWrong ? s.beamGroupsWrong(now.meter, current.beamUnit) : s.beamGroupsHint}
                htmlFor={`${id}-beams`}
              >
                <input
                  id={`${id}-beams`}
                  value={current.beamText}
                  placeholder={s.beamGroupsAuto}
                  aria-invalid={beamsWrong}
                  onChange={event => {
                    const beamText = event.target.value;
                    setRead(state => (state === null ? null : { ...state, beamText }));
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label={s.beamUnit} htmlFor={`${id}-beam-unit`}>
                <select
                  id={`${id}-beam-unit`}
                  value={current.beamUnit}
                  onChange={event => {
                    const beamUnit = BEAM_UNITS.find(unit => String(unit) === event.target.value);
                    if (beamUnit !== undefined)
                      setRead(state => (state === null ? null : { ...state, beamUnit }));
                  }}
                  className={INPUT_CLASS}
                >
                  {BEAM_UNITS.map(unit => (
                    <option key={unit} value={unit}>
                      {s.beamUnits[unit]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Field label={s.key} htmlFor={`${id}-key`}>
              <select
                id={`${id}-key`}
                value={now.key.signature}
                onChange={event => {
                  update({ key: { ...now.key, signature: Number(event.target.value) } });
                }}
                className={INPUT_CLASS}
              >
                {SIGNATURES.map(signature => (
                  <option key={signature} value={signature}>
                    {s.keyName(names[signature + 7] ?? '', now.key.minor, signature)}
                  </option>
                ))}
              </select>
            </Field>
            <SegmentedControl<'major' | 'minor'>
              label={s.mode}
              value={now.key.minor ? 'minor' : 'major'}
              onValueChange={value => {
                update({ key: { ...now.key, minor: value === 'minor' } });
              }}
              segments={[
                { value: 'major', label: s.major },
                { value: 'minor', label: s.minor },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label={s.tempo}
              checked={now.tempo !== null}
              onCheckedChange={on => {
                update({ tempo: on ? (was?.tempo ?? 120) : null });
              }}
            />
            {now.tempo !== null && (
              <div className="flex flex-col gap-2 pl-1">
                <Field label={s.tempoValue} htmlFor={`${id}-tempo`}>
                  <input
                    id={`${id}-tempo`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_TEMPO}
                    max={MAX_TEMPO}
                    value={now.tempo}
                    onChange={event => {
                      update({ tempo: whole(event.target.value, MIN_TEMPO, MAX_TEMPO, now.tempo ?? 120) });
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Switch
                  label={s.tempoRamp}
                  checked={now.tempoRamp}
                  onCheckedChange={tempoRamp => {
                    update({ tempoRamp });
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label={s.repeatStart}
              checked={now.repeatStart}
              onCheckedChange={repeatStart => {
                update({ repeatStart });
              }}
            />
            <Switch
              label={s.repeatEnd}
              checked={now.repeatCount > 0}
              onCheckedChange={on => {
                update({ repeatCount: on ? 2 : 0 });
              }}
            />
            {now.repeatCount > 0 && (
              <Field label={s.repeatTimes} htmlFor={`${id}-times`}>
                <input
                  id={`${id}-times`}
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_REPEATS}
                  value={now.repeatCount}
                  onChange={event => {
                    update({ repeatCount: whole(event.target.value, 2, MAX_REPEATS, now.repeatCount) });
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
            )}
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[13px] font-medium text-ink">{s.endings}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ENDINGS.map(pass => {
                  const bit = 1 << (pass - 1);
                  return (
                    <label key={pass} className="inline-flex items-center gap-1.5 text-[13px] text-ink">
                      <input
                        type="checkbox"
                        checked={(now.alternateEndings & bit) !== 0}
                        onChange={event => {
                          update({
                            alternateEndings: event.target.checked
                              ? now.alternateEndings | bit
                              : now.alternateEndings & ~bit,
                          });
                        }}
                        className="size-4 accent-[var(--color-accent)]"
                      />
                      {s.ending(pass)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label={s.section}
              checked={now.section !== null}
              onCheckedChange={on => {
                update({ section: on ? (was?.section ?? { marker: 'A', text: '' }) : null });
              }}
            />
            {now.section !== null && (
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <Field label={s.sectionMarker} htmlFor={`${id}-marker`}>
                  <input
                    id={`${id}-marker`}
                    type="text"
                    maxLength={20}
                    value={now.section.marker}
                    onChange={event => {
                      update({ section: { marker: event.target.value, text: now.section?.text ?? '' } });
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label={s.sectionText} htmlFor={`${id}-section`}>
                  <input
                    id={`${id}-section`}
                    type="text"
                    maxLength={200}
                    value={now.section.text}
                    onChange={event => {
                      update({ section: { marker: now.section?.marker ?? '', text: event.target.value } });
                    }}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={s.barLine} htmlFor={`${id}-line`}>
              <select
                id={`${id}-line`}
                value={now.barLine}
                onChange={event => {
                  update({ barLine: event.target.value as BarLine });
                }}
                className={INPUT_CLASS}
              >
                {BAR_LINES.map(line => (
                  <option key={line} value={line}>
                    {s.barLines[line]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={s.tripletFeel} htmlFor={`${id}-feel`}>
              <select
                id={`${id}-feel`}
                value={now.tripletFeel}
                onChange={event => {
                  update({ tripletFeel: event.target.value as TripletFeel });
                }}
                className={INPUT_CLASS}
              >
                {TRIPLET_FEELS.map(feel => (
                  <option key={feel} value={feel}>
                    {s.feels[feel]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Switch
            label={s.freeTime}
            hint={s.freeTimeHint}
            checked={now.freeTime}
            onCheckedChange={freeTime => {
              update({ freeTime });
            }}
          />
          {bar === 0 && (
            <Switch
              label={s.anacrusis}
              hint={s.anacrusisHint}
              checked={now.anacrusis}
              onCheckedChange={anacrusis => {
                update({ anacrusis });
              }}
            />
          )}

          <Switch
            label={s.systemBreak}
            hint={s.systemBreakHint}
            checked={now.systemBreak}
            onCheckedChange={systemBreak => {
              update({ systemBreak });
            }}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-[13px] font-semibold text-ink">{s.directions}</legend>
            <div role="group" aria-label={s.places} className="flex flex-wrap gap-x-4 gap-y-2">
              {PLACES.map(place => (
                <label key={place} className="inline-flex items-center gap-2 text-[13px] text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--ot-accent,currentColor)]"
                    checked={now.directions.includes(place)}
                    onChange={event => {
                      const others = now.directions.filter(direction => direction !== place);
                      update({ directions: event.target.checked ? [...others, place] : others });
                    }}
                  />
                  {s.placeNames[place]}
                </label>
              ))}
            </div>
            <Field label={s.jump} htmlFor={`${id}-jump`}>
              <select
                id={`${id}-jump`}
                value={now.directions.find(direction => !isPlace(direction)) ?? 'none'}
                onChange={event => {
                  const jump = JUMPS.find(candidate => candidate === event.target.value);
                  const places = now.directions.filter(isPlace);
                  update({ directions: jump === undefined ? places : [...places, jump] });
                }}
                className={INPUT_CLASS}
              >
                <option value="none">{s.jumpNames.none}</option>
                {JUMPS.map(jump => (
                  <option key={jump} value={jump}>
                    {s.jumpNames[jump]}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          {staffNow !== null && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-[13px] font-semibold text-ink">{s.staffSection(trackName)}</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label={s.clef} htmlFor={`${id}-clef`}>
                  <select
                    id={`${id}-clef`}
                    value={staffNow.clef}
                    onChange={event => {
                      const clef = CLEFS.find(candidate => candidate === event.target.value);
                      if (clef !== undefined) updateStaff({ clef });
                    }}
                    className={INPUT_CLASS}
                  >
                    {CLEFS.map((clef: Clef) => (
                      <option key={clef} value={clef}>
                        {s.clefs[clef]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={s.clefOttava} htmlFor={`${id}-ottava`}>
                  <select
                    id={`${id}-ottava`}
                    value={staffNow.clefOttava}
                    onChange={event => {
                      const clefOttava = CLEF_OTTAVAS.find(candidate => candidate === event.target.value);
                      if (clefOttava !== undefined) updateStaff({ clefOttava });
                    }}
                    className={INPUT_CLASS}
                  >
                    {CLEF_OTTAVAS.map((ottava: ClefOttava) => (
                      <option key={ottava} value={ottava}>
                        {s.ottavas[ottava]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {clefChanged && (
                <Switch
                  label={s.keepPlaces}
                  hint={current.keepPlaces ? s.keepPlacesHint : s.keepPitchesHint}
                  checked={current.keepPlaces}
                  onCheckedChange={keepPlaces => {
                    setRead(state => (state === null ? null : { ...state, keepPlaces }));
                  }}
                />
              )}
              <Field label={s.simile} hint={s.simileHint} htmlFor={`${id}-simile`}>
                <select
                  id={`${id}-simile`}
                  value={staffNow.simile}
                  onChange={event => {
                    const simile = SIMILE_CHOICES.find(candidate => candidate === event.target.value);
                    if (simile !== undefined) updateStaff({ simile });
                  }}
                  className={INPUT_CLASS}
                >
                  {SIMILE_CHOICES.map((simile: Simile) => (
                    <option
                      key={simile}
                      value={simile}
                      disabled={
                        (simile === 'one-bar' && (bar ?? 0) < 1) ||
                        (simile === 'two-bar' && ((bar ?? 0) < 2 || (bar ?? 0) >= bars - 1))
                      }
                    >
                      {s.similes[simile]}
                    </option>
                  ))}
                </select>
              </Field>
            </fieldset>
          )}
        </div>
      )}
    </Dialog>
  );
}
