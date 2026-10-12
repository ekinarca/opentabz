import { describe, expect, it } from 'vitest';
import { commandValue, parseQuery } from './command-query.ts';

describe('what is typed in the command palette (UX-014, UX-032, UX-038, UX-043)', () => {
  it('reads "?" as every command, "@" or nothing as commands by name', () => {
    expect(parseQuery('?')).toEqual({ kind: 'all', text: '' });
    expect(parseQuery('? zoom')).toEqual({ kind: 'all', text: 'zoom' });
    expect(parseQuery('@fretboard')).toEqual({ kind: 'commands', text: 'fretboard', value: null });
    expect(parseQuery('  fretboard ')).toEqual({ kind: 'commands', text: 'fretboard', value: null });
  });

  it('reads "$" as a section and ":" as a bar number', () => {
    expect(parseQuery('$ver')).toEqual({ kind: 'section', text: 'ver' });
    expect(parseQuery(':12')).toEqual({ kind: 'bar', bar: 12 });
    expect(parseQuery(': 7')).toEqual({ kind: 'bar', bar: 7 });
    expect(parseQuery(':')).toEqual({ kind: 'bar', bar: null });
    expect(parseQuery(':x')).toEqual({ kind: 'bar', bar: null });
  });

  it('reads a value after a command’s name: a number, or a change with its sign', () => {
    expect(commandValue('zoom 150')).toEqual({ name: 'zoom', amount: 150, relative: false });
    expect(commandValue('zoom 150 %')).toEqual({ name: 'zoom', amount: 150, relative: false });
    expect(commandValue('speed -10')).toEqual({ name: 'speed', amount: -10, relative: true });
    expect(commandValue('transpose +2')).toEqual({ name: 'transpose', amount: 2, relative: true });
    expect(commandValue('speed 92,5')).toEqual({ name: 'speed', amount: 92.5, relative: false });
    expect(commandValue('zoom')).toBeNull();
    expect(commandValue('150')).toBeNull();
    expect(parseQuery('@zoom 80').kind).toBe('commands');
    expect(parseQuery('zoom 80')).toMatchObject({ value: { name: 'zoom', amount: 80 } });
  });
});
