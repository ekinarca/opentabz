import { DEFAULT_METRONOME } from '@opentabz/audio/metronome';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRACTICE,
  MAX_BEAT_DROP,
  MAX_BPM,
  MIN_BPM,
  nextLevel,
  parseClick,
  parsePractice,
  tapTempo,
} from './practice.ts';

describe('practice settings', () => {
  it('fall back to the defaults when nothing or garbage is stored', () => {
    expect(parsePractice(null)).toEqual(DEFAULT_PRACTICE);
    expect(parsePractice('{not json')).toEqual(DEFAULT_PRACTICE);
    expect(parsePractice('42')).toEqual(DEFAULT_PRACTICE);
  });

  it('keep valid values and replace invalid ones field by field', () => {
    const stored = JSON.stringify({
      metronome: true,
      metronomeVolume: 0.3,
      countIn: 'yes',
      countInBars: 2,
      countInEveryLoop: true,
      countInVolume: 7,
      toolBpm: 180,
      toolNumerator: 7,
      toolDenominator: 8,
      click: {
        sound: 'cowbell',
        subdivision: 3,
        every: 2,
        accent: 'pattern',
        pattern: ['accent', 'off', 'loud', 'soft'],
        polyrhythm: 3,
        swing: 0.5,
        beatDrop: 0.95,
      },
    });
    const parsed = parsePractice(stored);
    expect(parsed.metronome).toBe(true);
    expect(parsed.metronomeVolume).toBe(0.3);
    expect(parsed.countIn).toBe(DEFAULT_PRACTICE.countIn);
    expect(parsed.countInBars).toBe(2);
    expect(parsed.countInEveryLoop).toBe(true);
    // Volumes are clamped to 0–1.
    expect(parsed.countInVolume).toBe(1);
    expect([parsed.toolBpm, parsed.toolNumerator, parsed.toolDenominator]).toEqual([180, 7, 8]);
    expect(parsed.click).toEqual({
      sound: 'cowbell',
      subdivision: 3,
      every: 2,
      accent: 'pattern',
      // Unknown levels are dropped.
      pattern: ['accent', 'off', 'soft'],
      polyrhythm: 3,
      swing: 0.5,
      beatDrop: MAX_BEAT_DROP,
    });
  });

  it('keep the tuner settings: reference pitch in range, target and display', () => {
    expect([DEFAULT_PRACTICE.tunerA4, DEFAULT_PRACTICE.tunerTarget, DEFAULT_PRACTICE.tunerDisplay]).toEqual([
      440,
      'strings',
      'needle',
    ]);
    const kept = parsePractice(
      JSON.stringify({ tunerA4: 415, tunerTarget: 'chromatic', tunerDisplay: 'strobe' }),
    );
    expect([kept.tunerA4, kept.tunerTarget, kept.tunerDisplay]).toEqual([415, 'chromatic', 'strobe']);
    const refused = parsePractice(
      JSON.stringify({ tunerA4: 1000, tunerTarget: 'bass', tunerDisplay: 'dial' }),
    );
    expect([refused.tunerA4, refused.tunerTarget, refused.tunerDisplay]).toEqual([440, 'strings', 'needle']);
  });

  it('reject tempos, meters and click settings outside their ranges', () => {
    const parsed = parsePractice(
      JSON.stringify({ toolBpm: MAX_BPM + 1, toolNumerator: 0, toolDenominator: 3 }),
    );
    expect(parsed.toolBpm).toBe(DEFAULT_PRACTICE.toolBpm);
    expect(parsed.toolNumerator).toBe(DEFAULT_PRACTICE.toolNumerator);
    expect(parsed.toolDenominator).toBe(DEFAULT_PRACTICE.toolDenominator);
    expect(parseClick({ sound: 'gong', subdivision: 5, polyrhythm: 1, pattern: [] })).toEqual(
      DEFAULT_METRONOME,
    );
    expect(parseClick('click')).toEqual(DEFAULT_METRONOME);
  });
});

describe('tap tempo', () => {
  it('needs two taps and averages the intervals of the last eight', () => {
    expect(tapTempo([])).toBeNull();
    expect(tapTempo([1000])).toBeNull();
    expect(tapTempo([0, 500])).toBe(120);
    expect(tapTempo([0, 480, 1010, 1500])).toBe(120);
    // Older taps fall out: twelve taps at 400 ms after two slow ones read 150 BPM.
    const taps = [0, 1000, ...Array.from({ length: 12 }, (_, index) => 2000 + index * 400)];
    expect(tapTempo(taps)).toBe(150);
  });

  it('stays inside the metronome range', () => {
    expect(tapTempo([0, 10])).toBe(MAX_BPM);
    expect(tapTempo([0, 60_000])).toBe(MIN_BPM);
    expect(tapTempo([500, 500])).toBeNull();
  });
});

describe('custom accent pattern', () => {
  it('cycles a beat through accent, normal, soft and silent', () => {
    expect(nextLevel('accent')).toBe('normal');
    expect(nextLevel('normal')).toBe('soft');
    expect(nextLevel('soft')).toBe('off');
    expect(nextLevel('off')).toBe('accent');
  });
});
