/**
 * Generated fixtures (fixtures/generated/, never committed; `pnpm fixtures` recreates them):
 *
 * - `perf-5x150.gp` and `perf-20x500.gp`: the scores behind the open-and-render budgets
 *   (ARCHITECTURE.md §9). Busy, varied content: chords, palm mutes, bends, slides, legato,
 *   drums, piano voicings, ties, dynamics, sections, tempo changes and repeats.
 * - `demos/*.gp`: the alphaTex demos exported to Guitar Pro 7+ files, so the binary import path
 *   is exercised with known content.
 * - `corrupt/*`: broken files for error handling.
 *
 * Everything is deterministic: the same seed always produces the same notes.
 */
import * as alphaTab from '@coderline/alphatab';
import { openScore } from '../src/open/open.ts';

export interface PerfSpec {
  readonly name: string;
  readonly tracks: number;
  readonly bars: number;
  readonly seed: number;
}

export const PERF_FIXTURES: readonly PerfSpec[] = [
  { name: 'perf-5x150', tracks: 5, bars: 150, seed: 0x0f7ab5 },
  { name: 'perf-20x500', tracks: 20, bars: 500, seed: 0x20500 },
];

/** Small, fast, seedable PRNG (mulberry32). */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = 'rhythm' | 'lead' | 'bass' | 'drums' | 'piano' | 'pad';
const KINDS: readonly Kind[] = ['rhythm', 'lead', 'bass', 'drums', 'piano', 'pad'];

interface Voice {
  readonly name: string;
  readonly header: string;
  readonly bar: (rng: () => number, index: number) => string;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}

/** Root frets on the low E string for a I–IV–V–vi progression in E, by bar. */
const ROOTS = [0, 5, 7, 2] as const;

function rhythmBar(rng: () => number, index: number): string {
  const root = ROOTS[Math.floor(index / 2) % ROOTS.length] ?? 0;
  const pm = rng() < 0.5 ? '{pm}' : '';
  const chord = `(${root}.6${pm} ${root + 2}.5${pm} ${root + 2}.4${pm})`;
  if (rng() < 0.15) return `${chord}.2 r.4 ${chord}.4`;
  return `${chord}.8 ${Array.from({ length: 7 }, () => (rng() < 0.12 ? 'r' : chord)).join(' ')}`;
}

function leadBar(rng: () => number): string {
  const notes: string[] = [];
  let remaining = 16;
  while (remaining > 0) {
    const duration = remaining >= 4 && rng() < 0.3 ? 4 : remaining >= 2 && rng() < 0.4 ? 8 : 16;
    const length = 16 / duration;
    remaining -= length;
    const fret = 5 + Math.floor(rng() * 12);
    const string = 1 + Math.floor(rng() * 3);
    const effect = pick(rng, ['', '', '', '{h}', '{sl}', '{v}', '{b (0 4)}', '{p}']);
    notes.push(rng() < 0.08 ? `r.${duration}` : `${fret}.${string}${effect}.${duration}`);
  }
  return notes.join(' ');
}

function bassBar(rng: () => number, index: number): string {
  const root = ROOTS[Math.floor(index / 2) % ROOTS.length] ?? 0;
  const string = root >= 5 ? 3 : 4;
  const fret = root >= 5 ? root - 5 : root;
  if (rng() < 0.5) return `${fret}.${string}.4 ${fret}.${string} ${fret + 2}.${string} ${fret}.${string}`;
  return `:8 ${Array.from({ length: 8 }, (_, step) => `${fret + (step % 4 === 3 ? 2 : 0)}.${string}`).join(' ')}`;
}

function drumsBar(rng: () => number, index: number): string {
  if (index % 8 === 7 && rng() < 0.7) {
    return ':8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed :16 SnareHit SnareHit HighTomHit HighTomHit MidTomHit MidTomHit LowTomHit LowTomHit';
  }
  const crash = index % 8 === 0 ? 'CrashHighHit' : 'HiHatClosed';
  const open = rng() < 0.3 ? 'HiHatOpen' : 'HiHatClosed';
  return `:8 (KickHit ${crash}) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) ${open}`;
}

const PIANO_CHORDS = ['(E4 G#4 B4)', '(A4 C#5 E5)', '(B3 D#4 F#4)', '(C#4 E4 G#4)'] as const;

function pianoBar(rng: () => number, index: number): string {
  const chord = PIANO_CHORDS[Math.floor(index / 2) % PIANO_CHORDS.length] ?? PIANO_CHORDS[0];
  const dynamic = index % 16 === 0 ? `{dy ${pick(rng, ['p', 'mp', 'mf', 'f'])}}` : '';
  if (rng() < 0.4) return `${chord}.2${dynamic} ${chord}.4 ${chord}.4`;
  return `${chord}.8${dynamic} r.8 ${chord}.8 ${chord}.8 ${chord}.4 r.4`;
}

function padBar(_rng: () => number, index: number): string {
  const chord = PIANO_CHORDS[Math.floor(index / 2) % PIANO_CHORDS.length] ?? PIANO_CHORDS[0];
  if (index % 2 === 0) return `${chord}.1`;
  // The second bar of each chord is tied over from the first.
  return `${chord.replace(/([A-G]#?\d)/g, '$1{t}')}.1`;
}

function voiceFor(kind: Kind, number: number): Voice {
  const label = `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)} ${number}`;
  switch (kind) {
    case 'rhythm':
      return {
        name: label,
        header: `\\track ("Rhythm ${number}" "R${number}") {instrument distortionGuitar}\n\\staff {score tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)`,
        bar: rhythmBar,
      };
    case 'lead':
      return {
        name: label,
        header: `\\track ("Lead ${number}" "L${number}") {instrument overdrivenGuitar}\n\\staff {score tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)`,
        bar: leadBar,
      };
    case 'bass':
      return {
        name: label,
        header: `\\track ("Bass ${number}" "B${number}") {instrument electricBassFinger}\n\\staff {score tabs}\n\\tuning (G2 D2 A1 E1)`,
        bar: bassBar,
      };
    case 'drums':
      return {
        name: label,
        header: `\\track ("Drums ${number}" "D${number}") {instrument percussion}\n\\articulation defaults`,
        bar: drumsBar,
      };
    case 'piano':
      return {
        name: label,
        header: `\\track ("Piano ${number}" "P${number}") {instrument acousticGrandPiano}\n\\staff {score}`,
        bar: pianoBar,
      };
    case 'pad':
      return {
        name: label,
        header: `\\track ("Strings ${number}" "S${number}") {instrument stringEnsemble1}\n\\staff {score}`,
        bar: padBar,
      };
  }
}

/** alphaTex source of a performance score. */
export function perfTex(spec: PerfSpec): string {
  const rng = random(spec.seed);
  const lines = [
    `// Generated by packages/core/scripts/fixtures.ts (${spec.tracks} tracks × ${spec.bars} bars, seed ${spec.seed}).`,
    `\\title "Performance ${spec.tracks} × ${spec.bars}"`,
    '\\subtitle "OpenTabz generated fixture"',
    '\\artist "OpenTabz"',
    '\\tempo 120',
  ];
  for (let track = 0; track < spec.tracks; track++) {
    const kind = KINDS[track % KINDS.length] ?? 'rhythm';
    const voice = voiceFor(kind, Math.floor(track / KINDS.length) + 1);
    lines.push('', voice.header);
    for (let bar = 0; bar < spec.bars; bar++) {
      // Bar-level metadata lives in the first track (it applies to every track).
      const meta: string[] = [];
      if (track === 0) {
        if (bar === 0) meta.push('\\ts (4 4) \\ks E');
        if (bar % 16 === 0) meta.push(`\\section "Part ${bar / 16 + 1}"`);
        if (bar % 24 === 12) meta.push(`\\tempo ${100 + Math.floor(rng() * 60)}`);
        if (bar % 32 === 4) meta.push('\\ro');
        if (bar % 32 === 7) meta.push('\\rc 2');
      }
      lines.push(`${meta.join(' ')}${meta.length > 0 ? ' ' : ''}${voice.bar(rng, bar)} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** Encodes a score as a Guitar Pro 7+ (.gp) file. */
export function exportGp(score: alphaTab.model.Score): Uint8Array {
  return new alphaTab.exporter.Gp7Exporter().export(score, new alphaTab.Settings());
}

export interface GeneratedFile {
  /** Path relative to fixtures/generated/. */
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** Every generated fixture; `demos` maps a demo's file name to its alphaTex source. */
export function generateFixtures(demos: ReadonlyMap<string, string>): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  for (const spec of PERF_FIXTURES) {
    const tex = perfTex(spec);
    const opened = openScore(new TextEncoder().encode(tex), `${spec.name}.atex`);
    const tracks = opened.score.tracks.length;
    const bars = opened.score.masterBars.length;
    if (tracks !== spec.tracks || bars !== spec.bars) {
      throw new Error(`${spec.name}: expected ${spec.tracks}×${spec.bars}, generated ${tracks}×${bars}.`);
    }
    files.push({ path: `${spec.name}.atex`, bytes: new TextEncoder().encode(tex) });
    files.push({ path: `${spec.name}.gp`, bytes: exportGp(opened.score) });
  }
  for (const [name, tex] of demos) {
    const opened = openScore(new TextEncoder().encode(tex), name);
    files.push({ path: `demos/${name.replace(/\.atex$/, '.gp')}`, bytes: exportGp(opened.score) });
  }

  const sample = files.find(file => file.path === 'perf-5x150.gp')?.bytes ?? new Uint8Array();
  const noise = random(0xbad);
  files.push(
    { path: 'corrupt/truncated-half.gp', bytes: sample.slice(0, Math.floor(sample.length / 2)) },
    { path: 'corrupt/empty.gp', bytes: new Uint8Array() },
    {
      path: 'corrupt/noise.gp',
      bytes: Uint8Array.from({ length: 4096 }, () => Math.floor(noise() * 256)),
    },
  );
  return files;
}
