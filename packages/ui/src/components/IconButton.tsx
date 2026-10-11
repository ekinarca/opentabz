import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx.ts';
import { Tooltip } from './Tooltip.tsx';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible name and tooltip text. */
  readonly label: string;
  readonly shortcut?: string | undefined;
  readonly icon: ReactNode;
  readonly pressed?: boolean;
  readonly size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, icon, pressed, size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={pressed}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted',
          'transition-colors duration-150 hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40',
          pressed === true && 'bg-accent-soft text-accent',
          size === 'md' ? 'size-9' : 'size-8',
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    </Tooltip>
  );
});
