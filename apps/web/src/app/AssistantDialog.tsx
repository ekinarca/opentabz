/**
 * Guitar Pro's palm-mute and let-ring assistants (EDIT-125, EDIT-126): the notes on the strings
 * chosen — of what is selected (else the caret's beat), or of the caret's track — palm-muted or
 * let ring, or no longer, as one edit to undo.
 */
import { noteName } from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl } from '@opentabz/ui';
import { useState } from 'react';
import { create } from 'zustand';
import { useDocuments } from '../state/documents.ts';
import { editingOf, markStrings } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.assistantDialog;

/** The document whose assistant is open, and the caret's staff's open strings, highest first. */
export const useAssistantDialog = create<{
  readonly open: { readonly key: string; readonly tuning: readonly number[] } | null;
}>(() => ({ open: null }));

/** Opens the assistant; false when nothing is being edited, or the caret's staff has no strings. */
export function openAssistantDialog(key: string): boolean {
  const { on, caret } = editingOf(key);
  if (!on || caret === null) return false;
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  const staff = doc?.summary.tracks[caret.track]?.staves[caret.staff];
  if (staff === undefined || staff.isPercussion || staff.tuning.length === 0) return false;
  useAssistantDialog.setState({ open: { key, tuning: staff.tuning } });
  return true;
}

type Technique = 'palm-mute' | 'let-ring';

export function AssistantDialog() {
  const open = useAssistantDialog(state => state.open);
  const [technique, setTechnique] = useState<Technique>('palm-mute');
  const [action, setAction] = useState<'set' | 'clear'>('set');
  const [scope, setScope] = useState<'selection' | 'track'>('selection');
  /** The strings chosen, as tablature numbers them (1 the highest). */
  const [chosen, setChosen] = useState<readonly number[]>([]);
  const close = () => {
    useAssistantDialog.setState({ open: null });
  };
  const tuning = open?.tuning ?? [];
  const count = tuning.length;
  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) close();
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
            disabled={chosen.length === 0}
            onClick={() => {
              if (open !== null)
                markStrings(
                  open.key,
                  technique,
                  action === 'set',
                  // alphaTab numbers the strings from the lowest.
                  chosen.filter(string => string <= count).map(string => count - string + 1),
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
        <Field label={s.technique}>
          <SegmentedControl<Technique>
            label={s.technique}
            value={technique}
            onValueChange={setTechnique}
            segments={[
              { value: 'palm-mute', label: s.palmMute },
              { value: 'let-ring', label: s.letRing },
            ]}
          />
        </Field>
        <Field label={s.action}>
          <SegmentedControl<'set' | 'clear'>
            label={s.action}
            value={action}
            onValueChange={setAction}
            segments={[
              { value: 'set', label: s.set },
              { value: 'clear', label: s.clear },
            ]}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-semibold text-ink">{s.strings}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {tuning.map((pitch, index) => {
              const string = index + 1;
              return (
                <label key={string} className="inline-flex items-center gap-2 text-[13px] text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--ot-accent,currentColor)]"
                    checked={chosen.includes(string)}
                    onChange={event => {
                      setChosen(was =>
                        event.target.checked ? [...was, string] : was.filter(each => each !== string),
                      );
                    }}
                  />
                  {s.string(string, noteName(pitch, false, false))}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label={s.scope} {...(scope === 'selection' ? { hint: s.selectionHint } : {})}>
          <SegmentedControl<'selection' | 'track'>
            label={s.scope}
            value={scope}
            onValueChange={setScope}
            segments={[
              { value: 'selection', label: s.scopes.selection },
              { value: 'track', label: s.scopes.track },
            ]}
          />
        </Field>
      </div>
    </Dialog>
  );
}
