/**
 * Proof that the playback techniques alphaTab 1.8.4 got wrong now play as written (OpenTabz patch
 * 0015, FEATURE_MATRIX PLAY-023, PLAY-038, PLAY-043, PLAY-081, PLAY-082, PLAY-093, PLAY-094,
 * PLAY-096): in the generated MIDI and, where the synthesizer is involved, in the audio.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { generatePlayback } from '../src/playback/generate.ts';
import { between, renderAudio, rms } from './playback-audio.ts';
import {
  controllerValues,
  notesBetween,
  playTex,
  QUARTER,
  soundingNotes,
  tempoChanges,
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

function instrument(name: string, tempo: number, key: string, ...bars: string[]): Played {
  return playTex(
    [
      '\\title "Notation"',
      `\\tempo ${tempo}`,
      `\\track "Part" {instrument ${name}}`,
      '\\staff {score}',
      `\\ks ${key}`,
      bars.join(' |\n'),
    ].join('\n'),
  );
}

/** Opens alphaTex, lets the test change the score, then generates its playback. */
function playChanged(tex: string, change: (score: alphaTab.model.Score) => void): Played {
  const { score } = openScore(new TextEncoder().encode(tex), 'changed.atex');
  change(score);
  const playback = generatePlayback(score, 'changed');
  const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(playback.midi);
  return { score, playback, midi, events: midi.tracks.flatMap(track => track.events) };
}

function timing(notes: readonly SoundingNote[]): number[][] {
  return notes.map(note => [note.key, note.start, note.end]);
}

describe('PLAY-038 tremolo picking', () => {
  it('PLAY-038 picks in eighths, sixteenths or thirty-seconds whatever the note value', () => {
    const notes = soundingNotes(
      guitar(120, ':2 3.3{tp 1} 3.3{tp 2}', ':1 3.3{tp 3}', ':8 3.3{tp 1} r :4 r :2 r').events,
    );
    // A half note in eighths: four notes. A half note in sixteenths: eight.
    expect(timing(notesBetween(notes, 0, 2 * QUARTER))).toEqual(
      [0, 1, 2, 3].map(i => [58, i * 480, (i + 1) * 480]),
    );
    expect(timing(notesBetween(notes, 2 * QUARTER, BAR))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map(i => [58, 2 * QUARTER + i * 240, 2 * QUARTER + (i + 1) * 240]),
    );
    // A whole note in thirty-seconds: thirty-two.
    expect(notesBetween(notes, BAR, 2 * BAR)).toHaveLength(32);
    expect(notesBetween(notes, BAR, 2 * BAR).every(note => note.end - note.start === 120)).toBe(true);
    // An eighth note with an eighth-note tremolo is picked once.
    expect(timing(notesBetween(notes, 2 * BAR, 3 * BAR))).toEqual([[58, 2 * BAR, 2 * BAR + 480]]);
  });
});

describe('PLAY-043 fades and swells', () => {
  it('PLAY-043 fades out and swells within the note, and the next note plays at the track volume', () => {
    const played = guitar(120, '(0.1 2.2 2.3).2{fo} (0.1 2.2 2.3).2', '(0.1 2.2 2.3).2{vs} (0.1 2.2 2.3).2');
    const volume = controllerValues(played.events, 0, alphaTab.midi.ControllerType.VolumeCoarse);
    const fadeOut = volume.filter(change => change.tick < 2 * QUARTER);
    expect(fadeOut[0]?.value).toBe(120);
    expect(fadeOut.at(-1)?.value).toBe(0);
    // Track volume 15 is controller value 120: back for the next note, on both channels.
    expect(volume.filter(change => change.tick === 2 * QUARTER).map(change => change.value)).toContain(120);
    const secondary = controllerValues(played.events, 1, alphaTab.midi.ControllerType.VolumeCoarse);
    expect(secondary.filter(change => change.tick === 2 * QUARTER).map(change => change.value)).toContain(
      120,
    );

    const swell = volume.filter(change => change.tick >= BAR && change.tick < BAR + 2 * QUARTER);
    const peak = Math.max(...swell.map(change => change.value));
    expect(swell[0]?.value).toBe(0);
    expect(peak).toBe(120);
    expect(swell.at(-1)?.value).toBe(0);
    expect(volume.filter(change => change.tick === BAR + 2 * QUARTER).map(change => change.value)).toContain(
      120,
    );

    // And it is heard: the chord after the fade-out is as loud as a chord after none.
    const audio = renderAudio(played);
    const after = rms(between(audio.left, 1.1, 1.8));
    const swellAfter = rms(between(audio.left, 3.1, 3.8));
    const reference = renderAudio(guitar(120, '(0.1 2.2 2.3).2 (0.1 2.2 2.3).2'));
    const plain = rms(between(reference.left, 1.1, 1.8));
    expect(after).toBeGreaterThan(plain * 0.8);
    expect(swellAfter).toBeGreaterThan(plain * 0.8);
  });
});

describe('PLAY-093 mordents and turns', () => {
  it('PLAY-093 takes the neighbouring notes from the key', () => {
    const keys = (played: Played) => soundingNotes(played.events).map(note => note.key);
    // Upper mordent on E4: F4 in C major, F♯4 in D major.
    expect(keys(instrument('flute', 60, 'C', ':4 E4{umordent} r r r')).slice(0, 2)).toEqual([64, 65]);
    expect(keys(instrument('flute', 60, 'D', ':4 E4{umordent} r r r')).slice(0, 2)).toEqual([64, 66]);
    // Lower mordent on E4: D4 in C major, D♯4 in E major.
    expect(keys(instrument('flute', 60, 'C', ':4 E4{lmordent} r r r')).slice(0, 2)).toEqual([64, 62]);
    expect(keys(instrument('flute', 60, 'E', ':4 E4{lmordent} r r r')).slice(0, 2)).toEqual([64, 63]);
    // A turn on A4 in F major: B♭4 above, G4 below.
    expect(keys(instrument('flute', 60, 'F', ':4 A4{turn} r r r')).slice(0, 3)).toEqual([70, 69, 67]);
    // An inverted turn on F♯4 in G major: E4 below, G4 above.
    expect(keys(instrument('flute', 60, 'G', ':4 F#4{iturn} r r r')).slice(0, 3)).toEqual([64, 66, 67]);
  });

  it('PLAY-093 follows the key of transposing guitar parts too', () => {
    // Guitar notation is written an octave up: the key is still A major.
    const played = playTex(
      [
        '\\title "Guitar"',
        '\\track "Guitar" {instrument acousticGuitarSteel}',
        '\\staff {score tabs}',
        '\\tuning (E4 B3 G3 D3 A2 E2)',
        '\\ks A',
        ':4 2.3{umordent} r r r',
      ].join('\n'),
    );
    // A3 (fret 2 of the G string): the next note up in A major is B3.
    expect(
      soundingNotes(played.events)
        .map(note => note.key)
        .slice(0, 2),
    ).toEqual([57, 59]);
  });
});

describe('PLAY-094 tapping', () => {
  it('PLAY-094 sounds tapped notes of either hand without a pick attack: one dynamic step softer', () => {
    const notes = soundingNotes(guitar(120, ':4 5.3 12.3{tt} 5.3 7.3{lht}').events);
    expect(notes.map(note => note.velocity)).toEqual([95, 79, 95, 79]);
  });
});

describe('PLAY-082 hairpins', () => {
  it('PLAY-082 ramps the velocity across a crescendo to the next dynamic', () => {
    const played = instrument('violin', 120, 'C', ':4 D4{dy p} D4{cre} D4{cre} D4{dy f}');
    expect(soundingNotes(played.events).map(note => note.velocity)).toEqual([47, 47, 71, 95]);
  });

  it('PLAY-082 ramps a diminuendo down, and one step when no dynamic follows', () => {
    const down = instrument('violin', 120, 'C', ':4 D4{dy ff} D4{dec} D4{dec} D4{dy p}');
    expect(soundingNotes(down.events).map(note => note.velocity)).toEqual([111, 111, 79, 47]);
    const open = instrument('violin', 120, 'C', ':4 D4{dy mf} D4{cre} D4{cre} D4{cre} | :4 D4 r r r');
    const velocities = soundingNotes(open.events).map(note => note.velocity);
    // From mf towards f: rising inside the hairpin, then the written dynamic again.
    expect(velocities.slice(1, 4)).toEqual([79, 84, 90]);
    expect(velocities[4]).toBe(79);
  });
});

describe('PLAY-081 fermatas', () => {
  it('PLAY-081 holds a beat under a fermata: half as long again, twice or three times', () => {
    const played = guitar(
      120,
      ':4 3.3 3.3{fermata short} 3.3 3.3{fermata medium}',
      ':4 3.3{fermata long} 3.3 3.3 3.3',
    );
    expect(tempoChanges(played.events)).toEqual([
      { tick: 0, bpm: 120 },
      { tick: QUARTER, bpm: 80 },
      { tick: 2 * QUARTER, bpm: 120 },
      { tick: 3 * QUARTER, bpm: 60 },
      { tick: BAR, bpm: 120 },
      { tick: BAR, bpm: 40 },
      { tick: BAR + QUARTER, bpm: 120 },
    ]);
    // Eight beats of 500 ms, plus 250, 500 and 1000 ms held.
    expect(renderAudio(played).endTime).toBeCloseTo(4000 + 250 + 500 + 1000, -1);
  });

  it('PLAY-081 holds every track once, and for the length a file asks', () => {
    const played = playTex(
      [
        '\\title "Two"',
        '\\tempo 100',
        '\\track "A" \\staff {score} :4 C4 D4{fermata medium 0.5} E4 F4',
        '\\track "B" \\staff {score} :4 C3 D3{fermata medium 0.5} E3 F3',
      ].join('\n'),
    );
    expect(tempoChanges(played.events)).toEqual([
      { tick: 0, bpm: 100 },
      { tick: QUARTER, bpm: 100 / 1.5 },
      { tick: 2 * QUARTER, bpm: 100 },
    ]);
  });
});

describe('PLAY-023 tempo ramps', () => {
  it('PLAY-023 changes the tempo gradually after a linear tempo automation', () => {
    const tex = [
      '\\title "Ramp"',
      '\\tempo 120',
      '\\track "Piano" {instrument acousticGrandPiano}',
      '\\staff {score}',
      ':1 C4 | \\tempo 120 :1 C4 | :1 C4 | \\tempo 60 :1 C4 | :1 C4',
    ].join('\n');
    const played = playChanged(tex, score => {
      const ramp = score.masterBars[1]?.tempoAutomations[0];
      if (ramp === undefined) throw new Error('No tempo automation in bar 2.');
      ramp.isLinear = true;
    });
    const changes = tempoChanges(played.events);
    const ramp = changes.filter(change => change.tick >= BAR && change.tick < 3 * BAR);
    expect(ramp[0]).toEqual({ tick: BAR, bpm: 120 });
    // Halfway through the ramp, halfway between the tempos; slowing down all along.
    expect(ramp.find(change => change.tick === 2 * BAR)?.bpm).toBeCloseTo(90, 5);
    for (let index = 1; index < ramp.length; index++) {
      expect(ramp[index]?.bpm ?? 0).toBeLessThan(ramp[index - 1]?.bpm ?? 0);
    }
    expect(ramp.length).toBeGreaterThanOrEqual(16);
    expect(changes.filter(change => change.tick >= 3 * BAR)).toEqual([{ tick: 3 * BAR, bpm: 60 }]);
    // Without the ramp the second and third bars play at 120; with it they take longer.
    const steady = renderAudio(playChanged(tex, () => undefined)).endTime;
    expect(renderAudio(played).endTime).toBeGreaterThan(steady + 1000);
  });
});

describe('PLAY-096 sustain pedal', () => {
  const piano = (pedal: boolean) =>
    playTex(
      [
        '\\title "Pedal"',
        '\\tempo 120',
        '\\track "Piano" {instrument acousticGrandPiano}',
        '\\staff {score}',
        `:8 C4${pedal ? '{spd}' : ''} r :4 r :2 r${pedal ? '{spu}' : ''} | :1 r`,
      ].join('\n'),
    );

  it('PLAY-096 sends the pedal down and up where they are written', () => {
    const played = piano(true);
    expect(controllerValues(played.events, 0, alphaTab.midi.ControllerType.HoldPedal)).toEqual([
      { tick: 0, value: 127 },
      { tick: 2 * QUARTER, value: 0 },
    ]);
  });

  it('PLAY-096 keeps notes sounding after their end while the pedal is down', () => {
    const held = renderAudio(piano(true));
    const dry = renderAudio(piano(false));
    // The eighth note ends at 0.25 s; the pedal comes up at 1 s.
    const heldLevel = rms(between(held.left, 0.5, 0.95));
    const dryLevel = rms(between(dry.left, 0.5, 0.95));
    expect(heldLevel).toBeGreaterThan(dryLevel * 4);
    expect(rms(between(held.left, 1.6, 2))).toBeLessThan(heldLevel / 4);
  });
});
