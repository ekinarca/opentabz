import { Button, Dialog, Kbd } from '@opentabz/ui';
import { RotateCcw } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import {
  bindingFromKey,
  bindingsOf,
  formatBinding,
  platformBindings,
  sameBinding,
  shortcutUsing,
  SHORTCUTS,
  type KeyBinding,
  type Shortcut,
  type ShortcutGroup,
} from './keymap.ts';
import { modKey } from './platform.ts';

const GROUPS: readonly ShortcutGroup[] = [
  'playback',
  'navigation',
  'selection',
  'editing',
  'view',
  'files',
  'help',
];
const e = strings.shortcuts.edit;

/**
 * A shortcut's keys, and changing them (PLAT-036): a click records the next keys pressed (Esc keeps
 * them as they were); keys another action has are taken from it only when asked.
 */
function ShortcutKeys({ shortcut }: { readonly shortcut: Shortcut }) {
  const overrides = usePreferences(state => state.keyBindings);
  const setPreferences = usePreferences(state => state.set);
  const [recording, setRecording] = useState(false);
  const [conflict, setConflict] = useState<{ readonly binding: KeyBinding; readonly other: Shortcut } | null>(
    null,
  );
  const mod = modKey();
  const bindings = platformBindings(shortcut, mod, overrides);
  const changed = overrides[shortcut.id] !== undefined;

  const assign = (binding: KeyBinding, from: Shortcut | null) => {
    const next: Record<string, readonly KeyBinding[]> = { ...overrides, [shortcut.id]: [binding] };
    if (from !== null)
      next[from.id] = bindingsOf(from, overrides).filter(other => !sameBinding(other, binding));
    setPreferences({ keyBindings: next });
  };

  // While recording, every key is the new binding's, before the dialog or the app sees it: Esc
  // keeps the keys as they were instead of closing the sheet.
  useEffect(() => {
    if (!recording) return;
    const record = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setRecording(false);
        return;
      }
      const binding = bindingFromKey(event, mod === '⌘');
      if (binding === null) return;
      setRecording(false);
      const other = shortcutUsing(binding, shortcut.id, overrides);
      if (other === null) assign(binding, null);
      else setConflict({ binding, other });
    };
    window.addEventListener('keydown', record, { capture: true });
    return () => {
      window.removeEventListener('keydown', record, { capture: true });
    };
  });

  return (
    <>
      <dd className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={e.change(shortcut.label)}
          aria-pressed={recording}
          data-shortcut={shortcut.id}
          onClick={() => {
            setConflict(null);
            setRecording(true);
          }}
          onBlur={() => {
            setRecording(false);
          }}
          className="flex min-h-7 flex-wrap items-center justify-end gap-1 rounded-[var(--radius-control)] px-1 hover:bg-sunken aria-pressed:bg-accent-soft"
        >
          {recording ? (
            <span className="text-[12px] text-accent">{e.pressKeys}</span>
          ) : bindings.length === 0 ? (
            <span className="text-[12px] text-ink-faint">{e.none}</span>
          ) : (
            bindings.map((binding, index) => (
              <span key={formatBinding(binding, mod)} className="inline-flex items-center gap-1">
                {index > 0 && <span className="text-[11px] text-ink-faint">{strings.shortcuts.or}</span>}
                <Kbd>{formatBinding(binding, mod)}</Kbd>
              </span>
            ))
          )}
        </button>
        {changed && (
          <button
            type="button"
            aria-label={e.reset(shortcut.label)}
            onClick={() => {
              const { [shortcut.id]: _own, ...rest } = overrides;
              setPreferences({ keyBindings: rest });
            }}
            className="inline-flex size-7 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
        )}
      </dd>
      {/* On a line of its own, under the action and its keys. */}
      {conflict !== null && (
        <dd
          role="alert"
          className="flex basis-full flex-wrap items-center justify-end gap-2 text-[12px] text-ink-muted"
        >
          {e.taken(formatBinding(conflict.binding, mod), conflict.other.label)}
          <Button
            size="sm"
            onClick={() => {
              assign(conflict.binding, conflict.other);
              setConflict(null);
            }}
          >
            {e.useHere}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setConflict(null);
            }}
          >
            {e.keep}
          </Button>
        </dd>
      )}
    </>
  );
}

/** Every keyboard shortcut, generated from the keymap (press ? to open); keys can be changed. */
export function ShortcutSheet() {
  const open = useUi(state => state.panel === 'shortcuts');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const singleKeys = usePreferences(state => state.singleKeyShortcuts);
  const overrides = usePreferences(state => state.keyBindings);
  const setPreferences = usePreferences(state => state.set);
  const toggleId = useId();

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setPanelOpen('shortcuts', next);
      }}
      title={strings.shortcuts.title}
      description={strings.shortcuts.description}
      closeLabel={strings.shortcuts.close}
      width="lg"
      footer={
        Object.keys(overrides).length > 0 ? (
          <Button
            onClick={() => {
              setPreferences({ keyBindings: {} });
            }}
          >
            {e.resetAll}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {GROUPS.map(group => (
          <section key={group} aria-labelledby={`shortcuts-${group}`}>
            <h3
              id={`shortcuts-${group}`}
              className="mb-1.5 text-[12px] font-semibold tracking-[0.06em] text-ink-faint uppercase"
            >
              {strings.shortcuts.groups[group]}
            </h3>
            <dl className="flex flex-col">
              {SHORTCUTS.filter(shortcut => shortcut.group === group).map(shortcut => (
                <div
                  key={shortcut.id}
                  className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-line/60 py-1.5 last:border-0"
                >
                  <dt className="pt-1 text-[13px] text-ink">{shortcut.label}</dt>
                  <ShortcutKeys shortcut={shortcut} />
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-control)] bg-sunken p-3">
        <input
          id={toggleId}
          type="checkbox"
          checked={singleKeys}
          aria-describedby={`${toggleId}-hint`}
          onChange={event => {
            setPreferences({ singleKeyShortcuts: event.target.checked });
          }}
          className="mt-0.5 size-4 accent-[var(--ot-accent)]"
        />
        <div className="flex flex-col">
          <label htmlFor={toggleId} className="text-[13px] font-medium text-ink">
            {strings.shortcuts.singleKeys}
          </label>
          <span id={`${toggleId}-hint`} className="text-[12px] text-ink-muted">
            {strings.shortcuts.singleKeysHint}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
