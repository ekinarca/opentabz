import { describe, expect, it } from 'vitest';
import type { CommandValue } from './command-query.ts';
import { paletteCommands, valueCommands, type Command, type ValueCommand } from './commands.ts';
import { paletteEntries, type PaletteSources } from './palette-entries.ts';

function command(id: string, label: string, extra: Partial<Command> = {}): Command {
  return { id, label, aliases: [], keys: null, unavailable: () => null, run: () => undefined, ...extra };
}

const applied: CommandValue[] = [];
const ZOOM: ValueCommand = {
  id: 'zoom',
  label: 'Zoom to…',
  aliases: ['magnify'],
  unavailable: () => null,
  describe: value => `Zoom to ${String(value.amount)} %`,
  apply: value => {
    applied.push(value);
  },
};

const wentTo: number[] = [];
const SOURCES: PaletteSources = {
  commands: [
    command('zoom-in', 'Zoom in', { keys: '⌘ =' }),
    command('loop', 'Loop on or off', { keys: 'F9' }),
    command('export', 'Export…', { aliases: ['pdf'] }),
    command('unfocus', 'Unfocus', { unavailable: () => 'no track is focused' }),
  ],
  values: [ZOOM],
  recent: ['loop'],
  score: {
    barCount: 24,
    sections: [
      { index: 0, marker: 'A', text: 'Intro' },
      { index: 8, marker: 'B', text: 'Verse' },
    ],
  },
  goToBar: index => {
    wentTo.push(index);
  },
};

const labels = (input: string, sources: PaletteSources = SOURCES) =>
  paletteEntries(input, sources).map(entry => entry.label);

describe('what the command palette lists (UX-014, UX-032, UX-038, UX-043)', () => {
  it('lists past commands first, then every command, when nothing is typed', () => {
    const entries = paletteEntries('', SOURCES);
    expect(entries.map(entry => [entry.label, entry.group])).toEqual([
      ['Loop on or off', 'recent'],
      ['Export…', 'results'],
      ['Unfocus', 'results'],
      ['Zoom in', 'results'],
      ['Zoom to…', 'results'],
    ]);
    expect(entries[0]?.keys).toBe('F9');
  });

  it('lists every command alphabetically after "?", with why one cannot run now', () => {
    expect(labels('?')).toEqual(['Export…', 'Loop on or off', 'Unfocus', 'Zoom in', 'Zoom to…']);
    expect(labels('? zoom')).toEqual(['Zoom in', 'Zoom to…']);
    expect(paletteEntries('?', SOURCES).find(entry => entry.id === 'unfocus')?.reason).toBe(
      'no track is focused',
    );
  });

  it('finds commands by name or alias; a value after a name offers the command that takes it', () => {
    expect(labels('pdf')).toEqual(['Export…']);
    expect(labels('zoom 150')[0]).toBe('Zoom to 150 %');
    expect(labels('magnify +10')[0]).toBe('Zoom to 10 %');
    const value = paletteEntries('zoom 150', SOURCES)[0];
    value?.run();
    expect(applied.at(-1)).toEqual({ name: 'zoom', amount: 150, relative: false });
    // Without a value, choosing it asks for one.
    const asking = paletteEntries('zoom to', SOURCES).find(entry => entry.id === 'value:zoom');
    expect(asking?.complete).toBe('zoom ');
  });

  it('goes to a section after "$" and to a bar after ":"', () => {
    expect(labels('$')).toEqual(['Go to A: Intro', 'Go to B: Verse']);
    expect(labels('$ver')).toEqual(['Go to B: Verse']);
    paletteEntries('$ver', SOURCES)[0]?.run();
    expect(wentTo.at(-1)).toBe(8);
    expect(labels(':12')).toEqual(['Go to bar 12']);
    paletteEntries(':12', SOURCES)[0]?.run();
    expect(wentTo.at(-1)).toBe(11);
    // Outside the score: said, not run.
    expect(paletteEntries(':40', SOURCES)[0]?.reason).toBe('type a bar number from 1 to 24');
    expect(paletteEntries(':', SOURCES)[0]?.reason).toBe('type a bar number from 1 to 24');
  });

  it('says what is missing without a score, or without sections', () => {
    const none = { ...SOURCES, score: null };
    expect(paletteEntries(':3', none)[0]?.reason).toBe('open a score first');
    expect(paletteEntries('$', none)[0]?.reason).toBe('open a score first');
    const plain = { ...SOURCES, score: { barCount: 4, sections: [] } };
    expect(paletteEntries('$', plain)[0]?.reason).toBe('this score has no sections');
  });

  it('keeps every entry apart: the app’s commands have ids and names of their own', () => {
    const sources = {
      commands: paletteCommands('Ctrl'),
      values: valueCommands(),
      recent: [],
      score: null,
      goToBar: () => undefined,
    };
    for (const typed of ['', '?', 'speed', 'zoom 120']) {
      const ids = paletteEntries(typed, sources).map(entry => entry.id);
      expect(new Set(ids).size, typed).toBe(ids.length);
    }
    // Labels too, so that no two look alike.
    const labels = paletteEntries('?', sources).map(entry => entry.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
