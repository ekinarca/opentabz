import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { collectTrackDrums } from '../src/playback/track-drums.ts';
import { GM_PERCUSSION_HIGH, GM_PERCUSSION_LOW } from '../src/shared/drums.ts';
import { TRACK_BEAT_STRIDE, TRACK_NOTE_STRIDE } from '../src/shared/notes.ts';
import { readFixture } from './helpers.ts';

describe('track drums for the drum view (VIEW-006, VIEW-020)', () => {
  const shuffle = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex').score;

  it('lists every sound the kit can make, in MIDI order, named as Guitar Pro names them', () => {
    const { sounds } = collectTrackDrums(shuffle, 3);
    expect(sounds.length).toBeGreaterThan(90);
    expect(sounds.map(sound => sound.midi)).toEqual(
      [...sounds.map(sound => sound.midi)].sort((a, b) => a - b),
    );
    expect(sounds).toContainEqual({
      key: 'Snare.38',
      name: 'Snare (hit)',
      piece: 'Snare',
      midi: 38,
      staffLine: 3,
    });
    expect(sounds).toContainEqual(
      expect.objectContaining({ name: 'Hi-Hat (open)', piece: 'Hi-Hat', midi: 46 }),
    );
    // Guitar Pro's names, not alphaTab's alternatives (some misspelt).
    const names = sounds.map(sound => sound.name);
    expect(names).toContain('Bell Tree (return)');
    expect(names).toContain('Triangle (mute)');
    expect(names).toContain('Bongo Low (hit)');
    expect(names).not.toContain('Bell Tee (return)');
    expect(names).not.toContain('Hand (hit)');
    // General MIDI's keys, and a few beyond them.
    const gm = sounds.filter(sound => sound.midi >= GM_PERCUSSION_LOW && sound.midi <= GM_PERCUSSION_HIGH);
    expect(gm.length).toBeGreaterThan(80);
    expect(sounds.length - gm.length).toBeGreaterThan(0);
  });

  it('names the sound of every note: the first beat is a kick and a closed hi-hat', () => {
    const { sounds, notes } = collectTrackDrums(shuffle, 3);
    const first = notes.beats[1] ?? 0;
    const count = notes.beats[2] ?? 0;
    const names = Array.from(
      { length: count },
      (_, at) => sounds[notes.notes[(first + at) * TRACK_NOTE_STRIDE + 2] ?? -1]?.name,
    );
    expect(names.sort()).toEqual(['Hi-Hat (closed)', 'Kick (hit)']);
    expect(notes.beats.length / TRACK_BEAT_STRIDE).toBeGreaterThan(90);
    expect(collectTrackDrums(shuffle, 0).sounds).toEqual([]);
  });

  it('gives each note the articulation alphaTab plays, in a Guitar Pro 5 kit of every piece', () => {
    const score = openScore(
      readFixture('alphatab/guitarpro5/percussion-all.gp5'),
      'percussion-all.gp5',
    ).score;
    const trackIndex = score.tracks.findIndex(track => track.isPercussion);
    const { sounds, notes } = collectTrackDrums(score, trackIndex);
    const played = score.tracks[trackIndex]?.staves[0]?.bars.flatMap(bar =>
      bar.voices.flatMap(voice => voice.beats.flatMap(beat => beat.notes)),
    );
    expect(played?.length).toBe(notes.notes.length / TRACK_NOTE_STRIDE);
    played?.forEach((note, index) => {
      const sound = sounds[notes.notes[index * TRACK_NOTE_STRIDE + 2] ?? -1];
      expect(sound?.key).toBe(alphaTab.model.PercussionMapper.getArticulation(note)?.uniqueId);
    });
    expect(
      new Set(played?.map(note => alphaTab.model.PercussionMapper.getArticulation(note)?.uniqueId)).size,
    ).toBeGreaterThan(40);
  });
});
