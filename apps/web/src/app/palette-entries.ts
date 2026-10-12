/**
 * What the command palette lists for what is typed (UX-014, UX-032, UX-033, UX-038, UX-043):
 * past commands, then every command, when nothing is typed; commands found by name (a value
 * after a name offers the commands that take one); every command alphabetically after "?"; the
 * sections after "$" and a bar after ":". Commands that cannot run now are listed with why.
 */
import { strings } from '../strings.ts';
import { parseQuery, type CommandValue } from './command-query.ts';
import { matchScore, searchCommands } from './command-search.ts';
import type { Command, ValueCommand } from './commands.ts';

const p = strings.palette;

export interface PaletteEntry {
  /** Unique in the list. */
  readonly id: string;
  readonly label: string;
  /** Its keys, if it has any. */
  readonly keys: string | null;
  /** A word on what to do next ("type a value after it"). */
  readonly hint: string | null;
  /** Why it cannot run now, or null when it can. */
  readonly reason: string | null;
  readonly group: 'recent' | 'results';
  readonly run: () => void;
  /** Rather than running: what to put in the field (a command that takes a value). */
  readonly complete: string | null;
  /** The command to keep among the past ones once run, if any. */
  readonly remember: string | null;
}

export interface PaletteSources {
  readonly commands: readonly Command[];
  readonly values: readonly ValueCommand[];
  /** Past commands, the latest first. */
  readonly recent: readonly string[];
  /** The open score, if any: its bars and sections. */
  readonly score: {
    readonly barCount: number;
    readonly sections: readonly { readonly index: number; readonly marker: string; readonly text: string }[];
  } | null;
  /** Plays from the start of a master bar. */
  readonly goToBar: (index: number) => void;
}

const nothing = () => undefined;

function fromCommand(command: Command, group: PaletteEntry['group']): PaletteEntry {
  return {
    id: command.id,
    label: command.label,
    keys: command.keys,
    hint: null,
    reason: command.unavailable(),
    group,
    run: command.run,
    complete: null,
    remember: command.id,
  };
}

/** A command that takes a value, offered without one: choosing it asks for the value. */
function asking(command: ValueCommand): PaletteEntry {
  return {
    // Apart from the shortcuts' ids: "speed" is also the speed panel's.
    id: `value:${command.id}`,
    label: command.label,
    keys: null,
    hint: p.values.typeValue,
    reason: command.unavailable(),
    group: 'results',
    run: nothing,
    complete: `${command.id} `,
    remember: null,
  };
}

function withValue(command: ValueCommand, value: CommandValue): PaletteEntry {
  return {
    id: `value:${command.id}=${String(value.amount)}`,
    label: command.describe(value),
    keys: null,
    hint: null,
    reason: command.unavailable(),
    group: 'results',
    run: () => {
      command.apply(value);
    },
    complete: null,
    remember: null,
  };
}

/** An entry that only says something: what to type, or why nothing can run. */
function note(id: string, label: string, reason: string): PaletteEntry {
  return {
    id,
    label,
    keys: null,
    hint: null,
    reason,
    group: 'results',
    run: nothing,
    complete: null,
    remember: null,
  };
}

function alphabetical(entries: PaletteEntry[]): PaletteEntry[] {
  return entries.sort((a, b) => a.label.localeCompare(b.label));
}

export function paletteEntries(input: string, sources: PaletteSources): PaletteEntry[] {
  const query = parseQuery(input);
  const { commands, values, score } = sources;
  switch (query.kind) {
    case 'bar': {
      if (score === null) return [note('bar', p.goToBarField, p.reasons.noScore)];
      const { bar } = query;
      if (bar === null || bar < 1 || bar > score.barCount)
        return [note('bar', bar === null ? p.goToBarField : p.goToBar(bar), p.typeBar(score.barCount))];
      return [
        {
          id: `bar=${String(bar)}`,
          label: p.goToBar(bar),
          keys: null,
          hint: null,
          reason: null,
          group: 'results',
          run: () => {
            sources.goToBar(bar - 1);
          },
          complete: null,
          remember: null,
        },
      ];
    }
    case 'section': {
      if (score === null) return [note('section', p.goToSectionField, p.reasons.noScore)];
      if (score.sections.length === 0) return [note('section', p.goToSectionField, p.reasons.noSections)];
      const sections = score.sections.map(section => ({
        ...section,
        label: p.sectionName(section.marker, section.text),
        aliases: [section.marker, section.text],
      }));
      // In the score's order, unless something is typed.
      const found = query.text.length === 0 ? sections : searchCommands(query.text, sections);
      return found.map(section => ({
        id: `section=${String(section.index)}`,
        label: p.goToSection(section.label),
        keys: null,
        hint: null,
        reason: null,
        group: 'results',
        run: () => {
          sources.goToBar(section.index);
        },
        complete: null,
        remember: null,
      }));
    }
    case 'all': {
      const all = [
        ...commands.map(command => ({ entry: fromCommand(command, 'results'), searchable: command })),
        ...values.map(command => ({ entry: asking(command), searchable: command })),
      ];
      return alphabetical(
        all.filter(({ searchable }) => matchScore(query.text, searchable) !== null).map(({ entry }) => entry),
      );
    }
    case 'commands': {
      if (query.text.length === 0) {
        const recent = sources.recent.flatMap(id => {
          const command = commands.find(candidate => candidate.id === id);
          return command === undefined ? [] : [fromCommand(command, 'recent')];
        });
        const rest = alphabetical([
          ...commands
            .filter(command => !sources.recent.includes(command.id))
            .map(command => fromCommand(command, 'results')),
          ...values.map(asking),
        ]);
        return [...recent, ...rest];
      }
      const { value } = query;
      const valued =
        value === null ? [] : searchCommands(value.name, values).map(command => withValue(command, value));
      const found = searchCommands(query.text, [...commands, ...values]).map(command =>
        'apply' in command ? asking(command) : fromCommand(command, 'results'),
      );
      return [
        ...valued,
        ...found.filter(entry => !valued.some(other => other.id.startsWith(`${entry.id}=`))),
      ];
    }
  }
}
