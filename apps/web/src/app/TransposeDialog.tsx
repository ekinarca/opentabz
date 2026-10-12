/**
 * The transpose dialog (EDIT-050, EDIT-051, EDIT-118): notes moved up or down by semitones — what
 * is selected (else the caret's beat), the caret's track, or every track — as Guitar Pro's
 * transpose tool moves them, as one edit to undo.
 */
import { MAX_TRANSPOSE } from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { editingOf, transposeNotes, type TransposeScope } from '../state/editing.ts';
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

/** Semitones typed, within the limits; 0 when not a number. */
function semitonesOf(text: string): number {
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) ? Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, value)) : 0;
}

export function TransposeDialog() {
  const key = useTransposeDialog(state => state.key);
  const id = useId();
  const [text, setText] = useState('2');
  const [scope, setScope] = useState<TransposeScope>('selection');
  const [chords, setChords] = useState(true);
  const close = () => {
    useTransposeDialog.setState({ key: null });
  };
  const semitones = semitonesOf(text);
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
            disabled={semitones === 0}
            onClick={() => {
              if (key !== null) transposeNotes(key, semitones, scope, chords);
              close();
            }}
          >
            {s.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
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
        <Switch label={s.chords} checked={chords} onCheckedChange={setChords} />
      </div>
    </Dialog>
  );
}
