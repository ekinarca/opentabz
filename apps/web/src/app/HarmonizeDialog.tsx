/**
 * The harmonizer (EDIT-055): each note of what is selected, or of the caret's beat, given another
 * a third, a sixth or an octave above or below it, in the key, as one edit to undo.
 */
import { HARMONIES, type Harmony } from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl } from '@opentabz/ui';
import { useState } from 'react';
import { create } from 'zustand';
import { editingOf, harmonizeNotes } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.harmonizeDialog;

export const useHarmonizeDialog = create<{ readonly key: string | null }>(() => ({ key: null }));

/** Opens the harmonizer; false when nothing is being edited. */
export function openHarmonizeDialog(key: string): boolean {
  if (!editingOf(key).on) return false;
  useHarmonizeDialog.setState({ key });
  return true;
}

export function HarmonizeDialog() {
  const key = useHarmonizeDialog(state => state.key);
  const [harmony, setHarmony] = useState<Harmony>('third');
  const [where, setWhere] = useState<'above' | 'below'>('above');
  const close = () => {
    useHarmonizeDialog.setState({ key: null });
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
            onClick={() => {
              if (key !== null) harmonizeNotes(key, harmony, where === 'below');
              close();
            }}
          >
            {s.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label={s.interval}>
          <SegmentedControl<Harmony>
            label={s.interval}
            value={harmony}
            onValueChange={setHarmony}
            segments={HARMONIES.map(value => ({ value, label: s.intervals[value] }))}
          />
        </Field>
        <Field label={s.where}>
          <SegmentedControl<'above' | 'below'>
            label={s.where}
            value={where}
            onValueChange={setWhere}
            segments={[
              { value: 'above', label: s.above },
              { value: 'below', label: s.below },
            ]}
          />
        </Field>
      </div>
    </Dialog>
  );
}
