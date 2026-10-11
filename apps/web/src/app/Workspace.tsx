import type { LayoutKind, StaffDisplay, SystemsLayout } from '@opentabz/core/shared';
import {
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  SegmentedControl,
} from '@opentabz/ui';
import { ChevronDown, Columns3, FileText, Guitar, Info, Minus, Plus, Rows3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PAPER_IDS, type PaperId } from '../score-view/pagination.ts';
import { clampZoom, useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { CountInOverlay } from './CountInOverlay.tsx';
import { FretboardPanel } from './FretboardPanel.tsx';
import { shortcutHint, zoomStep } from './keymap.ts';
import { PlaybackViewControl } from './PlaybackViewControl.tsx';
import { modKey } from './platform.ts';
import { PracticeDialog } from './PracticeDialog.tsx';
import { ScoreHost } from './ScoreHost.tsx';
import { SongInfoDialog } from './SongInfoDialog.tsx';
import { Transport } from './Transport.tsx';

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const STAFF_DISPLAYS: readonly StaffDisplay[] = ['default', 'score-tab', 'score', 'tab'];

function ToolbarMenuButton({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <MenuTrigger asChild>
      <button
        type="button"
        aria-label={`${label}: ${value}`}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-raised px-2.5 text-[13px] font-medium whitespace-nowrap text-ink hover:border-line-strong"
      >
        <span className="hidden text-ink-faint lg:inline">{label}</span>
        <span>{value}</span>
        <ChevronDown size={14} aria-hidden className="text-ink-faint" />
      </button>
    </MenuTrigger>
  );
}

function ViewToolbar({ doc, onInfo }: { readonly doc: OpenDocument; readonly onInfo: () => void }) {
  const updateView = useDocuments(state => state.updateView);
  const setPreferences = usePreferences(state => state.set);
  const fretboard = usePreferences(state => state.fretboard);
  const { view, summary } = doc;
  const update = (patch: Partial<OpenDocument['view']>) => {
    updateView(doc.key, patch);
  };
  const allTracks = summary.tracks.map(track => track.index);

  const toggleTrack = (index: number, checked: boolean) => {
    const next = checked
      ? [...view.trackIndexes, index].sort((a, b) => a - b)
      : view.trackIndexes.filter(value => value !== index);
    if (next.length > 0) update({ trackIndexes: next });
  };

  return (
    <div
      role="toolbar"
      aria-label={strings.toolbar.label}
      className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-surface px-3 [scrollbar-width:none]"
    >
      <Menu>
        <ToolbarMenuButton
          label={strings.toolbar.tracks}
          value={strings.toolbar.tracksCount(view.trackIndexes.length, summary.tracks.length)}
        />
        <MenuContent>
          <MenuLabel>{strings.toolbar.tracksHeading}</MenuLabel>
          {summary.tracks.map(track => (
            <MenuCheckboxItem
              key={track.index}
              checked={view.trackIndexes.includes(track.index)}
              onCheckedChange={checked => {
                toggleTrack(track.index, checked);
              }}
            >
              <span
                className="mr-2 inline-block size-2.5 rounded-full"
                style={{ background: track.color }}
                aria-hidden
              />
              {track.name.trim().length > 0 ? track.name : `${strings.toolbar.tracks} ${track.index + 1}`}
            </MenuCheckboxItem>
          ))}
          {summary.tracks.length > 1 && (
            <>
              <MenuSeparator />
              <MenuItem
                onSelect={() => {
                  update({ trackIndexes: allTracks });
                }}
              >
                {strings.toolbar.tracksAll}
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>

      <Menu>
        <ToolbarMenuButton label={strings.toolbar.staves} value={strings.staffDisplays[view.staffDisplay]} />
        <MenuContent>
          <MenuRadioGroup<StaffDisplay>
            value={view.staffDisplay}
            onValueChange={value => {
              update({ staffDisplay: value });
              setPreferences({ staffDisplay: value });
            }}
          >
            {STAFF_DISPLAYS.map(option => (
              <MenuRadioItem key={option} value={option}>
                {strings.staffDisplays[option]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <SegmentedControl<LayoutKind>
        density="collapse"
        label={strings.toolbar.layout}
        value={view.layout}
        onValueChange={value => {
          update({ layout: value });
          setPreferences({ layout: value });
        }}
        segments={[
          { value: 'page', label: strings.layouts.page, icon: <FileText size={16} aria-hidden /> },
          { value: 'scroll', label: strings.layouts.scroll, icon: <Rows3 size={16} aria-hidden /> },
          {
            value: 'horizontal',
            label: strings.layouts.horizontal,
            icon: <Columns3 size={16} aria-hidden />,
          },
        ]}
      />

      {view.layout === 'page' && (
        <Menu>
          <ToolbarMenuButton label={strings.toolbar.paper} value={strings.papers[view.paper]} />
          <MenuContent>
            <MenuRadioGroup<PaperId>
              value={view.paper}
              onValueChange={value => {
                update({ paper: value });
                setPreferences({ paper: value });
              }}
            >
              {PAPER_IDS.map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.papers[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      )}

      {summary.hasModelLayout && view.layout !== 'horizontal' && (
        <Menu>
          <ToolbarMenuButton
            label={strings.toolbar.systems}
            value={strings.systemsLayouts[view.systemsLayout]}
          />
          <MenuContent>
            <MenuRadioGroup<SystemsLayout>
              value={view.systemsLayout}
              onValueChange={value => {
                update({ systemsLayout: value });
              }}
            >
              <MenuRadioItem value="model">{strings.systemsLayouts.model}</MenuRadioItem>
              <MenuRadioItem value="auto">{strings.systemsLayouts.auto}</MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      )}

      <div className="ml-auto flex items-center gap-1">
        <IconButton
          label={strings.toolbar.zoomOut}
          shortcut={`${modKey()}+−`}
          icon={<Minus size={16} aria-hidden />}
          onClick={() => {
            update({ zoom: zoomStep(view.zoom, -1) });
          }}
          disabled={view.zoom <= 0.25}
        />
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={strings.toolbar.zoomMenu}
              className="h-9 min-w-[64px] rounded-[var(--radius-control)] px-2 font-mono text-[13px] text-ink tabular-nums hover:bg-sunken"
            >
              {strings.toolbar.zoomLevel(view.zoom)}
            </button>
          </MenuTrigger>
          <MenuContent align="center">
            <MenuRadioGroup<string>
              value={String(view.zoom)}
              onValueChange={value => {
                update({ zoom: clampZoom(Number(value)) });
              }}
            >
              {ZOOM_PRESETS.map(preset => (
                <MenuRadioItem key={preset} value={String(preset)}>
                  {strings.toolbar.zoomLevel(preset)}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
        <IconButton
          label={strings.toolbar.zoomIn}
          shortcut={`${modKey()}+=`}
          icon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update({ zoom: zoomStep(view.zoom, 1) });
          }}
          disabled={view.zoom >= 4}
        />
        <div className="mx-1 h-6 w-px bg-line" aria-hidden />
        <IconButton
          label={strings.fretboard.open}
          shortcut={shortcutHint('fretboard')}
          icon={<Guitar size={18} aria-hidden />}
          pressed={fretboard}
          onClick={() => {
            setPreferences({ fretboard: !fretboard });
          }}
        />
        <PlaybackViewControl />
        <IconButton label={strings.toolbar.songInfo} icon={<Info size={18} aria-hidden />} onClick={onInfo} />
      </div>
    </div>
  );
}

/** Keeps the synthesizer loaded with the active document. */
function usePlaybackForActiveDocument(active: OpenDocument | null): void {
  const load = usePlayer(state => state.load);
  const unload = usePlayer(state => state.unload);
  const key = active?.key ?? null;
  const engineId = active?.engineId ?? null;
  useEffect(() => {
    const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
    if (doc === undefined) {
      unload();
      return;
    }
    void load(doc);
  }, [key, engineId, load, unload]);
}

export function Workspace() {
  const docs = useDocuments(state => state.docs);
  const activeKey = useDocuments(state => state.activeKey);
  const active = docs.find(doc => doc.key === activeKey) ?? null;
  const [infoOpen, setInfoOpen] = useState(false);
  const fretboard = usePreferences(state => state.fretboard);
  usePlaybackForActiveDocument(active);

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col" hidden={active === null}>
      {active !== null && (
        <ViewToolbar
          doc={active}
          onInfo={() => {
            setInfoOpen(true);
          }}
        />
      )}
      {docs.map(doc => (
        <ScoreHost key={doc.key} doc={doc} hidden={doc.key !== activeKey} />
      ))}
      {active !== null && fretboard && <FretboardPanel doc={active} />}
      {active !== null && <Transport />}
      {active !== null && <PracticeDialog />}
      {active !== null && <CountInOverlay />}
      {active !== null && <SongInfoDialog doc={active} open={infoOpen} onOpenChange={setInfoOpen} />}
    </main>
  );
}
