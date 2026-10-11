import { Switch as RadixSwitch } from 'radix-ui';
import { useId, type ReactNode } from 'react';

export interface SwitchProps {
  readonly label: string;
  /** A line under the label explaining what the switch does. */
  readonly hint?: ReactNode;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  /** Shown but not to be changed, while something else makes it meaningless. */
  readonly disabled?: boolean;
  readonly className?: string;
}

/** An on/off switch with its label (and optional hint) as one row; the label is clickable. */
export function Switch({ label, hint, checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  const id = useId();
  const hintId = useId();
  return (
    <div
      className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <div className="min-w-0">
        <label htmlFor={id} className="text-[14px] font-medium text-ink">
          {label}
        </label>
        {hint !== undefined && (
          <p id={hintId} className="mt-0.5 text-[12px] text-ink-faint">
            {hint}
          </p>
        )}
      </div>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        {...(hint === undefined ? {} : { 'aria-describedby': hintId })}
        className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-line-strong bg-sunken transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-raised shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
    </div>
  );
}
