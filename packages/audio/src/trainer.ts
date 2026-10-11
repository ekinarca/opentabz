/**
 * The speed trainer: while a range loops, the speed moves from a start to a target in steps,
 * after a number of passes at each speed (Guitar Pro's speed trainer). Pure.
 */

export interface TrainerSettings {
  readonly enabled: boolean;
  /** Speed of the first passes (0.1–3, 1 is the score's tempo). */
  readonly from: number;
  /** Speed the trainer stops at. */
  readonly to: number;
  /** Change of speed per step; the direction comes from `from` and `to`. */
  readonly step: number;
  /** Passes at each speed before the next step. */
  readonly passes: number;
}

export const DEFAULT_TRAINER: TrainerSettings = {
  enabled: false,
  from: 0.6,
  to: 1,
  step: 0.05,
  passes: 2,
};

/** Speeds are kept to whole percent so steps add up exactly. */
function percent(speed: number): number {
  return Math.round(speed * 100) / 100;
}

/** The speed after `current` in the trainer's run, never past its target. */
export function nextTrainerSpeed(current: number, settings: TrainerSettings): number {
  const step = Math.abs(settings.step);
  if (step === 0 || settings.from === settings.to) return percent(settings.to);
  if (settings.to > settings.from) return percent(Math.min(settings.to, current + step));
  return percent(Math.max(settings.to, current - step));
}

/** How many steps the run has, counting the first speed: 60 → 100 % by 5 is nine speeds. */
export function trainerSpeeds(settings: TrainerSettings): number {
  const step = Math.abs(settings.step);
  if (step === 0) return 1;
  return Math.ceil(Math.round((Math.abs(settings.to - settings.from) / step) * 1000) / 1000) + 1;
}
