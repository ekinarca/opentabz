/**
 * The editor's commands (EDIT-001) and their undo and redo (EDIT-060). Each command is checked for
 * what it writes; then, in every public fixture, runs of edits made at random places are undone
 * and redone one by one, and each time the score must be written exactly as it was (its
 * fingerprint) and alphaTab must have worked out the same from it (its links) — the same, too, as
 * when the edited score is opened afresh.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { EditError } from '../src/edit/commands.ts';
import { ScoreEditor } from '../src/edit/editor.ts';
import { openScore } from '../src/open/open.ts';
import { DURATION_VALUES, type BeatAddress, type EditCommand } from '../src/shared/edit.ts';
import { fingerprint } from './fingerprint.ts';
import { listFixtures, readFixture } from './helpers.ts';
import { links } from './score-links.ts';

function texScore(tex: string): alphaTab.model.Score {
  return openScore(new TextEncoder().encode(tex), 'edit.atex').score;
}

function editorOf(score: alphaTab.model.Score): ScoreEditor {
  return new ScoreEditor(score, new alphaTab.Settings());
}

const AT: BeatAddress = { track: 0, staff: 0, bar: 0, voice: 0, beat: 0 };

/** alphaTex's string (1 the highest) as alphaTab's model numbers it (1 the lowest), on six strings. */
function tex(string: number): number {
  return 7 - string;
}

function beat(score: alphaTab.model.Score, bar: number, index: number): alphaTab.model.Beat {
  const found = score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats[index];
  if (found === undefined) throw new Error(`No beat ${String(index)} in bar ${String(bar)}.`);
  return found;
}

/** A bar's beats: notes as fret.string (strings as alphaTex numbers them), "r" a rest, "-" empty. */
function written(score: alphaTab.model.Score, bar: number): string[] {
  return (score.tracks[0]?.staves[0]?.bars[bar]?.voices[0]?.beats ?? []).map(each =>
    each.isEmpty
      ? '-'
      : each.notes.length === 0
        ? `r${String(each.duration)}`
        : [...each.notes]
            .sort((a, b) => b.string - a.string)
            .map(note => `${String(note.fret)}.${String(tex(note.string))}`)
            .join(' ') + `:${String(each.duration)}${'.'.repeat(each.dots)}`,
  );
}

describe('commands', () => {
  it('writes a note on a fret, moves it, takes it away', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 | r.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(2) }, fret: 7 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '7.2 5.3:4']);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 12 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '7.2 12.3:4']);
    editor.apply([{ kind: 'remove-note', at: { ...AT, string: tex(3) } }]);
    expect(written(score, 0)).toEqual(['r4', '7.2 12.3:4']);
    expect(beat(score, 0, 0).isRest).toBe(true);
  });

  it('writes the first note of an empty bar', () => {
    const score = texScore('\\track "Guitar" 3.3.1 | 5.3.1');
    // alphaTex writes an empty bar as a bar without beats in its other voices; the first is ours.
    const editor = editorOf(score);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['-']);
    expect(score.tracks[0]?.staves[0]?.bars[1]?.isEmpty).toBe(true);
    editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 1, string: tex(6) }, fret: 0 }]);
    expect(written(score, 1)).toEqual(['0.6:4']);
    expect(score.tracks[0]?.staves[0]?.bars[1]?.isEmpty).toBe(false);
  });

  it('sets durations and dots', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-duration', at: { ...AT, beat: 1 }, duration: 8, dots: 1 }]);
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:8.', '7.3:4', '8.3:4']);
    expect(beat(score, 0, 2).playbackStart).toBe(960 + 720);
  });

  it('puts in a rest before a beat, or after the last, and in an empty bar', () => {
    const score = texScore('\\track "Guitar" 3.3.8 5.3.2 | 7.3.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 1 } }]);
    expect(written(score, 0)).toEqual(['3.3:8', 'r2', '5.3:2']);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 3 } }]);
    expect(written(score, 0)).toEqual(['3.3:8', 'r2', '5.3:2', 'r2']);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['r4']);
  });

  it('takes a beat away, and the only beat of a bar leaves it empty', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3 | 0.6.1');
    const editor = editorOf(score);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, beat: 2 } }]);
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:4', '8.3:4']);
    expect(beat(score, 0, 2).playbackStart).toBe(1920);
    editor.apply([{ kind: 'remove-beat', at: { ...AT, bar: 1 } }]);
    expect(written(score, 1)).toEqual(['-']);
  });

  it('parts the notes joined to one taken away: a tied note sounds as written', () => {
    const score = texScore('\\track "Guitar" 5.3 -.3 7.3{h} 8.3');
    const editor = editorOf(score);
    expect(beat(score, 0, 1).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
    editor.apply([{ kind: 'remove-note', at: { ...AT, string: tex(3) } }]);
    const held = beat(score, 0, 1).notes[0];
    expect(held?.isTieDestination).toBe(false);
    expect(held?.tieOrigin).toBeNull();
    expect(held?.fret).toBe(5);
    // A hammer-on whose destination goes now reaches nothing; undone, it is back.
    editor.apply([{ kind: 'remove-beat', at: { ...AT, beat: 3 } }]);
    expect(beat(score, 0, 2).notes[0]?.isHammerPullOrigin).toBe(false);
    editor.undo();
    expect(beat(score, 0, 2).notes[0]?.isHammerPullOrigin).toBe(true);
    expect(beat(score, 0, 2).notes[0]?.hammerPullDestination).toBe(beat(score, 0, 3).notes[0]);
    editor.undo();
    expect(beat(score, 0, 1).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
  });

  it('a tied note written on a fret is played, no longer held', () => {
    const score = texScore('\\track "Guitar" 5.3 -.3');
    const editor = editorOf(score);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 9 }]);
    const note = beat(score, 0, 1).notes[0];
    expect(note?.isTieDestination).toBe(false);
    expect(note?.fret).toBe(9);
    expect(beat(score, 0, 0).notes[0]?.tieDestination).toBeNull();
  });

  it('a note written between a tie joins the held note to it, as Guitar Pro ties to the note before', () => {
    const score = texScore('\\track "Guitar" 5.3.2 -.3.2');
    const editor = editorOf(score);
    editor.apply([{ kind: 'insert-beat', at: { ...AT, beat: 1 } }]);
    expect(beat(score, 0, 2).notes[0]?.tieOrigin).toBe(beat(score, 0, 0).notes[0]);
    editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 7 }]);
    expect(beat(score, 0, 2).notes[0]?.tieOrigin).toBe(beat(score, 0, 1).notes[0]);
    expect(beat(score, 0, 2).notes[0]?.fret).toBe(7);
  });

  it('refuses what cannot be written, leaving the score as it was', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    const before = fingerprint(score);
    const refused: EditCommand[] = [
      { kind: 'set-fret', at: { ...AT, string: tex(7) }, fret: 3 },
      { kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 100 },
      { kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 1.5 },
      { kind: 'remove-note', at: { ...AT, string: tex(1) } },
      { kind: 'set-duration', at: AT, duration: 4, dots: 3 },
      { kind: 'insert-beat', at: { ...AT, beat: 5 } },
      { kind: 'remove-beat', at: { ...AT, bar: 1 } },
      { kind: 'set-fret', at: { ...AT, track: 1, string: tex(1) }, fret: 0 },
    ];
    for (const command of refused) {
      // One command made, the next refused: the edit is made whole or not at all.
      expect(() =>
        editor.apply([{ kind: 'set-fret', at: { ...AT, beat: 1, string: tex(1) }, fret: 3 }, command]),
      ).toThrow(EditError);
      expect(fingerprint(score)).toBe(before);
    }
    expect(editor.canUndo).toBe(false);
  });

  it('refuses frets on a drum staff', () => {
    const score = texScore(
      '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:4 (KickHit HiHatClosed) HiHatClosed',
    );
    expect(() =>
      editorOf(score).apply([{ kind: 'set-fret', at: { ...AT, string: tex(1) }, fret: 3 }]),
    ).toThrow('The staff has no strings.');
  });
});

describe('undo and redo', () => {
  it('undoes and redoes edits in turn; a new edit forgets what was undone', () => {
    const score = texScore('\\track "Guitar" 3.3 5.3 7.3 8.3');
    const editor = editorOf(score);
    expect([editor.canUndo, editor.canRedo, editor.undo(), editor.redo()]).toEqual([
      false,
      false,
      null,
      null,
    ]);
    editor.apply([{ kind: 'set-fret', at: { ...AT, string: tex(3) }, fret: 1 }]);
    editor.apply([
      { kind: 'set-fret', at: { ...AT, beat: 1, string: tex(3) }, fret: 2 },
      { kind: 'set-fret', at: { ...AT, beat: 2, string: tex(3) }, fret: 3 },
    ]);
    expect(written(score, 0)).toEqual(['1.3:4', '2.3:4', '3.3:4', '8.3:4']);
    expect(editor.undo()).toEqual({ firstChangedMasterBar: 0 });
    expect(written(score, 0)).toEqual(['1.3:4', '5.3:4', '7.3:4', '8.3:4']);
    editor.undo();
    expect(written(score, 0)).toEqual(['3.3:4', '5.3:4', '7.3:4', '8.3:4']);
    expect([editor.canUndo, editor.canRedo]).toEqual([false, true]);
    editor.redo();
    expect(written(score, 0)).toEqual(['1.3:4', '5.3:4', '7.3:4', '8.3:4']);
    editor.apply([{ kind: 'remove-beat', at: AT }]);
    expect([editor.canUndo, editor.canRedo]).toEqual([true, false]);
    expect(editor.redo()).toBeNull();
  });

  it('lays out again from three bars before the first bar edited', () => {
    const score = texScore(`\\track "Guitar" ${'3.3.1 | '.repeat(9)}3.3.1`);
    const editor = editorOf(score);
    expect(editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 7, string: tex(3) }, fret: 5 }])).toEqual({
      firstChangedMasterBar: 4,
    });
    expect(editor.apply([{ kind: 'set-fret', at: { ...AT, bar: 1, string: tex(3) }, fret: 5 }])).toEqual({
      firstChangedMasterBar: 0,
    });
  });
});

/** A small random number generator, seeded, so that every run edits the same places. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
  return hash >>> 0;
}

/** A command at a random place of a random string staff, of a random kind. */
function randomCommand(score: alphaTab.model.Score, random: () => number): EditCommand | null {
  const pick = (count: number): number => Math.floor(random() * count);
  const staves = score.tracks.flatMap(track =>
    track.staves.filter(staff => !staff.isPercussion && staff.tuning.length > 0),
  );
  const staff = staves[pick(staves.length)];
  if (staff === undefined) return null;
  const bar = staff.bars[pick(staff.bars.length)];
  const voice = bar?.voices[pick(bar.voices.length)];
  if (bar === undefined || voice === undefined) return null;
  const index = pick(voice.beats.length);
  const at: BeatAddress = {
    track: staff.track.index,
    staff: staff.index,
    bar: bar.index,
    voice: voice.index,
    beat: index,
  };
  const string = 1 + pick(staff.tuning.length);
  const notes = voice.beats[index]?.notes.filter(note => note.isStringed) ?? [];
  switch (pick(6)) {
    case 0:
      return { kind: 'set-fret', at: { ...at, string }, fret: pick(25) };
    case 1: {
      const note = notes[pick(notes.length)];
      return note === undefined
        ? { kind: 'set-fret', at: { ...at, string }, fret: pick(25) }
        : { kind: 'set-fret', at: { ...at, string: note.string }, fret: pick(25) };
    }
    case 2: {
      const note = notes[pick(notes.length)];
      return note === undefined
        ? { kind: 'remove-beat', at }
        : { kind: 'remove-note', at: { ...at, string: note.string } };
    }
    case 3:
      return {
        kind: 'set-duration',
        at,
        duration: DURATION_VALUES[pick(DURATION_VALUES.length)] ?? 4,
        dots: pick(2),
      };
    case 4:
      return { kind: 'insert-beat', at: { ...at, beat: pick(voice.beats.length + 1) } };
    default:
      return { kind: 'remove-beat', at };
  }
}

interface ScoreState {
  readonly written: string;
  readonly links: string;
}

function stateOf(score: alphaTab.model.Score): ScoreState {
  return { written: fingerprint(score), links: links(score) };
}

/** The score opened afresh from what is written in it. */
function reopened(score: alphaTab.model.Score): alphaTab.model.Score {
  const settings = new alphaTab.Settings();
  return alphaTab.model.JsonConverter.jsObjectToScore(
    alphaTab.model.JsonConverter.scoreToJsObject(score),
    settings,
  );
}

const FIXTURES = [
  ...listFixtures('alphatab', /\.(gp[345x]?|mxl|xml)$/),
  ...listFixtures('musicxml', /\.(xml|musicxml)$/),
  ...listFixtures('capella', /\.(capx|capxml)$/),
  ...listFixtures('alphatex', /\.atex$/),
];

/** How many edits each fixture gets. */
const EDITS = 24;

describe('every edit is undone and redone exactly, in every fixture', () => {
  it.each(FIXTURES)('%s', path => {
    const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
    const editor = editorOf(score);
    const random = randomFrom(seedOf(path));
    const states = [stateOf(score)];
    for (let edit = 0; edit < EDITS; edit++) {
      const command = randomCommand(score, random);
      if (command === null) break;
      editor.apply([command]);
      const state = stateOf(score);
      expect(state.links, `edit ${String(edit)}: ${JSON.stringify(command)}`).not.toContain('detached');
      expect(links(reopened(score)), `edit ${String(edit)} opened afresh: ${JSON.stringify(command)}`).toBe(
        state.links,
      );
      states.push(state);
    }
    for (let step = states.length - 2; step >= 0; step--) {
      editor.undo();
      expect(stateOf(score), `undo to ${String(step)}`).toEqual(states[step]);
    }
    for (let step = 1; step < states.length; step++) {
      editor.redo();
      expect(stateOf(score), `redo to ${String(step)}`).toEqual(states[step]);
    }
  });
});
