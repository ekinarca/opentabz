/**
 * The bar dialog (EDIT-021 … EDIT-024, EDIT-026, EDIT-027): the caret's bar's time signature, key,
 * tempo (and a ramp to the next), repeats and alternate endings, section, the bar line at its end,
 * free time, triplet feel and a pickup bar, for every track. Only what is changed is set, as one
 * edit to undo.
 */
import {
  BAR_LINES,
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
  type TripletFeel,
} from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { useEffect, useId, useState } from 'react';
import { create } from 'zustand';
import { caretBar, editingOf, readBar, setBar } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.barDialog;

/** The bar whose dialog is open, and its document. */
export const useBarDialog = create<{ readonly open: { readonly key: string; readonly bar: number } | null }>(
  () => ({ open: null }),
);

/** Opens the dialog of the caret's bar; false when the document is not being edited. */
export function openBarDialog(key: string): boolean {
  const editing = editingOf(key);
  const bar = caretBar(editing);
  if (!editing.on || bar === null) return false;
  useBarDialog.setState({ open: { key, bar } });
  return true;
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
  return changes;
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
    readonly open: { readonly key: string; readonly bar: number };
    readonly was: BarState;
    readonly now: BarState;
  } | null>(null);
  const current = read !== null && open !== null && read.open === open ? read : null;
  const was = current?.was ?? null;
  const now = current?.now ?? null;

  useEffect(() => {
    if (open === null) return undefined;
    let wanted = true;
    void readBar(open.key, open.bar).then(state => {
      if (wanted && state !== null) setRead({ open, was: state, now: state });
    });
    return () => {
      wanted = false;
    };
  }, [open]);

  const update = (patch: Partial<BarState>) => {
    setRead(state => (state === null ? null : { ...state, now: { ...state.now, ...patch } }));
  };
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
            disabled={was === null || now === null}
            onClick={() => {
              if (was !== null && now !== null && bar !== null) {
                const changes = barChanges(was, now);
                if (Object.keys(changes).length > 0) setBar(docKey, bar, changes);
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
        </div>
      )}
    </Dialog>
  );
}
