import { Popover as RadixPopover } from 'radix-ui';
import { useRef, type ReactNode, type RefObject } from 'react';
import { cx } from '../cx.ts';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export interface PopoverContentProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly align?: 'start' | 'center' | 'end';
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
  readonly className?: string;
  /** Element to focus when the panel opens (default: the panel itself). */
  readonly initialFocus?: RefObject<HTMLElement | null>;
}

export function PopoverContent({
  children,
  label,
  align = 'center',
  side = 'bottom',
  className,
  initialFocus,
}: PopoverContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        tabIndex={-1}
        // Focus the panel itself, not its first control: a focused control would open its
        // tooltip over the panel. Tab moves into the controls as usual.
        onOpenAutoFocus={event => {
          event.preventDefault();
          (initialFocus?.current ?? ref.current)?.focus();
        }}
        aria-label={label}
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={cx(
          'ot-pop-in z-50 rounded-[var(--radius-panel)] border border-line bg-raised text-ink shadow-[var(--shadow-popover)] outline-none',
          className,
        )}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
