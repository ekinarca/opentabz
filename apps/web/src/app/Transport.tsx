import {
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
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
  Square,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { canToggle } from '../audio/transport-machine.ts';
import { findBarOccurrence, occurrence, rangeBars } from '../score-view/timeline-lookup.ts';
import { useDocuments } from '../state/documents.ts';
import { SPEED_PRESETS, usePlayer } from '../state/player.ts';
import { Mixer } from './Mixer.tsx';
import { strings } from '../strings.ts';

function formatTime(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** A metronome glyph (Lucide has none): body, pendulum and weight. */
function MetronomeIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 3h6l4 18H5L9 3Z" />
      <path d="M12 17 17 7" />
      <path d="M7.5 14h9" />
    </svg>
  );
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
  const time = usePlayer(state => state.time);
  const endTime = usePlayer(state => state.endTime);
  const tick = usePlayer(state => state.tick);
  const timeline = usePlayer(state => state.timeline);
  const speed = usePlayer(state => state.speed);
  const metronome = usePlayer(state => state.metronome);
  const countIn = usePlayer(state => state.countIn);
  const loop = usePlayer(state => state.loop);
  const selection = usePlayer(state => state.selection);
  const volume = usePlayer(state => state.volume);
  const toggle = usePlayer(state => state.toggle);
  const stop = usePlayer(state => state.stop);
  const setSpeed = usePlayer(state => state.setSpeed);
  const setMetronome = usePlayer(state => state.setMetronome);
  const setCountIn = usePlayer(state => state.setCountIn);
  const setLoop = usePlayer(state => state.setLoop);
  const setSelection = usePlayer(state => state.setSelection);
  const setVolume = usePlayer(state => state.setVolume);

  const activeDoc = useDocuments(state => state.docs.find(doc => doc.key === state.activeKey) ?? null);
  const playing = transport.status === 'playing';
  const loading = transport.status === 'loading' || transport.status === 'unloaded';
  const bar = timeline === null ? null : occurrence(timeline, findBarOccurrence(timeline, tick));
  const selectedBars = timeline === null || selection === null ? null : rangeBars(timeline, selection);
  const clearSelection = () => {
    setSelection(null);
  };

  let status: string;
  if (transport.status === 'error') status = strings.transport.unavailable;
  else if (loading) status = strings.transport.loading;
  else if (bar === null) status = ' ';
  else status = strings.transport.bar(bar.masterBarIndex + 1);

  return (
    <div
      role="toolbar"
      aria-label={strings.transport.label}
      className="flex min-h-14 shrink-0 items-center gap-1 overflow-x-auto border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] [scrollbar-width:none] sm:gap-2 sm:px-3"
    >
      <Tooltip
        label={playing ? strings.transport.pause : strings.transport.play}
        shortcut={strings.transport.playShortcut}
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
        shortcut={strings.transport.stopShortcut}
        icon={<Square size={14} fill="currentColor" aria-hidden />}
        onClick={stop}
        disabled={!canToggle(transport)}
        className="max-sm:hidden"
      />

      <div className="ml-1 flex min-w-0 shrink-0 flex-col leading-tight" aria-live="off">
        <span className="font-mono text-[13px] text-ink tabular-nums">
          {formatTime(time)} <span className="text-ink-faint">/ {formatTime(endTime)}</span>
        </span>
        <span className="text-[11px] text-ink-faint">
          {selectedBars === null ? (
            status
          ) : (
            <>
              <span className="max-sm:hidden">{status}</span>
              <span className="font-medium text-accent sm:hidden">
                {strings.transport.selection(selectedBars.first + 1, selectedBars.last + 1)}
              </span>
            </>
          )}
        </span>
      </div>

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
        <Menu>
          <Tooltip label={strings.transport.speed}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={`${strings.transport.speed}: ${strings.transport.speedValue(speed)}`}
                className="h-9 min-w-[52px] rounded-[var(--radius-control)] px-1.5 font-mono text-[13px] text-ink tabular-nums hover:bg-sunken sm:min-w-[64px] sm:px-2"
              >
                {strings.transport.speedValue(speed)}
              </button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent align="end">
            <MenuRadioGroup<string>
              value={String(speed)}
              onValueChange={value => {
                setSpeed(Number(value));
              }}
            >
              {SPEED_PRESETS.map(preset => (
                <MenuRadioItem key={preset} value={String(preset)}>
                  {strings.transport.speedValue(preset)}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
        {activeDoc !== null && <Mixer doc={activeDoc} />}
        <IconButton
          label={selection === null ? strings.transport.loop : strings.transport.loopSelection}
          icon={<Repeat size={17} aria-hidden />}
          pressed={loop}
          onClick={() => {
            setLoop(!loop);
          }}
        />
        <IconButton
          label={strings.transport.metronome}
          icon={<MetronomeIcon />}
          pressed={metronome}
          onClick={() => {
            setMetronome(!metronome);
          }}
          className="max-sm:hidden"
        />
        <IconButton
          label={strings.transport.countIn}
          icon={<Hourglass size={17} aria-hidden />}
          pressed={countIn}
          onClick={() => {
            setCountIn(!countIn);
          }}
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
