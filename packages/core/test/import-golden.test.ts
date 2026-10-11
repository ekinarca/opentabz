/**
 * What every public fixture imports to, fingerprinted: the score as alphaTab's JSON converter
 * writes it, with ids renumbered in order of appearance (they come from global counters, or are
 * random for Guitar Pro 3–5 chords), hashed.
 * A change to the import path (a faster XML reader, a patch) must leave every score as it was, or
 * update the snapshot on purpose (`vitest -u`), which lists the files whose score changed.
 */
import { createHash } from 'node:crypto';
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { listFixtures, readFixture } from './helpers.ts';

/** The kind of id a key holds: beats and notes are numbered by separate counters. */
function idKind(key: string, holder: object): string | null {
  if (key.endsWith('noteid')) return 'note';
  if (key.endsWith('beatid')) return 'beat';
  if (key !== 'id') return null;
  return 'notes' in holder ? 'beat' : 'note';
}

const RANDOM_ID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function fingerprint(score: alphaTab.model.Score): string {
  const ids = new Map<string, Map<number | string, number>>();
  const renumber = (kind: string, id: number | string): number => {
    let numbering = ids.get(kind);
    if (numbering === undefined) {
      numbering = new Map();
      ids.set(kind, numbering);
    }
    let renumbered = numbering.get(id);
    if (renumbered === undefined) {
      renumbered = numbering.size;
      numbering.set(id, renumbered);
    }
    return renumbered;
  };
  const json = JSON.stringify(
    alphaTab.model.JsonConverter.scoreToJsObject(score),
    function (this: object, key: string, value: unknown): unknown {
      if (value instanceof Map) {
        return Object.fromEntries(
          [...value].map(([entry, item]: [unknown, unknown]) => [
            typeof entry === 'string' && RANDOM_ID.test(entry) ? `#${renumber('random', entry)}` : entry,
            item,
          ]),
        );
      }
      if (typeof value === 'string' && RANDOM_ID.test(value)) return `#${renumber('random', value)}`;
      const kind = typeof value === 'number' ? idKind(key, this) : null;
      return kind === null || typeof value !== 'number' ? value : renumber(kind, value);
    },
  );
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

const FIXTURES = [
  ...listFixtures('alphatab', /\.(gp[345x]?|mxl|xml)$/),
  ...listFixtures('musicxml', /\.(xml|musicxml)$/),
  ...listFixtures('musicxml-testsuite', /\.xml$/),
  ...listFixtures('capella', /\.(capx|capxml)$/),
];

describe('every fixture imports to the same score', () => {
  it.each(FIXTURES)('%s', path => {
    const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
    expect(fingerprint(score)).toMatchSnapshot();
  });
});
