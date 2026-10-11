import { METRONOME_SOUND_NAMES, type MetronomeLevel, type MetronomeSound } from '@opentabz/audio/metronome';
import { IconButton, SegmentedControl, Slider, Switch } from '@opentabz/ui';
import { Minus, Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { MAX_BEAT_DROP, MAX_PATTERN, nextLevel, POLYRHYTHMS, usePractice } from '../state/practice.ts';
import { strings } from '../strings.ts';

const s = strings.practice;

/** A labelled row: the label (and a hint) above its control. */
export function Field({
  label,
  hint,
  htmlFor,
  value,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  /** Shown at the end of the label row, such as the value of a slider. */
  readonly value?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        {htmlFor === undefined ? (
          <span className="text-[13px] font-medium text-ink">{label}</span>
        ) : (
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
            {label}
          </label>
        )}
        {value !== undefined && (
          <span className="font-mono text-[12px] text-ink-muted tabular-nums">{value}</span>
        )}
      </div>
      {children}
      {hint !== undefined && <p className="text-[12px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export const SELECT_CLASS =
  'h-9 rounded-[var(--radius-control)] border border-line bg-surface px-2 text-[14px] text-ink outline-none focus-visible:border-accent';

/** A whole number typed in a field; values outside `min`–`max` are not taken. */
export function NumberField({
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

/** Glyphs of the accent levels in the pattern editor. */
const LEVEL_GLYPHS: Readonly<Record<MetronomeLevel, string>> = {
  accent: '●',
  normal: '•',
  soft: '·',
  off: '○',
};

/** Tap a beat to cycle its level; − and + change how many beats the pattern has. */
function PatternEditor() {
  const pattern = usePractice(state => state.click.pattern);
  const setClick = usePractice(state => state.setClick);
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label={s.pattern} className="flex flex-wrap items-center gap-1">
        {pattern.map((level, index) => (
          <button
            // A beat of the pattern is its position.
            key={index}
            type="button"
            aria-label={s.patternBeat(index + 1, s.levels[level])}
            onClick={() => {
              setClick({
                pattern: pattern.map((current, at) => (at === index ? nextLevel(current) : current)),
              });
            }}
            className={`flex size-9 flex-col items-center justify-center rounded-[var(--radius-control)] border text-[15px] leading-none ${
              level === 'accent'
                ? 'border-accent bg-accent-soft text-accent'
                : level === 'off'
                  ? 'border-line text-ink-faint'
                  : 'border-line-strong text-ink'
            }`}
          >
            <span aria-hidden>{LEVEL_GLYPHS[level]}</span>
            <span aria-hidden className="mt-0.5 font-mono text-[9px] text-ink-faint">
              {index + 1}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={s.patternShorter}
            icon={<Minus size={14} aria-hidden />}
            disabled={pattern.length <= 1}
            onClick={() => {
              setClick({ pattern: pattern.slice(0, -1) });
            }}
          />
          <span className="min-w-14 text-center text-[12px] text-ink-muted tabular-nums">
            {s.patternLength(pattern.length)}
          </span>
          <IconButton
            label={s.patternLonger}
            icon={<Plus size={14} aria-hidden />}
            disabled={pattern.length >= MAX_PATTERN}
            onClick={() => {
              setClick({ pattern: [...pattern, 'normal'] });
            }}
          />
        </div>
      </div>
      <p className="text-[12px] text-ink-faint">{s.patternHint}</p>
    </div>
  );
}

/**
 * How the metronome clicks: sound, clicks per beat, accents, polyrhythm, swing, silent bars and
 * volume. Shared by the song's metronome settings and the metronome on its own.
 */
export function MetronomeSettingsForm() {
  const click = usePractice(state => state.click);
  const volume = usePractice(state => state.metronomeVolume);
  const set = usePractice(state => state.set);
  const setClick = usePractice(state => state.setClick);
  const soundId = useId();
  const polyId = useId();

  return (
    <div className="flex flex-col gap-4">
      <Field label={s.volume} value={s.percent(volume)} hint={s.silentHint}>
        <Slider
          label={s.volume}
          valueText={s.percent(volume)}
          value={volume}
          min={0}
          max={1}
          step={0.01}
          onValueChange={value => {
            set({ metronomeVolume: value });
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={s.sound} htmlFor={soundId}>
          <select
            id={soundId}
            value={click.sound}
            onChange={event => {
              setClick({ sound: event.target.value as MetronomeSound });
            }}
            className={SELECT_CLASS}
          >
            {METRONOME_SOUND_NAMES.map(sound => (
              <option key={sound} value={sound}>
                {s.sounds[sound]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s.polyrhythm} htmlFor={polyId}>
          <select
            id={polyId}
            value={click.polyrhythm}
            onChange={event => {
              setClick({ polyrhythm: Number(event.target.value) });
            }}
            className={SELECT_CLASS}
          >
            {POLYRHYTHMS.map(count => (
              <option key={count} value={count}>
                {count === 0 ? s.polyrhythmOff : s.polyrhythmValue(count)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {click.polyrhythm > 0 && <p className="-mt-2 text-[12px] text-ink-faint">{s.polyrhythmHint}</p>}

      <Field label={s.subdivision}>
        <SegmentedControl
          label={s.subdivision}
          value={String(click.subdivision)}
          segments={([1, 2, 3, 4] as const).map(count => ({
            value: String(count),
            label: s.subdivisions[count],
            icon: (
              <span aria-hidden className="font-mono text-[13px]">
                {count}
              </span>
            ),
            iconOnly: true,
          }))}
          onValueChange={value => {
            const subdivision = Number(value);
            if (subdivision === 1 || subdivision === 2 || subdivision === 3 || subdivision === 4) {
              setClick({ subdivision });
            }
          }}
        />
      </Field>

      {(click.subdivision === 2 || click.subdivision === 4) && (
        <Field label={s.swing} value={s.percent(click.swing)} hint={s.swingHint}>
          <Slider
            label={s.swing}
            valueText={s.percent(click.swing)}
            value={click.swing}
            min={0}
            max={1}
            step={0.05}
            onValueChange={value => {
              setClick({ swing: value });
            }}
          />
        </Field>
      )}

      <Switch
        label={s.halfTime}
        hint={s.halfTimeHint}
        checked={click.every === 2}
        onCheckedChange={checked => {
          setClick({ every: checked ? 2 : 1 });
        }}
      />

      <Field label={s.accents}>
        <SegmentedControl
          label={s.accents}
          value={click.accent}
          segments={(['first', 'none', 'pattern'] as const).map(mode => ({
            value: mode,
            label: s.accentModes[mode],
          }))}
          onValueChange={accent => {
            setClick({ accent });
          }}
        />
      </Field>
      {click.accent === 'pattern' && <PatternEditor />}

      <Field label={s.beatDrop} value={s.percent(click.beatDrop)} hint={s.beatDropHint}>
        <Slider
          label={s.beatDrop}
          valueText={s.percent(click.beatDrop)}
          value={click.beatDrop}
          min={0}
          max={MAX_BEAT_DROP}
          step={0.05}
          onValueChange={value => {
            setClick({ beatDrop: value });
          }}
        />
      </Field>
    </div>
  );
}
