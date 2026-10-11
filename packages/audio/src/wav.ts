/** WAV encoding: 16-bit PCM, stereo, little-endian, for audio export. */

/** A RIFF/WAVE file of two channels of samples in [-1, 1] (clipped beyond). */
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const frames = Math.min(left.length, right.length);
  const bytes = new Uint8Array(44 + frames * 4);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + frames * 4, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * 4, true);
  const pcm = (value: number) => {
    const clipped = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
    return Math.round(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff);
  };
  for (let frame = 0; frame < frames; frame++) {
    view.setInt16(44 + frame * 4, pcm(left[frame] ?? 0), true);
    view.setInt16(46 + frame * 4, pcm(right[frame] ?? 0), true);
  }
  return bytes;
}
