/**
 * The metronome as MIDI notes on a drum kit, generated from the song's bar grid (played bars in
 * playback order). Pure: the same settings and grid always give the same clicks.
 */

/**
 * Click sounds, as General MIDI percussion keys (accented and normal), with a gain that evens out
 * their loudness: the accents peak alike in the bundled SoundFont (sonivox; measured by the
 * offline render tests, which fail if a different SoundFont unbalances them).
 */
export const METRONOME_SOUNDS = {
  click: { accent: 34, normal: 33, gain: 1 },
  woodblock: { accent: 76, normal: 77, gain: 0.51 },
  claves: { accent: 75, normal: 75, gain: 0.73 },
  cowbell: { accent: 56, normal: 56, gain: 0.46 },
  sidestick: { accent: 37, normal: 37, gain: 0.82 },
  hihat: { accent: 46, normal: 42, gain: 0.58 },
} as const;

export type MetronomeSound = keyof typeof METRONOME_SOUNDS;
export const METRONOME_SOUND_NAMES = Object.keys(METRONOME_SOUNDS) as MetronomeSound[];

/** How a beat of a custom accent pattern sounds. */
export type MetronomeLevel = 'accent' | 'normal' | 'soft' | 'off';

export interface MetronomeSettings {
  readonly sound: MetronomeSound;
  /** Clicks per beat: 1 (beats), 2 (eighths in 4/4), 3 (triplets), 4 (sixteenths). */
  readonly subdivision: 1 | 2 | 3 | 4;
  /** Click every beat (1) or every other beat (2, half time). */
  readonly every: 1 | 2;
  /** First beat of each bar louder, no accents, or a pattern of levels per beat. */
  readonly accent: 'first' | 'none' | 'pattern';
  /** Levels per beat for `accent: 'pattern'`; repeated if the bar has more beats. */
  readonly pattern: readonly MetronomeLevel[];
  /** A second voice with this many evenly spaced clicks per bar (polyrhythm); 0 is off. */
  readonly polyrhythm: number;
  /** 0 (straight) to 1 (triplet swing) for off-beat eighths or sixteenths. */
  readonly swing: number;
  /** Probability (0–1) that a bar is left silent, to practise keeping time. */
  readonly beatDrop: number;
}

export const DEFAULT_METRONOME: MetronomeSettings = {
  sound: 'click',
  subdivision: 1,
  every: 1,
  accent: 'first',
  pattern: ['accent', 'normal', 'normal', 'normal'],
  polyrhythm: 0,
  swing: 0,
  beatDrop: 0,
};

export interface MetronomeClick {
  /** Score tick. */
  readonly tick: number;
  readonly key: number;
  /** 1–127. */
  readonly velocity: number;
}

/** Played bars: [startTick, numerator, denominator] per bar, in playback order. */
export const METRONOME_BAR_STRIDE = 3;

const VELOCITY: Readonly<Record<Exclude<MetronomeLevel, 'off'> | 'subdivision' | 'poly', number>> = {
  accent: 127,
  normal: 96,
  soft: 64,
  subdivision: 58,
  poly: 100,
};

/** MIDI velocity scales the level linearly in alphaTab's synthesizer. */
function velocity(base: number, gain: number): number {
  return Math.min(127, Math.max(1, Math.round(base * gain)));
}

/** Small seeded PRNG (mulberry32), so a bar is dropped the same way every time it is generated. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function levelOf(settings: MetronomeSettings, beat: number): MetronomeLevel {
  switch (settings.accent) {
    case 'first':
      return beat === 0 ? 'accent' : 'normal';
    case 'none':
      return 'normal';
    case 'pattern':
      return settings.pattern.length === 0
        ? 'normal'
        : (settings.pattern[beat % settings.pattern.length] ?? 'normal');
  }
}

/** The polyrhythm voice uses a sound that stands apart from the main one. */
function polySound(sound: MetronomeSound): MetronomeSound {
  return sound === 'claves' ? 'woodblock' : 'claves';
}

export function metronomeClicks(
  bars: Int32Array,
  endTick: number,
  settings: MetronomeSettings,
  seed = 1,
): MetronomeClick[] {
  const clicks: MetronomeClick[] = [];
  const sound = METRONOME_SOUNDS[settings.sound];
  const poly = METRONOME_SOUNDS[polySound(settings.sound)];
  const drop = random(seed);
  const swing = Math.min(1, Math.max(0, settings.swing));
  const count = bars.length / METRONOME_BAR_STRIDE;
  for (let index = 0; index < count; index++) {
    const start = bars[index * METRONOME_BAR_STRIDE] ?? 0;
    const numerator = bars[index * METRONOME_BAR_STRIDE + 1] ?? 4;
    const denominator = bars[index * METRONOME_BAR_STRIDE + 2] ?? 4;
    const end = index + 1 < count ? (bars[(index + 1) * METRONOME_BAR_STRIDE] ?? endTick) : endTick;
    // A bar dropped for time-keeping practice is silent, the first bar never is.
    if (index > 0 && settings.beatDrop > 0 && drop() < settings.beatDrop) continue;
    const beatTicks = (4 * 960) / denominator;
    // Pickup bars are shorter than their meter: count their beats from the end.
    const fullTicks = numerator * beatTicks;
    const offset = Math.max(0, fullTicks - (end - start));
    for (let beat = 0; beat < numerator; beat++) {
      if (beat % settings.every !== 0) continue;
      const beatStart = start + beat * beatTicks - offset;
      if (beatStart < start || beatStart >= end) continue;
      const level = levelOf(settings, beat);
      if (level === 'off') continue;
      clicks.push({
        tick: beatStart,
        key: level === 'accent' ? sound.accent : sound.normal,
        velocity: velocity(VELOCITY[level], sound.gain),
      });
      // Subdivisions split the interval between two clicks (a beat, or two in half time).
      const span = beatTicks * settings.every;
      const steps = settings.subdivision;
      for (let step = 1; step < steps; step++) {
        let position = (step / steps) * span;
        // Swing delays the off-beats of even subdivisions toward the last triplet.
        if (steps % 2 === 0 && step % 2 === 1 && swing > 0) {
          const pair = (2 / steps) * span;
          const pairStart = Math.floor(step / 2) * pair;
          position = pairStart + (pair / 2) * (1 + swing / 3);
        }
        const tick = Math.round(beatStart + position);
        if (tick >= end) break;
        clicks.push({ tick, key: sound.normal, velocity: velocity(VELOCITY.subdivision, sound.gain) });
      }
    }
    if (settings.polyrhythm > 0) {
      for (let pulse = 0; pulse < settings.polyrhythm; pulse++) {
        const tick = Math.round(start + (pulse * (end - start)) / settings.polyrhythm);
        clicks.push({
          tick,
          key: pulse === 0 ? poly.accent : poly.normal,
          velocity: velocity(VELOCITY.poly, poly.gain),
        });
      }
    }
  }
  return clicks.sort((a, b) => a.tick - b.tick);
}

/**
 * Where a count-in should start so that playback starting at `tick` falls on its beat: the start
 * of that beat, how many beats of its bar come before it, and the beats in a bar of its meter.
 */
export function countInStart(
  bars: Int32Array,
  endTick: number,
  tick: number,
): { tick: number; beatsBefore: number; numerator: number } {
  const count = bars.length / METRONOME_BAR_STRIDE;
  let index = 0;
  while (index + 1 < count && (bars[(index + 1) * METRONOME_BAR_STRIDE] ?? Infinity) <= tick) index++;
  const start = bars[index * METRONOME_BAR_STRIDE] ?? 0;
  const numerator = bars[index * METRONOME_BAR_STRIDE + 1] ?? 4;
  const denominator = bars[index * METRONOME_BAR_STRIDE + 2] ?? 4;
  const end = index + 1 < count ? (bars[(index + 1) * METRONOME_BAR_STRIDE] ?? endTick) : endTick;
  const beatTicks = (4 * 960) / denominator;
  const offset = Math.max(0, numerator * beatTicks - (end - start));
  const beat = Math.min(numerator - 1, Math.max(0, Math.floor((tick - start + offset) / beatTicks)));
  return {
    tick: Math.max(start, Math.round(start + beat * beatTicks - offset)),
    beatsBefore: beat,
    numerator,
  };
}

/** Bars in the metronome's song of clicks (played in a loop): enough for bar drops to vary. */
export const CLICK_TRACK_BARS = 16;

/** The bar grid of a song of clicks: `CLICK_TRACK_BARS` bars of one meter. */
export function clickTrackBars(numerator: number, denominator: number): Int32Array {
  const barTicks = (numerator * 4 * 960) / denominator;
  return Int32Array.from(
    Array.from({ length: CLICK_TRACK_BARS }, (_, index) => [index * barTicks, numerator, denominator]).flat(),
  );
}
