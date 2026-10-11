import type { PlaybackTimeline } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { trackChannels } from './track-channels.ts';

const TIMELINE: PlaybackTimeline = {
  playbackId: 'test',
  endTick: 0,
  bars: new Int32Array(0),
  slices: new Int32Array(0),
  items: new Int32Array(0),
  // Track 0 got a slap bass channel (4) and a golpe drum kit (5); track 1 a bend channel (6).
  extraChannels: Int32Array.from([0, 4, 0, 0, 5, 1, 1, 6, 0]),
};

describe('track channels', () => {
  it("adds the channels playback added for a track's techniques, telling drum kits apart", () => {
    expect(trackChannels(0, [0, 1], TIMELINE)).toEqual([
      { channel: 0, drums: false },
      { channel: 1, drums: false },
      { channel: 4, drums: false },
      { channel: 5, drums: true },
    ]);
    expect(trackChannels(1, [2, 3], TIMELINE)).toEqual([
      { channel: 2, drums: false },
      { channel: 3, drums: false },
      { channel: 6, drums: false },
    ]);
  });

  it('is the track’s own channels before playback is ready', () => {
    expect(trackChannels(0, [0, 1], null)).toEqual([
      { channel: 0, drums: false },
      { channel: 1, drums: false },
    ]);
  });
});
