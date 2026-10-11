import * as alphaTab from '@coderline/alphatab';

/**
 * A readable over a byte buffer that throws alphaTab's `EndOfReaderError` instead of returning
 * garbage when an importer reads past the end, so truncated files are detected precisely.
 * It also remembers the furthest position reached, reported in error details.
 */
export class StrictReader implements alphaTab.io.IReadable {
  private readonly buffer: alphaTab.io.ByteBuffer;
  private furthest = 0;
  private overrun = false;

  public constructor(bytes: Uint8Array) {
    this.buffer = alphaTab.io.ByteBuffer.fromBuffer(bytes);
  }

  public get position(): number {
    return this.buffer.position;
  }

  public set position(value: number) {
    this.buffer.position = value;
  }

  public get length(): number {
    return this.buffer.length;
  }

  /**
   * True when an importer tried to read past the end, even if it caught the error and carried on
   * (the Guitar Pro 6 decompressor stops at end-of-data by design). Signals a truncated file.
   */
  public get readPastEnd(): boolean {
    return this.overrun;
  }

  /** Furthest byte offset any read has reached. */
  public get furthestPosition(): number {
    return Math.max(this.furthest, this.buffer.position);
  }

  public reset(): void {
    this.buffer.reset();
  }

  public skip(offset: number): void {
    this.require(offset);
    this.buffer.skip(offset);
  }

  public readByte(): number {
    this.require(1);
    return this.buffer.readByte();
  }

  public read(target: Uint8Array, offset: number, count: number): number {
    this.require(count);
    return this.buffer.read(target, offset, count);
  }

  public readAll(): Uint8Array {
    return this.buffer.readAll();
  }

  private require(count: number): void {
    const end = this.buffer.position + count;
    this.furthest = Math.max(this.furthest, Math.min(end, this.buffer.length));
    if (end > this.buffer.length) {
      this.overrun = true;
      throw new alphaTab.io.EndOfReaderError();
    }
  }
}
