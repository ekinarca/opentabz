/**
 * Special paste (EDIT-101): what was copied pasted at the caret as many times as asked, one
 * after another — beats across bar lines, bars bar after bar — as one edit to undo.
 */
import { Button, Dialog } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { editingOf, pasteAtCaret, useClipboard } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.pasteDialog;

/** The most times what was copied is pasted at once (the engine's limit). */
const MAX_TIMES = 99;

export const usePasteDialog = create<{ readonly key: string | null }>(() => ({ key: null }));

/** Opens special paste; false when nothing is being edited or nothing was copied. */
export function openPasteDialog(key: string): boolean {
  if (!editingOf(key).on || useClipboard.getState().clip === null) return false;
  usePasteDialog.setState({ key });
  return true;
}

export function PasteDialog() {
  const key = usePasteDialog(state => state.key);
  const id = useId();
  const [text, setText] = useState('2');
  const times = Number.parseInt(text, 10);
  const valid = Number.isInteger(times) && times >= 1 && times <= MAX_TIMES;
  const close = () => {
    usePasteDialog.setState({ key: null });
  };
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
            disabled={!valid}
            onClick={() => {
              if (key !== null) pasteAtCaret(key, times);
              close();
            }}
          >
            {s.apply}
          </Button>
        </>
      }
    >
      <Field label={s.times} hint={s.timesHint} htmlFor={`${id}-times`}>
        <input
          id={`${id}-times`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_TIMES}
          step={1}
          value={text}
          onChange={event => {
            setText(event.target.value);
          }}
          className={`${SELECT_CLASS} w-24 tabular-nums`}
        />
      </Field>
    </Dialog>
  );
}
