import { IconButton, Popover, PopoverContent, PopoverTrigger, Slider, Switch, Tooltip } from '@opentabz/ui';
import { Minus, Plus } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import {
  clampSpeed,
  FIXED_TEMPO_PRESETS,
  MAX_FIXED_TEMPO,
  MAX_SPEED,
  MIN_FIXED_TEMPO,
  MIN_SPEED,
  SPEED_PRESETS,
  usePlayer,
} from '../state/player.ts';
import { TAP_RESET_MS, tapTempo, usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { shortcutHint, SPEED_STEP } from './keymap.ts';

/** One tempo for the whole song: on or off, typed in or picked from presets. */
function FixedTempo() {
  const fixedTempo = usePlayer(state => state.fixedTempo);
  const setFixedTempo = usePlayer(state => state.setFixedTempo);
  const [text, setText] = useState<string | null>(null);
  const inputId = useId();
  const scoreTempo = () => {
    const player = usePlayer.getState();
    return Math.round(player.tempo / player.speed);
  };
  return (
    <div className="mt-4 border-t border-line pt-3">
      <Switch
        label={strings.transport.fixedTempo}
        hint={strings.transport.fixedTempoHint}
        checked={fixedTempo !== null}
        onCheckedChange={checked => {
          setFixedTempo(checked ? scoreTempo() : null);
        }}
      />
      {fixedTempo !== null && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            {strings.transport.fixedTempoBpm}
          </label>
          <span aria-hidden className="text-[15px] text-ink-muted">
            ♩
          </span>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={MIN_FIXED_TEMPO}
            max={MAX_FIXED_TEMPO}
            value={text ?? String(fixedTempo)}
            onChange={event => {
              setText(event.target.value);
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isInteger(value) && value >= MIN_FIXED_TEMPO && value <= MAX_FIXED_TEMPO) {
                setFixedTempo(value);
              }
            }}
            onBlur={() => {
              setText(null);
            }}
            className="h-9 w-20 rounded-[var(--radius-control)] border border-line bg-surface px-2 font-mono text-[14px] text-ink tabular-nums outline-none focus-visible:border-accent"
          />
          <div role="group" aria-label={strings.transport.fixedTempoPresets} className="flex gap-1">
            {FIXED_TEMPO_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                aria-pressed={fixedTempo === preset}
                onClick={() => {
                  setFixedTempo(preset);
                }}
                className="h-8 rounded-[var(--radius-control)] px-2 font-mono text-[12px] text-ink-muted tabular-nums hover:bg-sunken hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Playback speed from 10 % to 300 %: a slider, ±5 % steps and presets. */
export function SpeedControl() {
  const speed = usePlayer(state => state.speed);
  const setSpeed = usePlayer(state => state.setSpeed);
  const open = useUi(state => state.panel === 'speed');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const label = strings.transport.speedValue(speed);
  const trainerOn = usePractice(state => state.trainer.enabled);
  const taps = useRef<number[]>([]);
  // Tap tempo: the speed that turns the score's tempo here into the tapped one.
  const tap = () => {
    const now = performance.now();
    const last = taps.current.at(-1);
    if (last !== undefined && now - last > TAP_RESET_MS) taps.current = [];
    taps.current.push(now);
    const bpm = tapTempo(taps.current);
    const player = usePlayer.getState();
    const scoreTempo = player.tempo / player.speed;
    if (bpm !== null && scoreTempo > 0) setSpeed(clampSpeed(bpm / scoreTempo));
  };

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
            aria-label={`${strings.transport.speed}: ${label}${trainerOn ? `, ${strings.transport.speedTrainerOn}` : ''}`}
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
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={tap}
            className="h-9 shrink-0 rounded-full border border-line-strong px-4 text-[13px] font-semibold text-ink hover:bg-sunken active:scale-95"
          >
            {strings.transport.speedTap}
          </button>
          <p className="text-[12px] text-ink-faint">{strings.transport.speedTapHint}</p>
        </div>
        <p className="mt-3 text-[12px] text-ink-faint">{strings.transport.speedHint}</p>
        <FixedTempo />
      </PopoverContent>
    </Popover>
  );
}
