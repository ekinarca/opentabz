import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { collectTrackLyrics, lyricChunks } from '../src/playback/track-lyrics.ts';
import { readFixture } from './helpers.ts';

/** alphaTab's own split of lyrics into the chunks it gives the beats. */
function alphaTabChunks(text: string): string[] {
  const lyrics = new alphaTab.model.Lyrics();
  lyrics.text = text;
  lyrics.finish();
  return lyrics.chunks;
}

describe('track lyrics for the lyrics pane (VIEW-010)', () => {
  it.each([
    'One two-oo\nthree four',
    '[Verse]\nMorn-ing light  up-on the riv-er\r\nCar-ry me',
    'Hel--lo wor+ld__ and_ - more',
    '[A] b [C]d\te',
    '  lead-ing spa-ces',
  ])('splits %j into the chunks alphaTab gives the beats', text => {
    expect(lyricChunks(text).map(chunk => chunk.text)).toEqual(alphaTabChunks(text));
  });

  it('keeps the line breaks and the comments alphaTab drops', () => {
    const chunks = lyricChunks('[Verse]\nOne two\nthree [Chorus] four');
    expect(chunks.map(chunk => [chunk.text, chunk.lineStart, chunk.heading])).toEqual([
      ['', true, 'Verse'],
      ['One', true, null],
      ['two', false, null],
      ['three', true, null],
      ['', true, 'Chorus'],
      ['four', false, null],
    ]);
  });

  it('gives each syllable its beat, its line and its heading, words joined', () => {
    const { score } = openScore(readFixture('alphatex/views/lyrics.atex'), 'lyrics.atex');
    const { verses } = collectTrackLyrics(score, 0);
    expect(verses).toHaveLength(1);
    const verse = verses[0] ?? [];
    const lines: string[] = [];
    let line = '';
    for (const syllable of verse) {
      if (syllable.lineStart) {
        if (line.length > 0) lines.push(line);
        line = syllable.heading === null ? '' : `[${syllable.heading}] `;
      }
      line += `${syllable.text}${syllable.continues ? '-' : ' '}`;
    }
    lines.push(line);
    expect(lines.map(line => line.trim())).toEqual([
      '[Verse] Morn-ing light up-on the riv-er',
      'Car-ry me a-long the shore',
      '[Chorus] Sing it out and sing it loud',
    ]);
    // Each syllable is on the beat alphaTab put it on.
    const beats = new Map(
      score.tracks[0]?.staves[0]?.bars.flatMap(
        bar => bar.voices[0]?.beats.map(beat => [beat.id, beat]) ?? [],
      ),
    );
    for (const syllable of verse) {
      expect(beats.get(syllable.beatId)?.lyrics?.[0]?.replace(/-+$/, '')).toBe(syllable.text);
    }
    // The first beat takes the empty chunk after the comment, as in the score.
    expect(beats.get(verse[0]?.beatId ?? -1)?.index).toBe(1);
    expect(collectTrackLyrics(score, 1).verses).toEqual([]);
  });

  it('reads the lyrics of Guitar Pro files the same way', () => {
    // The fixture saved as a Guitar Pro 7 file and opened again.
    const tex = openScore(readFixture('alphatex/views/lyrics.atex'), 'lyrics.atex').score;
    const gp = new alphaTab.exporter.Gp7Exporter().export(tex, new alphaTab.Settings());
    const { score } = openScore(gp, 'lyrics.gp');
    const { verses } = collectTrackLyrics(score, 0);
    const beats = new Map(
      score.tracks[0]?.staves[0]?.bars.flatMap(
        bar => bar.voices[0]?.beats.map(beat => [beat.id, beat]) ?? [],
      ),
    );
    const verse = verses[0] ?? [];
    expect(verse.map(syllable => syllable.text).join(' ')).toContain('Morn ing light up on the riv er');
    for (const syllable of verse) {
      expect(beats.get(syllable.beatId)?.lyrics?.[0]?.replace(/-+$/, '')).toBe(syllable.text);
    }
  });

  it('takes note-by-note lyrics (MusicXML) from the beats', () => {
    const { score } = openScore(readFixture('musicxml-testsuite/61a-Lyrics.xml'), '61a-Lyrics.xml');
    const { verses } = collectTrackLyrics(score, 0);
    expect(verses.length).toBeGreaterThan(0);
    const verse = verses[0] ?? [];
    expect(verse.length).toBeGreaterThan(3);
    expect(verse[0]?.lineStart).toBe(true);
    expect(verse.every(syllable => syllable.text.length > 0)).toBe(true);
  });
});
