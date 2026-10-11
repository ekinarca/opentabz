import { describe, expect, it } from 'vitest';
import {
  effectiveVolume,
  FOCUS_DUCK,
  fingerprint,
  MAX_REMEMBERED_SONGS,
  parseMemory,
  remember,
  ringingTracks,
  type RememberedMix,
  type TrackMix,
} from './mixer-memory.ts';

const TRACK: TrackMix = {
  mute: false,
  solo: true,
  volume: 0.5,
  pan: -0.25,
  program: 30,
  transpose: 2,
  detune: -10,
  letRing: true,
  brush: false,
  palmMute: 0.8,
  accent: true,
};
const HASH = 'a'.repeat(64);

describe('mixer memory', () => {
  it('reads back what it keeps, clamping out-of-range values', () => {
    const raw = JSON.stringify({
      [HASH]: {
        tracks: [TRACK, { ...TRACK, volume: 4, pan: -3, program: 300, transpose: 40, detune: 99 }],
        focus: 1,
      },
    });
    const memory = parseMemory(raw);
    expect(memory.get(HASH)).toEqual({
      tracks: [TRACK, { ...TRACK, volume: 1, pan: -1, program: 127, transpose: 12, detune: 50 }],
      focus: 1,
    });
  });

  it('plays songs remembered before playing styles existed as written', () => {
    const { letRing: _letRing, brush: _brush, palmMute: _palmMute, accent: _accent, ...older } = TRACK;
    const memory = parseMemory(
      JSON.stringify({ [HASH]: { tracks: [older, { ...older, palmMute: 7 }], focus: null } }),
    );
    expect(memory.get(HASH)?.tracks).toEqual([
      { ...older, letRing: false, brush: false, palmMute: 0.5, accent: false },
      { ...older, letRing: false, brush: false, palmMute: 1, accent: false },
    ]);
  });

  it('leaves out songs it cannot read', () => {
    expect(parseMemory(null).size).toBe(0);
    expect(parseMemory('nonsense').size).toBe(0);
    const raw = JSON.stringify({
      'not-a-hash': { tracks: [TRACK], focus: null },
      [HASH]: { tracks: [{ ...TRACK, mute: 'yes' }], focus: null },
      ['b'.repeat(64)]: { tracks: [TRACK], focus: 5 },
    });
    const memory = parseMemory(raw);
    expect([...memory.keys()]).toEqual(['b'.repeat(64)]);
    // A focus outside the tracks is dropped.
    expect(memory.get('b'.repeat(64))?.focus).toBeNull();
  });

  it('forgets the least recently used songs beyond its limit', () => {
    let memory = new Map<string, RememberedMix>();
    const mix: RememberedMix = { tracks: [TRACK], focus: null };
    for (let index = 0; index < MAX_REMEMBERED_SONGS + 5; index++) {
      memory = remember(memory, index.toString(16).padStart(64, '0'), mix);
    }
    expect(memory.size).toBe(MAX_REMEMBERED_SONGS);
    expect(memory.has('0'.repeat(64))).toBe(false);
    // Using a song again makes it the most recent.
    const first = [...memory.keys()][0] ?? '';
    memory = remember(memory, first, mix);
    expect([...memory.keys()].at(-1)).toBe(first);
  });

  it('names the tracks whose notes all ring on, for the score to say so (REND-188)', () => {
    const quiet = { ...TRACK, letRing: false };
    expect(ringingTracks([quiet, TRACK, quiet, TRACK])).toEqual([1, 3]);
    expect(ringingTracks([quiet])).toEqual([]);
  });

  it('ducks every track but the focused one', () => {
    const mix = [TRACK, { ...TRACK, volume: 1 }];
    expect(effectiveVolume(mix, null, 0)).toBe(0.5);
    expect(effectiveVolume(mix, 0, 0)).toBe(0.5);
    expect(effectiveVolume(mix, 0, 1)).toBe(FOCUS_DUCK);
    expect(effectiveVolume(mix, 1, 0)).toBe(0.5 * FOCUS_DUCK);
  });

  it('recognises a file by the SHA-256 of its bytes', async () => {
    const hash = await fingerprint(new TextEncoder().encode('abc').buffer);
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
