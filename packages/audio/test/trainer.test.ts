import { describe, expect, it } from 'vitest';
import { DEFAULT_TRAINER, nextTrainerSpeed, trainerSpeeds, type TrainerSettings } from '../src/trainer.ts';

function trainer(patch: Partial<TrainerSettings>): TrainerSettings {
  return { ...DEFAULT_TRAINER, enabled: true, ...patch };
}

describe('speed trainer', () => {
  it('steps up to the target and stays there', () => {
    const settings = trainer({ from: 0.6, to: 0.72, step: 0.05 });
    expect(nextTrainerSpeed(0.6, settings)).toBe(0.65);
    expect(nextTrainerSpeed(0.65, settings)).toBe(0.7);
    expect(nextTrainerSpeed(0.7, settings)).toBe(0.72);
    expect(nextTrainerSpeed(0.72, settings)).toBe(0.72);
    expect(trainerSpeeds(settings)).toBe(4);
  });

  it('steps down when the target is slower', () => {
    const settings = trainer({ from: 1.2, to: 1, step: 0.1 });
    expect(nextTrainerSpeed(1.2, settings)).toBe(1.1);
    expect(nextTrainerSpeed(1.1, settings)).toBe(1);
    expect(nextTrainerSpeed(1, settings)).toBe(1);
    expect(trainerSpeeds(settings)).toBe(3);
  });

  it('adds steps without drifting off whole percent', () => {
    const settings = trainer({ from: 0.1, to: 3, step: 0.01 });
    let speed = settings.from;
    for (let index = 0; index < 290; index++) speed = nextTrainerSpeed(speed, settings);
    expect(speed).toBe(3);
    expect(trainerSpeeds(settings)).toBe(291);
  });

  it('goes straight to the target with no step or no distance', () => {
    expect(nextTrainerSpeed(0.5, trainer({ from: 0.5, to: 0.8, step: 0 }))).toBe(0.8);
    expect(nextTrainerSpeed(0.7, trainer({ from: 0.7, to: 0.7 }))).toBe(0.7);
    expect(trainerSpeeds(trainer({ from: 0.7, to: 0.7 }))).toBe(1);
  });
});
