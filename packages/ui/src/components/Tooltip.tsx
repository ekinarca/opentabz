import { Tooltip as RadixTooltip } from 'radix-ui';
import type { ReactNode } from 'react';
import { Kbd } from './Kbd.tsx';

export const TooltipProvider = RadixTooltip.Provider;

export interface TooltipProps {
  readonly label: string;
  /** Keyboard shortcut shown next to the label, e.g. "Ctrl+O". */
  readonly shortcut?: string | undefined;
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
  readonly children: ReactNode;
}

export function Tooltip({ label, shortcut, side = 'bottom', children }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={350}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-[12px] font-medium text-canvas shadow-[var(--shadow-popover)]"
        >
          {label}
          {shortcut !== undefined && <Kbd tone="inverse">{shortcut}</Kbd>}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
