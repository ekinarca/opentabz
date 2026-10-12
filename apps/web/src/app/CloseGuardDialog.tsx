/**
 * Asks before a score with changes not saved is closed (EDIT-123): save it and close, close it
 * anyway, or keep it open.
 */
import { Button, Dialog } from '@opentabz/ui';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { savedName, saveDocument, useCloseGuard } from './save.ts';

const e = strings.editing;

export function CloseGuardDialog() {
  const pending = useCloseGuard(state => state.pending);
  const doc = useDocuments(state => state.docs.find(candidate => candidate.key === pending) ?? null);
  const name = doc === null ? '' : doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name;
  const dismiss = () => {
    useCloseGuard.setState({ pending: null });
  };
  return (
    <Dialog
      open={doc !== null}
      onOpenChange={open => {
        if (!open) dismiss();
      }}
      title={e.closeTitle(name)}
      description={e.closeDescription}
      closeLabel={e.keepOpenLabel}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={dismiss}>
            {e.keepOpen}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (doc !== null) useDocuments.getState().close(doc.key);
              dismiss();
            }}
          >
            {e.closeAnyway}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (doc === null) return;
              const { key } = doc;
              dismiss();
              void saveDocument(key).then(saved => {
                if (saved) useDocuments.getState().close(key);
              });
            }}
          >
            {e.saveAndClose}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-ink-muted">{doc === null ? '' : e.saveAs(savedName(doc))}</p>
    </Dialog>
  );
}
