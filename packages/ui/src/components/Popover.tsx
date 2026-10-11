import { Popover as RadixPopover } from 'radix-ui';
import type { ReactNode } from 'react';
import { cx } from '../cx.ts';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export interface PopoverContentProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly align?: 'start' | 'center' | 'end';
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
  readonly className?: string;
}

export function PopoverContent({
  children,
  label,
  align = 'center',
  side = 'bottom',
  className,
}: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        aria-label={label}
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={cx(
          'ot-pop-in z-50 rounded-[var(--radius-panel)] border border-line bg-raised text-ink shadow-[var(--shadow-popover)]',
          className,
        )}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
