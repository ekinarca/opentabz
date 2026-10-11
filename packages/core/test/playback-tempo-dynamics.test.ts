/**
 * Proof of the tempo map, decimal and very slow tempos, dynamics and volume / pan automation in
 * playback (FEATURE_MATRIX PLAY-023, PLAY-099, PLAY-024, PLAY-025), down to the rendered audio.
 * Not covered because alphaTab 1.8.4 does not play them: fermatas (PLAY-081) and hairpins (PLAY-082).
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { between, centsFrom, fundamental, renderAudio, rms } from './playback-audio.ts';
import {
  controllerValues,
  playFixture,
  playTex,
  QUARTER,
  soundingNotes,
  tempoChanges,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;
const { PanCoarse, VolumeCoarse } = alphaTab.midi.ControllerType;

/** Milliseconds that `beats` quarter notes last at `bpm`. */
function ms(beats: number, bpm: number): number {
  return (beats * 60_000) / bpm;
}

// Ramps (Guitar Pro's linear tempo automations, which alphaTex cannot write) are proved in
// playback-realism.test.ts (PLAY-023, patch 0015).
describe('tempo map', () => {
  it('changes tempo at bar starts, at positions inside a bar and on beats', () => {
    const played = playTex(
      [
        '\\title "Tempo Map"',
        '\\tempo 120',
        '\\track "Violin" {instrument violin}',
        '\\staff {score}',
        ':4 G3 A3 B3 C4 |',
        '\\tempo 80 :4 D4 E4 F4{tempo 60} G4 |',
        '\\tempo (100 "" 0.75) :4 A4 G4 F4 E4 |',
        'D4.1',
      ].join('\n'),
    );
    expect(tempoChanges(played.events)).toEqual([
      { tick: 0, bpm: 120 },
      { tick: BAR, bpm: 80 },
      { tick: BAR + 2 * QUARTER, bpm: 60 },
      { tick: 2 * BAR + 3 * QUARTER, bpm: 100 },
    ]);
    // The synthesizer's clock follows the map: 4 beats at 120, 2 at 80, 5 at 60, 5 at 100.
    const audio = renderAudio(played);
    expect(audio.endTime).toBeCloseTo(ms(4, 120) + ms(2, 80) + ms(5, 60) + ms(5, 100), 6);
  });

  it('places the tempo changes of a Guitar Pro 8 file exactly', () => {
    const played = playFixture('alphatab/guitarpro8/beat-tempo-change.gp');
    // Bar 1: 120, then 60 halfway; bar 2: 100, 120 at 63.75 %; bars 3–4: 121 / 120 / 121.
    expect(tempoChanges(played.events)).toEqual([
      { tick: 0, bpm: 120 },
      { tick: 1920, bpm: 60 },
      { tick: 3840, bpm: 100 },
      { tick: 6288, bpm: 120 },
      { tick: 7680, bpm: 121 },
      { tick: 9120, bpm: 120 },
      { tick: 11520, bpm: 121 },
      { tick: 12960, bpm: 120 },
      { tick: 15120, bpm: 121 },
    ]);
  });
});

describe('PLAY-099 decimal and very slow tempos', () => {
  it('PLAY-099 keeps decimal tempos and tempos below 30 BPM exact, in the MIDI and in the audio', () => {
    const played = playTex(
      [
        '\\title "Slow Down"',
        '\\tempo 112.5',
        '\\track "Violin" {instrument violin}',
        '\\staff {score}',
        ':4 G3 A3 B3 C4 |',
        ':4 D4 E4{tempo (20.5)} F4 G4',
      ].join('\n'),
    );
    expect(tempoChanges(played.events)).toEqual([
      { tick: 0, bpm: 112.5 },
      { tick: BAR + QUARTER, bpm: 20.5 },
    ]);
    const audio = renderAudio(played);
    expect(audio.endTime).toBeCloseTo(ms(5, 112.5) + ms(3, 20.5), 6);
    // At 20.5 BPM a quarter lasts 2.93 s: E4 sounds right up to the moment F4 is due, G4 after that.
    const fStarts = (ms(5, 112.5) + ms(1, 20.5)) / 1000;
    const pitchAt = (from: number, to: number) => fundamental(between(audio.left, from, to));
    expect(Math.abs(centsFrom(pitchAt(fStarts - 0.4, fStarts - 0.1), 64))).toBeLessThan(20);
    expect(Math.abs(centsFrom(pitchAt(fStarts + 0.1, fStarts + 0.4), 65))).toBeLessThan(20);
    expect(Math.abs(centsFrom(pitchAt(fStarts + 3.2, fStarts + 4.2), 67))).toBeLessThan(20);
  });
});

describe('PLAY-024 dynamics', () => {
  it('PLAY-024 maps ppp…fff to rising velocities and the synthesizer plays them louder', () => {
    const played = playTex(
      [
        '\\title "Dynamics"',
        '\\tempo 60',
        '\\track "Violin" {instrument violin}',
        '\\staff {score}',
        ':4 D4{dy ppp} D4{dy pp} D4{dy p} D4{dy mp} |',
        ':4 D4{dy mf} D4{dy f} D4{dy ff} D4{dy fff}',
      ].join('\n'),
    );
    const velocities = soundingNotes(played.events).map(note => note.velocity);
    expect(velocities).toEqual([15, 31, 47, 63, 79, 95, 111, 127]);
    const audio = renderAudio(played);
    const levels = velocities.map((_, beat) => rms(between(audio.left, beat + 0.2, beat + 0.8)));
    for (let beat = 1; beat < levels.length; beat++) {
      expect(levels[beat] ?? 0).toBeGreaterThan((levels[beat - 1] ?? 0) * 1.1);
    }
  });

  it('PLAY-024 keeps a dynamic for the following notes of the staff, starting from forte', () => {
    const played = playTex(
      [
        '\\title "Dynamics"',
        '\\track "Violin" {instrument violin}',
        '\\staff {score}',
        ':4 D4 D4 D4{dy pp} D4 | :4 D4 D4{dy ff} D4 D4',
      ].join('\n'),
    );
    expect(soundingNotes(played.events).map(note => note.velocity)).toEqual([
      95, 95, 31, 31, 31, 111, 111, 111,
    ]);
  });
});

describe('PLAY-025 volume and pan automation', () => {
  it('PLAY-025 sends the track mix and every volume and pan change, and the audio follows', () => {
    const played = playTex(
      [
        '\\title "Mixer Moves"',
        '\\tempo 60',
        '\\track "Violin" {instrument violin volume 12 balance 4}',
        '\\staff {score}',
        ':4 D4 D4{balance 0} D4{balance 16} D4{balance 8} |',
        ':4 D4{volume 8} D4{volume 16} D4{volume 4} D4{volume 15}',
      ].join('\n'),
    );
    // Both channels of the track (plain notes and bent notes) get every change.
    for (const channel of [0, 1]) {
      expect(controllerValues(played.events, channel, PanCoarse)).toEqual([
        { tick: 0, value: 32 },
        { tick: QUARTER, value: 0 },
        { tick: 2 * QUARTER, value: 127 },
        { tick: 3 * QUARTER, value: 64 },
      ]);
      expect(controllerValues(played.events, channel, VolumeCoarse)).toEqual([
        { tick: 0, value: 96 },
        { tick: BAR, value: 64 },
        { tick: BAR + QUARTER, value: 127 },
        { tick: BAR + 2 * QUARTER, value: 32 },
        { tick: BAR + 3 * QUARTER, value: 120 },
      ]);
    }
    const { left, right } = renderAudio(played);
    const level = (samples: Float32Array, beat: number) => rms(between(samples, beat + 0.2, beat + 0.8));
    // Hard left, then hard right, then centre.
    expect(level(right, 1)).toBeLessThan(level(left, 1) / 100);
    expect(level(left, 2)).toBeLessThan(level(right, 2) / 5);
    expect(Math.abs(level(left, 3) / level(right, 3) - 1)).toBeLessThan(0.05);
    // Volume 8 is much quieter than 15, 16 louder, 4 quieter still.
    expect(level(left, 4)).toBeLessThan(level(left, 7) / 3);
    expect(level(left, 5)).toBeGreaterThan(level(left, 7));
    expect(level(left, 6)).toBeLessThan(level(left, 4) / 3);
  });
});
