import { describe, expect, it } from 'vitest';
import { matchScore, normalize, searchCommands } from './command-search.ts';

const COMMANDS = [
  { label: 'Zoom in' },
  { label: 'Zoom out' },
  { label: 'Fretboard', aliases: ['neck', 'guitar view'] },
  { label: 'Export…', aliases: ['pdf', 'midi', 'wav', 'musicxml', 'save as'] },
  { label: 'Song start' },
  { label: 'Stop' },
  { label: 'Stylesheet', aliases: ['engraving', 'style'] },
  { label: 'Full screen' },
];

const labels = (query: string) => searchCommands(query, COMMANDS).map(command => command.label);

describe('command search (UX-033)', () => {
  it('finds a command by the start of its name, or of a word in it', () => {
    expect(labels('fret')).toEqual(['Fretboard']);
    expect(labels('zoom')).toEqual(['Zoom in', 'Zoom out']);
    expect(labels('screen')[0]).toBe('Full screen');
    expect(labels('in zoom')[0]).toBe('Zoom in');
  });

  it('finds a command by its initials or an alias', () => {
    expect(labels('zi')[0]).toBe('Zoom in');
    expect(labels('ss')[0]).toBe('Song start');
    expect(labels('pdf')).toEqual(['Export…']);
    expect(labels('xml')).toEqual(['Export…']);
    expect(labels('neck')).toEqual(['Fretboard']);
  });

  it('puts the closest first: the whole name, its start, a word, initials, a part, letters in order', () => {
    const score = (query: string, label: string) => matchScore(query, { label }) ?? -1;
    expect(score('stop', 'Stop')).toBeGreaterThan(score('stop', 'Stop at the end'));
    expect(score('sto', 'Stop')).toBeGreaterThan(score('sto', 'Song stop'));
    expect(score('st', 'Song stop')).toBeGreaterThan(score('ss', 'Song stop'));
    expect(score('ss', 'Song stop')).toBeGreaterThan(score('ong', 'Song stop'));
    expect(score('sty', 'Stylesheet')).toBeGreaterThan(score('ysh', 'Stylesheet'));
    expect(score('stlsht', 'Stylesheet')).toBeGreaterThan(0);
    expect(matchScore('qq', { label: 'Stylesheet' })).toBeNull();
  });

  it('ignores case, accents and punctuation', () => {
    expect(normalize('  Éxport…  PDF ')).toBe('export pdf');
    expect(labels('EXPORT')).toEqual(['Export…']);
    expect(labels('éxp')).toEqual(['Export…']);
  });

  it('lists everything, in order, for nothing typed', () => {
    expect(labels('')).toEqual(
      [...COMMANDS.map(command => command.label)].sort((a, b) => a.localeCompare(b)),
    );
  });
});
