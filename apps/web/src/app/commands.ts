/**
 * Every command of the command palette (UX-014): the keyboard shortcuts' actions with their keys,
 * and the actions without keys (export, themes, instrument views, layouts, staves, focus…), each
 * with the other words it is found by (UX-033) and, when it cannot run now, why (UX-032);
 * commands that take a value typed after their name (UX-043); the sections and bars to go to
 * (UX-038).
 */
import { LAYOUT_KINDS, NOTE_NAMES, STAFF_DISPLAYS, SYSTEMS_LAYOUTS } from '@opentabz/core/shared';
import { ORIENTATIONS, PAGE_ARRANGEMENTS, PAPER_IDS, type PageSetup } from '../score-view/pagination.ts';
import { occurrenceOfMasterBar } from '../score-view/timeline-lookup.ts';
import { clampZoom, useDocuments, type DocViewState, type OpenDocument } from '../state/documents.ts';
import { editingOf, goToIncompleteBar, transposeNotes } from '../state/editing.ts';
import { openBarDialog } from './BarDialog.tsx';
import { openTransposeDialog } from './TransposeDialog.tsx';
import { openEffectsDialog } from './EffectsDialog.tsx';
import { openAssistantDialog } from './AssistantDialog.tsx';
import { openPasteDialog } from './PasteDialog.tsx';
import { openScoreInfoDialog } from './ScoreInfoDialog.tsx';
import { openTrackDialog } from './TrackDialog.tsx';
import { newScore } from './new-score.ts';
import { requestClose } from './save.ts';
import { MAX_TRANSPOSE } from '../state/mixer-memory.ts';
import { clampSpeed, usePlayer } from '../state/player.ts';
import { THEME_PREFERENCES, usePreferences, type Preferences } from '../state/preferences.ts';
import { useRecentScores } from '../state/recent-scores.ts';
import { recentSource } from '../state/session.ts';
import { useUi, type Panel } from '../state/ui.ts';
import { strings } from '../strings.ts';
import type { CommandValue } from './command-query.ts';
import type { Searchable } from './command-search.ts';
import { formatBinding, platformBindings, SHORTCUTS } from './keymap.ts';
import { openMetronomeTool } from './MetronomeTool.tsx';
import { canPickFolder, pickFolder } from './open-actions.ts';
import { modKey } from './platform.ts';
import { openTuner } from './TunerTool.tsx';
import { writeOutRepeats } from './unfold.ts';

const p = strings.palette;

export interface Command extends Searchable {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  /** Its keys as this platform writes them, if it has any. */
  readonly keys: string | null;
  /** Why it cannot run now, or null when it can. */
  readonly unavailable: () => string | null;
  readonly run: () => void;
}

/** A command that takes a value typed after its name: "zoom 150", "speed -10". */
export interface ValueCommand extends Searchable {
  readonly id: string;
  /** Its name without a value ("Zoom to…"). */
  readonly label: string;
  readonly aliases: readonly string[];
  readonly unavailable: () => string | null;
  /** What it does with the value typed ("Zoom to 150 %"). */
  readonly describe: (value: CommandValue) => string;
  readonly apply: (value: CommandValue) => void;
}

function activeDocument(): OpenDocument | null {
  const { docs, activeKey } = useDocuments.getState();
  return docs.find(doc => doc.key === activeKey) ?? null;
}

function needsScore(): string | null {
  return activeDocument() === null ? p.reasons.noScore : null;
}

/** Why an editing command cannot run: no score, or the score is not being edited. */
function whileEditing(): string | null {
  const doc = activeDocument();
  if (doc === null) return p.reasons.noScore;
  return editingOf(doc.key).on ? null : p.reasons.notEditing;
}

function aliasesOf(id: string): readonly string[] {
  const aliases: Readonly<Record<string, readonly string[]>> = p.aliases;
  return aliases[id] ?? [];
}

/** Changes the open score's view. */
function updateView(change: (doc: OpenDocument) => Partial<DocViewState>): void {
  const doc = activeDocument();
  if (doc !== null) useDocuments.getState().updateView(doc.key, change(doc));
}

function setPreferences(patch: Partial<Preferences>): void {
  usePreferences.getState().set(patch);
}

/** Changes the open score's paper, and the paper of scores opened from now on, as Page setup does. */
function setPage(patch: Partial<PageSetup>): void {
  const doc = activeDocument();
  if (doc === null) return;
  const page = { ...doc.view.page, ...patch };
  useDocuments.getState().updateView(doc.key, { page });
  setPreferences({ page });
}

/** Paper and pages belong to the page layout. */
function needsPages(): string | null {
  const doc = activeDocument();
  if (doc === null) return p.reasons.noScore;
  return doc.view.layout === 'page' ? null : p.reasons.pagesOnly;
}

/** The commands about the open score's own tracks and the other open scores. */
function scoreCommands(): Command[] {
  const { docs, activeKey } = useDocuments.getState();
  const doc = docs.find(candidate => candidate.key === activeKey) ?? null;
  const c = p.commands;
  const tracks =
    doc === null
      ? []
      : doc.summary.tracks.map((track): Command => ({
          id: `track-${String(track.index)}`,
          label: c.track(track.name.trim().length > 0 ? track.name : track.shortName),
          aliases: [],
          keys: null,
          unavailable: () => null,
          run: () => {
            const view = activeDocument()?.view;
            if (view === undefined) return;
            const shown = view.trackIndexes.includes(track.index);
            const next = shown
              ? view.trackIndexes.filter(index => index !== track.index)
              : [...view.trackIndexes, track.index].sort((a, b) => a - b);
            // A score shows one track at least.
            if (next.length > 0) updateView(() => ({ trackIndexes: next }));
          },
        }));
  const others = docs
    .filter(other => other.key !== activeKey)
    .map((other): Command => ({
      id: `document-${other.key}`,
      label: c.switchTo(other.summary.title.trim().length > 0 ? other.summary.title : other.source.name),
      aliases: [other.source.name],
      keys: null,
      unavailable: () => null,
      run: () => {
        useDocuments.getState().activate(other.key);
      },
    }));
  // The scores opened lately (LIB-005): open again, or to the front when still open.
  const recent = useRecentScores.getState().list.map((score): Command => ({
    id: `recent-${score.fingerprint}`,
    label: strings.recent.open(score.title.length > 0 ? score.title : score.name),
    aliases: [score.name, score.artist],
    keys: null,
    unavailable: () => null,
    run: () => {
      const open = useDocuments
        .getState()
        .docs.find(candidate => candidate.fingerprint === score.fingerprint);
      if (open !== undefined) useDocuments.getState().activate(open.key);
      else void useDocuments.getState().open([recentSource(score)]);
    },
  }));
  const clearRecent: Command = {
    id: 'clear-recent',
    label: strings.recent.clearCommand,
    aliases: [],
    keys: null,
    unavailable: () => (useRecentScores.getState().list.length === 0 ? p.reasons.noRecent : null),
    run: () => {
      void useRecentScores.getState().clear();
    },
  };
  return [...tracks, ...others, ...recent, clearRecent];
}

/** A command that opens one of the app's panels or dialogs. */
function opens(
  id: string,
  label: string,
  panel: Panel,
  unavailable: () => string | null = needsScore,
): Command {
  return {
    id,
    label,
    aliases: aliasesOf(id),
    keys: null,
    unavailable,
    run: () => {
      useUi.getState().openPanel(panel);
    },
  };
}

/** A command that switches a preference on or off, while a score is open. */
function toggle(
  id: string,
  label: string,
  key: 'keyboard' | 'drums' | 'chords' | 'beatCounts' | 'drumKey',
): Command {
  return {
    id,
    label,
    aliases: aliasesOf(id),
    keys: null,
    unavailable: needsScore,
    run: () => {
      setPreferences({ [key]: !usePreferences.getState()[key] });
    },
  };
}

/** Plays from the start of a bar, as "Go to" does. */
export function goToMasterBar(index: number): boolean {
  const { timeline, seek } = usePlayer.getState();
  if (timeline === null) return false;
  const target = occurrenceOfMasterBar(timeline, index);
  if (target === null) return false;
  seek(target.startTick);
  return true;
}

/** The commands of the shortcut table, with their keys, and those without keys. */
export function paletteCommands(mod: string = modKey()): Command[] {
  // A fret is written by its digits, not from the palette.
  const fromShortcuts = SHORTCUTS.filter(
    shortcut => shortcut.id !== 'command-palette' && shortcut.id !== 'write-fret',
  ).map((shortcut): Command => {
    const binding = platformBindings(shortcut, mod)[0];
    return {
      id: shortcut.id,
      label: shortcut.label,
      aliases: aliasesOf(shortcut.id),
      keys: binding === undefined ? null : formatBinding(binding, mod),
      unavailable: () => {
        const doc = activeDocument();
        if (shortcut.needsScore && doc === null) return p.reasons.noScore;
        const editing = editingOf(doc?.key ?? null);
        if (shortcut.editing === true && !editing.on) return p.reasons.notEditing;
        if (shortcut.id === 'undo' && !editing.canUndo) return p.reasons.nothingToUndo;
        if (shortcut.id === 'redo' && !editing.canRedo) return p.reasons.nothingToRedo;
        if (
          shortcut.id === 'clear-selection' &&
          usePlayer.getState().selection === null &&
          !useUi.getState().fullScreen
        )
          return p.reasons.noSelection;
        return null;
      },
      run: () => {
        shortcut.run();
      },
    };
  });
  const c = p.commands;
  const others: Command[] = [
    opens('export', c.export, 'export'),
    opens('settings', c.settings, 'settings', () => null),
    opens('practice', c.practice, 'practice'),
    opens('about', strings.topBar.about, 'about', () => null),
    opens('open-url', strings.home.openUrl, 'url', () => null),
    {
      id: 'track-properties',
      label: strings.trackDialog.open,
      aliases: aliasesOf('track-properties'),
      keys: null,
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        return editingOf(doc.key).on ? null : p.reasons.notEditing;
      },
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openTrackDialog(doc.key);
      },
    },
    {
      id: 'bar-properties',
      label: strings.barDialog.open,
      aliases: aliasesOf('bar-properties'),
      keys: null,
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        return editingOf(doc.key).on ? null : p.reasons.notEditing;
      },
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openBarDialog(doc.key);
      },
    },
    {
      id: 'score-information',
      label: strings.scoreInfoDialog.open,
      aliases: aliasesOf('score-information'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openScoreInfoDialog(doc.key);
      },
    },
    {
      id: 'paste-special',
      label: strings.pasteDialog.open,
      aliases: aliasesOf('paste-special'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openPasteDialog(doc.key);
      },
    },
    {
      id: 'next-incomplete-bar',
      label: strings.editing.goToIncomplete,
      aliases: aliasesOf('next-incomplete-bar'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) goToIncompleteBar(doc.key);
      },
    },
    {
      id: 'palm-mute-let-ring',
      label: strings.assistantDialog.open,
      aliases: aliasesOf('palm-mute-let-ring'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openAssistantDialog(doc.key);
      },
    },
    {
      id: 'effects',
      label: strings.effectsDialog.open,
      aliases: aliasesOf('effects'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openEffectsDialog(doc.key);
      },
    },
    {
      id: 'transpose-notes',
      label: strings.transposeDialog.open,
      aliases: aliasesOf('transpose-notes'),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) openTransposeDialog(doc.key);
      },
    },
    ...(
      [
        ['semitone-up', strings.transposeDialog.semitoneUp, 1],
        ['semitone-down', strings.transposeDialog.semitoneDown, -1],
        ['octave-up', strings.transposeDialog.octaveUpCommand, 12],
        ['octave-down', strings.transposeDialog.octaveDownCommand, -12],
      ] as const
    ).map(([id, label, semitones]) => ({
      id,
      label,
      aliases: aliasesOf(id),
      keys: null,
      unavailable: whileEditing,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) transposeNotes(doc.key, semitones);
      },
    })),
    {
      id: 'new-score',
      label: strings.home.newScore,
      aliases: aliasesOf('new-score'),
      keys: null,
      unavailable: () => null,
      run: () => {
        void newScore();
      },
    },
    opens('song-info', strings.toolbar.songInfo, 'songInfo'),
    opens('page-setup', strings.pageSetup.open, 'pageSetup'),
    opens('track-staves', strings.trackStaves.title, 'trackStaves'),
    opens('mixer', strings.mixer.open, 'mixer'),
    opens('note-colours', strings.noteColors.open, 'noteColors'),
    opens('following', strings.playbackView.open, 'following'),
    {
      id: 'unfold',
      label: strings.toolbar.unfold,
      aliases: aliasesOf('unfold'),
      keys: null,
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        return doc.summary.hasRepeats ? null : p.reasons.noRepeats;
      },
      run: () => {
        const doc = activeDocument();
        if (doc !== null) void writeOutRepeats(doc);
      },
    },
    {
      id: 'tuner',
      label: c.tuner,
      aliases: aliasesOf('tuner'),
      keys: null,
      unavailable: () => null,
      run: openTuner,
    },
    {
      id: 'metronome-tool',
      label: c.metronomeTool,
      aliases: aliasesOf('metronome-tool'),
      keys: null,
      unavailable: () => null,
      run: openMetronomeTool,
    },
    {
      id: 'open-folder',
      label: c.openFolder,
      aliases: aliasesOf('open-folder'),
      keys: null,
      unavailable: () => (canPickFolder() ? null : p.reasons.noFolderPicker),
      run: pickFolder,
    },
    ...THEME_PREFERENCES.map((theme): Command => ({
      id: `theme-${theme}`,
      label: c.theme(strings.themes[theme]),
      aliases: [],
      keys: null,
      unavailable: () => null,
      run: () => {
        setPreferences({ theme });
      },
    })),
    ...LAYOUT_KINDS.map((layout): Command => ({
      id: `layout-${layout}`,
      label: c.layout(strings.layouts[layout]),
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        updateView(() => ({ layout }));
        setPreferences({ layout });
      },
    })),
    ...STAFF_DISPLAYS.map((staffDisplay): Command => ({
      id: `staves-${staffDisplay}`,
      label: c.staves(strings.staffDisplays[staffDisplay]),
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        // One choice for every track again, as the Staves menu makes it.
        updateView(() => ({ staffDisplay, staves: [] }));
        setPreferences({ staffDisplay });
      },
    })),
    toggle('keyboard', c.keyboard, 'keyboard'),
    toggle('drums', c.drums, 'drums'),
    toggle('chords', c.chords, 'chords'),
    {
      id: 'lyrics',
      label: c.lyrics,
      aliases: aliasesOf('lyrics'),
      keys: null,
      unavailable: needsScore,
      run: () => {
        const { lyrics } = usePreferences.getState();
        if (lyrics) useUi.getState().setLyricsOnly(false);
        setPreferences({ lyrics: !lyrics });
      },
    },
    toggle('beat-counts', c.beatCounts, 'beatCounts'),
    ...NOTE_NAMES.map((noteNames): Command => ({
      id: `note-names-${noteNames}`,
      label: c.noteNames(strings.readingAids.names[noteNames]),
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        setPreferences({ noteNames });
      },
    })),
    ...PAPER_IDS.filter(paper => paper !== 'custom').map((paper): Command => ({
      id: `paper-${paper}`,
      label: c.paper(strings.papers[paper]),
      aliases: [],
      keys: null,
      unavailable: needsPages,
      run: () => {
        setPage({ paper });
      },
    })),
    ...ORIENTATIONS.map((orientation): Command => ({
      id: `orientation-${orientation}`,
      label: c.paper(strings.orientations[orientation]),
      aliases: [],
      keys: null,
      unavailable: needsPages,
      run: () => {
        setPage({ orientation });
      },
    })),
    ...PAGE_ARRANGEMENTS.map((arrangement): Command => ({
      id: `pages-${arrangement}`,
      label: c.pages(strings.arrangements[arrangement]),
      aliases: [],
      keys: null,
      unavailable: needsPages,
      run: () => {
        updateView(() => ({ arrangement }));
        setPreferences({ pageArrangement: arrangement });
      },
    })),
    ...SYSTEMS_LAYOUTS.map((systemsLayout): Command => ({
      id: `systems-${systemsLayout}`,
      label: c.systems(strings.systemsLayouts[systemsLayout]),
      aliases: [],
      keys: null,
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        if (!doc.summary.hasModelLayout) return p.reasons.noModelLayout;
        return doc.view.layout === 'horizontal' ? p.reasons.notHorizontal : null;
      },
      run: () => {
        updateView(() => ({ systemsLayout }));
      },
    })),
    toggle('drum-key', c.drumKey, 'drumKey'),
    {
      id: 'concert-pitch',
      label: c.concertPitch,
      aliases: aliasesOf('concert-pitch'),
      keys: null,
      unavailable: needsScore,
      run: () => {
        updateView(doc => ({ concertPitch: !doc.view.concertPitch }));
      },
    },
    {
      id: 'tempo-marks',
      label: c.tempoMarks,
      aliases: aliasesOf('tempo-marks'),
      keys: null,
      unavailable: needsScore,
      run: () => {
        updateView(doc => ({ style: { ...doc.view.style, tempoMarks: !doc.view.style.tempoMarks } }));
      },
    },
    {
      id: 'all-tracks',
      label: c.allTracks,
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        updateView(doc => ({ trackIndexes: doc.summary.tracks.map(track => track.index) }));
      },
    },
    {
      id: 'focus',
      label: c.focus,
      aliases: aliasesOf('focus'),
      keys: null,
      unavailable: needsScore,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) useDocuments.getState().setFocus(doc.key, doc.activeTrack);
      },
    },
    {
      id: 'unfocus',
      label: c.unfocus,
      aliases: [],
      keys: null,
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        return doc.focus === null ? p.reasons.noFocus : null;
      },
      run: () => {
        const doc = activeDocument();
        if (doc !== null) useDocuments.getState().setFocus(doc.key, null);
      },
    },
    {
      id: 'close',
      label: c.close,
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        const doc = activeDocument();
        if (doc !== null) requestClose(doc.key);
      },
    },
  ];
  return [...fromShortcuts, ...others, ...scoreCommands()];
}

/** A whole percentage: absolute, or a change from `current` when signed. */
function percent(value: CommandValue, current: number): number {
  return Math.round(value.relative ? current * 100 + value.amount : value.amount);
}

/** The pitched tracks: drums are not transposed. */
function pitchedTracks(doc: OpenDocument): number[] {
  return doc.summary.tracks.filter(track => !track.isPercussion).map(track => track.index);
}

function semitones(value: CommandValue): number {
  return Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, Math.round(value.amount)));
}

/** The commands that take a value (UX-043). */
export function valueCommands(): ValueCommand[] {
  const v = p.values;
  return [
    {
      id: 'zoom',
      label: v.zoom,
      aliases: aliasesOf('zoom'),
      unavailable: needsScore,
      describe: value =>
        v.zoomTo(Math.round(clampZoom(percent(value, activeDocument()?.view.zoom ?? 1) / 100) * 100)),
      apply: value => {
        updateView(doc => ({ zoom: clampZoom(percent(value, doc.view.zoom) / 100) }));
      },
    },
    {
      id: 'speed',
      label: v.speed,
      aliases: aliasesOf('speed'),
      unavailable: needsScore,
      describe: value =>
        v.speedTo(Math.round(clampSpeed(percent(value, usePlayer.getState().speed) / 100) * 100)),
      apply: value => {
        const player = usePlayer.getState();
        player.setSpeed(clampSpeed(percent(value, player.speed) / 100));
      },
    },
    {
      id: 'transpose',
      label: v.transpose,
      aliases: aliasesOf('transpose'),
      unavailable: () => {
        const doc = activeDocument();
        if (doc === null) return p.reasons.noScore;
        return pitchedTracks(doc).length === 0 ? p.reasons.drumsOnly : null;
      },
      describe: value => v.transposeTo(semitones(value)),
      apply: value => {
        const doc = activeDocument();
        if (doc === null) return;
        const { updateMix } = useDocuments.getState();
        for (const track of pitchedTracks(doc)) updateMix(doc.key, track, { transpose: semitones(value) });
      },
    },
  ];
}
