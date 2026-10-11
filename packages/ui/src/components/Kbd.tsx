import type { ReactNode } from 'react';
import { cx } from '../cx.ts';

export interface KbdProps {
  readonly children: ReactNode;
  readonly tone?: 'default' | 'inverse';
}

export function Kbd({ children, tone = 'default' }: KbdProps) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[11px] leading-none',
        tone === 'default' ? 'border border-line bg-sunken text-ink-muted' : 'bg-white/15 text-canvas',
      )}
    >
      {children}
    </kbd>
  );
}
