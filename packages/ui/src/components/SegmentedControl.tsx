import { ToggleGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip.tsx';

export interface Segment<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: ReactNode;
  /** When set, only the icon is shown and the label becomes the tooltip/accessible name. */
  readonly iconOnly?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly segments: readonly Segment<T>[];
  readonly onValueChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onValueChange,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={next => {
        if (next !== '') onValueChange(next as T);
      }}
      className="inline-flex h-9 items-center gap-0.5 rounded-[var(--radius-control)] border border-line bg-sunken p-0.5"
    >
      {segments.map(segment => {
        const item = (
          <ToggleGroup.Item
            key={segment.value}
            value={segment.value}
            aria-label={segment.label}
            className="inline-flex h-full items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink data-[state=on]:bg-raised data-[state=on]:text-ink data-[state=on]:shadow-sm"
          >
            {segment.icon}
            {segment.iconOnly === true ? null : segment.label}
          </ToggleGroup.Item>
        );
        return segment.iconOnly === true ? (
          <Tooltip key={segment.value} label={segment.label}>
            {item}
          </Tooltip>
        ) : (
          item
        );
      })}
    </ToggleGroup.Root>
  );
}
