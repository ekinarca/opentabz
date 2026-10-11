import { ToastProvider, TooltipProvider } from '@opentabz/ui';
import { useEffect, useState } from 'react';
import { onEngineRestart } from '../engine/instance.ts';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { AboutDialog } from './AboutDialog.tsx';
import { DropOverlay } from './DropOverlay.tsx';
import { ShortcutSheet } from './ShortcutSheet.tsx';
import { Home } from './Home.tsx';
import { Notices } from './Notices.tsx';
import { OpenErrorsDialog } from './OpenErrorsDialog.tsx';
import { TopBar } from './TopBar.tsx';
import { UrlDialog } from './UrlDialog.tsx';
import { useGlobalIntake } from './use-global-intake.ts';
import { useShortcuts } from './use-shortcuts.ts';
import { useTheme } from './use-theme.ts';
import { Workspace } from './Workspace.tsx';

export function App() {
  useTheme();
  useShortcuts();
  const dragging = useGlobalIntake();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const docs = useDocuments(state => state.docs);
  const activeKey = useDocuments(state => state.activeKey);
  const active = docs.find(doc => doc.key === activeKey) ?? null;

  useEffect(() => {
    onEngineRestart(() => void useDocuments.getState().reopenAll());
  }, []);

  // The app is on screen and interactive: the "warm start" budget ends here.
  useEffect(() => {
    performance.mark('ot:app-ready');
  }, []);

  useEffect(() => {
    const title =
      active === null
        ? null
        : active.summary.title.trim().length > 0
          ? active.summary.title
          : active.source.name;
    document.title = strings.documentTitle(title);
  }, [active]);

  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="relative flex h-full flex-col bg-canvas text-ink">
          <TopBar
            home={active === null}
            onAbout={() => {
              setAboutOpen(true);
            }}
          />
          {active === null && (
            <Home
              dragging={dragging}
              onOpenUrl={() => {
                setUrlOpen(true);
              }}
            />
          )}
          {docs.length > 0 && <Workspace />}
        </div>
        {/* The landing page answers a drag itself; the overlay is for open documents. */}
        <DropOverlay visible={dragging && active !== null} />
        <OpenErrorsDialog />
        <UrlDialog open={urlOpen} onOpenChange={setUrlOpen} />
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
        <ShortcutSheet />
        <Notices />
      </ToastProvider>
    </TooltipProvider>
  );
}
