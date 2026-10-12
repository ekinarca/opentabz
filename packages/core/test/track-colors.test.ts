/**
 * Track colours (REND-036): every track's colour as Guitar Pro files give it, in each of their
 * formats; tracks of files that give none (MusicXML, alphaTex without colours) a colour each, told
 * apart; and the colours kept when the score is written out as a Guitar Pro file.
 */
import { describe, expect, it } from 'vitest';
import { TRACK_COLORS } from '../src/document/track-colors.ts';
import { EngineHost } from '../src/engine/host.ts';
import type { DocSummary } from '../src/shared/summary.ts';
import { readFixture } from './helpers.ts';

function open(host: EngineHost, name: string, bytes: Uint8Array): DocSummary {
  const copy = bytes.slice();
  const opened = host.open({ name, bytes: copy.buffer });
  if (!opened.ok) throw new Error(`${name} did not open.`);
  return opened.summary;
}

function colors(summary: DocSummary): string[] {
  return summary.tracks.map(track => track.color);
}

const tex = (body: string) => new TextEncoder().encode(body);

describe('track colours (REND-036)', () => {
  it.each([
    'alphatab/guitarpro4/colors.gp4',
    'alphatab/guitarpro5/colors.gp5',
    'alphatab/guitarpro6/colors.gpx',
    'alphatab/guitarpro7/colors.gp',
  ])('reads each track’s colour from %s', path => {
    const summary = open(new EngineHost(), path, readFixture(path));
    expect(summary.tracks.map(track => [track.name, track.color])).toEqual([
      ['Red', '#FF0000'],
      ['Green', '#00FF00'],
      ['Yellow', '#FFFF00'],
      ['Blue', '#0000FF'],
    ]);
  });

  it('gives each track of a file without colours one of its own', () => {
    const path = 'musicxml-testsuite/41a-MultiParts-Partorder.xml';
    const summary = open(new EngineHost(), path, readFixture(path));
    expect(summary.tracks.length).toBe(4);
    expect(colors(summary)).toEqual(TRACK_COLORS.slice(0, 4));
    expect(new Set(colors(summary)).size).toBe(4);
  });

  it('keeps the colours alphaTex gives, and colours the tracks it leaves', () => {
    const summary = open(
      new EngineHost(),
      'colours.atex',
      tex(
        [
          '\\track "Lead" {color "#2E6FBA"}',
          'C4.4 C4 C4 C4 |',
          '\\track "Rhythm"',
          'C4.4 C4 C4 C4 |',
          '\\track "Bass"',
          'C3.4 C3 C3 C3 |',
        ].join('\n'),
      ),
    );
    expect(colors(summary)).toEqual(['#2E6FBA', TRACK_COLORS[1], TRACK_COLORS[2]]);
  });

  it('keeps every track’s colour in a written-out copy', () => {
    const host = new EngineHost();
    const summary = open(
      host,
      'form.atex',
      tex(
        ['\\track "Lead"', '\\ro C4.1 | \\rc 2 D4.1 |', '\\track "Bass"', '\\ro C3.1 | \\rc 2 D3.1 |'].join(
          '\n',
        ),
      ),
    );
    const { bytes } = host.unfoldDocument({ docId: summary.id });
    const unfolded = open(host, 'form (unfolded).gp', new Uint8Array(bytes));
    expect(colors(unfolded)).toEqual(colors(summary));
    expect(colors(summary)).toEqual(TRACK_COLORS.slice(0, 2));
  });
});
