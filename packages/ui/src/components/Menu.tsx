import { Check } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { Kbd } from './Kbd.tsx';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

const ITEM =
  'relative flex h-8 cursor-default items-center gap-2 rounded-md pr-2 pl-7 text-[13px] text-ink outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken';

export function MenuContent({
  children,
  align = 'start',
}: {
  readonly children: ReactNode;
  readonly align?: 'start' | 'center' | 'end';
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className="ot-pop-in z-50 min-w-[220px] rounded-[10px] border border-line bg-raised p-1 shadow-[var(--shadow-popover)]"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuLabel({ children }: { readonly children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
      {children}
    </DropdownMenu.Label>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />;
}

export interface MenuItemProps {
  readonly children: ReactNode;
  readonly onSelect: () => void;
  readonly icon?: ReactNode;
  readonly shortcut?: string | undefined;
  readonly disabled?: boolean;
}

export function MenuItem({ children, onSelect, icon, shortcut, disabled }: MenuItemProps) {
  return (
    <DropdownMenu.Item className={ITEM} onSelect={onSelect} disabled={disabled ?? false}>
      <span className="absolute left-2 inline-flex size-4 items-center justify-center text-ink-muted">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
    </DropdownMenu.Item>
  );
}

export function MenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
  shortcut,
}: {
  readonly children: ReactNode;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly shortcut?: string | undefined;
}) {
  return (
    <DropdownMenu.CheckboxItem
      className={ITEM}
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={event => {
        event.preventDefault();
      }}
    >
      <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex size-4 items-center justify-center text-accent">
        <Check size={14} aria-hidden />
      </DropdownMenu.ItemIndicator>
      {children}
      {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
    </DropdownMenu.CheckboxItem>
  );
}

export function MenuRadioGroup<T extends string>({
  value,
  onValueChange,
  children,
}: {
  readonly value: T;
  readonly onValueChange: (value: T) => void;
  readonly children: ReactNode;
}) {
  return (
    <DropdownMenu.RadioGroup
      value={value}
      onValueChange={next => {
        onValueChange(next as T);
      }}
    >
      {children}
    </DropdownMenu.RadioGroup>
  );
}

export function MenuRadioItem({
  value,
  children,
  hint,
}: {
  readonly value: string;
  readonly children: ReactNode;
  readonly hint?: string;
}) {
  return (
    <DropdownMenu.RadioItem className={ITEM} value={value}>
      <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex size-4 items-center justify-center text-accent">
        <Check size={14} aria-hidden />
      </DropdownMenu.ItemIndicator>
      <span className="flex-1">{children}</span>
      {hint !== undefined && <span className="text-[12px] text-ink-faint">{hint}</span>}
    </DropdownMenu.RadioItem>
  );
}
