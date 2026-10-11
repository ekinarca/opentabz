/**
 * Proof that note-level techniques and articulations change what is played (FEATURE_MATRIX
 * PLAY-033…PLAY-043, PLAY-079, PLAY-080, PLAY-089, PLAY-090): pitches, lengths, velocities and
 * re-attacks in the generated MIDI. Techniques alphaTab 1.8.4 got wrong are proved where they are
 * fixed: tremolo speeds, fades, ornaments in key, tapping and the sustain pedal in
 * playback-realism.test.ts (patch 0015), slap, pop and golpe in playback-channels.test.ts (0017).
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import {
  barOrder,
  controllerValues,
  notesBetween,
  playedBars,
  playFixture,
  playTex,
  QUARTER,
  soundingNotes,
  type Played,
  type SoundingNote,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;

function guitar(tempo: number, ...bars: string[]): Played {
  return playTex(
    [
      '\\title "Techniques"',
      `\\tempo ${tempo}`,
      '\\track "Guitar" {instrument electricGuitarClean}',
      '\\staff {score tabs}',
      '\\tuning (E4 B3 G3 D3 A2 E2)',
      bars.join(' |\n'),
    ].join('\n'),
  );
}

function piano(...bars: string[]): Played {
  return playTex(
    [
      '\\title "Notation"',
      '\\track "Piano" {instrument acousticGrandPiano}',
      '\\staff {score}',
      bars.join(' |\n'),
    ].join('\n'),
  );
}

/** [key, start, end] of every sounding note. */
function timing(notes: readonly SoundingNote[]): number[][] {
  return notes.map(note => [note.key, note.start, note.end]);
}

/** Milliseconds that a number of ticks lasts at `bpm`. */
function ms(ticks: number, bpm: number): number {
  return (ticks / QUARTER) * (60_000 / bpm);
}

/** Notes of the first track's first staff, beat by beat, as the score shows them. */
function writtenNotes(score: alphaTab.model.Score): alphaTab.model.Note[] {
  const bars = score.tracks[0]?.staves[0]?.bars ?? [];
  return bars.flatMap(bar => bar.voices[0]?.beats.flatMap(beat => beat.notes) ?? []);
}

describe('PLAY-033 hammer-ons and pull-offs', () => {
  it('PLAY-033 sounds the hammered or pulled note without a full pick attack: one dynamic step softer', () => {
    const picked = soundingNotes(guitar(120, ':4 5.3 7.3 7.3 5.3').events);
    const legato = soundingNotes(guitar(120, ':4 5.3{h} 7.3 7.3{h} 5.3').events);
    expect(timing(legato)).toEqual(timing(picked));
    expect(picked.map(note => note.velocity)).toEqual([95, 95, 95, 95]);
    // C4 hammered to D4, D4 pulled off to C4: the targets are 16 velocity steps softer.
    expect(legato.map(note => note.velocity)).toEqual([95, 79, 95, 79]);
  });
});

describe('PLAY-034 harmonics', () => {
  it('PLAY-034 sounds natural, artificial, tapped and pinch harmonics at the pitch of the partial', () => {
    const played = guitar(
      120,
      ':4 12.3{nh} 7.3{nh} 5.3{nh} 4.3{nh}',
      ':4 19.3{nh} 24.3{nh} 7.6{nh} 5.3{ah 12}',
      ':4 5.3{th 12} 2.3{ph 7} r.2',
    );
    expect(soundingNotes(played.events).map(note => note.key)).toEqual([
      // Natural harmonics on the open G string (G3 = 55): octave, octave + fifth, two octaves,
      // two octaves + major third; the 19th and 24th fret repeat the 7th and 5th fret partials.
      55 + 12,
      55 + 19,
      55 + 24,
      55 + 28,
      55 + 19,
      55 + 24,
      // The 7th-fret harmonic of the low E string (E2 = 40).
      40 + 19,
      // Artificial and tapped harmonics 12 frets above the fretted C4: an octave up.
      60 + 12,
      60 + 12,
      // A pinch harmonic 7 frets above the fretted A3 (57): octave + fifth.
      57 + 19,
    ]);
  });
});

describe('PLAY-035 palm mute', () => {
  it('PLAY-035 cuts palm-muted notes to a short thump of about 80 ms at any tempo', () => {
    for (const tempo of [60, 120, 180]) {
      const notes = soundingNotes(guitar(tempo, ':4 3.6{pm} 3.6 3.6{pm} 3.6').events);
      expect(notes.map(note => note.key)).toEqual([43, 43, 43, 43]);
      const lengths = notes.map(note => ms(note.end - note.start, tempo));
      expect(lengths[0]).toBeCloseTo(83.3, 0);
      expect(lengths[2]).toBeCloseTo(83.3, 0);
      // Unmuted notes last their whole beat.
      expect(lengths[1]).toBeCloseTo(ms(QUARTER, tempo), 6);
      expect(lengths[3]).toBeCloseTo(ms(QUARTER, tempo), 6);
    }
  });
});

describe('PLAY-036 let ring', () => {
  it('PLAY-036 lets notes ring until the same string is played again or a rest comes', () => {
    const played = guitar(120, ':4 0.4{lr} 2.3{lr} 0.2{lr} 0.3{lr}', ':4 r 0.1 0.1 0.1');
    expect(timing(soundingNotes(played.events))).toEqual([
      // D3 rings through the bar up to the rest.
      [50, 0, BAR],
      // A3 on the G string stops when the G string is struck again.
      [57, QUARTER, 3 * QUARTER],
      [59, 2 * QUARTER, BAR],
      [55, 3 * QUARTER, BAR],
      // Without let ring, notes last their written value.
      [64, BAR + QUARTER, BAR + 2 * QUARTER],
      [64, BAR + 2 * QUARTER, BAR + 3 * QUARTER],
      [64, BAR + 3 * QUARTER, 2 * BAR],
    ]);
  });
});

describe('PLAY-037 dead notes', () => {
  it('PLAY-037 plays a dead note as a click of about 30 ms instead of a sustained pitch', () => {
    const notes = soundingNotes(guitar(120, ':4 x.6 3.4{x} 3.4 r').events);
    // A dead low E string, a dead F3 (fret 3, D string), then the same F3 played normally.
    expect(notes.map(note => note.key)).toEqual([40, 53, 53]);
    const lengths = notes.map(note => ms(note.end - note.start, 120));
    expect(lengths[0]).toBeLessThanOrEqual(32);
    expect(lengths[1]).toBeLessThanOrEqual(32);
    expect(lengths[2]).toBe(500);
  });
});

// Other note values: playback-realism.test.ts (PLAY-038, patch 0015).
describe('tremolo picking on quarter notes', () => {
  it('repeats a quarter note in eighths, sixteenths and thirty-seconds for one, two and three marks', () => {
    const notes = soundingNotes(guitar(120, ':4 3.3{tp 1} 3.3{tp 2} 3.3{tp 3} r').events);
    const onsets = (beat: number) => notesBetween(notes, beat * QUARTER, (beat + 1) * QUARTER);
    expect(timing(onsets(0))).toEqual([0, 1].map(i => [58, i * 480, (i + 1) * 480]));
    expect(timing(onsets(1))).toEqual(
      [0, 1, 2, 3].map(i => [58, QUARTER + i * 240, QUARTER + (i + 1) * 240]),
    );
    expect(timing(onsets(2))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map(i => [58, 2 * QUARTER + i * 120, 2 * QUARTER + (i + 1) * 120]),
    );
  });
});

describe('PLAY-039 trills', () => {
  it('PLAY-039 alternates the note with the trill fret at the chosen speed for the whole note', () => {
    const notes = soundingNotes(guitar(120, ':2 5.3{tr 7} 5.3{tr (7 32)}').events);
    // C4 (fret 5) trilled with D4 (fret 7): sixteenths, then thirty-seconds.
    const sixteenths = notesBetween(notes, 0, 2 * QUARTER);
    expect(timing(sixteenths)).toEqual(
      Array.from({ length: 8 }, (_, i) => [i % 2 === 0 ? 60 : 62, i * 240, (i + 1) * 240]),
    );
    const thirtySeconds = notesBetween(notes, 2 * QUARTER, BAR);
    expect(timing(thirtySeconds)).toEqual(
      Array.from({ length: 16 }, (_, i) => [
        i % 2 === 0 ? 60 : 62,
        2 * QUARTER + i * 120,
        2 * QUARTER + (i + 1) * 120,
      ]),
    );
  });
});

describe('PLAY-041 grace notes', () => {
  it('PLAY-041 plays a before-the-beat grace ahead of its note and an on-the-beat grace on it', () => {
    const notes = soundingNotes(guitar(120, ':4 0.3 3.3.16{gr} 5.3.4 3.3.16{gr ob} 5.3.4 0.3.4').events);
    expect(timing(notes)).toEqual([
      // The grace (A#3) takes a thirty-second from the previous note; C4 keeps its full beat.
      [55, 0, QUARTER - 120],
      [58, QUARTER - 120, QUARTER],
      [60, QUARTER, 2 * QUARTER],
      // On the beat: the grace starts with the beat and C4 is delayed by a thirty-second.
      [58, 2 * QUARTER, 2 * QUARTER + 120],
      [60, 2 * QUARTER + 120, 3 * QUARTER],
      [55, 3 * QUARTER, BAR],
    ]);
  });
});

describe('PLAY-042 staccato', () => {
  it('PLAY-042 halves the sounding length of staccato notes', () => {
    const notes = soundingNotes(guitar(120, ':4 3.3{st} 3.3 :2 3.3{st}').events);
    expect(timing(notes)).toEqual([
      [58, 0, QUARTER / 2],
      [58, QUARTER, 2 * QUARTER],
      [58, 2 * QUARTER, 3 * QUARTER],
    ]);
  });

  it('PLAY-042 sounds staccatissimo notes a quarter of their length (alphaTab patch 0026)', () => {
    const notes = soundingNotes(guitar(120, ':4 3.3{sti} 3.3{st} :2 3.3{sti}').events);
    expect(timing(notes)).toEqual([
      [58, 0, QUARTER / 4],
      [58, QUARTER, QUARTER + QUARTER / 2],
      [58, 2 * QUARTER, 2 * QUARTER + QUARTER / 2],
    ]);
  });
});

// Fade-outs and swells: playback-realism.test.ts (PLAY-043, patch 0015).
describe('fade in', () => {
  it('raises the channel volume from silence to the track volume over the note, then leaves it there', () => {
    const played = guitar(120, '(0.1 2.2 2.3).2{f} (0.1 2.2 2.3).2', '(0.1 2.2 2.3).1');
    const volume = controllerValues(played.events, 0, alphaTab.midi.ControllerType.VolumeCoarse);
    const fade = volume.filter(change => change.tick < 2 * QUARTER);
    // Track volume 15 is controller value 120.
    expect(fade[0]).toEqual({ tick: 0, value: 120 });
    expect(fade[1]).toEqual({ tick: 0, value: 0 });
    expect(fade.at(-1)?.value).toBe(120);
    expect(fade.every((change, index) => index < 2 || change.value >= (fade[index - 1]?.value ?? 0))).toBe(
      true,
    );
    expect(volume.filter(change => change.tick >= 2 * QUARTER)).toEqual([]);
  });
});

describe('PLAY-079 accents', () => {
  it('PLAY-079 plays accented notes one dynamic step louder and heavy accents two', () => {
    const notes = soundingNotes(guitar(120, ':4 3.3{dy mf} 3.3{ac} 3.3{hac} 3.3{ten}').events);
    // mf = 79; tenuto is a length mark and leaves the velocity alone.
    expect(notes.map(note => note.velocity)).toEqual([79, 95, 111, 79]);
  });
});

describe('PLAY-080 ghost notes', () => {
  it('PLAY-080 plays ghost notes one dynamic step softer', () => {
    const notes = soundingNotes(guitar(120, ':4 3.3{dy mf} 3.3{g} 3.3 3.3{g}').events);
    expect(notes.map(note => note.velocity)).toEqual([79, 63, 79, 63]);
  });
});

describe('PLAY-089 ottava', () => {
  it('PLAY-089 sounds notes under 8va, 15ma, 8vb and 15mb lines one or two octaves from where they are written', () => {
    const played = piano(':4 C5{ot 8va} C5{ot 15ma} C3{ot 8vb} C3{ot 15mb}');
    // The score draws them at C4, C3, C4 and C5 under their lines.
    expect(writtenNotes(played.score).map(note => note.displayValue)).toEqual([60, 48, 60, 72]);
    expect(soundingNotes(played.events).map(note => note.key)).toEqual([60 + 12, 48 + 24, 60 - 12, 72 - 24]);
  });

  it('PLAY-089 sounds notes on an octave clef an octave from where they are written', () => {
    const played = piano('\\clef G2 \\ottava 8vb :4 C3 E3 G3 C4', '\\clef F4 \\ottava 8va :4 C4 E4 G4 C5');
    // Treble 8vb draws C3 as C4; bass 8va draws C4 as C3.
    expect(writtenNotes(played.score).map(note => note.displayValue)).toEqual([
      60, 64, 67, 72, 48, 52, 55, 60,
    ]);
    expect(soundingNotes(played.events).map(note => note.key)).toEqual([48, 52, 55, 60, 60, 64, 67, 72]);
  });
});

describe('PLAY-090 simile marks', () => {
  it('PLAY-090 plays the bar before a one-bar repeat sign and the two bars before a two-bar sign', () => {
    const played = piano(
      ':4 C4 D4 E4 F4',
      '\\simile simple',
      ':4 G4 A4 B4 C5',
      ':4 D5 E5 F5 G5',
      '\\simile firstOfDouble',
      '\\simile secondOfDouble',
    );
    const notes = soundingNotes(played.events);
    const keysOfBar = (bar: number) => notesBetween(notes, bar * BAR, (bar + 1) * BAR).map(note => note.key);
    expect([0, 1, 2, 3, 4, 5].map(keysOfBar)).toEqual([
      [60, 62, 64, 65],
      [60, 62, 64, 65],
      [67, 69, 71, 72],
      [74, 76, 77, 79],
      [67, 69, 71, 72],
      [74, 76, 77, 79],
    ]);
  });

  it('PLAY-090 plays the simile bars of a Guitar Pro 7 file, through its repeats', () => {
    const played = playFixture('alphatab/guitarpro7/simile-mark.gp');
    const notes = soundingNotes(played.events);
    const written = (bar: number) =>
      played.score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats.flatMap(beat =>
        beat.notes.map(n => n.realValue),
      );
    // The bar whose notes each simile bar plays: bars 1, 7 and 11 repeat one bar; bars 4–5, 8–9
    // and 15–16 repeat the two bars before them (bar 9 repeats bar 7, itself a repeat of bar 6).
    const source = new Map([
      [1, 0],
      [4, 2],
      [5, 3],
      [7, 6],
      [8, 6],
      [9, 6],
      [11, 10],
      [15, 13],
      [16, 14],
    ]);
    expect(barOrder(played)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 12, 13, 14, 15, 16, 17, 18, 15, 16, 17, 18,
    ]);
    for (const bar of playedBars(played.playback.timeline)) {
      const sounding = notesBetween(notes, bar.start, bar.end).map(note => note.key);
      expect(sounding.length).toBeGreaterThan(0);
      expect(sounding).toEqual(written(source.get(bar.masterBar) ?? bar.masterBar));
    }
  });
});
