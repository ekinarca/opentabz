import {
  IconButton,
  LogoMark,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
  Wordmark,
} from '@opentabz/ui';
import {
  CircleHelp,
  Download,
  Ellipsis,
  FolderOpen,
  Keyboard,
  Palette,
  Printer,
  Settings,
  X,
} from 'lucide-react';
import { useDocuments } from '../state/documents.ts';
import { THEME_PREFERENCES, usePreferences, type ThemePreference } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { pickFiles } from './open-actions.ts';
import { modKey } from './platform.ts';
import { MetronomeIcon, TuningForkIcon } from './icons.tsx';
import { shortcutHint } from './keymap.ts';
import { openMetronomeTool } from './MetronomeTool.tsx';
import { openTuner } from './TunerTool.tsx';
import { useUi } from '../state/ui.ts';

export function TopBar({ onAbout, home }: { readonly onAbout: () => void; readonly home: boolean }) {
  const docs = useDocuments(state => state.docs);
  const activeKey = useDocuments(state => state.activeKey);
  const activate = useDocuments(state => state.activate);
  const close = useDocuments(state => state.close);
  const theme = usePreferences(state => state.theme);
  const setPreferences = usePreferences(state => state.set);

  return (
    <header
      className={
        home && docs.length === 0
          ? 'absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-2 px-3 sm:px-5'
          : 'flex min-h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 pt-[env(safe-area-inset-top)] sm:px-3'
      }
    >
      <button
        type="button"
        onClick={() => {
          activate(null);
        }}
        aria-label={strings.topBar.home}
        aria-current={activeKey === null ? 'page' : undefined}
        className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] px-1.5 hover:bg-sunken"
      >
        <LogoMark size={26} />
        <Wordmark className="hidden sm:inline" />
      </button>

      {docs.length > 0 && (
        <nav aria-label={strings.topBar.documents} className="flex min-w-0 flex-1 items-center">
          <ul className="flex min-w-0 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
            {docs.map(doc => {
              const active = doc.key === activeKey;
              const name = doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name;
              return (
                <li key={doc.key} className="flex shrink-0 items-center">
                  <div
                    className={`group flex h-8 items-center rounded-[var(--radius-control)] border ${
                      active
                        ? 'border-line bg-raised text-ink shadow-sm'
                        : 'border-transparent text-ink-muted hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        activate(doc.key);
                      }}
                      aria-current={active ? 'page' : undefined}
                      title={doc.source.name}
                      className="max-w-[220px] truncate pr-1 pl-3 text-[13px] font-medium"
                    >
                      {name}
                    </button>
                    <Tooltip label={strings.topBar.close(name)}>
                      <button
                        type="button"
                        onClick={() => {
                          close(doc.key);
                        }}
                        aria-label={strings.topBar.close(name)}
                        className="mr-1 inline-flex size-6 items-center justify-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <div className={docs.length > 0 ? 'flex items-center gap-1' : 'ml-auto flex items-center gap-1'}>
        {!home && (
          <IconButton
            label={strings.topBar.openFile}
            shortcut={`${modKey()}+O`}
            icon={<FolderOpen size={18} aria-hidden />}
            onClick={pickFiles}
          />
        )}
        {!home && activeKey !== null && (
          <IconButton
            label={strings.topBar.export}
            icon={<Download size={18} aria-hidden />}
            onClick={() => {
              useUi.getState().openPanel('export');
            }}
          />
        )}
        {!home && activeKey !== null && (
          <IconButton
            label={strings.topBar.print}
            shortcut={`${modKey()}+P`}
            icon={<Printer size={18} aria-hidden />}
            onClick={() => {
              useUi.getState().requestPrint();
            }}
            className="max-md:hidden"
          />
        )}
        <Menu>
          <Tooltip label={strings.topBar.theme}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={strings.topBar.theme}
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink max-md:hidden"
              >
                <Palette size={18} aria-hidden />
              </button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent align="end">
            <MenuRadioGroup<ThemePreference>
              value={theme}
              onValueChange={value => {
                setPreferences({ theme: value });
              }}
            >
              {THEME_PREFERENCES.map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.themes[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
        <IconButton
          label={strings.metronomeTool.open}
          icon={<MetronomeIcon />}
          onClick={openMetronomeTool}
          className="max-md:hidden"
        />
        <IconButton
          label={strings.tuner.open}
          icon={<TuningForkIcon />}
          onClick={openTuner}
          className="max-md:hidden"
        />
        <IconButton
          label={strings.shortcuts.title}
          shortcut={shortcutHint('shortcuts')}
          icon={<Keyboard size={18} aria-hidden />}
          onClick={() => {
            useUi.getState().openPanel('shortcuts');
          }}
          className="max-md:hidden"
        />
        <IconButton
          label={strings.topBar.settings}
          icon={<Settings size={18} aria-hidden />}
          onClick={() => {
            useUi.getState().openPanel('settings');
          }}
          className="max-md:hidden"
        />
        <IconButton
          label={strings.topBar.about}
          icon={<CircleHelp size={18} aria-hidden />}
          onClick={onAbout}
          className="max-md:hidden"
        />
        {/* On narrow screens the tools fold into one menu, leaving room for the open scores. */}
        <Menu>
          <Tooltip label={strings.topBar.more}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={strings.topBar.more}
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink md:hidden"
              >
                <Ellipsis size={18} aria-hidden />
              </button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent align="end">
            {!home && activeKey !== null && (
              <MenuItem
                icon={<Printer size={16} aria-hidden />}
                onSelect={() => {
                  useUi.getState().requestPrint();
                }}
              >
                {strings.topBar.print}
              </MenuItem>
            )}
            <MenuItem icon={<MetronomeIcon size={16} />} onSelect={openMetronomeTool}>
              {strings.metronomeTool.open}
            </MenuItem>
            <MenuItem icon={<TuningForkIcon size={16} />} onSelect={openTuner}>
              {strings.tuner.open}
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>{strings.topBar.theme}</MenuLabel>
            <MenuRadioGroup<ThemePreference>
              value={theme}
              onValueChange={value => {
                setPreferences({ theme: value });
              }}
            >
              {THEME_PREFERENCES.map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.themes[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem
              icon={<Settings size={16} aria-hidden />}
              onSelect={() => {
                useUi.getState().openPanel('settings');
              }}
            >
              {strings.topBar.settings}
            </MenuItem>
            <MenuItem icon={<CircleHelp size={16} aria-hidden />} onSelect={onAbout}>
              {strings.topBar.about}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
