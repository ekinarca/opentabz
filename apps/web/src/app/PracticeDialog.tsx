import { trainerSpeeds } from '@opentabz/audio/trainer';
import { Dialog, SegmentedControl, Slider, Switch } from '@opentabz/ui';
import { useId, useState } from 'react';
import { usePlayer } from '../state/player.ts';
import {
  LOOP_PASSES,
  LOOP_RESTS,
  MAX_TRAINER_PASSES,
  MAX_TRAINER_STEP,
  TRAINER_MAX,
  TRAINER_MIN,
  usePractice,
} from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { Field, MetronomeSettingsForm, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.practice;

/** Count-in: on or off, one or two bars, before every loop pass, its own volume. */
function CountInSettings() {
  const countIn = usePractice(state => state.countIn);
  const bars = usePractice(state => state.countInBars);
  const everyLoop = usePractice(state => state.countInEveryLoop);
  const volume = usePractice(state => state.countInVolume);
  const set = usePractice(state => state.set);
  return (
    <section className="flex flex-col gap-4">
      <Switch
        label={s.countIn}
        hint={s.countInHint}
        checked={countIn}
        onCheckedChange={checked => {
          set({ countIn: checked });
        }}
      />
      <Field label={s.countInBars}>
        <SegmentedControl
          label={s.countInBars}
          value={String(bars)}
          segments={([1, 2] as const).map(count => ({
            value: String(count),
            label: s.countInBarsValue(count),
          }))}
          onValueChange={value => {
            set({ countInBars: value === '2' ? 2 : 1 });
          }}
        />
      </Field>
      <Switch
        label={s.countInEveryLoop}
        hint={s.countInEveryLoopHint}
        checked={everyLoop}
        onCheckedChange={checked => {
          set({ countInEveryLoop: checked });
        }}
      />
      <Field label={s.countInVolume} value={s.percent(volume)}>
        <Slider
          label={s.countInVolume}
          valueText={s.percent(volume)}
          value={volume}
          min={0}
          max={1}
          step={0.01}
          onValueChange={value => {
            set({ countInVolume: value });
          }}
        />
      </Field>
    </section>
  );
}

/** A whole number typed in a field; values outside `min`–`max` are not taken. */
function NumberField({
  label,
  value,
  min,
  max,
  unit,
  onCommit,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly unit?: string;
  readonly onCommit: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] font-medium text-ink-muted">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text ?? String(value)}
          onChange={event => {
            setText(event.target.value);
            const number = Number.parseInt(event.target.value, 10);
            if (Number.isInteger(number) && number >= min && number <= max) onCommit(number);
          }}
          onBlur={() => {
            setText(null);
          }}
          className={`${SELECT_CLASS} w-full min-w-0 font-mono tabular-nums`}
        />
        {unit !== undefined && <span className="text-[13px] text-ink-muted">{unit}</span>}
      </div>
    </div>
  );
}

/** How many times a loop plays before playback stops, and the rest between passes. */
function LoopSettings() {
  const passes = usePractice(state => state.loopPasses);
  const rest = usePractice(state => state.loopRest);
  const set = usePractice(state => state.set);
  const id = useId();
  const restId = useId();
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[14px] font-medium text-ink">{s.loop}</h3>
      <Field label={s.loopPasses} htmlFor={id} hint={s.loopPassesHint}>
        <select
          id={id}
          value={passes === null ? '' : String(passes)}
          onChange={event => {
            const value = event.target.value === '' ? null : Number(event.target.value);
            const choice = LOOP_PASSES.find(option => option === value);
            if (choice !== undefined) set({ loopPasses: choice });
          }}
          className={SELECT_CLASS}
        >
          {LOOP_PASSES.map(option => (
            <option key={option ?? 'endless'} value={option === null ? '' : String(option)}>
              {s.loopPassesValue(option)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={s.loopRest} htmlFor={restId} hint={s.loopRestHint}>
        <select
          id={restId}
          value={rest}
          onChange={event => {
            const value = Number(event.target.value);
            const choice = LOOP_RESTS.find(option => option === value);
            if (choice !== undefined) set({ loopRest: choice });
          }}
          className={SELECT_CLASS}
        >
          {LOOP_RESTS.map(option => (
            <option key={option} value={option}>
              {s.loopRestValue(option)}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
}

/** The speed trainer: start and target speed, step, and passes at each speed. */
function TrainerSettings() {
  const trainer = usePractice(state => state.trainer);
  const setTrainer = usePractice(state => state.setTrainer);
  const speed = usePlayer(state => state.speed);
  const loop = usePlayer(state => state.loop);
  const setLoop = usePlayer(state => state.setLoop);
  const percent = (value: number) => Math.round(value * 100);
  const count = trainerSpeeds(trainer);
  const index = Math.min(
    count,
    Math.round(Math.abs(speed - trainer.from) / Math.max(0.01, Math.abs(trainer.step))) + 1,
  );
  return (
    <section className="flex flex-col gap-3">
      <Switch
        label={s.trainer}
        hint={s.trainerHint}
        checked={trainer.enabled}
        onCheckedChange={checked => {
          setTrainer({ enabled: checked });
          // The trainer moves on after loop passes.
          if (checked && !loop) setLoop(true);
        }}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField
          label={s.trainerFrom}
          value={percent(trainer.from)}
          min={percent(TRAINER_MIN)}
          max={percent(TRAINER_MAX)}
          unit={s.trainerUnit}
          onCommit={value => {
            setTrainer({ from: value / 100 });
          }}
        />
        <NumberField
          label={s.trainerTo}
          value={percent(trainer.to)}
          min={percent(TRAINER_MIN)}
          max={percent(TRAINER_MAX)}
          unit={s.trainerUnit}
          onCommit={value => {
            setTrainer({ to: value / 100 });
          }}
        />
        <NumberField
          label={s.trainerStep}
          value={percent(trainer.step)}
          min={1}
          max={percent(MAX_TRAINER_STEP)}
          unit={s.trainerUnit}
          onCommit={value => {
            setTrainer({ step: value / 100 });
          }}
        />
        <NumberField
          label={s.trainerPasses}
          value={trainer.passes}
          min={1}
          max={MAX_TRAINER_PASSES}
          onCommit={value => {
            setTrainer({ passes: value });
          }}
        />
      </div>
      {trainer.enabled && (
        <p role="status" className="text-[13px] font-medium text-accent">
          {Math.abs(speed - trainer.to) < 0.001 ? s.trainerDone(speed) : s.trainerStatus(speed, index, count)}
        </p>
      )}
    </section>
  );
}

/** The song's practice settings in one dialog (the transport has the on/off toggles). */
export function PracticeDialog() {
  const open = useUi(state => state.panel === 'practice');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const metronome = usePractice(state => state.metronome);
  const set = usePractice(state => state.set);
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setPanelOpen('practice', next);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <Switch
            label={s.metronome}
            hint={s.metronomeHint}
            checked={metronome}
            onCheckedChange={checked => {
              set({ metronome: checked });
            }}
          />
          <MetronomeSettingsForm />
        </section>
        <div className="h-px bg-line" aria-hidden />
        <CountInSettings />
        <div className="h-px bg-line" aria-hidden />
        <LoopSettings />
        <div className="h-px bg-line" aria-hidden />
        <TrainerSettings />
      </div>
    </Dialog>
  );
}
