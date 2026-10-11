import {
  NOTE_NAMES,
  type LayoutKind,
  type NoteNames,
  type StaffDisplay,
  type SystemsLayout,
} from '@opentabz/core/shared';
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
import {
  ChevronDown,
  Columns3,
  Drum,
  FileText,
  Grid3x3,
  Guitar,
  Info,
  Maximize,
  MicVocal,
  Piano,
  Rows3,
  SwatchBook,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ORIENTATIONS,
  PAGE_ARRANGEMENTS,
  PAPER_IDS,
  type Orientation,
  type PageArrangement,
  type PaperId,
} from '../score-view/pagination.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { CountInOverlay } from './CountInOverlay.tsx';
import { enterFullScreen } from './full-screen.ts';
import { FullScreenBar } from './FullScreenBar.tsx';
import { FretboardPanel } from './FretboardPanel.tsx';
import { ChordsPanel } from './ChordsPanel.tsx';
import { DrumsPanel } from './DrumsPanel.tsx';
import { ChordIcon } from './icons.tsx';
import { KeyboardPanel } from './KeyboardPanel.tsx';
import { LyricsPanel } from './LyricsPanel.tsx';
import { NoteColorsControl } from './NoteColorsControl.tsx';
import { OverviewPanel } from './OverviewPanel.tsx';
import { shortcutHint } from './keymap.ts';
import { PageSetupDialog, usePageSetup } from './PageSetupDialog.tsx';
import { PlaybackViewControl } from './PlaybackViewControl.tsx';
import { PracticeDialog } from './PracticeDialog.tsx';
import { ScoreHost } from './ScoreHost.tsx';
import { SongMap } from './SongMap.tsx';
import { SongInfoDialog } from './SongInfoDialog.tsx';
import { StylesheetDialog } from './StylesheetDialog.tsx';
import { TrackStavesDialog } from './TrackStavesDialog.tsx';
import { Transport } from './Transport.tsx';
import { ZoomControls } from './ZoomControls.tsx';

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

function ViewToolbar({
  doc,
  onInfo,
  onPageSetup,
  onTrackStaves,
}: {
  readonly doc: OpenDocument;
  readonly onInfo: () => void;
  readonly onPageSetup: () => void;
  readonly onTrackStaves: () => void;
}) {
  const updateView = useDocuments(state => state.updateView);
  const setPreferences = usePreferences(state => state.set);
  const fretboard = usePreferences(state => state.fretboard);
  const keyboard = usePreferences(state => state.keyboard);
  const chords = usePreferences(state => state.chords);
  const lyrics = usePreferences(state => state.lyrics);
  const drums = usePreferences(state => state.drums);
  const overview = usePreferences(state => state.overview);
  const noteNames = usePreferences(state => state.noteNames);
  const beatCounts = usePreferences(state => state.beatCounts);
  const drumKey = usePreferences(state => state.drumKey);
  const { view, summary } = doc;
  const update = (patch: Partial<OpenDocument['view']>) => {
    updateView(doc.key, patch);
  };
  const setPage = usePageSetup(doc);
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
        <ToolbarMenuButton
          label={strings.toolbar.staves}
          value={
            view.staves.length > 0 ? strings.trackStaves.value : strings.staffDisplays[view.staffDisplay]
          }
        />
        <MenuContent>
          <MenuRadioGroup<StaffDisplay>
            value={view.staffDisplay}
            onValueChange={value => {
              // One choice for every track again.
              update({ staffDisplay: value, staves: [] });
              setPreferences({ staffDisplay: value });
            }}
          >
            {STAFF_DISPLAYS.map(option => (
              <MenuRadioItem key={option} value={option}>
                {strings.staffDisplays[option]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem onSelect={onTrackStaves}>{strings.trackStaves.open}</MenuItem>
          <MenuCheckboxItem
            checked={view.concertPitch}
            onCheckedChange={concertPitch => {
              update({ concertPitch });
            }}
          >
            {strings.trackStaves.concertPitch}
          </MenuCheckboxItem>
          <MenuSeparator />
          <MenuLabel>{strings.readingAids.noteNames}</MenuLabel>
          <MenuRadioGroup<NoteNames>
            value={noteNames}
            onValueChange={value => {
              setPreferences({ noteNames: value });
            }}
          >
            {NOTE_NAMES.map(option => (
              <MenuRadioItem key={option} value={option}>
                {strings.readingAids.names[option]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuCheckboxItem
            checked={beatCounts}
            onCheckedChange={value => {
              setPreferences({ beatCounts: value });
            }}
          >
            {strings.readingAids.counts}
          </MenuCheckboxItem>
          <MenuCheckboxItem
            checked={drumKey}
            onCheckedChange={value => {
              setPreferences({ drumKey: value });
            }}
          >
            {strings.readingAids.drumKey}
          </MenuCheckboxItem>
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
          <ToolbarMenuButton
            label={strings.toolbar.paper}
            value={strings.pageSetup.paperValue(
              strings.papers[view.page.paper],
              view.page.orientation === 'landscape',
            )}
          />
          <MenuContent>
            <MenuRadioGroup<PaperId>
              value={view.page.paper}
              onValueChange={paper => {
                setPage({ paper });
              }}
            >
              {PAPER_IDS.filter(option => option !== 'custom' || view.page.paper === 'custom').map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.papers[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuRadioGroup<Orientation>
              value={view.page.orientation}
              onValueChange={orientation => {
                setPage({ orientation });
              }}
            >
              {ORIENTATIONS.map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.orientations[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem onSelect={onPageSetup}>{strings.pageSetup.open}</MenuItem>
          </MenuContent>
        </Menu>
      )}

      {view.layout === 'page' && (
        <Menu>
          <ToolbarMenuButton label={strings.toolbar.pages} value={strings.arrangements[view.arrangement]} />
          <MenuContent>
            <MenuRadioGroup<PageArrangement>
              value={view.arrangement}
              onValueChange={value => {
                update({ arrangement: value });
                setPreferences({ pageArrangement: value });
              }}
            >
              {PAGE_ARRANGEMENTS.map(option => (
                <MenuRadioItem key={option} value={option}>
                  {strings.arrangements[option]}
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
        <ZoomControls doc={doc} />
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
        <IconButton
          label={strings.keyboard.open}
          icon={<Piano size={18} aria-hidden />}
          pressed={keyboard}
          onClick={() => {
            setPreferences({ keyboard: !keyboard });
          }}
        />
        <IconButton
          label={strings.drums.open}
          icon={<Drum size={18} aria-hidden />}
          pressed={drums}
          onClick={() => {
            setPreferences({ drums: !drums });
          }}
        />
        <IconButton
          label={strings.chords.open}
          icon={<ChordIcon />}
          pressed={chords}
          onClick={() => {
            setPreferences({ chords: !chords });
          }}
        />
        <IconButton
          label={strings.lyrics.open}
          icon={<MicVocal size={18} aria-hidden />}
          pressed={lyrics}
          onClick={() => {
            if (lyrics) useUi.getState().setLyricsOnly(false);
            setPreferences({ lyrics: !lyrics });
          }}
        />
        <IconButton
          label={strings.overview.open}
          shortcut={shortcutHint('overview')}
          icon={<Grid3x3 size={18} aria-hidden />}
          pressed={overview}
          onClick={() => {
            setPreferences({ overview: !overview });
          }}
        />
        <NoteColorsControl />
        <PlaybackViewControl />
        <IconButton label={strings.toolbar.songInfo} icon={<Info size={18} aria-hidden />} onClick={onInfo} />
        <IconButton
          label={strings.stylesheet.open}
          shortcut={shortcutHint('stylesheet')}
          icon={<SwatchBook size={18} aria-hidden />}
          onClick={() => {
            useUi.getState().openPanel('stylesheet');
          }}
        />
        <IconButton
          label={strings.toolbar.fullScreen}
          shortcut={shortcutHint('full-screen')}
          icon={<Maximize size={18} aria-hidden />}
          onClick={enterFullScreen}
        />
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
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [stavesOpen, setStavesOpen] = useState(false);
  const fretboard = usePreferences(state => state.fretboard);
  const keyboard = usePreferences(state => state.keyboard);
  const chords = usePreferences(state => state.chords);
  const lyrics = usePreferences(state => state.lyrics);
  const drums = usePreferences(state => state.drums);
  const overview = usePreferences(state => state.overview);
  // The lyrics in place of the score (VIEW-022).
  const lyricsOnly = useUi(state => state.lyricsOnly) && lyrics;
  const fullScreen = useUi(state => state.fullScreen);
  usePlaybackForActiveDocument(active);

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col" hidden={active === null}>
      {active !== null &&
        (fullScreen ? (
          <FullScreenBar doc={active} />
        ) : (
          <ViewToolbar
            doc={active}
            onInfo={() => {
              setInfoOpen(true);
            }}
            onPageSetup={() => {
              setPageSetupOpen(true);
            }}
            onTrackStaves={() => {
              setStavesOpen(true);
            }}
          />
        ))}
      {docs.map(doc => (
        <ScoreHost key={doc.key} doc={doc} hidden={doc.key !== activeKey || lyricsOnly} />
      ))}
      {active !== null && fretboard && <FretboardPanel doc={active} />}
      {active !== null && keyboard && <KeyboardPanel doc={active} />}
      {active !== null && drums && <DrumsPanel doc={active} />}
      {active !== null && chords && <ChordsPanel doc={active} />}
      {active !== null && lyrics && <LyricsPanel doc={active} />}
      {active !== null && overview && <OverviewPanel doc={active} />}
      {active !== null && <SongMap doc={active} />}
      {active !== null && <Transport />}
      {active !== null && <PracticeDialog />}
      {active !== null && <CountInOverlay />}
      {active !== null && <SongInfoDialog doc={active} open={infoOpen} onOpenChange={setInfoOpen} />}
      {active !== null && (
        <PageSetupDialog doc={active} open={pageSetupOpen} onOpenChange={setPageSetupOpen} />
      )}
      {active !== null && <StylesheetDialog doc={active} />}
      {active !== null && <TrackStavesDialog doc={active} open={stavesOpen} onOpenChange={setStavesOpen} />}
    </main>
  );
}
