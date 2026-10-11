import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cx } from '../cx.ts';

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly closeLabel: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly width?: 'sm' | 'md' | 'lg';
}

const WIDTHS = { sm: 'max-w-[420px]', md: 'max-w-[560px]', lg: 'max-w-[760px]' } as const;

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
  width = 'md',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ot-fade-in fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          className={cx(
            'ot-pop-in fixed top-1/2 left-1/2 z-50 flex max-h-[min(86vh,820px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-[var(--radius-panel)] border border-line bg-raised text-ink shadow-[var(--shadow-popover)]',
            WIDTHS[width],
          )}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="font-display text-[26px] leading-tight">
                {title}
              </RadixDialog.Title>
              {description !== undefined && (
                <RadixDialog.Description className="mt-1 text-[13px] text-ink-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label={closeLabel}
              className="-mr-1 inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
            >
              <X size={18} aria-hidden />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
          {footer !== undefined && (
            <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
