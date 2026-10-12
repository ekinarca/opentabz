import * as alphaTab from '@coderline/alphatab';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { EngineHost } from '../src/engine/host.ts';
import { ALPHATAB_VERSION } from '../src/engine/version.ts';
import { TRACK_BEAT_NOTE_STRIDE, TRACK_BEATS_STRIDE } from '../src/shared/beats.ts';
import { BOUNDS_STAFF_LINES_STRIDE, STAFF_KIND } from '../src/shared/playback.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

const AT = { track: 0, staff: 0, bar: 0, voice: 0, beat: 0 };

const VIEW: ViewOptions = {
  trackIndexes: [0],
  layout: 'page',
  systemsLayout: 'auto',
  staffDisplay: 'default',
  width: 700,
  notationScale: 1,
};

function buffer(path: string): ArrayBuffer {
  const bytes = readFixture(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe('EngineHost', () => {
  it('warms up and reports the engine version', () => {
    const info = new EngineHost().init({});
    expect(info.alphaTabVersion).toBe(ALPHATAB_VERSION);
    expect(info.warmupMs).toBeGreaterThan(0);
  });

  it('opens a document and summarizes it', () => {
    const host = new EngineHost();
    const result = host.open({ name: 'score-info.gp', bytes: buffer('alphatab/guitarpro7/score-info.gp') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toMatchObject({
      fileName: 'score-info.gp',
      format: 'gp',
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      extensionMismatch: false,
      truncated: false,
    });
    expect(result.summary.tracks.length).toBe(2);
    expect(result.summary.tracks[0]?.staves[0]?.tuning.length).toBe(6);
    expect(result.parseMs).toBeGreaterThanOrEqual(0);
  });

  it('summarizes every bar: meter, pickup and sections', () => {
    const host = new EngineHost();
    const shuffle = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    const greensleeves = host.open({
      name: 'greensleeves.atex',
      bytes: buffer('alphatex/demos/greensleeves.atex'),
    });
    if (!shuffle.ok || !greensleeves.ok) throw new Error('demo did not open');
    const bars = shuffle.summary.masterBars;
    expect(bars).toHaveLength(shuffle.summary.barCount);
    expect(bars.every(bar => bar.numerator === 4 && bar.denominator === 4 && !bar.anacrusis)).toBe(true);
    expect(bars.flatMap((bar, index) => (bar.section === null ? [] : [[index, bar.section.text]]))).toEqual([
      [0, 'Twelve bars'],
      [8, 'Turnaround'],
      [12, 'Ending'],
    ]);
    expect(greensleeves.summary.masterBars[0]).toMatchObject({
      numerator: 3,
      denominator: 4,
      anacrusis: true,
    });
  });

  it('returns typed errors instead of throwing', () => {
    const host = new EngineHost();
    const result = host.open({ name: 'empty.gp', bytes: new ArrayBuffer(0) });
    expect(result).toMatchObject({ ok: false, error: { code: 'empty' } });
    expect(host.documentCount).toBe(0);
  });

  it('lays out views, paints the current generation only and closes cleanly', () => {
    const host = new EngineHost();
    const opened = host.open({ name: 'effects.gp', bytes: buffer('alphatab/guitarpro7/effects.gp') });
    if (!opened.ok) throw new Error('fixture failed to open');
    const docId = opened.summary.id;
    const first = host.layoutView({ viewId: 'v1', docId, options: VIEW });
    const ids = first.partials.slice(0, 3).map(p => p.id);
    expect(host.paint({ viewId: 'v1', generation: first.generation, ids }).partials).toHaveLength(3);

    const second = host.layoutView({ viewId: 'v1', docId, options: { ...VIEW, width: 500 } });
    expect(host.paint({ viewId: 'v1', generation: first.generation, ids }).partials).toHaveLength(0);
    expect(
      host.paint({ viewId: 'v1', generation: second.generation, ids: [second.partials[0]?.id ?? ''] })
        .partials,
    ).toHaveLength(1);

    host.closeDocument({ docId });
    expect(host.documentCount).toBe(0);
    expect(host.paint({ viewId: 'v1', generation: second.generation, ids }).partials).toHaveLength(0);
    expect(() => host.layoutView({ viewId: 'v1', docId, options: VIEW })).toThrow(/Unknown document/);
  });

  it('keeps the bundled alphaTab version constant in sync with the installed package', () => {
    const require = createRequire(import.meta.url);
    const entry = require.resolve('@coderline/alphatab');
    const pkgPath = entry.replace(/dist[\\/][^\\/]+$/, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    expect(pkg.version).toBe(ALPHATAB_VERSION);
  });
});

describe('EngineHost — editing (EDIT-001, EDIT-060)', () => {
  function systemSvg(host: EngineHost, docId: string, bar: number): { id: string; svg: string } {
    const layout = host.layoutView({ viewId: 'v', docId, options: VIEW });
    const system = layout.partials.find(p => p.kind === 'system' && p.firstBar <= bar && bar <= p.lastBar);
    if (system === undefined) throw new Error(`No system shows bar ${String(bar)}.`);
    const [painted] = host.paint({ viewId: 'v', generation: layout.generation, ids: [system.id] }).partials;
    if (painted === undefined) throw new Error('The system was not painted.');
    return painted;
  }

  it('edits a document, lays it out again from the system edited on, and undoes and redoes', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const docId = opened.summary.id;
    const opening = host.layoutView({ viewId: 'v', docId, options: VIEW });
    const bar = opening.partials.filter(p => p.kind === 'system').at(-1)?.firstBar ?? 0;
    expect(systemSvg(host, docId, bar).svg).not.toContain('>23<');
    const before = host.layoutView({ viewId: 'v', docId, options: VIEW });
    const systems = before.partials.filter(p => p.kind === 'system');
    expect(systems.length).toBeGreaterThan(2);

    const at = { track: 0, staff: 0, bar, voice: 0, beat: 0, string: 1 };
    const edited = host.edit({ docId, commands: [{ kind: 'set-fret', at, fret: 23 }] });
    expect(edited).toMatchObject({ changed: true, canUndo: true, canRedo: false, revision: 1 });
    expect(edited.firstChangedMasterBar).toBe(bar - 3);
    expect(edited.summary.id).toBe(docId);
    const after = host.layoutView({ viewId: 'v', docId, options: VIEW });
    // The systems before the first bar changed are kept as they were, ids and all.
    const kept = systems.filter(p => p.lastBar < edited.firstChangedMasterBar).map(p => p.id);
    expect(kept.length).toBeGreaterThan(0);
    expect(after.partials.map(p => p.id)).toEqual(expect.arrayContaining(kept));
    expect(after.partials.filter(p => p.kind === 'system')).toHaveLength(systems.length);
    expect(systemSvg(host, docId, bar).svg).toContain('>23<');

    expect(host.undo({ docId })).toMatchObject({ changed: true, canUndo: false, canRedo: true, revision: 0 });
    expect(systemSvg(host, docId, bar).svg).not.toContain('>23<');
    expect(host.undo({ docId })).toMatchObject({ changed: false, canUndo: false, canRedo: true });
    expect(host.redo({ docId })).toMatchObject({ changed: true, canUndo: true, canRedo: false, revision: 1 });
    expect(systemSvg(host, docId, bar).svg).toContain('>23<');
  });

  it('lays out bars put in and taken away, in every track, and their undoing', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const docId = opened.summary.id;
    const bars = opened.summary.masterBars.length;
    const lastBar = (): number =>
      Math.max(...host.layoutView({ viewId: 'v', docId, options: VIEW }).partials.map(p => p.lastBar));
    expect(lastBar()).toBe(bars - 1);
    const added = host.edit({ docId, commands: [{ kind: 'insert-bar', bar: bars }] });
    expect(added.summary.masterBars).toHaveLength(bars + 1);
    expect(lastBar()).toBe(bars);
    expect(host.trackBeats({ docId, trackIndex: 2 }).beats.length).toBeGreaterThan(0);
    host.edit({ docId, commands: [{ kind: 'remove-bar', bar: 0 }] });
    expect(lastBar()).toBe(bars - 1);
    host.undo({ docId });
    expect(host.undo({ docId }).summary.masterBars).toHaveLength(bars);
    expect(lastBar()).toBe(bars - 1);
  });

  it('after an edit laid out from its system, lays out a narrower view with each bar once (alphaTab patch 0060)', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const docId = opened.summary.id;
    const bars = opened.summary.masterBars.length;
    const layOut = (width: number) => {
      const layout = host.layoutView({ viewId: 'v', docId, options: { ...VIEW, width } });
      const systems = layout.partials.filter(p => p.kind === 'system');
      const painted = host.paint({ viewId: 'v', generation: layout.generation, ids: systems.map(p => p.id) });
      expect(painted.partials).toHaveLength(systems.length);
      return systems.reduce((count, p) => count + p.lastBar - p.firstBar + 1, 0);
    };
    expect(layOut(412)).toBe(bars);
    // A new time signature moves where every later bar starts.
    host.edit({
      docId,
      commands: [{ kind: 'set-bar', bar: 0, properties: { meter: { numerator: 3, denominator: 4 } } }],
    });
    expect(layOut(412)).toBe(bars);
    expect(layOut(383)).toBe(bars);
    expect(layOut(700)).toBe(bars);
  });

  it('starts a new system at a bar when asked, every track alike (EDIT-109)', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const docId = opened.summary.id;
    const starts = () =>
      host
        .layoutView({ viewId: 'v', docId, options: { ...VIEW, width: 1200 } })
        .partials.filter(p => p.kind === 'system')
        .map(p => p.firstBar);
    expect(starts()).not.toContain(4);
    host.edit({ docId, commands: [{ kind: 'set-bar', bar: 4, properties: { systemBreak: true } }] });
    expect(starts()).toContain(4);
    expect(host.barProperties({ docId, bar: 4 }).systemBreak).toBe(true);
    host.undo({ docId });
    expect(starts()).not.toContain(4);
    expect(host.barProperties({ docId, bar: 4 }).systemBreak).toBe(false);
  });

  it('copies bars from one document and pastes them in another (EDIT-020)', () => {
    const host = new EngineHost();
    const shuffle = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    const blank = host.open({
      name: 'blank.atex',
      bytes: new TextEncoder().encode('\\track "Guitar"\n r.1 | r.1').buffer,
    });
    if (!shuffle.ok || !blank.ok) throw new Error('documents did not open');
    const copied = host.copy({
      docId: shuffle.summary.id,
      selection: { kind: 'bars', fromTrack: 0, toTrack: 0, fromBar: 0, toBar: 3 },
    });
    expect(copied).toMatchObject({ kind: 'bars', beats: 0, bars: 4, tracks: 1 });
    // Plain data, as the page keeps it and sends it back.
    const clip = structuredClone(copied);
    const pasted = host.edit({ docId: blank.summary.id, commands: [{ kind: 'paste', at: AT, clip }] });
    expect(pasted.summary.masterBars).toHaveLength(4);
    // The first four bars' frets, beat by beat.
    const frets = (docId: string): number[][] => {
      const { beats, notes } = host.trackBeats({ docId, trackIndex: 0 });
      const found: number[][] = [];
      for (let at = 0; at < beats.length; at += TRACK_BEATS_STRIDE) {
        if ((beats[at + 2] ?? 0) >= 4) continue;
        const first = beats[at + 8] ?? 0;
        const count = beats[at + 9] ?? 0;
        found.push(
          Array.from(
            { length: count },
            (_, note) => notes[(first + note) * TRACK_BEAT_NOTE_STRIDE + 1] ?? -1,
          ),
        );
      }
      return found;
    };
    expect(frets(blank.summary.id).flat().length).toBeGreaterThan(20);
    expect(frets(blank.summary.id)).toEqual(frets(shuffle.summary.id));
    expect(() =>
      host.copy({
        docId: blank.summary.id,
        selection: { kind: 'bars', fromTrack: 0, toTrack: 3, fromBar: 0, toBar: 0 },
      }),
    ).toThrow(expect.objectContaining({ name: 'EngineHostError', message: 'No tracks 0 to 3.' }));
  });

  it('refuses an edit it cannot make, saying why, and leaves the document as it was', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const docId = opened.summary.id;
    const at = { track: 0, staff: 0, bar: 0, voice: 0, beat: 0, string: 9 };
    expect(() => host.edit({ docId, commands: [{ kind: 'set-fret', at, fret: 1 }] })).toThrow(
      expect.objectContaining({ name: 'EngineHostError', message: 'No string 9 on a staff of 6.' }),
    );
    expect(host.undo({ docId })).toMatchObject({ changed: false, canUndo: false, revision: 0 });
    expect(() => host.edit({ docId: 'doc-0', commands: [] })).toThrow(/Unknown document/);
  });
});

describe('EngineHost — staves and their lines (alphaTab patch 0058)', () => {
  it('gives each system a tablature staff with a line per string under the standard notation', () => {
    const host = new EngineHost();
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const { bounds, partials } = host.layoutView({
      viewId: 'v',
      docId: opened.summary.id,
      options: { ...VIEW, staffDisplay: 'score-tab' },
    });
    const systems = partials.filter(partial => partial.kind === 'system').length;
    const rows = Array.from({ length: bounds.staffLines.length / BOUNDS_STAFF_LINES_STRIDE }, (_, index) =>
      Array.from(bounds.staffLines.subarray(index * 6, index * 6 + 6)),
    );
    const linesOf = ([, , , , first = 0, count = 0]: number[]) =>
      Array.from(bounds.lines.subarray(first, first + count));
    for (let system = 0; system < systems; system++) {
      const staves = rows.filter(([at, track, staff]) => at === system && track === 0 && staff === 0);
      const notation = staves.find(row => row[3] === STAFF_KIND.notation);
      const tab = staves.find(row => row[3] === STAFF_KIND.tablature);
      if (notation === undefined || tab === undefined)
        throw new Error(`System ${String(system)} lacks a staff.`);
      const five = linesOf(notation);
      const six = linesOf(tab);
      expect(five).toHaveLength(5);
      expect(six).toHaveLength(6);
      // Evenly spaced, top down, the tablature under the notation.
      const gaps = six.slice(1).map((y, index) => y - (six[index] ?? 0));
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] ?? 0, 3);
      expect(gaps[0]).toBeGreaterThan(0);
      expect(six[0]).toBeGreaterThan(five.at(-1) ?? 0);
      // Within the system's bounds.
      const top = bounds.systems[system * 4 + 1] ?? 0;
      const height = bounds.systems[system * 4 + 3] ?? 0;
      expect(five[0]).toBeGreaterThanOrEqual(top);
      expect(six.at(-1)).toBeLessThanOrEqual(top + height);
    }
  });
});

describe('EngineHost — audible stepping', () => {
  it('sends the requested beats to the synth as a one-time MIDI starting at tick 0', () => {
    const host = new EngineHost();
    const sent: unknown[] = [];
    host.connectSynth({ port: { postMessage: message => sent.push(message) } });
    const opened = host.open({
      name: 'shuffle.atex',
      bytes: buffer('alphatex/demos/twelve-bar-shuffle.atex'),
    });
    if (!opened.ok) throw new Error('demo did not open');
    const timeline = host.preparePlayback({ docId: opened.summary.id, playbackId: 'p' });
    sent.length = 0;
    // The first beat of every track sounds together.
    const firstBeats = new Set<number>();
    for (let index = 0; index < timeline.items.length; index += 3) {
      if (timeline.items[index + 2] === 0) firstBeats.add(timeline.items[index] ?? -1);
    }
    expect(firstBeats.size).toBe(4);
    host.previewBeats({ docId: opened.summary.id, beatIds: [...firstBeats] });
    expect(sent).toHaveLength(1);
    const delivery = sent[0] as { type: string; midi: unknown };
    expect(delivery.type).toBe('preview');
    const file = alphaTab.model.JsonConverter.jsObjectToMidiFile(delivery.midi);
    const noteOns = file.events.filter(event => event.type === alphaTab.midi.MidiEventType.NoteOn);
    // Rhythm guitar (two strings), bass (one) and drums (two); the lead guitar rests.
    expect(noteOns).toHaveLength(5);
    expect(new Set(noteOns.map(event => event.tick))).toEqual(new Set([0]));
    // Unknown beats are ignored without sending anything.
    host.previewBeats({ docId: opened.summary.id, beatIds: [-1] });
    expect(sent).toHaveLength(1);
  });
});
