import { Dialog, IconButton, Slider } from '@opentabz/ui';
import { ChevronDown, Loader2, Minus, Pause, Play, Plus } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { canToggle } from '../audio/transport-machine.ts';
import { usePlayer } from '../state/player.ts';
import {
  DENOMINATORS,
  MAX_BPM,
  MAX_NUMERATOR,
  MIN_BPM,
  TAP_RESET_MS,
  tapTempo,
  usePractice,
  type Denominator,
} from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { BeatIndicator, useClickTrackConductor } from './BeatIndicator.tsx';
import { MetronomeSettingsForm, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.metronomeTool;

/** Opens the metronome on its own; the open song waits (and comes back when it closes). */
export function openMetronomeTool(): void {
  useUi.getState().openPanel('metronome');
  void usePlayer.getState().openClickTrack();
}

function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/** Tempo: a large number to type in, ±1 buttons, a slider and tap tempo. */
function TempoControl() {
  const bpm = usePractice(state => state.toolBpm);
  const set = usePractice(state => state.set);
  const [text, setText] = useState(String(bpm));
  const [editing, setEditing] = useState(false);
  const inputId = useId();
  const setBpm = (value: number) => {
    set({ toolBpm: clampBpm(value) });
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <IconButton
          label={s.slower}
          icon={<Minus size={18} aria-hidden />}
          disabled={bpm <= MIN_BPM}
          onClick={() => {
            setBpm(bpm - 1);
          }}
        />
        <div className="flex flex-col items-center">
          <label htmlFor={inputId} className="sr-only">
            {s.tempo}
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={MIN_BPM}
            max={MAX_BPM}
            value={editing ? text : String(bpm)}
            onFocus={() => {
              setText(String(bpm));
              setEditing(true);
            }}
            onChange={event => {
              setText(event.target.value);
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isInteger(value) && value >= MIN_BPM && value <= MAX_BPM) setBpm(value);
            }}
            onBlur={() => {
              setEditing(false);
            }}
            className="w-[3.6ch] [appearance:textfield] bg-transparent text-center font-display text-[64px] leading-none text-ink tabular-nums outline-none focus-visible:rounded-[var(--radius-control)] focus-visible:bg-sunken [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[12px] font-medium tracking-[0.08em] text-ink-faint uppercase">{s.bpm}</span>
        </div>
        <IconButton
          label={s.faster}
          icon={<Plus size={18} aria-hidden />}
          disabled={bpm >= MAX_BPM}
          onClick={() => {
            setBpm(bpm + 1);
          }}
        />
      </div>
      <Slider
        className="w-full max-w-[360px]"
        label={s.tempo}
        valueText={s.bpmValue(bpm)}
        value={bpm}
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        onValueChange={setBpm}
      />
    </div>
  );
}

/** Taps set the tempo from their spacing; a pause of two seconds starts over. */
function useTapTempo(): () => void {
  const taps = useRef<number[]>([]);
  const set = usePractice(state => state.set);
  return useCallback(() => {
    const now = performance.now();
    const last = taps.current.at(-1);
    if (last !== undefined && now - last > TAP_RESET_MS) taps.current = [];
    taps.current.push(now);
    const bpm = tapTempo(taps.current);
    if (bpm !== null) set({ toolBpm: bpm });
  }, [set]);
}

function MeterControl() {
  const numerator = usePractice(state => state.toolNumerator);
  const denominator = usePractice(state => state.toolDenominator);
  const set = usePractice(state => state.set);
  const numeratorId = useId();
  const denominatorId = useId();
  return (
    <fieldset className="flex items-center justify-center gap-2">
      <legend className="sr-only">{s.meter}</legend>
      <label htmlFor={numeratorId} className="sr-only">
        {s.beatsPerBar}
      </label>
      <select
        id={numeratorId}
        value={numerator}
        onChange={event => {
          set({ toolNumerator: Number(event.target.value) });
        }}
        className={`${SELECT_CLASS} font-mono`}
      >
        {Array.from({ length: MAX_NUMERATOR }, (_, index) => index + 1).map(value => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <label htmlFor={denominatorId} className="sr-only">
        {s.beatUnit}
      </label>
      <select
        id={denominatorId}
        value={denominator}
        onChange={event => {
          const value = Number(event.target.value);
          const next = DENOMINATORS.find(candidate => candidate === value);
          if (next !== undefined) set({ toolDenominator: next satisfies Denominator });
        }}
        className={`${SELECT_CLASS} font-mono`}
      >
        {DENOMINATORS.map(value => (
          <option key={value} value={value}>
            {s.beatUnitValue(value)}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

/**
 * The metronome on its own (no song needed): tempo with tap tempo, meter, start and stop, the
 * visual metronome, and the shared sound and pattern settings.
 */
export function MetronomeTool() {
  const open = useUi(state => state.panel === 'metronome');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const clickTrack = usePlayer(state => state.clickTrack);
  const transport = usePlayer(state => state.transport);
  const toggle = usePlayer(state => state.toggle);
  const conductor = useClickTrackConductor();
  const tap = useTapTempo();
  const playing = transport.status === 'playing';
  const loading = transport.status === 'loading' || transport.status === 'unloaded';

  // Loading a document (say, a file dropped meanwhile) ends the metronome on its own.
  useEffect(() => {
    if (open && !clickTrack) setPanelOpen('metronome', false);
  }, [open, clickTrack, setPanelOpen]);

  // T taps the tempo while the dialog is open (fields keep their keys).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
      if (typing || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.key !== 't' && event.key !== 'T') return;
      event.preventDefault();
      tap();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, tap]);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setPanelOpen('metronome', next);
        if (!next) usePlayer.getState().closeClickTrack();
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="sm"
    >
      <div className="flex flex-col gap-5">
        <TempoControl />
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={tap}
            aria-label={s.tapLabel}
            className="h-11 min-w-24 rounded-full border border-line-strong px-5 text-[14px] font-semibold text-ink hover:bg-sunken active:scale-95"
          >
            {s.tap}
          </button>
          <MeterControl />
        </div>
        <p className="-mt-2 text-center text-[12px] text-ink-faint">{s.tapHint}</p>
        <div className="flex min-h-12 items-center justify-center">
          <BeatIndicator conductor={conductor} playing={playing} size="large" />
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!canToggle(transport)}
          className="mx-auto inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-canvas shadow-sm transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause size={18} fill="currentColor" aria-hidden />
          ) : (
            <Play size={18} fill="currentColor" aria-hidden />
          )}
          {playing ? s.stop : s.start}
        </button>
        {transport.status === 'error' && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {transport.error ?? s.unavailable}
          </p>
        )}
        <details className="group rounded-[10px] border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {s.soundAndPattern}
            <ChevronDown
              size={16}
              aria-hidden
              className="text-ink-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-line px-3 py-4">
            <MetronomeSettingsForm />
          </div>
        </details>
      </div>
    </Dialog>
  );
}
