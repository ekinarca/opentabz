import { CommandDialog, cx, Kbd } from '@opentabz/ui';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDocuments } from '../state/documents.ts';
import { recallRecent, rememberRecent } from '../state/palette-memory.ts';
import { useRecentScores } from '../state/recent-scores.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { goToMasterBar, paletteCommands, valueCommands } from './commands.ts';
import { paletteEntries, type PaletteEntry } from './palette-entries.ts';

const p = strings.palette;

/**
 * The command palette (UX-014, Guitar Pro 8's, ⌘/Ctrl K or E): every action by name with its
 * keys, the past ones first; "?" lists them all, "$" goes to a section, ":" to a bar, and a value
 * after a name sets it ("zoom 150"). Arrow keys choose, Enter runs, Escape closes.
 */
export function CommandPalette() {
  const open = useUi(state => state.panel === 'palette');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const doc = useDocuments(state => state.docs.find(candidate => candidate.key === state.activeKey) ?? null);
  const [input, setInput] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  // Read again each time the palette opens.
  const recent = useMemo(() => (open ? recallRecent() : []), [open]);
  // The scores kept to open again, as they are now.
  useRecentScores(state => state.list);
  useEffect(() => {
    if (open) void useRecentScores.getState().refresh();
  }, [open]);

  const score = useMemo(
    () =>
      doc === null
        ? null
        : {
            barCount: doc.summary.barCount,
            sections: doc.summary.masterBars.flatMap((bar, index) =>
              bar.section === null ? [] : [{ index, marker: bar.section.marker, text: bar.section.text }],
            ),
          },
    [doc],
  );
  const entries = open
    ? paletteEntries(input, {
        commands: paletteCommands(),
        values: valueCommands(),
        recent,
        score,
        goToBar: index => {
          goToMasterBar(index);
        },
      })
    : [];
  const current = Math.min(active, Math.max(0, entries.length - 1));
  const optionId = (index: number) => `${listId}-option-${String(index)}`;

  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' });
  });

  const close = () => {
    setPanelOpen('palette', false);
    setInput('');
    setActive(0);
  };

  const choose = (entry: PaletteEntry) => {
    if (entry.reason !== null) return;
    if (entry.complete !== null) {
      setInput(entry.complete);
      setActive(0);
      inputRef.current?.focus();
      return;
    }
    // Closed first: a command may open a panel of its own in its place.
    close();
    if (entry.remember !== null) rememberRecent(entry.remember);
    entry.run();
  };

  const recentEntries = entries.filter(entry => entry.group === 'recent');
  const option = (entry: PaletteEntry, index: number) => (
    <div
      key={entry.id}
      id={optionId(index)}
      role="option"
      tabIndex={-1}
      aria-selected={index === current}
      aria-disabled={entry.reason === null ? undefined : true}
      data-command={entry.id}
      onClick={() => {
        choose(entry);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') choose(entry);
      }}
      onMouseMove={() => {
        if (index !== current) setActive(index);
      }}
      className={cx(
        'flex min-h-9 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-1.5 text-[14px] outline-none',
        index === current && 'bg-sunken',
        entry.reason !== null && 'cursor-default text-ink-faint',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      {entry.reason !== null ? (
        <span className="shrink-0 text-[12px] text-ink-faint">{p.unavailable(entry.reason)}</span>
      ) : entry.hint !== null ? (
        <span className="shrink-0 text-[12px] text-ink-faint">{entry.hint}</span>
      ) : entry.keys !== null ? (
        <Kbd>{entry.keys}</Kbd>
      ) : null}
    </div>
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={next => {
        if (next) setPanelOpen('palette', true);
        else close();
      }}
      label={p.label}
      initialFocus={inputRef}
    >
      <div className="border-b border-line p-2">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={entries.length > 0 ? optionId(current) : undefined}
          aria-label={p.field}
          placeholder={p.hint}
          value={input}
          spellCheck={false}
          autoComplete="off"
          onChange={event => {
            setInput(event.target.value);
            setActive(0);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (entries.length === 0) return;
              const step = event.key === 'ArrowDown' ? 1 : -1;
              setActive((current + step + entries.length) % entries.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const entry = entries[current];
              if (entry !== undefined) choose(entry);
            }
          }}
          className="h-10 w-full rounded-[var(--radius-control)] bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <div id={listId} role="listbox" aria-label={p.results} className="min-h-0 flex-1 overflow-auto p-1">
        {recentEntries.length > 0 && (
          <div role="group" aria-label={p.recent}>
            <div aria-hidden className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-ink-faint uppercase">
              {p.recent}
            </div>
            {recentEntries.map((entry, index) => option(entry, index))}
          </div>
        )}
        {recentEntries.length > 0 ? (
          <div role="group" aria-label={p.results}>
            <div aria-hidden className="px-3 pt-2 pb-1 text-[11px] font-medium text-ink-faint uppercase">
              {p.results}
            </div>
            {entries
              .slice(recentEntries.length)
              .map((entry, index) => option(entry, recentEntries.length + index))}
          </div>
        ) : (
          entries.map((entry, index) => option(entry, index))
        )}
      </div>
      {entries.length === 0 && (
        <p role="status" className="px-4 pb-3 text-[13px] text-ink-muted">
          {p.none}
        </p>
      )}
    </CommandDialog>
  );
}
