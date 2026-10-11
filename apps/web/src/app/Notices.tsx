import { Toast, ToastViewport } from '@opentabz/ui';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';

/** Non-blocking notices (renamed files, recovered truncation, engine restarts). */
export function Notices() {
  const notices = useDocuments(state => state.notices);
  const dismiss = useDocuments(state => state.dismissNotice);
  return (
    <>
      {notices.map(notice => (
        <Toast
          key={notice.id}
          open
          onOpenChange={open => {
            if (!open) dismiss(notice.id);
          }}
          title={notice.title}
          description={notice.description}
          tone={notice.tone}
          closeLabel={strings.notices.close}
        />
      ))}
      <ToastViewport label={strings.notices.toastRegion} />
    </>
  );
}
