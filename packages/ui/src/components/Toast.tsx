import { X } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';
import type { ReactNode } from 'react';
import { cx } from '../cx.ts';

export const ToastProvider = RadixToast.Provider;

export function ToastViewport({ label }: { readonly label: string }) {
  return (
    <RadixToast.Viewport
      label={label}
      className="fixed right-4 bottom-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2 outline-none"
    />
  );
}

export type ToastTone = 'info' | 'warning' | 'error';

export interface ToastProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: ReactNode;
  readonly tone?: ToastTone;
  readonly closeLabel: string;
  readonly action?: ReactNode;
  /** Milliseconds before auto-dismissal; errors stay until dismissed. */
  readonly duration?: number;
}

const TONES: Record<ToastTone, string> = {
  info: 'border-line',
  warning: 'border-warning',
  error: 'border-danger',
};

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  tone = 'info',
  closeLabel,
  action,
  duration,
}: ToastProps) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration ?? (tone === 'error' ? Number.POSITIVE_INFINITY : 6000)}
      type={tone === 'error' ? 'foreground' : 'background'}
      className={cx(
        'ot-pop-in flex items-start gap-3 rounded-[12px] border-l-4 border-y border-r bg-raised p-3 pr-2 text-ink shadow-[var(--shadow-popover)]',
        TONES[tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <RadixToast.Title className="text-[13px] font-semibold">{title}</RadixToast.Title>
        {description !== undefined && (
          <RadixToast.Description className="mt-0.5 text-[13px] text-ink-muted">
            {description}
          </RadixToast.Description>
        )}
        {action !== undefined && <div className="mt-2">{action}</div>}
      </div>
      <RadixToast.Close
        aria-label={closeLabel}
        className="inline-flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink"
      >
        <X size={16} aria-hidden />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
