/**
 * Changes not saved, offered back (EDIT-124): at the start, the drafts no open tab holds — a crash,
 * a reload or a closed tab left them — to open again with their edits, or to discard.
 */
import { Button, Dialog } from '@opentabz/ui';
import { useEffect, useState } from 'react';
import { useDocuments } from '../state/documents.ts';
import { deleteDraft, orphanDrafts, type Draft } from '../state/drafts.ts';
import { restoreEdits, toggleEditing } from '../state/editing.ts';
import { strings } from '../strings.ts';

const s = strings.recover;

/** Opens a draft's file and makes its edits again; the draft is then the new document's. */
export async function recoverDraft(draft: Draft): Promise<void> {
  const documents = useDocuments.getState();
  const before = new Set(documents.docs.map(doc => doc.key));
  await documents.open([
    {
      name: draft.name,
      ...(draft.blank ? { blank: true } : {}),
      load: () => Promise.resolve({ ok: true, name: draft.name, bytes: draft.bytes.slice(0) }),
    },
  ]);
  const doc = useDocuments.getState().docs.find(candidate => !before.has(candidate.key));
  if (doc === undefined) return;
  await restoreEdits(doc.key, draft.done, draft.undone);
  await toggleEditing(doc.key);
  await deleteDraft(draft.id);
}

export function RecoverDialog() {
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);

  useEffect(() => {
    let current = true;
    void orphanDrafts().then(found => {
      if (current) setDrafts(found);
    });
    return () => {
      current = false;
    };
  }, []);

  const without = (id: string) => {
    setDrafts(list => list.filter(draft => draft.id !== id));
  };

  return (
    <Dialog
      open={drafts.length > 0}
      onOpenChange={open => {
        if (!open) setDrafts([]);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.later}
      footer={
        <Button
          variant="ghost"
          onClick={() => {
            setDrafts([]);
          }}
        >
          {s.later}
        </Button>
      }
    >
      <ul className="flex flex-col divide-y divide-line">
        {drafts.map(draft => {
          const name = draft.title.trim().length > 0 ? draft.title : draft.name;
          const time = new Date(draft.writtenAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          return (
            <li key={draft.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{name}</p>
                <p className="text-[12px] text-ink-muted">
                  {s.edits(draft.done.length)} · {s.kept(time)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={s.discardName(name)}
                onClick={() => {
                  without(draft.id);
                  void deleteDraft(draft.id);
                }}
              >
                {s.discard}
              </Button>
              <Button
                size="sm"
                variant="primary"
                aria-label={s.recoverName(name)}
                onClick={() => {
                  without(draft.id);
                  void recoverDraft(draft).catch((error: unknown) => {
                    useDocuments.getState().notify({
                      title: s.failed,
                      description: error instanceof Error ? error.message : String(error),
                      tone: 'error',
                    });
                  });
                }}
              >
                {s.recover}
              </Button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
