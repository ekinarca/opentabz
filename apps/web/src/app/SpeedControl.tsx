import { IconButton, Popover, PopoverContent, PopoverTrigger, Slider, Tooltip } from '@opentabz/ui';
import { Minus, Plus } from 'lucide-react';
import { clampSpeed, MAX_SPEED, MIN_SPEED, SPEED_PRESETS, usePlayer } from '../state/player.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { shortcutHint, SPEED_STEP } from './keymap.ts';

/** Playback speed from 10 % to 300 %: a slider, ±5 % steps and presets. */
export function SpeedControl() {
  const speed = usePlayer(state => state.speed);
  const setSpeed = usePlayer(state => state.setSpeed);
  const open = useUi(state => state.panel === 'speed');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const label = strings.transport.speedValue(speed);

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setPanelOpen('speed', next);
      }}
    >
      <Tooltip label={strings.transport.speed} shortcut={shortcutHint('speed')}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${strings.transport.speed}: ${label}`}
            className={`h-9 min-w-[52px] rounded-[var(--radius-control)] px-1.5 font-mono text-[13px] tabular-nums hover:bg-sunken sm:min-w-[64px] sm:px-2 ${
              speed === 1 ? 'text-ink' : 'bg-accent-soft text-accent'
            }`}
          >
            {label}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={strings.transport.speed}
        align="end"
        side="top"
        className="w-[min(300px,calc(100vw-16px))] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <IconButton
            label={strings.transport.speedSlower}
            shortcut={shortcutHint('speed-down')}
            icon={<Minus size={16} aria-hidden />}
            disabled={speed <= MIN_SPEED}
            onClick={() => {
              setSpeed(clampSpeed(speed - SPEED_STEP));
            }}
          />
          <output className="font-mono text-[28px] leading-none text-ink tabular-nums" aria-live="polite">
            {label}
          </output>
          <IconButton
            label={strings.transport.speedFaster}
            shortcut={shortcutHint('speed-up')}
            icon={<Plus size={16} aria-hidden />}
            disabled={speed >= MAX_SPEED}
            onClick={() => {
              setSpeed(clampSpeed(speed + SPEED_STEP));
            }}
          />
        </div>
        <Slider
          className="mt-4"
          label={strings.transport.speed}
          valueText={label}
          value={speed}
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={0.01}
          onValueChange={setSpeed}
        />
        <div role="group" aria-label={strings.transport.speedPresets} className="mt-4 grid grid-cols-4 gap-1">
          {SPEED_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              aria-pressed={Math.abs(speed - preset) < 0.001}
              onClick={() => {
                setSpeed(preset);
              }}
              className="h-8 rounded-[var(--radius-control)] font-mono text-[12px] text-ink-muted tabular-nums hover:bg-sunken hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent"
            >
              {strings.transport.speedValue(preset)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-faint">{strings.transport.speedHint}</p>
      </PopoverContent>
    </Popover>
  );
}
