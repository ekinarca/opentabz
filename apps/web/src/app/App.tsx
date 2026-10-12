import { ToastProvider, TooltipProvider } from '@opentabz/ui';
import { useEffect } from 'react';
import { onEngineRestart } from '../engine/instance.ts';
import { useDocuments } from '../state/documents.ts';
import { reopenLastSession } from '../state/reopen.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { AboutDialog } from './AboutDialog.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { DropOverlay } from './DropOverlay.tsx';
import { leaveFullScreen, useFullScreenSync } from './full-screen.ts';
import { MetronomeTool } from './MetronomeTool.tsx';
import { TunerTool } from './TunerTool.tsx';
import { SettingsDialog } from './SettingsDialog.tsx';
import { ExportDialog } from './ExportDialog.tsx';
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
  const aboutOpen = useUi(state => state.panel === 'about');
  const urlOpen = useUi(state => state.panel === 'url');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const docs = useDocuments(state => state.docs);
  const activeKey = useDocuments(state => state.activeKey);
  const active = docs.find(doc => doc.key === activeKey) ?? null;
  // Full screen puts the app's bars away while a score is open (VIEW-013).
  const fullScreen = useUi(state => state.fullScreen) && active !== null;
  useFullScreenSync();

  useEffect(() => {
    if (active === null && useUi.getState().fullScreen) leaveFullScreen();
  }, [active]);

  useEffect(() => {
    onEngineRestart(() => void useDocuments.getState().reopenAll());
  }, []);

  // The scores open last time, when the settings ask (UX-028).
  useEffect(() => {
    void reopenLastSession();
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
          {!fullScreen && (
            <TopBar
              home={active === null}
              onAbout={() => {
                setPanelOpen('about', true);
              }}
            />
          )}
          {active === null && (
            <Home
              dragging={dragging}
              onOpenUrl={() => {
                setPanelOpen('url', true);
              }}
            />
          )}
          {docs.length > 0 && <Workspace />}
        </div>
        {/* The landing page answers a drag itself; the overlay is for open documents. */}
        <DropOverlay visible={dragging && active !== null} />
        <OpenErrorsDialog />
        <UrlDialog
          open={urlOpen}
          onOpenChange={open => {
            setPanelOpen('url', open);
          }}
        />
        <AboutDialog
          open={aboutOpen}
          onOpenChange={open => {
            setPanelOpen('about', open);
          }}
        />
        <ShortcutSheet />
        <CommandPalette />
        <SettingsDialog />
        <ExportDialog />
        <MetronomeTool />
        <TunerTool />
        <Notices />
      </ToastProvider>
    </TooltipProvider>
  );
}
