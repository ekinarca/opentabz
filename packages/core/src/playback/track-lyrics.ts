/**
 * The lyrics of one track for the lyrics pane (engine worker): syllable by syllable on the beats
 * they are sung on, line by line as written. Lyrics typed for a whole track (Guitar Pro,
 * alphaTex) are read again as alphaTab reads them, keeping what it drops: line breaks and
 * comments in brackets. Lyrics that come note by note (MusicXML) are taken from the beats, a
 * line starting at each section.
 */
import type * as alphaTab from '@coderline/alphatab';
import type { LyricSyllable, TrackLyrics } from '../shared/lyrics.ts';

interface Chunk {
  readonly text: string;
  readonly lineStart: boolean;
  readonly heading: string | null;
}

const LF = 10;
const CR = 13;
const TAB = 9;
const SPACE = 32;
const OPEN = 91;
const CLOSE = 93;
const DASH = 45;

/** alphaTab's `Lyrics._prepareChunk`: `+` joins words on one beat, trailing `_` go. */
function prepare(text: string): string {
  return text.split('+').join(' ').replace(/_+$/, '');
}

/**
 * The syllables of lyrics as alphaTab's `Lyrics._parse` splits them (the same chunks, empty ones
 * included), each with whether a line starts with it and the comment before it.
 */
export function lyricChunks(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let state = 1;
  let next = 1;
  let skipSpace = false;
  let start = 0;
  let lineStart = true;
  let heading: string | null = null;
  let commentStart = 0;
  const add = (raw: string) => {
    chunks.push({ text: prepare(raw), lineStart, heading });
    lineStart = false;
    heading = null;
  };
  let p = 0;
  while (p < text.length) {
    const c = text.charCodeAt(p);
    switch (state) {
      case 0:
        if (c === LF || c === CR || c === TAB) {
          if (c !== TAB) lineStart = true;
          break;
        }
        if (c === SPACE && skipSpace) break;
        if (c !== SPACE) skipSpace = false;
        state = next;
        continue;
      case 1:
        if (c === OPEN) {
          state = 3;
          commentStart = p + 1;
          break;
        }
        start = p;
        state = 2;
        continue;
      case 3:
        if (c === CLOSE) {
          state = 1;
          const comment = text.slice(commentStart, p).trim();
          if (comment.length > 0) heading = comment;
          lineStart = true;
        }
        break;
      case 2:
        if (c === DASH) state = 4;
        else if (c === CR || c === LF || c === SPACE) {
          add(text.slice(start, p));
          if (c !== SPACE) lineStart = true;
          state = 0;
          next = 1;
        }
        break;
      case 4:
        if (c === DASH) break;
        add(text.slice(start, p));
        skipSpace = true;
        state = 0;
        next = 1;
        continue;
    }
    p += 1;
  }
  if (state === 2 && p !== start) add(text.slice(start, p));
  return chunks;
}

function syllable(
  beatId: number,
  text: string,
  lineStart: boolean,
  heading: string | null,
): LyricSyllable | null {
  const continues = text.endsWith('-');
  const shown = text.replace(/-+$/, '');
  if (shown.length === 0) return null;
  return { beatId, text: shown, continues, lineStart, heading };
}

export function collectTrackLyrics(score: alphaTab.model.Score, trackIndex: number): TrackLyrics {
  const track = score.tracks[trackIndex];
  const staff = track?.staves[0];
  if (track === undefined || staff === undefined) return { trackIndex, verses: [] };
  const typed = track.lyrics;
  const verses: LyricSyllable[][] = [];
  if (typed.length > 0) {
    typed.forEach((lyric, line) => {
      const syllables: LyricSyllable[] = [];
      if (lyric.startBar >= 0 && lyric.startBar < staff.bars.length) {
        // The beats alphaTab gives the chunks to (Track.applyLyrics): rests and empty beats skipped.
        let beat: alphaTab.model.Beat | null = staff.bars[lyric.startBar]?.voices[0]?.beats[0] ?? null;
        let carried: { lineStart: boolean; heading: string | null } = { lineStart: false, heading: null };
        for (const chunk of lyricChunks(lyric.text)) {
          while (beat !== null && (beat.isEmpty || beat.isRest)) beat = beat.nextBeat;
          if (beat === null) break;
          const lineStart = chunk.lineStart || carried.lineStart;
          const heading = chunk.heading ?? carried.heading;
          const sung = syllable(beat.id, chunk.text, lineStart, heading);
          if (sung === null) carried = { lineStart, heading };
          else {
            syllables.push(sung);
            carried = { lineStart: false, heading: null };
          }
          beat = beat.nextBeat;
        }
      }
      verses[line] = syllables;
    });
    return { trackIndex, verses };
  }
  // Lyrics set note by note: a line starts with each section.
  for (const bar of staff.bars) {
    for (const beat of bar.voices[0]?.beats ?? []) {
      beat.lyrics?.forEach((text, line) => {
        const syllables = (verses[line] ??= []);
        const sectionStart = bar.masterBar.section !== null && beat.index === 0;
        const sung = syllable(beat.id, text, syllables.length === 0 || sectionStart, null);
        if (sung !== null) syllables.push(sung);
      });
    }
  }
  return { trackIndex, verses };
}
