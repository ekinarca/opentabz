/**
 * The presets a SoundFont 2 file offers (its `phdr` chunk): bank, program and name. Read on the
 * main thread from the bytes the synthesizer loads, so the mixer can offer what the sound bank
 * has, such as its drum kits.
 */
export interface SoundFontPreset {
  readonly bank: number;
  readonly program: number;
  readonly name: string;
}

/** Bank of the drum kits in a SoundFont. */
export const DRUM_BANK = 128;
const RECORD = 38;

function chunkId(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/** Walks RIFF chunks from `start` to `end`, looking into LIST chunks, for `id`. */
function findChunk(
  view: DataView,
  start: number,
  end: number,
  id: string,
): { offset: number; size: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    const name = chunkId(view, offset);
    const size = view.getUint32(offset + 4, true);
    if (name === id) return { offset: offset + 8, size };
    if (name === 'LIST' || name === 'RIFF') {
      const found = findChunk(view, offset + 12, Math.min(end, offset + 8 + size), id);
      if (found !== null) return found;
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/** The presets of a SoundFont by bank and program, without the terminal record; none for other files. */
export function soundFontPresets(bytes: ArrayBuffer): SoundFontPreset[] {
  const view = new DataView(bytes);
  if (bytes.byteLength < 12 || chunkId(view, 0) !== 'RIFF' || chunkId(view, 8) !== 'sfbk') return [];
  const phdr = findChunk(view, 12, bytes.byteLength, 'phdr');
  if (phdr === null) return [];
  const presets: SoundFontPreset[] = [];
  const decoder = new TextDecoder('latin1');
  for (let record = phdr.offset; record + RECORD <= phdr.offset + phdr.size - RECORD; record += RECORD) {
    const raw = new Uint8Array(bytes, record, 20);
    const end = raw.indexOf(0);
    presets.push({
      name: decoder.decode(raw.subarray(0, end < 0 ? 20 : end)).trim(),
      program: view.getUint16(record + 20, true),
      bank: view.getUint16(record + 22, true),
    });
  }
  return presets.sort((a, b) => a.bank - b.bank || a.program - b.program);
}
