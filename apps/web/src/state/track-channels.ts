/** Which synthesizer channels belong to a track, for the mixer. */
import {
  EXTRA_CHANNEL_DRUMS,
  TIMELINE_EXTRA_CHANNEL_STRIDE,
  type PlaybackTimeline,
} from '@opentabz/core/shared';

/**
 * A track's channels: its own and those playback added for its techniques. Drum kits added for
 * a guitar's golpe take the track's level and pan, not its instrument or tuning.
 */
export function trackChannels(
  trackIndex: number,
  own: readonly number[],
  timeline: PlaybackTimeline | null,
): { readonly channel: number; readonly drums: boolean }[] {
  const channels = own.map(channel => ({ channel, drums: false }));
  const extra = timeline?.extraChannels ?? new Int32Array(0);
  for (let index = 0; index < extra.length; index += TIMELINE_EXTRA_CHANNEL_STRIDE) {
    if (extra[index] !== trackIndex) continue;
    channels.push({ channel: extra[index + 1] ?? -1, drums: extra[index + 2] === EXTRA_CHANNEL_DRUMS });
  }
  return channels;
}
