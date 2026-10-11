import { IconButton } from '@opentabz/ui';
import { Minimize } from 'lucide-react';
import type { OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { leaveFullScreen } from './full-screen.ts';
import { shortcutHint } from './keymap.ts';
import { ZoomControls } from './ZoomControls.tsx';

/**
 * What full screen keeps of the app's bars (VIEW-013): the song's name, the zoom and the way out,
 * on a strip the colour of the score, above it rather than over it.
 */
export function FullScreenBar({ doc }: { readonly doc: OpenDocument }) {
  const title = doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name;
  const artist = doc.summary.artist.trim();

  return (
    <div
      role="toolbar"
      aria-label={strings.fullScreen.controls}
      className="flex min-h-10 shrink-0 items-center gap-1 bg-canvas pt-[env(safe-area-inset-top)] pr-2 pl-4"
    >
      <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
        <span className="font-medium text-ink">{title}</span>
        {artist.length > 0 && ` · ${artist}`}
      </p>
      <ZoomControls doc={doc} size="sm" />
      <IconButton
        size="sm"
        label={strings.fullScreen.leave}
        shortcut={`Esc · ${shortcutHint('full-screen') ?? ''}`}
        icon={<Minimize size={16} aria-hidden />}
        onClick={leaveFullScreen}
      />
    </div>
  );
}
