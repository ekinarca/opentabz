import { FileUp } from 'lucide-react';
import { strings } from '../strings.ts';

/** Full-window hint while files are dragged over the app (any drop target accepts them). */
export function DropOverlay({ visible }: { readonly visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="ot-fade-in pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[var(--ot-drop)] backdrop-blur-[1.5px]"
    >
      <div className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-accent bg-raised/95 px-12 py-10 shadow-[var(--shadow-popover)]">
        <FileUp size={40} className="text-accent" aria-hidden />
        <p className="font-display text-[34px] leading-none text-ink">{strings.drop.overlay}</p>
        <p className="text-[13px] text-ink-muted">{strings.drop.overlayDetail}</p>
      </div>
    </div>
  );
}
