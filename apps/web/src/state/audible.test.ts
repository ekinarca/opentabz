import { describe, expect, it } from 'vitest';
import { silencedTracks } from './audible.ts';

const track = (mute: boolean, solo: boolean) => ({ mute, solo });

describe('tracks the mixer silences', () => {
  it('are the muted ones', () => {
    expect(silencedTracks([track(false, false), track(true, false), track(false, false)])).toEqual([1]);
  });

  it('are all but the soloed ones when any is soloed, a muted solo included', () => {
    expect(silencedTracks([track(false, true), track(false, false), track(true, true)])).toEqual([1, 2]);
  });

  it('are none when nothing is muted or soloed', () => {
    expect(silencedTracks([track(false, false), track(false, false)])).toEqual([]);
  });
});
