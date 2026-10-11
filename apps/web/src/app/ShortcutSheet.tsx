import { Dialog, Kbd } from '@opentabz/ui';
import { useId } from 'react';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { formatBinding, SHORTCUTS, type ShortcutGroup } from './keymap.ts';

const GROUPS: readonly ShortcutGroup[] = ['playback', 'navigation', 'selection', 'view', 'files', 'help'];

/** Every keyboard shortcut, generated from the keymap (press ? to open). */
export function ShortcutSheet() {
  const open = useUi(state => state.panel === 'shortcuts');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const singleKeys = usePreferences(state => state.singleKeyShortcuts);
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
                  className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5 last:border-0"
                >
                  <dt className="text-[13px] text-ink">{shortcut.label}</dt>
                  <dd className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {shortcut.bindings.map((binding, index) => (
                      <span key={formatBinding(binding)} className="inline-flex items-center gap-1">
                        {index > 0 && (
                          <span className="text-[11px] text-ink-faint">{strings.shortcuts.or}</span>
                        )}
                        <Kbd>{formatBinding(binding)}</Kbd>
                      </span>
                    ))}
                  </dd>
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
