import {
  IconButton,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Tooltip,
} from '@opentabz/ui';
import {
  Hourglass,
  Loader2,
  Pause,
  Play,
  Repeat,
  Square,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { canToggle } from '../audio/transport-machine.ts';
import { findBarOccurrence, occurrence } from '../score-view/timeline-lookup.ts';
import { SPEED_PRESETS, usePlayer } from '../state/player.ts';
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
  const volume = usePlayer(state => state.volume);
  const toggle = usePlayer(state => state.toggle);
  const stop = usePlayer(state => state.stop);
  const setSpeed = usePlayer(state => state.setSpeed);
  const setMetronome = usePlayer(state => state.setMetronome);
  const setCountIn = usePlayer(state => state.setCountIn);
  const setLoop = usePlayer(state => state.setLoop);
  const setVolume = usePlayer(state => state.setVolume);

  const playing = transport.status === 'playing';
  const loading = transport.status === 'loading' || transport.status === 'unloaded';
  const bar = timeline === null ? null : occurrence(timeline, findBarOccurrence(timeline, tick));

  return (
    <div
      role="toolbar"
      aria-label={strings.transport.label}
      className="flex h-14 shrink-0 items-center gap-2 border-t border-line bg-surface px-3"
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
          className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-canvas shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
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
      />

      <div className="ml-1 flex min-w-0 flex-col leading-tight" aria-live="off">
        <span className="font-mono text-[13px] text-ink tabular-nums">
          {formatTime(time)} <span className="text-ink-faint">/ {formatTime(endTime)}</span>
        </span>
        <span className="text-[11px] text-ink-faint">
          {transport.status === 'error'
            ? strings.transport.unavailable
            : loading
              ? strings.transport.loading
              : bar === null
                ? ' '
                : strings.transport.bar(bar.masterBarIndex + 1)}
        </span>
      </div>

      {transport.status === 'error' && (
        <Tooltip label={transport.error ?? strings.transport.unavailable}>
          <span className="inline-flex text-danger" role="img" aria-label={strings.transport.unavailable}>
            <TriangleAlert size={18} aria-hidden />
          </span>
        </Tooltip>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Menu>
          <Tooltip label={strings.transport.speed}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={`${strings.transport.speed}: ${strings.transport.speedValue(speed)}`}
                className="h-9 min-w-[64px] rounded-[var(--radius-control)] px-2 font-mono text-[13px] text-ink tabular-nums hover:bg-sunken"
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
        <IconButton
          label={strings.transport.loop}
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
        />
        <IconButton
          label={strings.transport.countIn}
          icon={<Hourglass size={17} aria-hidden />}
          pressed={countIn}
          onClick={() => {
            setCountIn(!countIn);
          }}
        />
        <div className="ml-1 flex items-center gap-1.5">
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
            className="ot-range hidden w-24 sm:block"
          />
        </div>
      </div>
    </div>
  );
}
