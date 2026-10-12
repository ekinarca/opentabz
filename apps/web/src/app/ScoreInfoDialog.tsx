/**
 * A score's information edited (EDIT-089): its title block and credits, instructions and notices,
 * as Guitar Pro's score information sets them. Only what is changed is set, as one edit to undo.
 */
import { MAX_INFO, MAX_INFO_TEXT, SCORE_INFO_FIELDS, type ScoreInfo } from '@opentabz/core/shared';
import { Button, Dialog } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { editingOf, setScoreInfo } from '../state/editing.ts';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.scoreInfoDialog;
const labels = strings.songInfo.fields;
type FieldName = (typeof SCORE_INFO_FIELDS)[number];
type Values = Readonly<Record<FieldName, string>>;

export const useScoreInfoDialog = create<{
  readonly open: { readonly key: string; readonly was: Values } | null;
}>(() => ({ open: null }));

/** Opens the score's information to edit; false when it is not being edited. */
export function openScoreInfoDialog(key: string): boolean {
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  if (doc === undefined || !editingOf(key).on) return false;
  const was = Object.fromEntries(SCORE_INFO_FIELDS.map(field => [field, doc.summary[field]])) as Values;
  useScoreInfoDialog.setState({ open: { key, was } });
  return true;
}

/** The lines of text: several lines, the others one. */
function long(field: FieldName): boolean {
  return field === 'instructions' || field === 'notices';
}

function InfoForm({ open }: { readonly open: { readonly key: string; readonly was: Values } }) {
  const id = useId();
  const [now, setNow] = useState<Values>(open.was);
  const close = () => {
    useScoreInfoDialog.setState({ open: null });
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault();
        const changes: { -readonly [K in keyof ScoreInfo]: ScoreInfo[K] } = {};
        for (const field of SCORE_INFO_FIELDS)
          if (now[field] !== open.was[field]) changes[field] = now[field];
        if (Object.keys(changes).length > 0) setScoreInfo(open.key, changes);
        close();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCORE_INFO_FIELDS.map(field =>
          long(field) ? null : (
            <Field key={field} label={labels[field]} htmlFor={`${id}-${field}`}>
              <input
                id={`${id}-${field}`}
                value={now[field]}
                maxLength={MAX_INFO}
                onChange={event => {
                  setNow({ ...now, [field]: event.target.value });
                }}
                className={`${SELECT_CLASS} w-full`}
              />
            </Field>
          ),
        )}
      </div>
      {SCORE_INFO_FIELDS.filter(long).map(field => (
        <Field key={field} label={labels[field]} htmlFor={`${id}-${field}`}>
          <textarea
            id={`${id}-${field}`}
            value={now[field]}
            maxLength={MAX_INFO_TEXT}
            rows={3}
            onChange={event => {
              setNow({ ...now, [field]: event.target.value });
            }}
            className={`${SELECT_CLASS} h-auto w-full py-2`}
          />
        </Field>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          {s.cancel}
        </Button>
        <Button variant="primary" type="submit">
          {s.apply}
        </Button>
      </div>
    </form>
  );
}

export function ScoreInfoDialog() {
  const open = useScoreInfoDialog(state => state.open);
  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) useScoreInfoDialog.setState({ open: null });
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.cancel}
      width="lg"
    >
      {open !== null && <InfoForm key={open.key} open={open} />}
    </Dialog>
  );
}
