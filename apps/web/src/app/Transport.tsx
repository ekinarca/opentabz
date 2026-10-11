import {
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
} from '@opentabz/ui';
import {
  Ellipsis,
  Hourglass,
  Loader2,
  Pause,
  Play,
  Repeat,
  Settings,
  Square,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { canToggle } from '../audio/transport-machine.ts';
import { rangeBars } from '../score-view/timeline-lookup.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { BeatIndicator, useSongConductor } from './BeatIndicator.tsx';
import { MetronomeIcon } from './icons.tsx';
import { shortcutHint } from './keymap.ts';
import { Mixer } from './Mixer.tsx';
import { PositionReadout } from './PositionReadout.tsx';
import { SpeedControl } from './SpeedControl.tsx';

/** The visual metronome of the song, while the metronome is on. */
function SongBeat({ doc, playing }: { readonly doc: OpenDocument; readonly playing: boolean }) {
  const conductor = useSongConductor(doc);
  if (conductor === null) return null;
  return <BeatIndicator conductor={conductor} playing={playing} />;
}

function openPracticeSettings(): void {
  useUi.getState().openPanel('practice');
}

/** The selected bars with a button to clear them (tablets and desktops). */
function SelectionChip({
  first,
  last,
  onClear,
}: {
  readonly first: number;
  readonly last: number;
  readonly onClear: () => void;
}) {
  return (
    <Tooltip label={strings.transport.selectionHelp}>
      <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-accent-soft pl-3 text-[12px] font-medium text-accent tabular-nums max-sm:hidden">
        <span className="max-md:hidden">{strings.transport.selection(first, last)}</span>
        <span className="md:hidden" aria-hidden>
          {strings.transport.selectionBars(first, last)}
        </span>
        <span className="sr-only md:hidden">{strings.transport.selection(first, last)}</span>
        <button
          type="button"
          aria-label={strings.transport.clearSelection}
          onClick={onClear}
          className="ml-0.5 inline-flex size-8 items-center justify-center rounded-full hover:bg-accent/15"
        >
          <X size={14} aria-hidden />
        </button>
      </span>
    </Tooltip>
  );
}

export function Transport() {
  const transport = usePlayer(state => state.transport);
  const timeline = usePlayer(state => state.timeline);
  const metronome = usePractice(state => state.metronome);
  const countIn = usePractice(state => state.countIn);
  const setPractice = usePractice(state => state.set);
  const loop = usePlayer(state => state.loop);
  const selection = usePlayer(state => state.selection);
  const volume = usePlayer(state => state.volume);
  const toggle = usePlayer(state => state.toggle);
  const stop = usePlayer(state => state.stop);
  const setMetronome = (on: boolean) => {
    setPractice({ metronome: on });
  };
  const setCountIn = (on: boolean) => {
    setPractice({ countIn: on });
  };
  const setLoop = usePlayer(state => state.setLoop);
  const setSelection = usePlayer(state => state.setSelection);
  const setVolume = usePlayer(state => state.setVolume);

  const activeDoc = useDocuments(state => state.docs.find(doc => doc.key === state.activeKey) ?? null);
  const playing = transport.status === 'playing';
  const loading = transport.status === 'loading' || transport.status === 'unloaded';
  const selectedBars = timeline === null || selection === null ? null : rangeBars(timeline, selection);
  const clearSelection = () => {
    setSelection(null);
  };

  let status: string | null = null;
  if (transport.status === 'error') status = strings.transport.unavailable;
  else if (loading) status = strings.transport.loading;

  return (
    <div
      role="toolbar"
      aria-label={strings.transport.label}
      className="flex min-h-14 shrink-0 items-center gap-1 overflow-x-auto border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] [scrollbar-width:none] sm:gap-2 sm:px-3"
    >
      <Tooltip
        label={playing ? strings.transport.pause : strings.transport.play}
        shortcut={shortcutHint('play-pause')}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={!canToggle(transport)}
          aria-label={playing ? strings.transport.pause : strings.transport.play}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-canvas shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause size={18} fill="currentColor" aria-hidden />
          ) : (
            <Play size={18} fill="currentColor" className="translate-x-[1px]" aria-hidden />
          )}
        </button>
      </Tooltip>
      <IconButton
        label={strings.transport.stop}
        shortcut={shortcutHint('stop')}
        icon={<Square size={14} fill="currentColor" aria-hidden />}
        onClick={stop}
        disabled={!canToggle(transport)}
        className="max-sm:hidden"
      />

      {activeDoc !== null && <PositionReadout doc={activeDoc} status={status} />}
      {activeDoc !== null && metronome && <SongBeat doc={activeDoc} playing={playing} />}

      {selectedBars !== null && (
        <SelectionChip first={selectedBars.first + 1} last={selectedBars.last + 1} onClear={clearSelection} />
      )}

      {transport.status === 'error' && (
        <Tooltip label={transport.error ?? strings.transport.unavailable}>
          <span className="inline-flex text-danger" role="img" aria-label={strings.transport.unavailable}>
            <TriangleAlert size={18} aria-hidden />
          </span>
        </Tooltip>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <SpeedControl />
        {activeDoc !== null && <Mixer doc={activeDoc} />}
        <IconButton
          label={selection === null ? strings.transport.loop : strings.transport.loopSelection}
          shortcut={shortcutHint('loop')}
          icon={<Repeat size={17} aria-hidden />}
          pressed={loop}
          onClick={() => {
            setLoop(!loop);
          }}
        />
        <IconButton
          label={strings.transport.metronome}
          shortcut={shortcutHint('metronome')}
          icon={<MetronomeIcon />}
          pressed={metronome}
          onClick={() => {
            setMetronome(!metronome);
          }}
          className="max-sm:hidden"
        />
        <IconButton
          label={strings.transport.countIn}
          shortcut={shortcutHint('count-in')}
          icon={<Hourglass size={17} aria-hidden />}
          pressed={countIn}
          onClick={() => {
            setCountIn(!countIn);
          }}
          className="max-sm:hidden"
        />
        <IconButton
          label={strings.transport.practiceSettings}
          icon={<Settings size={16} aria-hidden />}
          onClick={openPracticeSettings}
          className="max-sm:hidden"
        />
        {/* Phones: the less frequent controls live in a menu. */}
        <Menu>
          <Tooltip label={strings.transport.more}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={strings.transport.more}
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink sm:hidden"
              >
                <Ellipsis size={18} aria-hidden />
              </button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent align="end">
            <MenuItem
              icon={<Square size={12} fill="currentColor" aria-hidden />}
              onSelect={stop}
              disabled={!canToggle(transport)}
            >
              {strings.transport.stop}
            </MenuItem>
            {selection !== null && (
              <MenuItem icon={<X size={14} aria-hidden />} onSelect={clearSelection}>
                {strings.transport.clearSelection}
              </MenuItem>
            )}
            <MenuSeparator />
            <MenuCheckboxItem checked={metronome} onCheckedChange={setMetronome}>
              {strings.transport.metronome}
            </MenuCheckboxItem>
            <MenuCheckboxItem checked={countIn} onCheckedChange={setCountIn}>
              {strings.transport.countIn}
            </MenuCheckboxItem>
            <MenuItem icon={<Settings size={14} aria-hidden />} onSelect={openPracticeSettings}>
              {strings.transport.practiceSettings}
            </MenuItem>
          </MenuContent>
        </Menu>
        <div className="ml-1 hidden items-center gap-1.5 sm:flex">
          <IconButton
            label={volume === 0 ? strings.transport.unmute : strings.transport.mute}
            icon={volume === 0 ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
            onClick={() => {
              setVolume(volume === 0 ? 1 : 0);
            }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label={strings.transport.volume}
            onChange={event => {
              setVolume(Number(event.target.value));
            }}
            className="ot-range hidden w-24 lg:block"
          />
        </div>
      </div>
    </div>
  );
}
