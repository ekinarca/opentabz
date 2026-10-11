/**
 * Proof that techniques needing a sound of their own get a channel of their own (OpenTabz patch
 * 0017, FEATURE_MATRIX PLAY-040, PLAY-095, PLAY-098): slapped and popped bass notes play the
 * slap bass sounds, a golpe knocks on a drum channel, and two strings bent from the same pitch
 * bend independently. Each extra channel is reported with its track, so the mixer covers it.
 */
import * as alphaTab from '@coderline/alphatab';
import { TIMELINE_EXTRA_CHANNEL_STRIDE } from '../src/shared/playback.ts';
import { describe, expect, it } from 'vitest';
import { between, frequencyOf, power, renderAudio, rms } from './playback-audio.ts';
import {
  bendAt,
  controllerValues,
  noteBendCurve,
  playTex,
  QUARTER,
  soundingNotes,
  type Played,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;

function track(instrument: string, tuning: string, ...bars: string[]): Played {
  return playTex(
    [
      '\\title "Channels"',
      '\\tempo 60',
      `\\track "Part" {instrument ${instrument}}`,
      '\\staff {tabs}',
      `\\tuning (${tuning})`,
      bars.join(' |\n'),
    ].join('\n'),
  );
}

/** Program changes per channel, in order. */
function programs(played: Played): Map<number, number[]> {
  const result = new Map<number, number[]>();
  for (const event of played.events) {
    if (event instanceof alphaTab.midi.ProgramChangeEvent) {
      result.set(event.channel, [...(result.get(event.channel) ?? []), event.program]);
    }
  }
  return result;
}

/** [track, channel, kind] of every extra channel. */
function extraChannels(played: Played): number[][] {
  const values = played.playback.timeline.extraChannels;
  const rows: number[][] = [];
  for (let index = 0; index < values.length; index += TIMELINE_EXTRA_CHANNEL_STRIDE) {
    rows.push([values[index] ?? -1, values[index + 1] ?? -1, values[index + 2] ?? -1]);
  }
  return rows;
}

describe('PLAY-040 slap and pop', () => {
  it('PLAY-040 plays slapped and popped bass notes with the slap bass sounds', () => {
    const played = track('electricBassFinger', 'G2 D2 A1 E1', ':4 3.4{s} 3.4 5.2{p} 3.4');
    const notes = soundingNotes(played.events);
    const [slap, plain, pop] = [notes[0], notes[1], notes[2]];
    expect(plain?.channel).toBe(0);
    expect(slap?.channel).not.toBe(0);
    expect(pop?.channel).not.toBe(0);
    expect(pop?.channel).not.toBe(slap?.channel);
    const changes = programs(played);
    // Slap Bass 1 and Slap Bass 2 in General MIDI; the track keeps Fingered Bass.
    expect(changes.get(slap?.channel ?? -1)).toEqual([36]);
    expect(changes.get(pop?.channel ?? -1)).toEqual([37]);
    expect(changes.get(0)).toEqual([33]);
    expect(extraChannels(played)).toEqual(
      expect.arrayContaining([
        [0, slap?.channel ?? -1, 0],
        [0, pop?.channel ?? -1, 0],
      ]),
    );
  });

  it('PLAY-040 sounds slaps and pops on other instruments two dynamic steps harder', () => {
    const notes = soundingNotes(
      track('acousticGuitarSteel', 'E4 B3 G3 D3 A2 E2', ':4 3.3{dy mf} 3.3{s} 3.3{p} 3.3').events,
    );
    expect(notes.map(note => note.velocity)).toEqual([79, 111, 111, 79]);
    expect(notes.every(note => note.channel === 0)).toBe(true);
  });
});

describe('PLAY-095 golpe', () => {
  it('PLAY-095 knocks on a drum channel: thumb and finger', () => {
    const played = track('acousticGuitarNylon', 'E4 B3 G3 D3 A2 E2', ':4 r{glpt} r{glpf} 0.1 r');
    const notes = soundingNotes(played.events);
    const knocks = notes.filter(note => note.channel !== 0);
    expect(knocks.map(note => [note.key, note.start])).toEqual([
      [77, 0],
      [37, QUARTER],
    ]);
    const drums = knocks[0]?.channel ?? -1;
    // Bank 127 makes the channel a drum kit (patch 0007).
    expect(controllerValues(played.events, drums, alphaTab.midi.ControllerType.BankSelectCoarse)).toEqual([
      { tick: 0, value: 127 },
    ]);
    expect(extraChannels(played)).toEqual([[0, drums, 1]]);
    // And they are heard (the kit pans its wood blocks right; the app centres the channel).
    const audio = renderAudio(played);
    const level = (from: number, to: number) =>
      Math.hypot(rms(between(audio.left, from, to)), rms(between(audio.right, from, to)));
    expect(level(0, 0.3)).toBeGreaterThan(0.01);
    expect(level(1, 1.3)).toBeGreaterThan(0.01);
  });
});

describe('PLAY-098 simultaneous bends', () => {
  // E4 on the B string bent a whole tone, the open E4 string bent a semitone: one pitch, two curves.
  const unison = '(5.2{be (bend 0 0 20 0 40 4)} 0.1{be (bend 0 0 20 0 40 2)}).1';

  it('PLAY-098 bends two strings that start on the same pitch on channels of their own', () => {
    const played = track('distortionGuitar', 'E4 B3 G3 D3 A2 E2', unison, 'r.1');
    const notes = soundingNotes(played.events);
    expect(notes.map(note => note.key)).toEqual([64, 64]);
    const [first, second] = [notes[0]?.channel ?? -1, notes[1]?.channel ?? -1];
    expect(first).not.toBe(second);
    const bends = [
      bendAt(noteBendCurve(played.events, first, 64), BAR),
      bendAt(noteBendCurve(played.events, second, 64), BAR),
    ];
    expect(bends.sort()).toEqual([1, 2]);
    expect(extraChannels(played)).toEqual([[0, Math.max(first, second), 0]]);
  });

  it('PLAY-098 the synthesizer sounds both bent pitches', () => {
    const audio = renderAudio(track('distortionGuitar', 'E4 B3 G3 D3 A2 E2', unison, 'r.1'));
    // At 60 BPM the bends reach their targets 2.4 s into the bar: F4 and F♯4 sound, E4 no longer.
    const late = between(audio.left, 3, 3.8);
    const f = power(late, frequencyOf(65));
    const fSharp = power(late, frequencyOf(66));
    const e = power(late, frequencyOf(64));
    expect(f).toBeGreaterThan(e * 4);
    expect(fSharp).toBeGreaterThan(e * 4);
  });
});
