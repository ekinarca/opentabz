/**
 * Every command of the command palette (UX-014): the keyboard shortcuts' actions with their keys,
 * and the actions without keys (export, themes, instrument views, layouts, staves, focus…), each
 * with the other words it is found by (UX-033) and, when it cannot run now, why (UX-032);
 * commands that take a value typed after their name (UX-043); the sections and bars to go to
 * (UX-038).
 */
import { LAYOUT_KINDS, STAFF_DISPLAYS } from '@opentabz/core/shared';
import { occurrenceOfMasterBar } from '../score-view/timeline-lookup.ts';
import { clampZoom, useDocuments, type DocViewState, type OpenDocument } from '../state/documents.ts';
import { MAX_TRANSPOSE } from '../state/mixer-memory.ts';
import { clampSpeed, usePlayer } from '../state/player.ts';
import { THEME_PREFERENCES, usePreferences, type Preferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import type { CommandValue } from './command-query.ts';
import type { Searchable } from './command-search.ts';
import { formatBinding, platformBindings, SHORTCUTS } from './keymap.ts';
import { openMetronomeTool } from './MetronomeTool.tsx';
import { modKey } from './platform.ts';
import { openTuner } from './TunerTool.tsx';

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
  const fromShortcuts = SHORTCUTS.filter(shortcut => shortcut.id !== 'command-palette').map(
    (shortcut): Command => {
      const binding = platformBindings(shortcut, mod)[0];
      return {
        id: shortcut.id,
        label: shortcut.label,
        aliases: aliasesOf(shortcut.id),
        keys: binding === undefined ? null : formatBinding(binding, mod),
        unavailable: () => {
          if (shortcut.needsScore && activeDocument() === null) return p.reasons.noScore;
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
    },
  );
  const c = p.commands;
  const others: Command[] = [
    {
      id: 'export',
      label: c.export,
      aliases: aliasesOf('export'),
      keys: null,
      unavailable: needsScore,
      run: () => {
        useUi.getState().openPanel('export');
      },
    },
    {
      id: 'settings',
      label: c.settings,
      aliases: [],
      keys: null,
      unavailable: () => null,
      run: () => {
        useUi.getState().openPanel('settings');
      },
    },
    {
      id: 'practice',
      label: c.practice,
      aliases: [],
      keys: null,
      unavailable: needsScore,
      run: () => {
        useUi.getState().openPanel('practice');
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
        if (doc !== null) useDocuments.getState().close(doc.key);
      },
    },
  ];
  return [...fromShortcuts, ...others];
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
