/**
 * What is typed in the command palette, read as Guitar Pro 8 reads it (GP-CMD-002, GP-CMD-007,
 * GP-CMD-009, GP-CMD-014): "?" lists every command, "@" (or nothing) runs one by name, "$" goes
 * to a section and ":" to a bar; a command can end with a value ("zoom 150", "speed -10").
 */

export type PaletteQuery =
  /** Every command, alphabetically, filtered by what follows. */
  | { readonly kind: 'all'; readonly text: string }
  /** Commands by name, with the value typed after the name if any. */
  | { readonly kind: 'commands'; readonly text: string; readonly value: CommandValue | null }
  | { readonly kind: 'section'; readonly text: string }
  | { readonly kind: 'bar'; readonly bar: number | null };

/** A number typed after a command's name: absolute, or a change with its sign. */
export interface CommandValue {
  readonly amount: number;
  /** "+10" or "-10": a change from the current value. */
  readonly relative: boolean;
  /** The name typed before it. */
  readonly name: string;
}

const VALUE = /^(.*?)\s+([+-]?\d+(?:[.,]\d+)?)\s*%?$/;

/** The value at the end of what was typed, if it ends with a number after a name. */
export function commandValue(text: string): CommandValue | null {
  const match = VALUE.exec(text.trim());
  if (match === null) return null;
  const name = (match[1] ?? '').trim();
  const number = match[2] ?? '';
  if (name.length === 0) return null;
  return {
    name,
    amount: Number.parseFloat(number.replace(',', '.')),
    relative: number.startsWith('+') || number.startsWith('-'),
  };
}

export function parseQuery(input: string): PaletteQuery {
  const text = input.trimStart();
  const rest = text.slice(1).trim();
  switch (text[0]) {
    case '?':
      return { kind: 'all', text: rest };
    case '$':
      return { kind: 'section', text: rest };
    case ':': {
      const bar = /^\d+$/.test(rest) ? Number.parseInt(rest, 10) : null;
      return { kind: 'bar', bar };
    }
    case '@':
      return { kind: 'commands', text: rest, value: commandValue(rest) };
    default:
      return { kind: 'commands', text: text.trim(), value: commandValue(text) };
  }
}
