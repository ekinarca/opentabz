/**
 * Metronome and count-in settings, and the tempo and meter of the metronome on its own. Kept
 * between visits in localStorage, guarded like the other preferences: private windows and
 * blocked storage fall back to the defaults.
 */
import {
  DEFAULT_METRONOME,
  METRONOME_SOUND_NAMES,
  type MetronomeLevel,
  type MetronomeSettings,
  type MetronomeSound,
} from '@opentabz/audio/metronome';
import { DEFAULT_TRAINER, type TrainerSettings } from '@opentabz/audio/trainer';
import { create } from 'zustand';

export const PRACTICE_STORAGE_KEY = 'opentabz.practice.v1';

/** Tempo range of the metronome on its own, in beats per minute. */
export const MIN_BPM = 10;
export const MAX_BPM = 400;
/** Meters of the metronome on its own. */
export const MAX_NUMERATOR = 16;
export const DENOMINATORS = [2, 4, 8, 16] as const;
export type Denominator = (typeof DENOMINATORS)[number];
/** The longest custom accent pattern, in beats. */
export const MAX_PATTERN = 16;
/** Polyrhythm voices: clicks per bar against the beat. */
export const POLYRHYTHMS = [0, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** Bar drops above this would leave too little to play along with. */
export const MAX_BEAT_DROP = 0.9;
/** Choices for how many times a loop plays (null: endlessly). */
export const LOOP_PASSES = [null, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] as const;
export type LoopPasses = (typeof LOOP_PASSES)[number];
/** Choices for the bars of rest between loop passes. */
export const LOOP_RESTS = [0, 1, 2, 4] as const;
export type LoopRest = (typeof LOOP_RESTS)[number];
/** Speed trainer limits, in speed (1 = 100 %). */
export const TRAINER_MIN = 0.1;
export const TRAINER_MAX = 3;
export const MAX_TRAINER_STEP = 0.5;
export const MAX_TRAINER_PASSES = 20;
/** What the tuner aims at: the strings of the track's tuning, or the nearest note. */
export const TUNER_TARGETS = ['strings', 'chromatic'] as const;
export type TunerTarget = (typeof TUNER_TARGETS)[number];
/** How the tuner shows how far off a note is: a needle, or a strobe that stands still in tune. */
export const TUNER_DISPLAYS = ['needle', 'strobe'] as const;
export type TunerDisplay = (typeof TUNER_DISPLAYS)[number];
/** Reference pitches of A4 the tuner takes, in hertz (baroque 415 to modern orchestras' 446 and beyond). */
export const MIN_A4 = 400;
export const MAX_A4 = 480;

export interface PracticeSettings {
  readonly metronome: boolean;
  /** 0–1; zero keeps a silent, visual metronome. */
  readonly metronomeVolume: number;
  readonly click: MetronomeSettings;
  readonly countIn: boolean;
  readonly countInVolume: number;
  readonly countInBars: 1 | 2;
  readonly countInEveryLoop: boolean;
  /** The metronome on its own. */
  readonly toolBpm: number;
  readonly toolNumerator: number;
  readonly toolDenominator: Denominator;
  /** How many times a loop plays before playback stops (null: endlessly). */
  readonly loopPasses: LoopPasses;
  /** Bars of rest before every pass of a loop after the first. */
  readonly loopRest: LoopRest;
  /** The speed trainer; it always starts off (only its numbers are kept). */
  readonly trainer: TrainerSettings;
  /** The tuner's reference pitch of A4, in hertz. */
  readonly tunerA4: number;
  readonly tunerTarget: TunerTarget;
  readonly tunerDisplay: TunerDisplay;
}

export const DEFAULT_PRACTICE: PracticeSettings = {
  metronome: false,
  metronomeVolume: 0.8,
  click: DEFAULT_METRONOME,
  countIn: false,
  countInVolume: 0.8,
  countInBars: 1,
  countInEveryLoop: false,
  toolBpm: 100,
  toolNumerator: 4,
  toolDenominator: 4,
  loopPasses: null,
  loopRest: 0,
  trainer: DEFAULT_TRAINER,
  tunerA4: 440,
  tunerTarget: 'strings',
  tunerDisplay: 'needle',
};

const LEVELS: readonly MetronomeLevel[] = ['accent', 'normal', 'soft', 'off'];

function unit(value: unknown, fallback: number, max = 1): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function parseClick(value: unknown): MetronomeSettings {
  const fallback = DEFAULT_METRONOME;
  if (typeof value !== 'object' || value === null) return fallback;
  const raw = value as Partial<Record<keyof MetronomeSettings, unknown>>;
  const pattern = Array.isArray(raw.pattern)
    ? raw.pattern.filter((level): level is MetronomeLevel => LEVELS.includes(level as MetronomeLevel))
    : [];
  return {
    sound: oneOf<MetronomeSound>(raw.sound, METRONOME_SOUND_NAMES, fallback.sound),
    subdivision: oneOf(raw.subdivision, [1, 2, 3, 4] as const, fallback.subdivision),
    every: oneOf(raw.every, [1, 2] as const, fallback.every),
    accent: oneOf(raw.accent, ['first', 'none', 'pattern'] as const, fallback.accent),
    pattern: pattern.length > 0 && pattern.length <= MAX_PATTERN ? pattern : fallback.pattern,
    polyrhythm: oneOf(raw.polyrhythm, POLYRHYTHMS, 0),
    swing: unit(raw.swing, fallback.swing),
    beatDrop: unit(raw.beatDrop, fallback.beatDrop, MAX_BEAT_DROP),
  };
}

export function parseTrainer(value: unknown): TrainerSettings {
  const fallback = DEFAULT_TRAINER;
  if (typeof value !== 'object' || value === null) return fallback;
  const raw = value as Partial<Record<keyof TrainerSettings, unknown>>;
  const speed = (input: unknown, otherwise: number) =>
    typeof input === 'number' && Number.isFinite(input) && input >= TRAINER_MIN && input <= TRAINER_MAX
      ? Math.round(input * 100) / 100
      : otherwise;
  const step = raw.step;
  return {
    enabled: false,
    from: speed(raw.from, fallback.from),
    to: speed(raw.to, fallback.to),
    step:
      typeof step === 'number' && step >= 0.01 && step <= MAX_TRAINER_STEP
        ? Math.round(step * 100) / 100
        : fallback.step,
    passes: integer(raw.passes, fallback.passes, 1, MAX_TRAINER_PASSES),
  };
}

export function parsePractice(raw: string | null): PracticeSettings {
  const fallback = DEFAULT_PRACTICE;
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof PracticeSettings, unknown>>;
    return {
      metronome: typeof value.metronome === 'boolean' ? value.metronome : fallback.metronome,
      metronomeVolume: unit(value.metronomeVolume, fallback.metronomeVolume),
      click: parseClick(value.click),
      countIn: typeof value.countIn === 'boolean' ? value.countIn : fallback.countIn,
      countInVolume: unit(value.countInVolume, fallback.countInVolume),
      countInBars: oneOf(value.countInBars, [1, 2] as const, fallback.countInBars),
      countInEveryLoop:
        typeof value.countInEveryLoop === 'boolean' ? value.countInEveryLoop : fallback.countInEveryLoop,
      toolBpm: integer(value.toolBpm, fallback.toolBpm, MIN_BPM, MAX_BPM),
      toolNumerator: integer(value.toolNumerator, fallback.toolNumerator, 1, MAX_NUMERATOR),
      toolDenominator: oneOf(value.toolDenominator, DENOMINATORS, fallback.toolDenominator),
      loopPasses: oneOf(value.loopPasses, LOOP_PASSES, fallback.loopPasses),
      loopRest: oneOf(value.loopRest, LOOP_RESTS, fallback.loopRest),
      trainer: parseTrainer(value.trainer),
      tunerA4: integer(value.tunerA4, fallback.tunerA4, MIN_A4, MAX_A4),
      tunerTarget: oneOf(value.tunerTarget, TUNER_TARGETS, fallback.tunerTarget),
      tunerDisplay: oneOf(value.tunerDisplay, TUNER_DISPLAYS, fallback.tunerDisplay),
    };
  } catch {
    return fallback;
  }
}

/** A tempo from taps: the mean of the intervals between the last taps (up to eight). */
export function tapTempo(times: readonly number[]): number | null {
  const recent = times.slice(-8);
  if (recent.length < 2) return null;
  const first = recent[0] ?? 0;
  const last = recent.at(-1) ?? 0;
  const interval = (last - first) / (recent.length - 1);
  if (interval <= 0) return null;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60_000 / interval)));
}

/** Taps further apart than this start a new tempo. */
export const TAP_RESET_MS = 2000;

/** The next level of a beat of a custom pattern, in the order tapping cycles through them. */
export function nextLevel(level: MetronomeLevel): MetronomeLevel {
  return LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length] ?? 'accent';
}

function load(): PracticeSettings {
  try {
    return parsePractice(localStorage.getItem(PRACTICE_STORAGE_KEY));
  } catch {
    return DEFAULT_PRACTICE;
  }
}

function save(settings: PracticeSettings): void {
  try {
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, quota): settings last for this session only.
  }
}

interface PracticeStore extends PracticeSettings {
  readonly set: (patch: Partial<PracticeSettings>) => void;
  readonly setClick: (patch: Partial<MetronomeSettings>) => void;
  readonly setTrainer: (patch: Partial<TrainerSettings>) => void;
}

function settingsOf(state: PracticeSettings): PracticeSettings {
  return {
    metronome: state.metronome,
    metronomeVolume: state.metronomeVolume,
    click: state.click,
    countIn: state.countIn,
    countInVolume: state.countInVolume,
    countInBars: state.countInBars,
    countInEveryLoop: state.countInEveryLoop,
    toolBpm: state.toolBpm,
    toolNumerator: state.toolNumerator,
    toolDenominator: state.toolDenominator,
    loopPasses: state.loopPasses,
    loopRest: state.loopRest,
    trainer: state.trainer,
    tunerA4: state.tunerA4,
    tunerTarget: state.tunerTarget,
    tunerDisplay: state.tunerDisplay,
  };
}

export const usePractice = create<PracticeStore>((set, get) => ({
  ...load(),
  set: patch => {
    set(patch);
    save(settingsOf(get()));
  },
  setClick: patch => {
    set(state => ({ click: { ...state.click, ...patch } }));
    save(settingsOf(get()));
  },
  setTrainer: patch => {
    set(state => ({ trainer: { ...state.trainer, ...patch } }));
    save(settingsOf(get()));
  },
}));
