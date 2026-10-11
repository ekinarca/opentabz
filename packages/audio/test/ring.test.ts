import { describe, expect, it } from 'vitest';
import { createRingBuffers, distance, RingReader, RingWriter } from '../src/ring.ts';

function stereo(frames: number, offset = 0): Float32Array {
  const data = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    data[i * 2] = offset + i;
    data[i * 2 + 1] = -(offset + i);
  }
  return data;
}

describe('ring buffer', () => {
  it('passes frames from writer to reader in order, across the wrap point', () => {
    const buffers = createRingBuffers(8);
    const writer = new RingWriter(buffers);
    const reader = new RingReader(buffers);
    writer.setPaused(false);
    const left = new Float32Array(4);
    const right = new Float32Array(4);
    for (let round = 0; round < 5; round++) {
      expect(writer.write(stereo(6, round * 6))).toBe(6);
      expect(reader.read(left, right)).toBe(4);
      expect([...left]).toEqual([0, 1, 2, 3].map(i => round * 6 + i));
      expect([...right]).toEqual([0, 1, 2, 3].map(i => -(round * 6 + i)));
      expect(reader.read(left, right)).toBe(2);
      expect([...left.subarray(0, 2)]).toEqual([4, 5].map(i => round * 6 + i));
      expect([...left.subarray(2)]).toEqual([0, 0]);
    }
    expect(writer.consumed).toBe(30);
  });

  it('never overwrites unread frames', () => {
    const buffers = createRingBuffers(8);
    const writer = new RingWriter(buffers);
    expect(writer.write(stereo(6))).toBe(6);
    expect(writer.write(stereo(6))).toBe(2);
    expect(writer.free).toBe(0);
  });

  it('outputs silence without consuming while paused', () => {
    const buffers = createRingBuffers(8);
    const writer = new RingWriter(buffers);
    const reader = new RingReader(buffers);
    writer.write(stereo(4, 10));
    const left = new Float32Array(4).fill(9);
    const right = new Float32Array(4).fill(9);
    expect(reader.read(left, right)).toBe(0);
    expect([...left]).toEqual([0, 0, 0, 0]);
    writer.setPaused(false);
    expect(reader.read(left, right)).toBe(4);
    expect(left[0]).toBe(10);
  });

  it('drops buffered frames on reset (seek) and keeps frames written afterwards', () => {
    const buffers = createRingBuffers(16);
    const writer = new RingWriter(buffers);
    const reader = new RingReader(buffers);
    writer.setPaused(false);
    writer.write(stereo(6, 100));
    writer.reset();
    expect(writer.buffered).toBe(0);
    writer.write(stereo(3, 500));
    const left = new Float32Array(4);
    const right = new Float32Array(4);
    expect(reader.read(left, right)).toBe(3);
    expect([...left.subarray(0, 3)]).toEqual([500, 501, 502]);
  });

  it('measures distances across 32-bit wrap-around', () => {
    expect(distance(0x7ffffffe, -0x7fffffff)).toBe(3);
    expect(distance(5, 2)).toBe(-3);
  });

  it('rejects capacities that are not powers of two', () => {
    expect(() => createRingBuffers(12)).toThrow(RangeError);
  });
});
