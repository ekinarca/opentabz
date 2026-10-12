import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode, RefObject } from 'react';

export interface CommandDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The dialog's name for assistive technology; not shown. */
  readonly label: string;
  /** The field that takes focus when it opens. */
  readonly initialFocus: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
}

/**
 * A dialog near the top of the window for a command field and what it finds (a command palette):
 * no visible title or close button, Escape or a click outside closes it.
 */
export function CommandDialog({ open, onOpenChange, label, initialFocus, children }: CommandDialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ot-fade-in fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={event => {
            event.preventDefault();
            initialFocus.current?.focus();
          }}
          // A command that opened a dialog of its own leaves the focus there.
          onCloseAutoFocus={event => {
            if (document.querySelector('[role="dialog"]') !== null) event.preventDefault();
          }}
          className="ot-pop-in fixed top-[max(16px,10vh)] left-1/2 z-50 flex max-h-[min(70vh,560px)] w-[calc(100vw-32px)] max-w-[600px] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-raised text-ink shadow-[var(--shadow-popover)]"
        >
          <RadixDialog.Title className="sr-only">{label}</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
