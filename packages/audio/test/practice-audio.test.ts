/**
 * The metronome, the count-in and loop wraps, measured in audio rendered through the real synth
 * path. Events are dispatched every 64 samples (1.45 ms at 44.1 kHz), so timings are asserted
 * to within that, plus the attack of the instrument.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_METRONOME, METRONOME_SOUND_NAMES, type MetronomeSettings } from '../src/metronome.ts';
import type { SynthEvent } from '../src/protocol.ts';
import {
  clickTimes,
  fundamental,
  onsets,
  peak,
  power,
  renderOffline,
  rms,
  window,
  type Command,
} from './offline.ts';

/** One dispatch block plus a marimba's attack. */
const TOLERANCE = 0.003;
const BAR_TICKS = 4 * 960;

/** Marimba at 120 BPM: a beat is half a second, a 4/4 bar two seconds. */
function marimba(bars: string): string {
  return `\\tempo 120\n\\track "Marimba" {instrument marimba}\n\\staff {score}\n${bars}`;
}

function metronome(enabled: boolean, settings: Partial<MetronomeSettings> = {}, volume = 1): Command {
  return { type: 'setMetronome', enabled, volume, settings: { ...DEFAULT_METRONOME, ...settings } };
}

function countIn(bars: 1 | 2, everyLoop = false): Command {
  return { type: 'setCountIn', enabled: true, volume: 1, bars, everyLoop };
}

function loop(startBar: number, endBar: number): Command {
  return {
    type: 'setLoop',
    enabled: true,
    range: { startTick: startBar * BAR_TICKS, endTick: endBar * BAR_TICKS },
    id: 1,
  };
}

/** Expects sound to start at each of `times` (seconds), and nowhere else. */
function expectOnsets(actual: readonly number[], times: readonly number[]): void {
  expect(actual).toHaveLength(times.length);
  times.forEach((time, index) => {
    expect(Math.abs((actual[index] ?? Infinity) - time)).toBeLessThan(TOLERANCE);
  });
}

/** A click starts on the beat at `time`: much louder right after it than right before. */
function clicksAt(samples: Float32Array, time: number): boolean {
  const before = time > 0.002 ? peak(samples, Math.max(0, time - 0.05), time - 0.002) : 0;
  return peak(samples, time, time + 0.04) > 3 * before;
}

function decibels(value: number): number {
  return 20 * Math.log10(value);
}

function countInEvents(events: readonly SynthEvent[]): [number, number][] {
  return events.flatMap(event => (event.type === 'countIn' ? [[event.beat, event.beats]] : []));
}

const RESTS = marimba('r.1 | r.1');

describe('the metronome through the synthesizer', () => {
  it('clicks on every beat, accents the first of each bar, and is silent when off', async () => {
    const { left } = await renderOffline(RESTS, 4.2, { before: [metronome(true)] });
    for (let beat = 0; beat < 8; beat++) expect(clicksAt(left, beat * 0.5)).toBe(true);
    // Nothing between the beats.
    for (let beat = 0; beat < 8; beat++) expect(clicksAt(left, beat * 0.5 + 0.25)).toBe(false);
    const accents = [0, 2].map(time => peak(left, time, time + 0.04));
    const others = [0.5, 1, 1.5, 2.5, 3, 3.5].map(time => peak(left, time, time + 0.04));
    expect(Math.min(...accents)).toBeGreaterThan(Math.max(...others));

    const off = await renderOffline(RESTS, 2.2, { before: [metronome(false)] });
    expect(peak(off.left)).toBe(0);
  });

  it('plays each sound in the middle, at a similar level, with louder accents', async () => {
    const levels: number[] = [];
    for (const sound of METRONOME_SOUND_NAMES) {
      const { left, right } = await renderOffline(RESTS, 2.2, { before: [metronome(true, { sound })] });
      const accent = peak(left, 0, 0.04);
      expect(accent, sound).toBeGreaterThan(0.05);
      // Drum kits pan percussion; the metronome stays centered (alphaTab patch 0008).
      expect(Math.abs(decibels(rms(left) / rms(right))), sound).toBeLessThan(0.1);
      expect(accent, sound).toBeGreaterThan(peak(left, 0.5, 0.54));
      levels.push(decibels(accent));
    }
    // The gains in METRONOME_SOUNDS even out the SoundFont's levels.
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThan(3);
  });

  it('follows its volume, and stays audible when a track is soloed', async () => {
    const full = peak((await renderOffline(RESTS, 1.2, { before: [metronome(true)] })).left, 0, 1);
    const quarter = peak(
      (await renderOffline(RESTS, 1.2, { before: [metronome(true, {}, 0.25)] })).left,
      0,
      1,
    );
    expect(quarter / full).toBeGreaterThan(0.2);
    expect(quarter / full).toBeLessThan(0.3);
    const soloed = await renderOffline(marimba('r.1'), 1.2, {
      before: [metronome(true), { type: 'setChannelSolo', channel: 0, value: true }],
    });
    expect(clicksAt(soloed.left, 0.5)).toBe(true);
  });

  it('plays a polyrhythm against the beat, swings and drops bars', async () => {
    const near = (times: readonly number[], expected: readonly number[]) => {
      expect(times).toHaveLength(expected.length);
      expected.forEach((time, index) => {
        expect(Math.abs((times[index] ?? Infinity) - time)).toBeLessThan(TOLERANCE);
      });
    };
    // Three against four: the beats, and a second sound at thirds of the bar.
    const poly = await renderOffline(RESTS, 1.9, { before: [metronome(true, { polyrhythm: 3 })] });
    near(clickTimes(poly.left), [0, 0.5, 2 / 3, 1, 4 / 3, 1.5]);
    // Full swing: the second eighth of each beat on the last triplet.
    const swung = await renderOffline(RESTS, 0.95, {
      before: [metronome(true, { subdivision: 2, swing: 1 })],
    });
    near(clickTimes(swung.left), [0, 1 / 3, 0.5, 0.5 + 1 / 3]);
    // Every bar but the first left out.
    const dropped = await renderOffline(marimba('r.1 | r.1 | r.1'), 6, {
      before: [metronome(true, { beatDrop: 1 })],
    });
    near(clickTimes(dropped.left), [0, 0.5, 1, 1.5]);
  });

  it('changes its pattern while playing without stopping or moving the playhead', async () => {
    const { left, events } = await renderOffline(RESTS, 3.2, {
      before: [metronome(true)],
      schedule: [{ at: 1.1, command: metronome(true, { subdivision: 2 }) }],
    });
    // Eighths once the audio buffered before the change has played (alphaTab patch 0009).
    expect(clicksAt(left, 0.75)).toBe(false);
    for (const time of [1.75, 2.25, 2.75]) expect(clicksAt(left, time)).toBe(true);
    // Still on the beat grid: nothing was skipped or repeated.
    const starts = onsets(left, 0.01, 0.05);
    for (const time of [1.5, 1.75, 2, 2.5, 2.75, 3]) {
      expect(Math.min(...starts.map(start => Math.abs(start - time)))).toBeLessThan(TOLERANCE);
    }
    // No pause, and positions keep moving forward in steps of one audio block.
    const started = events.findIndex(event => event.type === 'state' && event.playing);
    expect(events.slice(started + 1).some(event => event.type === 'state')).toBe(false);
    const ticks = events.slice(started).flatMap(event => (event.type === 'position' ? [event.tick] : []));
    ticks.slice(1).forEach((tick, index) => {
      expect(tick - (ticks[index] ?? 0)).toBeGreaterThanOrEqual(0);
      expect(tick - (ticks[index] ?? 0)).toBeLessThan(60);
    });
    expect(ticks.at(-1) ?? 0).toBeGreaterThan(5.5 * 960);
  });
});

describe('the count-in through the synthesizer', () => {
  const SONG = marimba('C5.4 r.4 r.2 | r.1');

  it('counts in a bar, and the song starts exactly a beat after the last click', async () => {
    const { left, events } = await renderOffline(SONG, 3, { before: [countIn(1)] });
    expectOnsets(onsets(left, 0.002), [0, 0.5, 1, 1.5, 2]);
    const pitch = fundamental(window(left, 2.05, 2.3));
    expect(pitch).toBeGreaterThan(523.25 * 0.98);
    expect(pitch).toBeLessThan(523.25 * 1.02);
    expect(countInEvents(events)).toEqual([
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [-1, 0],
    ]);
  });

  it('has a level of its own', async () => {
    const level = async (volume: number) => {
      const { left } = await renderOffline(SONG, 1.9, {
        before: [{ type: 'setCountIn', enabled: true, volume, bars: 1, everyLoop: false }],
      });
      return peak(left, 0, 1.9);
    };
    const ratio = (await level(0.25)) / (await level(1));
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.3);
  });

  it('counts in two bars', async () => {
    const { left } = await renderOffline(SONG, 5, { before: [countIn(2)] });
    expectOnsets(onsets(left, 0.002), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]);
  });

  it('starting in mid-bar, adds the beats of the bar before the start', async () => {
    // Playback starts on beat three (E5): a bar of count-in, then beats one and two.
    const { left, events } = await renderOffline(marimba('C5.4 D5.4 E5.4 r.4 | r.1'), 4, {
      before: [countIn(1), { type: 'seek', tick: 2 * 960, id: 1 }],
    });
    expectOnsets(onsets(left, 0.002), [0, 0.5, 1, 1.5, 2, 2.5, 3]);
    const pitch = fundamental(window(left, 3.05, 3.3));
    expect(pitch).toBeGreaterThan(659.26 * 0.98);
    expect(pitch).toBeLessThan(659.26 * 1.02);
    expect(countInEvents(events).at(-2)).toEqual([5, 6]);
  });

  it('counts in again before every pass of a loop when asked to', async () => {
    const song = marimba('r.1 | C5.4 r.4 r.2 | E5.1');
    const every = await renderOffline(song, 6.5, { before: [loop(1, 2), countIn(1, true)] });
    expectOnsets(onsets(every.left, 0.002), [0, 0.5, 1, 1.5, 2, 4, 4.5, 5, 5.5, 6]);
    const once = await renderOffline(song, 6.5, { before: [loop(1, 2), countIn(1)] });
    expectOnsets(onsets(once.left, 0.002), [0, 0.5, 1, 1.5, 2, 4, 6]);
  });
});

describe('loop wraps through the synthesizer', () => {
  it('repeats a range at exactly its length, without a gap', async () => {
    const { left } = await renderOffline(marimba('r.1 | C5.4 r.4 r.2 | E5.1'), 6.5, {
      before: [loop(1, 2)],
    });
    expectOnsets(onsets(left, 0.002), [0, 2, 4, 6]);
    // Each pass lasts the length of the range, to within one dispatch block.
    const starts = onsets(left, 0.002);
    starts.slice(1).forEach((start, index) => {
      expect(Math.abs(start - (starts[index] ?? 0) - 2)).toBeLessThan(64 / 44100);
    });
  });
});

describe('the metronome on its own (click track)', () => {
  function clickTrack(bpm: number, numerator: number, denominator: number): Command {
    return { type: 'loadClickTrack', playbackId: 'clicks', bpm, numerator, denominator };
  }

  it('clicks at its tempo in its meter, whether or not the song metronome is on', async () => {
    // 90 BPM in 3/4: a beat every 2/3 s, an accent every 2 s.
    const { left, events } = await renderOffline(null, 4.3, {
      before: [metronome(false), countIn(1), clickTrack(90, 3, 4)],
    });
    const times = clickTimes(left);
    expect(times).toHaveLength(7);
    times.forEach((time, index) => {
      expect(Math.abs(time - (index * 2) / 3)).toBeLessThan(TOLERANCE);
    });
    const accents = [0, 2, 4].map(time => peak(left, time, time + 0.04));
    const others = [2 / 3, 4 / 3, 8 / 3, 10 / 3].map(time => peak(left, time, time + 0.04));
    expect(Math.min(...accents)).toBeGreaterThan(Math.max(...others));
    // No count-in for the metronome on its own.
    expect(countInEvents(events)).toEqual([]);
    expect(events.some(event => event.type === 'midiLoaded' && event.playbackId === 'clicks')).toBe(true);
  });

  it('beats in the denominator of the meter: eighths in 6/8', async () => {
    const { left } = await renderOffline(null, 1.6, { before: [clickTrack(240, 6, 8)] });
    const times = clickTimes(left);
    times.forEach((time, index) => {
      expect(Math.abs(time - index * 0.25)).toBeLessThan(TOLERANCE);
    });
    expect(times.length).toBeGreaterThanOrEqual(6);
  });

  it('changes tempo without a break, keeping its place in the bar', async () => {
    const { left, events } = await renderOffline(null, 5, {
      before: [clickTrack(120, 4, 4)],
      schedule: [{ at: 1.1, command: clickTrack(60, 4, 4) }],
    });
    const times = clickTimes(left);
    const gaps = times.slice(1).map((time, index) => time - (times[index] ?? 0));
    // Half a second apart at first, a second apart at the end; the change lands between beats,
    // so one gap lies in between, and none is shorter or longer.
    expect(Math.abs((gaps[0] ?? 0) - 0.5)).toBeLessThan(TOLERANCE);
    expect(Math.abs((gaps.at(-1) ?? 0) - 1)).toBeLessThan(TOLERANCE);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0.5 - TOLERANCE);
      expect(gap).toBeLessThan(1 + TOLERANCE);
    }
    // Playback never stopped.
    const started = events.findIndex(event => event.type === 'state' && event.playing);
    expect(events.slice(started + 1).some(event => event.type === 'state')).toBe(false);
  });

  it('a volume of zero makes it silent, still running for a visual metronome', async () => {
    const { left, events } = await renderOffline(null, 1.2, {
      before: [metronome(false, {}, 0), clickTrack(120, 4, 4)],
    });
    expect(peak(left)).toBeLessThan(1e-4);
    const ticks = events.flatMap(event => (event.type === 'position' ? [event.tick] : []));
    expect(ticks.at(-1) ?? 0).toBeGreaterThan(2 * 960);
  });
});

describe('speed changes, the speed trainer and counted loops', () => {
  function trainer(from: number, to: number, step: number, passes: number): Command {
    return { type: 'setTrainer', enabled: true, from, to, step, passes };
  }

  it('changes speed while playing without a seek, a skip or a repeat', async () => {
    const { left, events } = await renderOffline(marimba('r.1 | r.1 | r.1'), 5.5, {
      before: [metronome(true)],
      schedule: [{ at: 1.1, command: { type: 'setSpeed', value: 0.5 } }],
    });
    const times = clickTimes(left);
    const gaps = times.slice(1).map((time, index) => time - (times[index] ?? 0));
    expect(Math.abs((gaps[0] ?? 0) - 0.5)).toBeLessThan(TOLERANCE);
    expect(Math.abs((gaps.at(-1) ?? 0) - 1)).toBeLessThan(TOLERANCE);
    // The change lands between two clicks: one gap in between, none shorter or longer.
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0.5 - TOLERANCE);
      expect(gap).toBeLessThan(1 + TOLERANCE);
    }
    // alphaTab used to seek on every speed change (alphaTab patch 0010).
    const started = events.findIndex(event => event.type === 'state' && event.playing);
    const positions = events.slice(started).flatMap(event => (event.type === 'position' ? [event] : []));
    expect(positions.some(position => position.isSeek)).toBe(false);
    positions.slice(1).forEach((position, index) => {
      expect(position.tick).toBeGreaterThanOrEqual(positions[index]?.tick ?? 0);
    });
  });

  it('the trainer moves the speed on every N passes, from the first sample of a pass', async () => {
    // One bar of 4/4 at 120 BPM loops: two passes at 50 %, two at 60 %, then 70 % to the end.
    const { left, events, times } = await renderOffline(marimba('C5.4 r.4 r.2 | r.1'), 18.5, {
      before: [loop(0, 1), trainer(0.5, 0.7, 0.1, 2)],
    });
    const starts = onsets(left, 0.002);
    const expected = [0, 4, 8, 8 + 10 / 3, 8 + 20 / 3, 8 + 20 / 3 + 20 / 7];
    expected.forEach((time, index) => {
      expect(Math.abs((starts[index] ?? Infinity) - time)).toBeLessThan(TOLERANCE);
    });
    // The UI hears about each new speed when it is heard, not before.
    const speeds = events.flatMap((event, index) =>
      event.type === 'speed' ? [[event.value, times[index] ?? 0] as const] : [],
    );
    expect(speeds.map(([speed]) => speed)).toEqual([0.5, 0.6, 0.7]);
    const heard = (speed: number) => speeds.find(([value]) => value === speed)?.[1] ?? Infinity;
    expect(heard(0.6)).toBeGreaterThanOrEqual(8 - 0.03);
    expect(heard(0.6)).toBeLessThan(8 + 0.05);
    expect(heard(0.7)).toBeGreaterThanOrEqual(8 + 20 / 3 - 0.03);
  });

  it('a counted loop plays its passes, stops, and loops again on the next play', async () => {
    const { left, events } = await renderOffline(marimba('C5.4 r.4 r.2 | E5.1'), 13, {
      before: [loop(0, 1), { type: 'setLoopPasses', passes: 3 }],
      schedule: [{ at: 7, command: { type: 'play' } }],
    });
    expectOnsets(onsets(left, 0.002), [0, 2, 4, 7, 9, 11]);
    // Nothing of the second bar: playback stopped after the third pass.
    expect(power(window(left, 6, 6.9), 659.26)).toBeLessThan(1e-9);
    const states = events.flatMap(event => (event.type === 'state' ? [event.playing] : []));
    expect(states.slice(-3)).toEqual([true, false, true]);
  });
});

describe('fixed-tempo practice', () => {
  // 120 BPM, then 60 BPM from bar 2: the metronome clicks follow the tempo map.
  const TEMPO_CHANGE = marimba('r.1 | \\tempo 60 r.1 | r.1');

  it('follows the tempo map, or one fixed tempo for the whole song', async () => {
    const mapped = await renderOffline(TEMPO_CHANGE, 4.6, { before: [metronome(true)] });
    expectOnsets(clickTimes(mapped.left), [0, 0.5, 1, 1.5, 2, 3, 4]);
    const fixed = await renderOffline(TEMPO_CHANGE, 4.6, {
      before: [metronome(true), { type: 'setFixedTempo', bpm: 90 }],
    });
    expectOnsets(
      clickTimes(fixed.left),
      Array.from({ length: 7 }, (_, index) => (index * 2) / 3),
    );
  });

  it('switches to a fixed tempo while playing without a break, in step with the beat', async () => {
    const { left, events } = await renderOffline(TEMPO_CHANGE, 4.2, {
      before: [metronome(true)],
      schedule: [{ at: 0.6, command: { type: 'setFixedTempo', bpm: 40 } }],
    });
    const times = clickTimes(left);
    const gaps = times.slice(1).map((time, index) => time - (times[index] ?? 0));
    // 0.5 s apart, then 1.5 s apart at 40 BPM; the change lands between beats.
    expect(Math.abs((gaps[0] ?? 0) - 0.5)).toBeLessThan(TOLERANCE);
    expect(Math.abs((gaps.at(-1) ?? 0) - 1.5)).toBeLessThan(TOLERANCE);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0.5 - TOLERANCE);
      expect(gap).toBeLessThan(1.5 + TOLERANCE);
    }
    const started = events.findIndex(event => event.type === 'state' && event.playing);
    expect(events.slice(started + 1).some(event => event.type === 'state')).toBe(false);
    const tempos = events.flatMap(event => (event.type === 'position' ? [event.tempo] : []));
    expect(tempos.at(-1)).toBeCloseTo(40, 5);
  });
});

describe('rests between loop passes', () => {
  const ONE_BAR = marimba('C5.4 r.4 r.2 | E5.1');

  it('leaves bars of silence before every pass after the first', async () => {
    const { left, events } = await renderOffline(ONE_BAR, 8.5, {
      before: [loop(0, 1), { type: 'setLoopRest', bars: 1 }],
    });
    // A pass of two seconds, a bar of rest, the next pass.
    expectOnsets(onsets(left, 0.002), [0, 4, 8]);
    expect(rms(window(left, 2.6, 3.95))).toBe(0);
    const rests = events.flatMap(event => (event.type === 'rest' ? [[event.beat, event.beats]] : []));
    expect(rests.slice(0, 5)).toEqual([
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [-1, 0],
    ]);
    // The position waits at the loop start during the rest: it is the last one reported.
    const end = events.findIndex(event => event.type === 'rest' && event.beat === -1);
    const before = events.slice(0, end).flatMap(event => (event.type === 'position' ? [event.tick] : []));
    // (alphaTab's time-to-tick conversion may round up by a tick.)
    expect(before.at(-1) ?? Infinity).toBeLessThanOrEqual(2);
  });

  it('rests, then counts in, before every later pass', async () => {
    const { left } = await renderOffline(ONE_BAR, 8.5, {
      before: [loop(0, 1), { type: 'setLoopRest', bars: 1 }, countIn(1, true)],
    });
    expectOnsets(onsets(left, 0.002), [0, 0.5, 1, 1.5, 2, 6, 6.5, 7, 7.5, 8]);
  });
});
