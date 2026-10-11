/**
 * Proof that playback visits bars in performance order: repeats, alternate endings and the
 * D.C. / D.S. / Coda / Fine directions (FEATURE_MATRIX PLAY-020…PLAY-022, PLAY-100…PLAY-114).
 * Every case checks the timeline the cursor follows and that the MIDI plays the same bars.
 */
import { describe, expect, it } from 'vitest';
import {
  barOrder,
  notesBetween,
  playedBars,
  playFixture,
  playTex,
  QUARTER,
  soundingNotes,
  type Played,
} from './playback-helpers.ts';

const BAR = 4 * QUARTER;
/** Bar `i` of a form score plays one whole note of `BAR_PITCHES[i]` (MIDI key `BAR_KEYS[i]`). */
const BAR_PITCHES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];
const BAR_KEYS = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];

/** A score with one bar per entry: the entry holds the bar's tags (`\ro`, `\jump segno`, …). */
function form(...bars: string[]): Played {
  const body = bars.map((tags, index) => `${tags} ${BAR_PITCHES[index] ?? 'C4'}.1`).join(' |\n');
  return playTex(`\\title "Form"\n\\track "Flute" {instrument flute}\n\\staff {score}\n${body}`);
}

/** The timeline visits `order`, bar after bar without gaps, and the MIDI sounds those bars. */
function expectFormOrder(played: Played, order: readonly number[]): void {
  expect(barOrder(played)).toEqual(order);
  expect(playedBars(played.playback.timeline)).toEqual(
    order.map((masterBar, index) => ({ start: index * BAR, end: (index + 1) * BAR, masterBar })),
  );
  expect(played.playback.timeline.endTick).toBe(order.length * BAR);
  const notes = soundingNotes(played.events);
  expect(notes.map(note => note.key)).toEqual(order.map(index => BAR_KEYS[index]));
  expect(notes.map(note => note.start)).toEqual(order.map((_, index) => index * BAR));
}

/** For files with arbitrary content: bars follow each other and every pass of a bar sounds alike. */
function expectPassesSoundAlike(played: Played): void {
  const bars = playedBars(played.playback.timeline);
  const notes = soundingNotes(played.events);
  const firstPass = new Map<number, string>();
  let previousEnd = 0;
  for (const bar of bars) {
    expect(bar.start).toBe(previousEnd);
    previousEnd = bar.end;
    const sound = JSON.stringify(
      notesBetween(notes, bar.start, bar.end).map(note => [note.key, note.start - bar.start, note.velocity]),
    );
    expect(sound).not.toBe('[]');
    const first = firstPass.get(bar.masterBar);
    if (first === undefined) firstPass.set(bar.masterBar, sound);
    else expect(sound).toBe(first);
  }
}

describe('PLAY-020 repeats', () => {
  it('PLAY-020 plays a repeat as many times as its count in Guitar Pro 7 files', () => {
    const twice = playFixture('alphatab/guitarpro7/repeat-close.gp');
    expect(barOrder(twice)).toEqual([0, 1, 0, 1, 2]);
    expectPassesSoundAlike(twice);
    // The closing bar says "x4": four passes in all.
    const fourTimes = playFixture('alphatab/guitarpro7/repeat-close-multi.gp');
    expect(fourTimes.score.masterBars[1]?.repeatCount).toBe(4);
    expect(barOrder(fourTimes)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 2]);
    expectPassesSoundAlike(fourTimes);
  });

  it('PLAY-020 repeats from the start of the piece when the opening repeat sign is left out', () => {
    const played = playFixture('alphatab/guitarpro5/repeat-close-without-start-at-beginning.gp5');
    expect(played.score.masterBars[0]?.isRepeatStart).toBe(false);
    expect(barOrder(played)).toEqual([0, 1, 0, 1]);
    expectPassesSoundAlike(played);
    expectFormOrder(form('', '\\rc 2', ''), [0, 1, 0, 1, 2]);
  });

  it('PLAY-020 repeats a passage in the middle of a piece three times', () => {
    expectFormOrder(form('', '\\ro', '\\rc 3', ''), [0, 1, 2, 1, 2, 1, 2, 3]);
  });

  it('PLAY-020 replays an inner repeat on every pass of the outer one', () => {
    expectFormOrder(form('\\ro', '\\ro', '\\rc 2', '\\rc 2', ''), [0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3, 4]);
  });
});

describe('PLAY-021 alternate endings', () => {
  it('PLAY-021 takes first and second endings on the matching passes', () => {
    expectFormOrder(form('\\ro', '\\ae 1 \\rc 2', '\\ae 2', ''), [0, 1, 0, 2, 3]);
  });

  it('PLAY-021 shares one ending between two passes and gives the last pass its own', () => {
    expectFormOrder(form('\\ro', '\\ae (1 2) \\rc 3', '\\ae 3', ''), [0, 1, 0, 1, 0, 2, 3]);
  });

  it('PLAY-021 keeps bars after an ending bracket in that ending', () => {
    // The first ending is two bars long: bar 2 carries no bracket of its own.
    expectFormOrder(form('\\ro', '\\ae 1', '\\rc 2', '\\ae 2', ''), [0, 1, 2, 0, 3, 4]);
  });

  it('PLAY-021 follows the endings of a Guitar Pro 7 file across four passes', () => {
    const played = playFixture('alphatab/guitarpro7/repeat-close-alternate-endings.gp');
    const endings = played.score.masterBars.map(bar => bar.alternateEndings);
    // Bar 1 is ending 1 and 3 (bit mask 0b101), bar 2 ending 2; bar 3 closes a four-pass repeat.
    expect(endings).toEqual([0, 0b101, 0b010, 0, 0]);
    expect(played.score.masterBars[3]?.repeatCount).toBe(4);
    expect(barOrder(played)).toEqual([0, 1, 0, 2, 3, 0, 1, 0, 4]);
    expectPassesSoundAlike(played);
  });
});

// alphaTab 1.8.4 got single jumps right, but a D.C. landed on a pickup bar (PLAY-100), a D.S.
// inside a repeat fired on the first pass (PLAY-104), a D.S.S. was never taken after a plain D.S.
// (PLAY-108) and every alternate ending played again after a jump. Patch 0016 fixes all four.
describe('Da Capo and Dal Segno', () => {
  it('Da Capo goes back to the first bar and plays on to the end', () => {
    expectFormOrder(form('', '', '\\jump daCapo', ''), [0, 1, 2, 0, 1, 2, 3]);
  });

  it('Dal Segno goes back to the Segno and plays on to the end', () => {
    expectFormOrder(form('', '\\jump segno', '', '\\jump dalSegno', ''), [0, 1, 2, 3, 1, 2, 3, 4]);
  });

  it('Dal Segno returns to the Segno, not to a Segno Segno', () => {
    expectFormOrder(
      form('\\jump segnoSegno', '\\jump segno', '', '\\jump dalSegno', ''),
      [0, 1, 2, 3, 1, 2, 3, 4],
    );
  });

  it('a D.S. whose Segno is missing is passed by', () => {
    expectFormOrder(form('', '', '\\jump dalSegno', ''), [0, 1, 2, 3]);
  });

  it('Dal Segno Segno jumps back to the Segno Segno in a score without a D.S.', () => {
    expectFormOrder(
      form('\\jump segno', '\\jump segnoSegno', '', '\\jump dalSegnoSegno', ''),
      [0, 1, 2, 3, 1, 2, 3, 4],
    );
  });

  it('a whole song form plays with a repeated intro and D.S. al Coda', () => {
    const played = playFixture('alphatex/playback/coda-march.atex');
    // Intro twice, verse (Segno) with To Coda, bridge with D.S. al Coda, verse again, coda.
    expect(barOrder(played)).toEqual([0, 0, 1, 2, 3, 4, 5, 1, 2, 3, 6, 7]);
    expectPassesSoundAlike(played);
  });
});

describe('PLAY-022 jumps after repeats and endings', () => {
  it('PLAY-022 after a jump the repeat is not taken again: only the last ending plays', () => {
    expectFormOrder(
      form('\\ro', '\\ae 1 \\rc 2', '\\ae 2', '', '\\jump daCapo'),
      [0, 1, 0, 2, 3, 4, 0, 2, 3, 4],
    );
    // A first ending of two bars is passed by whole.
    expectFormOrder(
      form('\\jump segno \\ro', '\\ae 1', '\\rc 2', '\\ae 2', '\\jump dalSegnoAlFine \\jump fine'),
      [0, 1, 2, 0, 3, 4, 0, 3, 4],
    );
  });
});

describe('PLAY-100 Da Capo after a pickup bar', () => {
  it('PLAY-100 lands on the bar after the pickup', () => {
    expectFormOrder(form('\\ac', '', '\\jump daCapo', ''), [0, 1, 2, 1, 2, 3]);
    expectFormOrder(form('\\ac', '\\jump fine', '\\jump daCapoAlFine'), [0, 1, 2, 1]);
  });
});

describe('PLAY-104 Dal Segno inside a repeat', () => {
  it('PLAY-104 fires on the last pass of the repeat, not the first', () => {
    expectFormOrder(form('\\jump segno', '\\ro', '\\rc 2 \\jump dalSegno', ''), [0, 1, 2, 1, 2, 0, 1, 2, 3]);
    // Three passes: the jump waits for the third.
    expectFormOrder(form('\\ro \\jump segno', '\\rc 3 \\jump dalSegno', ''), [0, 1, 0, 1, 0, 1, 0, 1, 2]);
  });

  it('PLAY-104 a Da Capo inside a repeat waits for the last pass too', () => {
    expectFormOrder(form('', '\\ro', '\\rc 2 \\jump daCapo', ''), [0, 1, 2, 1, 2, 0, 1, 2, 3]);
  });
});

describe('PLAY-108 Dal Segno Segno', () => {
  it('PLAY-108 is taken once a Dal Segno has jumped', () => {
    expectFormOrder(
      form('\\jump segno', '\\jump segnoSegno', '\\jump dalSegno', '', '\\jump dalSegnoSegno', ''),
      [0, 1, 2, 0, 1, 2, 3, 4, 1, 2, 3, 4, 5],
    );
  });

  it('PLAY-108 is passed by while a Dal Segno is still to come', () => {
    expectFormOrder(
      form('\\jump segnoSegno', '\\jump dalSegnoSegno', '\\jump segno', '\\jump dalSegno', ''),
      [0, 1, 2, 3, 2, 3, 4],
    );
  });
});

describe('PLAY-101…PLAY-103 Da Capo variants', () => {
  it('PLAY-101 D.C. al Coda plays from the start to To Coda, then jumps to the Coda', () => {
    expectFormOrder(
      form('', '\\jump daCoda', '', '\\jump daCapoAlCoda', '\\jump coda', ''),
      [0, 1, 2, 3, 0, 1, 4, 5],
    );
  });

  it('PLAY-102 D.C. al Double Coda branches at To Double Coda and passes To Coda by', () => {
    expectFormOrder(
      form(
        '',
        '\\jump daCoda',
        '\\jump daDoubleCoda',
        '\\jump daCapoAlDoubleCoda',
        '\\jump coda',
        '\\jump doubleCoda',
      ),
      [0, 1, 2, 3, 0, 1, 2, 5],
    );
  });

  it('PLAY-103 D.C. al Fine plays from the start and stops at the Fine', () => {
    expectFormOrder(form('', '\\jump fine', '', '\\jump daCapoAlFine'), [0, 1, 2, 3, 0, 1]);
  });
});

describe('PLAY-105…PLAY-107 Dal Segno variants', () => {
  it('PLAY-105 D.S. al Coda returns to the Segno, then jumps from To Coda to the Coda', () => {
    expectFormOrder(
      form('', '\\jump segno', '\\jump daCoda', '\\jump dalSegnoAlCoda', '\\jump coda'),
      [0, 1, 2, 3, 1, 2, 4],
    );
  });

  it('PLAY-106 D.S. al Double Coda branches at To Double Coda and passes To Coda by', () => {
    expectFormOrder(
      form(
        '',
        '\\jump segno',
        '\\jump daCoda',
        '\\jump daDoubleCoda',
        '\\jump dalSegnoAlDoubleCoda',
        '\\jump coda',
        '\\jump doubleCoda',
      ),
      [0, 1, 2, 3, 4, 1, 2, 3, 6],
    );
  });

  it('PLAY-107 D.S. al Fine returns to the Segno and stops at the Fine', () => {
    expectFormOrder(form('', '\\jump segno', '\\jump fine', '\\jump dalSegnoAlFine', ''), [0, 1, 2, 3, 1, 2]);
  });
});

describe('PLAY-109…PLAY-111 Dal Segno Segno variants', () => {
  it('PLAY-109 D.S.S. al Coda returns to the Segno Segno (not the Segno), then takes the Coda', () => {
    expectFormOrder(
      form('\\jump segno', '\\jump segnoSegno', '\\jump daCoda', '\\jump dalSegnoSegnoAlCoda', '\\jump coda'),
      [0, 1, 2, 3, 1, 2, 4],
    );
  });

  it('PLAY-110 D.S.S. al Double Coda returns to the Segno Segno and branches at To Double Coda', () => {
    expectFormOrder(
      form(
        '\\jump segno',
        '\\jump segnoSegno',
        '\\jump daCoda',
        '\\jump daDoubleCoda',
        '\\jump dalSegnoSegnoAlDoubleCoda',
        '\\jump coda',
        '\\jump doubleCoda',
      ),
      [0, 1, 2, 3, 4, 1, 2, 3, 6],
    );
  });

  it('PLAY-111 D.S.S. al Fine returns to the Segno Segno and stops at the Fine', () => {
    expectFormOrder(
      form('\\jump segno', '\\jump segnoSegno', '\\jump fine', '\\jump dalSegnoSegnoAlFine', ''),
      [0, 1, 2, 3, 1, 2],
    );
  });

  it('a D.S.S. al Double Coda after a D.S. al Coda fires once the Coda has been reached', () => {
    expectFormOrder(
      form(
        '\\jump segno',
        '\\jump daCoda',
        '\\jump dalSegnoAlCoda',
        '\\jump coda',
        '\\jump segnoSegno',
        '\\jump daDoubleCoda',
        '\\jump dalSegnoSegnoAlDoubleCoda',
        '\\jump doubleCoda',
      ),
      [0, 1, 2, 0, 1, 3, 4, 5, 6, 4, 5, 7],
    );
  });
});

describe('PLAY-112…PLAY-114 To Coda, To Double Coda and Fine', () => {
  it('PLAY-112 To Coda is passed by until an al Coda jump arms it, then fires on the first pass inside a repeat', () => {
    // Bars 0–2 repeat; To Coda sits inside the repeat and is ignored on both passes before the D.C.
    expectFormOrder(
      form('\\ro', '\\jump daCoda', '\\rc 2', '\\jump daCapoAlCoda', '\\jump coda'),
      [0, 1, 2, 0, 1, 2, 3, 0, 1, 4],
    );
    // The same with D.S. al Coda: the repeat starts at the Segno.
    expectFormOrder(
      form('', '\\jump segno \\ro', '\\jump daCoda', '\\rc 2', '\\jump dalSegnoAlCoda', '\\jump coda'),
      [0, 1, 2, 3, 1, 2, 3, 4, 1, 2, 5],
    );
  });

  it('PLAY-113 To Double Coda follows the same arming rules as To Coda', () => {
    expectFormOrder(
      form('\\ro', '\\jump daDoubleCoda', '\\rc 2', '\\jump daCapoAlDoubleCoda', '\\jump doubleCoda'),
      [0, 1, 2, 0, 1, 2, 3, 0, 1, 4],
    );
    // A D.C. al Coda does not arm To Double Coda: bar 1 is passed by, the jump happens at bar 2.
    expectFormOrder(
      form(
        '',
        '\\jump daDoubleCoda',
        '\\jump daCoda',
        '\\jump daCapoAlCoda',
        '\\jump coda',
        '\\jump doubleCoda',
      ),
      [0, 1, 2, 3, 0, 1, 2, 4, 5],
    );
  });

  it('PLAY-114 Fine is passed by on the first time through and ends playback after the jump', () => {
    expectFormOrder(form('', '\\jump fine', ''), [0, 1, 2]);
    const played = form('', '\\jump fine', '', '\\jump daCapoAlFine');
    expectFormOrder(played, [0, 1, 2, 3, 0, 1]);
    // Nothing sounds after the Fine bar: the last note ends with it.
    const notes = soundingNotes(played.events);
    expect(Math.max(...notes.map(note => note.end))).toBe(6 * BAR);
  });
});
