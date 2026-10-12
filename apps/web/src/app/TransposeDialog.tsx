/**
 * The transpose dialog (EDIT-050, EDIT-051, EDIT-116 … EDIT-118): notes moved up or down by
 * semitones, by an interval spelling them (with the keys, for whole bars), or by steps of each
 * bar's scale — what is selected (else the caret's beat), the caret's track, or every track — as
 * Guitar Pro's transpose tool moves them, as one edit to undo.
 */
import { MAX_DEGREES, MAX_TRANSPOSE } from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { editingOf, transposeNotes, wholeBars, type TransposeScope } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.transposeDialog;

/** The document whose transpose dialog is open. */
export const useTransposeDialog = create<{ readonly key: string | null }>(() => ({ key: null }));

/** Opens the transpose dialog; false when the document is not being edited. */
export function openTransposeDialog(key: string): boolean {
  if (!editingOf(key).on) return false;
  useTransposeDialog.setState({ key });
  return true;
}

/** A number typed, within ±`limit`; 0 when not a number. */
function numberOf(text: string, limit: number): number {
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) ? Math.max(-limit, Math.min(limit, value)) : 0;
}

/** How notes are moved. */
type Mode = 'semitones' | 'interval' | 'degrees';

/** Intervals up to an octave: their semitones and the letters they span (EDIT-116). */
const INTERVALS = [
  { id: 'augmented-unison', semitones: 1, letters: 0 },
  { id: 'minor-second', semitones: 1, letters: 1 },
  { id: 'major-second', semitones: 2, letters: 1 },
  { id: 'augmented-second', semitones: 3, letters: 1 },
  { id: 'minor-third', semitones: 3, letters: 2 },
  { id: 'major-third', semitones: 4, letters: 2 },
  { id: 'diminished-fourth', semitones: 4, letters: 3 },
  { id: 'perfect-fourth', semitones: 5, letters: 3 },
  { id: 'augmented-fourth', semitones: 6, letters: 3 },
  { id: 'diminished-fifth', semitones: 6, letters: 4 },
  { id: 'perfect-fifth', semitones: 7, letters: 4 },
  { id: 'augmented-fifth', semitones: 8, letters: 4 },
  { id: 'minor-sixth', semitones: 8, letters: 5 },
  { id: 'major-sixth', semitones: 9, letters: 5 },
  { id: 'diminished-seventh', semitones: 9, letters: 6 },
  { id: 'minor-seventh', semitones: 10, letters: 6 },
  { id: 'major-seventh', semitones: 11, letters: 6 },
  { id: 'octave', semitones: 12, letters: 7 },
] as const;
type IntervalId = (typeof INTERVALS)[number]['id'];

/** Octaves an interval is widened by: a tenth is a third and an octave. */
const OCTAVES = [0, 1, 2, 3] as const;

export function TransposeDialog() {
  const key = useTransposeDialog(state => state.key);
  const id = useId();
  const [mode, setMode] = useState<Mode>('semitones');
  const [text, setText] = useState('2');
  const [interval, setInterval] = useState<IntervalId>('major-second');
  const [down, setDown] = useState(false);
  const [octaves, setOctaves] = useState(0);
  const [stepsText, setStepsText] = useState('2');
  const [scope, setScope] = useState<TransposeScope>('selection');
  const [chords, setChords] = useState(true);
  const [keys, setKeys] = useState(false);
  const close = () => {
    useTransposeDialog.setState({ key: null });
  };
  const chosen = INTERVALS.find(candidate => candidate.id === interval) ?? INTERVALS[0];
  const sign = down ? -1 : 1;
  const semitones =
    mode === 'interval' ? sign * (chosen.semitones + 12 * octaves) : numberOf(text, MAX_TRANSPOSE);
  const degrees = numberOf(stepsText, MAX_DEGREES);
  // Keys move with whole bars only: a track, every track, or bars selected.
  const barsOnly = key !== null && wholeBars(key, scope);
  return (
    <Dialog
      open={key !== null}
      onOpenChange={open => {
        if (!open) close();
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.cancel}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {s.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={mode === 'degrees' ? degrees === 0 : semitones === 0}
            onClick={() => {
              if (key !== null)
                transposeNotes(
                  key,
                  mode === 'degrees'
                    ? { semitones: 0, degrees }
                    : {
                        semitones,
                        ...(mode === 'interval' ? { letters: sign * (chosen.letters + 7 * octaves) } : {}),
                        keys: keys && barsOnly,
                        chords,
                      },
                  scope,
                );
              close();
            }}
          >
            {s.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label={s.by}>
          <SegmentedControl<Mode>
            label={s.by}
            value={mode}
            onValueChange={setMode}
            segments={[
              { value: 'semitones', label: s.modes.semitones },
              { value: 'interval', label: s.modes.interval },
              { value: 'degrees', label: s.modes.degrees },
            ]}
          />
        </Field>
        {mode === 'semitones' && (
          <Field label={s.semitones} hint={s.semitonesHint} htmlFor={`${id}-semitones`}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`${id}-semitones`}
                type="number"
                inputMode="numeric"
                min={-MAX_TRANSPOSE}
                max={MAX_TRANSPOSE}
                step={1}
                value={text}
                onChange={event => {
                  setText(event.target.value);
                }}
                className={`${SELECT_CLASS} w-24 tabular-nums`}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setText('-12');
                }}
              >
                {s.octaveDown}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setText('12');
                }}
              >
                {s.octaveUp}
              </Button>
            </div>
          </Field>
        )}
        {mode === 'interval' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={s.interval} htmlFor={`${id}-interval`}>
                <select
                  id={`${id}-interval`}
                  value={interval}
                  onChange={event => {
                    const found = INTERVALS.find(candidate => candidate.id === event.target.value);
                    if (found !== undefined) setInterval(found.id);
                  }}
                  className={`${SELECT_CLASS} w-full`}
                >
                  {INTERVALS.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {s.intervals[candidate.id]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={s.octavesAdded} htmlFor={`${id}-octaves`}>
                <select
                  id={`${id}-octaves`}
                  value={octaves}
                  onChange={event => {
                    setOctaves(Number(event.target.value));
                  }}
                  className={`${SELECT_CLASS} w-full`}
                >
                  {OCTAVES.map(count => (
                    <option key={count} value={count}>
                      {s.octaveCount(count)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={s.direction}>
              <SegmentedControl<'up' | 'down'>
                label={s.direction}
                value={down ? 'down' : 'up'}
                onValueChange={value => {
                  setDown(value === 'down');
                }}
                segments={[
                  { value: 'up', label: s.up },
                  { value: 'down', label: s.down },
                ]}
              />
            </Field>
          </>
        )}
        {mode === 'degrees' && (
          <Field label={s.steps} hint={s.stepsHint} htmlFor={`${id}-steps`}>
            <input
              id={`${id}-steps`}
              type="number"
              inputMode="numeric"
              min={-MAX_DEGREES}
              max={MAX_DEGREES}
              step={1}
              value={stepsText}
              onChange={event => {
                setStepsText(event.target.value);
              }}
              className={`${SELECT_CLASS} w-24 tabular-nums`}
            />
          </Field>
        )}
        <Field label={s.scope} {...(scope === 'selection' ? { hint: s.selectionHint } : {})}>
          <SegmentedControl<TransposeScope>
            label={s.scope}
            value={scope}
            onValueChange={setScope}
            segments={[
              { value: 'selection', label: s.scopes.selection },
              { value: 'track', label: s.scopes.track },
              { value: 'score', label: s.scopes.score },
            ]}
          />
        </Field>
        {mode !== 'degrees' && (
          <>
            <Switch
              label={s.keys}
              hint={barsOnly ? s.keysHint : s.keysWholeBars}
              checked={keys && barsOnly}
              disabled={!barsOnly}
              onCheckedChange={setKeys}
            />
            <Switch label={s.chords} checked={chords} onCheckedChange={setChords} />
          </>
        )}
      </div>
    </Dialog>
  );
}
