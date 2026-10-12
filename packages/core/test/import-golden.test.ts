/**
 * What every public fixture imports to, fingerprinted: the score as alphaTab's JSON converter
 * writes it, with ids renumbered in order of appearance (they come from global counters, or are
 * random for Guitar Pro 3–5 chords), hashed.
 * A change to the import path (a faster XML reader, a patch) must leave every score as it was, or
 * update the snapshot on purpose (`vitest -u`), which lists the files whose score changed.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { fingerprint } from './fingerprint.ts';
import { listFixtures, readFixture } from './helpers.ts';

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
