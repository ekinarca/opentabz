/**
 * Finding commands in the command palette (UX-033), as Guitar Pro's smart search does: by the
 * start of a command's name or of a word in it, by its initials ("zi" for Zoom in), by an alias
 * ("pdf" for Export), by any part of its name, or by its letters in order; the closest first. Names
 * are matched as the interface writes them, so a translated interface is searched in its language.
 */

export interface Searchable {
  /** The name the palette shows. */
  readonly label: string;
  /** Other words for it: what it is also called, or what it makes ("pdf", "midi"). */
  readonly aliases?: readonly string[];
}

/** Lower case, without accents, punctuation or repeated spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+\-%. ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  return text.split(/[ -]/).filter(word => word.length > 0);
}

/** How far apart the letters of `query` lie in `text`, in order; null when they do not. */
function spread(query: string, text: string): number | null {
  let at = -1;
  let gaps = 0;
  for (const letter of query) {
    if (letter === ' ') continue;
    const found = text.indexOf(letter, at + 1);
    if (found < 0) return null;
    if (at >= 0) gaps += found - at - 1;
    at = found;
  }
  return gaps;
}

/** How well a command matches what was typed: higher is closer, null is no match. */
export function matchScore(query: string, item: Searchable): number | null {
  const wanted = normalize(query);
  if (wanted.length === 0) return 0;
  const label = normalize(item.label);
  const aliases = (item.aliases ?? []).map(normalize);
  const labelWords = words(label);
  if (label === wanted) return 1000;
  if (label.startsWith(wanted)) return 900;
  if (aliases.includes(wanted)) return 850;
  const tokens = words(wanted);
  // Every word typed starts a word of the name, in any order ("in zoom").
  if (tokens.every(token => labelWords.some(word => word.startsWith(token)))) return 700;
  if (aliases.some(alias => alias.startsWith(wanted))) return 650;
  // Initials: "zi" for Zoom in, "ss" for Song start.
  const initials = labelWords.map(word => word[0] ?? '').join('');
  if (!wanted.includes(' ') && wanted.length > 1 && initials.startsWith(wanted)) return 600;
  if (label.includes(wanted)) return 400;
  if (aliases.some(alias => alias.includes(wanted))) return 300;
  const gaps = spread(wanted, label);
  if (gaps !== null) return Math.max(1, 200 - gaps);
  return null;
}

/** The commands that match, the closest first, then in alphabetical order. */
export function searchCommands<T extends Searchable>(query: string, items: readonly T[]): T[] {
  return items
    .flatMap(item => {
      const score = matchScore(query, item);
      return score === null ? [] : [{ item, score }];
    })
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .map(({ item }) => item);
}
