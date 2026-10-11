/**
 * How techniques are engraved (REND-100…REND-145), from Guitar Pro files and alphaTex: where a
 * beat or note carries a technique, its mark is drawn at that beat, as Guitar Pro draws it, and
 * nowhere else. What a note draws itself (noteheads, fret texts, articulations, fingering, bend
 * arrows) is read from the beat's own group; marks on the rows above and below the staves are
 * placed at the beat whose notes they are nearest.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import {
  Engraving,
  engraveFixture,
  engraveTex,
  glyphs,
  type Mark,
  type MarkKind,
  texts,
} from './engraving.ts';

const { BendType, HarmonicType, SlideInType, SlideOutType, VibratoType } = alphaTab.model;
type Beat = alphaTab.model.Beat;

/** Positions of beats as "bar:beat", for readable expectations. */
function at(beats: readonly Beat[]): string[] {
  return beats.map(beat => `${beat.voice.bar.index}:${beat.index}`);
}

/** The beats, in order, where marks of a kind and name are placed. */
function placedAt(view: Engraving, kind: MarkKind, name: string): string[] {
  const beats = view.beats();
  const placed = new Set(view.placed(kind, name, beats));
  return at(beats.filter(beat => placed.has(beat)));
}

/** The beats of a view that a predicate picks. */
function where(view: Engraving, predicate: (beat: Beat) => boolean): string[] {
  return at(view.beats().filter(predicate));
}

/** The first beat of every run of consecutive beats a predicate picks: where a ranged label starts. */
function runStarts(view: Engraving, predicate: (beat: Beat) => boolean): string[] {
  const beats = view.beats();
  return at(
    beats.filter((beat, index) => {
      const previous = beats[index - 1];
      return predicate(beat) && !(previous !== undefined && predicate(previous));
    }),
  );
}

/** Texts a beat draws itself, without its fret numbers. */
function ownTexts(view: Engraving, beat: Beat): string[] {
  const frets = new Set(beat.notes.map(note => String(note.fret)));
  return texts(view.drawnBy(beat)).filter(text => !frets.has(text));
}

/** Arrowheads a beat draws (bends, strokes), left to right. */
function arrows(view: Engraving, beat: Beat): ('up' | 'down')[] {
  return view
    .drawnBy(beat)
    .filter(mark => mark.kind === 'path' && mark.name === 'fill' && mark.commands === 'MLLz')
    .sort((a, b) => a.x - b.x)
    .map(mark => {
      const [tip, base] = mark.points ?? [];
      return (tip?.y ?? 0) < (base?.y ?? 0) ? 'up' : 'down';
    });
}

/** Straight vertical lines a beat draws (the line of a pre-bend). */
function verticals(view: Engraving, beat: Beat): Mark[] {
  return view.drawnBy(beat).filter(mark => {
    const [from, to] = mark.points ?? [];
    return (
      mark.name === 'stroke' &&
      mark.commands === 'ML' &&
      from !== undefined &&
      to !== undefined &&
      Math.abs(from.x - to.x) < 0.5
    );
  });
}

/** Dashed horizontal lines a beat draws (a held bend). */
function dashedLevels(view: Engraving, beat: Beat): Mark[] {
  return view
    .drawnBy(beat)
    .filter(mark => mark.name === 'stroke' && /^(ML){3,}$/.test(mark.commands ?? '') && mark.height < 0.5);
}

describe('bends', () => {
  it('REND-100: any amount in quarter tones, written as Guitar Pro writes it, with an arrow up', () => {
    const view = engraveTex(
      ':4 7.3{b (0 1)} 7.3{b (0 2)} 7.3{b (0 3)} 7.3{b (0 4)} | 7.3{b (0 5)} 7.3{b (0 6)} 7.3{b (0 8)} r',
    );
    const bent = view.beats().filter(beat => beat.notes.length > 0);
    expect(bent.map(beat => ownTexts(view, beat))).toEqual([
      ['¼'],
      ['½'],
      ['¾'],
      ['full'],
      ['1¼'],
      ['1½'],
      ['2'],
    ]);
    for (const beat of bent) expect(arrows(view, beat)).toEqual(['up']);

    const file = engraveFixture('alphatab/guitarpro7/bends.gp');
    const bends = file.beats().filter(beat => beat.notes[0]?.bendType === BendType.Bend);
    expect(at(bends)).toEqual(['0:0', '0:1']);
    for (const beat of bends) {
      expect(ownTexts(file, beat)).toEqual(['full']);
      expect(arrows(file, beat)).toEqual(['up']);
    }
  });

  it('REND-101: bend and release, up then down, each end written where it is not the open pitch', () => {
    const view = engraveFixture('alphatab/guitarpro7/bends.gp');
    const [beat] = view.beats().filter(candidate => candidate.notes[0]?.bendType === BendType.BendRelease);
    expect(beat).toBeDefined();
    if (beat === undefined) return;
    // Up three tones, back to a tone and a half.
    expect(beat.notes[0]?.bendPoints?.map(point => point.value)).toEqual([0, 12, 12, 6]);
    expect(ownTexts(view, beat)).toEqual(['3', '1½']);
    expect(arrows(view, beat)).toEqual(['up', 'down']);
    const back = engraveTex(':2 7.3{b (0 4 4 0)} r');
    const [full] = back.beats();
    expect(full && ownTexts(back, full)).toEqual(['full']);
    expect(full && arrows(back, full)).toEqual(['up', 'down']);
  });

  it('REND-102: bend, release, bend', () => {
    const view = engraveTex(':2 7.3{b (0 4 0 4)} r');
    const [beat] = view.beats();
    expect(beat).toBeDefined();
    if (beat === undefined) return;
    expect(arrows(view, beat)).toEqual(['up', 'down', 'up']);
    expect(ownTexts(view, beat)).toEqual(['full', 'full']);
  });

  it('REND-103…REND-106: pre-bends with a straight line, holds with a dashed one, every kind on its beat', () => {
    const view = engraveFixture('alphatab/guitarpro7/bends-advanced.gp');
    const expected = new Map<number, ('up' | 'down')[]>([
      [BendType.Bend, ['up']],
      [BendType.Release, ['down']],
      [BendType.BendRelease, ['up', 'down']],
      [BendType.Prebend, ['up']],
      [BendType.PrebendBend, ['up', 'up']],
      [BendType.PrebendRelease, ['up', 'down']],
      [BendType.Hold, []],
    ]);
    const prebends = new Set<number>([BendType.Prebend, BendType.PrebendBend, BendType.PrebendRelease]);
    const kinds = new Set<number>();
    for (const beat of view.beats()) {
      const note = beat.notes.find(candidate => candidate.bendType !== BendType.None);
      if (note === undefined) continue;
      kinds.add(note.bendType);
      expect(arrows(view, beat), `${at([beat])[0]} ${BendType[note.bendType]}`).toEqual(
        expected.get(note.bendType),
      );
      expect(verticals(view, beat).length > 0, `${at([beat])[0]} pre-bend line`).toBe(
        prebends.has(note.bendType),
      );
      const held =
        note.bendType === BendType.Hold && note.bendPoints?.some(point => point.value > 0) === true;
      expect(dashedLevels(view, beat).length > 0, `${at([beat])[0]} hold`).toBe(held);
    }
    // Every kind of bend is in the file.
    expect([...kinds].sort()).toEqual([...expected.keys()].sort());
    // Pre-bend and bend: the pre-bend's amount, then the bend's.
    const prebendBend = view.beats().find(beat => beat.notes[0]?.bendType === BendType.PrebendBend);
    expect(prebendBend && ownTexts(view, prebendBend)).toEqual(['full', '1½']);
  });
});

describe('whammy bar', () => {
  /** A pitch change in quarter tones as written on a whammy diagram: -1 is a tone down. */
  function amount(quarterTones: number): string {
    const sign = quarterTones < 0 ? '-' : '';
    const value = Math.abs(quarterTones);
    const steps = Math.floor(value / 4);
    const rest = ['', '¼', '½', '¾'][value % 4] ?? '';
    return `${sign}${steps > 0 ? String(steps) : ''}${rest}`;
  }

  it('REND-107…REND-109: dives, dips, holds and pre-dives write their amounts under "w/bar"', () => {
    const view = engraveFixture('alphatab/guitarpro7/whammy-advanced.gp');
    const whammy = (beat: Beat) => beat.hasWhammyBar;
    // "w/bar" starts every run of whammy beats.
    expect(placedAt(view, 'text', 'w/bar')).toEqual(runStarts(view, whammy));
    const kinds = new Set<number>();
    const beats = view.beats();
    for (const beat of beats.filter(whammy)) {
      kinds.add(beat.whammyBarType);
      const points = beat.whammyBarPoints ?? [];
      // Each change of pitch writes where it arrives, at the end of its line (which may reach
      // the next beat); a return to the bar's pitch writes nothing.
      const arrivals = points
        .slice(1)
        .filter((point, index) => point.value !== 0 && point.value !== points[index]?.value)
        .map(point => amount(point.value));
      const next = beats[beats.indexOf(beat) + 1];
      const right =
        next !== undefined && view.span(next).system === view.span(beat).system
          ? view.span(next).right
          : Infinity;
      const written = view.marks
        .filter(
          mark =>
            mark.kind === 'text' && mark.beat === -1 && /^-?\d*[¼½¾]?$/.test(mark.name) && mark.name !== '',
        )
        .filter(mark => view.systemOf(mark) === view.span(beat).system)
        .filter(mark => mark.x + mark.width / 2 >= view.span(beat).left && mark.x + mark.width / 2 < right)
        .map(mark => mark.name);
      for (const label of new Set(arrivals)) expect(written, `${at([beat])[0]}`).toContain(label);
    }
    const { WhammyType } = alphaTab.model;
    for (const kind of [
      WhammyType.Dive,
      WhammyType.Dip,
      WhammyType.Hold,
      WhammyType.Predive,
      WhammyType.PrediveDive,
    ]) {
      expect(kinds).toContain(kind);
    }
  });
});

describe('slides', () => {
  /** Straight lines a beat draws, as rising or falling from left to right. */
  function lines(view: Engraving, beat: Beat): ('rising' | 'falling' | 'level')[] {
    return view
      .drawnBy(beat)
      .filter(mark => mark.name === 'stroke' && mark.commands === 'ML')
      .map(mark => {
        const [from, to] = mark.points ?? [];
        const rise = (from?.y ?? 0) - (to?.y ?? 0);
        return Math.abs(rise) < 0.5 ? 'level' : rise > 0 ? 'rising' : 'falling';
      });
  }

  it('REND-110…REND-113: legato and shift slides join the notes; slides in and out show their direction', () => {
    const view = engraveFixture('alphatab/guitarpro7/slides.gp');
    const beats = view.beats();
    const first = (predicate: (note: alphaTab.model.Note) => boolean) =>
      beats.find(beat => beat.notes.some(predicate));
    // Legato: "sl." and a line on both staves, with a slur.
    const legato = first(note => note.slideOutType === SlideOutType.Legato);
    expect(legato && ownTexts(view, legato)).toContain('sl.');
    expect(legato && lines(view, legato).filter(line => line === 'rising').length).toBeGreaterThanOrEqual(2);
    // Shift: a line on both staves, no "sl.".
    const shift = first(note => note.slideOutType === SlideOutType.Shift);
    expect(shift && ownTexts(view, shift)).not.toContain('sl.');
    expect(shift && lines(view, shift)).toEqual(['rising', 'rising']);
    // Into the note from below rises to it, from above falls to it.
    const fromBelow = first(note => note.slideInType === SlideInType.IntoFromBelow);
    const fromAbove = first(note => note.slideInType === SlideInType.IntoFromAbove);
    expect(fromBelow && lines(view, fromBelow)).toEqual(['rising', 'rising']);
    expect(fromAbove && lines(view, fromAbove)).toEqual(['falling', 'falling']);
    // Out of the note downwards falls, upwards rises.
    const outDown = first(note => note.slideOutType === SlideOutType.OutDown);
    const outUp = first(note => note.slideOutType === SlideOutType.OutUp);
    expect(outDown && lines(view, outDown)).toEqual(['falling', 'falling']);
    expect(outUp && lines(view, outUp)).toEqual(['rising', 'rising']);
  });

  it('REND-114: pick slides (scrapes), down and up, are a wavy line labelled "P.S."', () => {
    const view = engraveFixture('alphatab/guitarpro7/pick-slide.gp');
    const scraped = (beat: Beat) =>
      beat.notes.some(
        note =>
          note.slideOutType === SlideOutType.PickSlideDown || note.slideOutType === SlideOutType.PickSlideUp,
      );
    const kinds = new Set(view.beats().flatMap(beat => beat.notes.map(note => note.slideOutType)));
    expect(kinds).toContain(SlideOutType.PickSlideDown);
    expect(kinds).toContain(SlideOutType.PickSlideUp);
    for (const beat of view.beats().filter(scraped)) {
      expect(glyphs(view.drawnBy(beat)), at([beat])[0]).toContain('GuitarVibratoStroke');
    }
    expect(placedAt(view, 'text', 'P.S.')).toEqual(runStarts(view, scraped));
  });
});

describe('legato and tapping', () => {
  it('REND-115: hammer-ons and pull-offs are slurred, marked H or P between their two notes', () => {
    for (const path of ['alphatab/guitarpro7/hammer.gp', 'alphatab/guitarpro7/left-hand-tap.gp']) {
      const view = engraveFixture(path);
      const labels = view.marks.filter(
        mark => mark.kind === 'text' && (mark.name === 'H' || mark.name === 'P'),
      );
      const between = (mark: Mark, from: Beat, to: Beat) => {
        const centre = mark.x + mark.width / 2;
        return (
          view.systemOf(mark) === view.span(from).system &&
          centre > view.span(from).notes &&
          centre < view.span(to).notes
        );
      };
      const legatos = view.beats().flatMap(beat =>
        beat.notes.flatMap(note => {
          const destination = note.hammerPullDestination;
          return note.isHammerPullOrigin && destination !== null ? [{ note, destination }] : [];
        }),
      );
      expect(legatos.length, path).toBeGreaterThan(0);
      // Every hammer-on (to a higher fret) has an H, every pull-off a P, between the two notes…
      for (const { note, destination } of legatos) {
        const letter = destination.fret > note.fret ? 'H' : 'P';
        const label = labels.find(mark => mark.name === letter && between(mark, note.beat, destination.beat));
        expect(label, `${path} ${at([note.beat])[0]} string ${note.string}`).toBeDefined();
      }
      // …and every H or P belongs to one.
      for (const mark of labels) {
        const owner = legatos.find(({ note, destination }) => between(mark, note.beat, destination.beat));
        expect(owner, `${path} ${mark.name} at ${mark.x.toFixed(0)}`).toBeDefined();
      }
    }
  });

  it('REND-116: left-hand taps show the tapping sign', () => {
    const view = engraveFixture('alphatab/guitarpro7/left-hand-tap.gp');
    const tapped = where(view, beat => beat.notes.some(note => note.isLeftHandTapped));
    expect(tapped.length).toBeGreaterThan(0);
    expect(placedAt(view, 'glyph', 'GuitarLeftHandTapping')).toEqual(tapped);
  });

  it('REND-117, REND-118: right-hand taps are marked T, slaps S and pops P', () => {
    const view = engraveFixture('alphatab/guitarpro7/other-effects.gp');
    expect(placedAt(view, 'text', 'T')).toEqual(where(view, beat => beat.tap));
    expect(placedAt(view, 'text', 'S')).toEqual(where(view, beat => beat.slap));
    expect(placedAt(view, 'text', 'P')).toEqual(where(view, beat => beat.pop));
    expect(where(view, beat => beat.tap || beat.slap || beat.pop)).toHaveLength(3);
  });
});

describe('harmonics', () => {
  const LABELS = new Map<alphaTab.model.HarmonicType, string>([
    [HarmonicType.Natural, 'N.H.'],
    [HarmonicType.Artificial, 'A.H.'],
    [HarmonicType.Pinch, 'P.H.'],
    [HarmonicType.Tap, 'T.H.'],
    [HarmonicType.Semi, 'S.H.'],
    [HarmonicType.Feedback, 'Fdbk.'],
  ]);

  it('REND-119…REND-124: each kind is labelled where it starts, with diamond noteheads', () => {
    const files = [engraveFixture('alphatab/guitarpro7/harmonics.gp'), engraveTex(':4 12.3{fh} 12.3 r r')];
    const seen = new Set<number>();
    for (const view of files) {
      for (const [type, label] of LABELS) {
        const harmonic = (beat: Beat) => beat.notes.some(note => note.harmonicType === type);
        if (where(view, harmonic).length === 0) continue;
        seen.add(type);
        expect(placedAt(view, 'text', label), label).toEqual(runStarts(view, harmonic));
        for (const beat of view.beats().filter(harmonic)) {
          expect(glyphs(view.drawnBy(beat)), label).toContain('NoteheadDiamondBlackWide');
        }
      }
    }
    expect([...seen].sort()).toEqual([...LABELS.keys()].sort());
  });

  it('REND-119: natural harmonics write their fret in angle brackets', () => {
    const view = engraveTex(':4 12.3{nh} 7.3{nh} 5.3{nh} 3.3');
    expect(view.beats().map(beat => texts(view.drawnBy(beat)))).toEqual([['<12>'], ['<7>'], ['<5>'], ['3']]);
  });
});

describe('vibrato', () => {
  it('REND-125: note vibrato, slight and wide, as a wavy line over the note', () => {
    const view = engraveTex(':2 5.3{v} 5.3{vw}');
    const [slight, wide] = view.beats();
    expect(slight?.notes[0]?.vibrato).toBe(VibratoType.Slight);
    expect(wide?.notes[0]?.vibrato).toBe(VibratoType.Wide);
    if (slight === undefined || wide === undefined) return;
    expect(new Set(glyphs(view.over(slight)).filter(name => name.includes('Vibrato')))).toEqual(
      new Set(['GuitarVibratoStroke']),
    );
    expect(new Set(glyphs(view.over(wide)).filter(name => name.includes('Vibrato')))).toEqual(
      new Set(['GuitarWideVibratoStroke']),
    );
  });

  it('REND-126: beat (whammy) vibrato, slight and wide, as a sawtooth', () => {
    const view = engraveFixture('alphatab/guitarpro7/tremolo-vibrato.gp');
    for (const beat of view.beats()) {
      const sawtooth = glyphs(view.over(beat)).filter(name => name.startsWith('WiggleSawtooth'));
      if (beat.vibrato === VibratoType.Slight)
        expect(sawtooth, at([beat])[0]).toContain('WiggleSawtoothNarrow');
      else if (beat.vibrato === VibratoType.Wide) expect(sawtooth, at([beat])[0]).toContain('WiggleSawtooth');
      else expect(sawtooth, at([beat])[0]).toEqual([]);
    }
    expect(where(view, beat => beat.vibrato === VibratoType.Slight).length).toBeGreaterThan(0);
    expect(where(view, beat => beat.vibrato === VibratoType.Wide).length).toBeGreaterThan(0);
  });
});

describe('muting, ringing and articulations', () => {
  it('REND-127, REND-128: palm mute and let ring are labelled where they start, as Guitar Pro writes them', () => {
    for (const path of [
      'alphatab/guitarpro7/effects.gp',
      'alphatab/guitarpro7/other-effects.gp',
      'alphatab/guitarpro7/accentuations.gp',
    ]) {
      const view = engraveFixture(path);
      expect(placedAt(view, 'text', 'P.M.'), path).toEqual(runStarts(view, beat => beat.isPalmMute));
      expect(placedAt(view, 'text', 'let ring'), path).toEqual(runStarts(view, beat => beat.isLetRing));
      expect(view.find('text', 'LetRing'), path).toEqual([]);
    }
    const view = engraveTex(':4 5.6{pm} 5.6{pm} 5.6{pm} 5.6 | 5.6{lr} 5.6{lr} 5.6 5.6');
    expect(placedAt(view, 'text', 'P.M.')).toEqual(['0:0']);
    expect(placedAt(view, 'text', 'let ring')).toEqual(['1:0']);
    // A dashed line runs from the label to the last muted beat, and stops before the next.
    const label = view.find('text', 'P.M.')[0];
    const lastMuted = view.beats()[2];
    const unmuted = view.beats()[3];
    expect(label).toBeDefined();
    if (label === undefined || lastMuted === undefined || unmuted === undefined) return;
    const dashes = view.marks.filter(
      mark => mark.kind === 'rect' && Math.abs(mark.y - label.y) < 4 && mark.x > label.x,
    );
    expect(dashes.length).toBeGreaterThan(3);
    const end = Math.max(...dashes.map(mark => mark.x + mark.width));
    expect(end).toBeGreaterThan(view.span(lastMuted).left);
    expect(end).toBeLessThan(view.span(unmuted).notes);
  });

  it('REND-188: "let ring throughout" over the first bar of a track whose notes all ring on', () => {
    const bars = `:4 ${Array.from({ length: 6 }, () => '5.6 7.5 5.4 7.4').join(' | ')} |`;
    const guitar = (staves: string) =>
      [`\\track "Guitar"`, `\\staff {${staves}}`, '\\tuning (E4 B3 G3 D3 A2 E2)', bars].join('\n');
    const labels = (view: Engraving) => view.find('text', 'let ring throughout');
    expect(labels(engraveTex(bars, { width: 500 }))).toEqual([]);
    for (const staves of ['score tabs', 'tabs', 'score']) {
      const view = engraveTex(guitar(staves), { width: 500, letRing: [0] });
      // Once, from the first beat on: later systems start without it.
      const [label, ...more] = labels(view);
      const [first, second] = view.beats();
      expect(label === undefined || first === undefined || second === undefined, staves).toBe(false);
      if (label === undefined || first === undefined || second === undefined) continue;
      expect(more, staves).toEqual([]);
      expect(Math.abs(label.x - view.span(first).left), staves).toBeLessThan(8);
      expect(label.x, staves).toBeLessThan(view.span(second).left);
      expect(view.systemOf(label), staves).toBe(0);
      expect(Math.max(...view.bars.map(bar => bar.system)), staves).toBeGreaterThan(0);
      // The score itself is left as it was.
      expect(view.score.tracks[0]?.letRingThroughout, staves).toBe(false);
    }
    // Of two guitars, only the one that rings on says so, over its own staves.
    const duet = `${guitar('tabs')}\n${guitar('tabs').replace('"Guitar"', '"Second"')}`;
    const upper = labels(engraveTex(duet, { trackIndexes: [0, 1], letRing: [0] }));
    const lower = labels(engraveTex(duet, { trackIndexes: [0, 1], letRing: [1] }));
    expect([upper.length, lower.length]).toEqual([1, 1]);
    expect((lower[0]?.y ?? 0) - (upper[0]?.y ?? 0)).toBeGreaterThan(40);
    // Keyboards have no strings to ring on.
    expect(
      labels(engraveTex('\\track "Piano"\n\\staff {score}\n:4 C4 D4 E4 F4 |', { letRing: [0] })),
    ).toEqual([]);
  });

  it('REND-129: dead notes are an x on the tab and a cross notehead', () => {
    const view = engraveFixture('alphatab/guitarpro7/dead.gp');
    for (const beat of view.beats()) {
      const dead = beat.notes.some(note => note.isDead);
      expect(texts(view.drawnBy(beat)).includes('x'), at([beat])[0]).toBe(dead);
      expect(glyphs(view.drawnBy(beat)).includes('NoteheadXOrnate'), at([beat])[0]).toBe(dead);
    }
  });

  it('REND-130: ghost notes are bracketed on the tab and the staff', () => {
    const view = engraveFixture('alphatab/guitarpro7/accentuations.gp');
    for (const beat of view.beats()) {
      const ghost = beat.notes.find(note => note.isGhost);
      const own = view.drawnBy(beat);
      if (ghost === undefined) {
        expect(
          texts(own).some(text => text.startsWith('(')),
          at([beat])[0],
        ).toBe(false);
        continue;
      }
      expect(texts(own)).toContain(`(${ghost.fret})`);
      // Parentheses around the notehead.
      expect(own.filter(mark => mark.kind === 'path' && mark.name === 'fill').length).toBe(2);
    }
  });

  it('REND-132: staccatissimo is a wedge on the side away from the stem, kept by Guitar Pro 7+ and MusicXML', () => {
    // A B4-and-above note has its stem down, so its wedge above; below the middle line, the other way.
    const view = engraveTex(':4 3.1{sti} 3.6{sti} 3.1{st} 3.6');
    const wedges = view
      .beats()
      .map(beat => glyphs(view.drawnBy(beat)).filter(name => name.startsWith('ArticStacc')));
    expect(wedges).toEqual([
      ['ArticStaccatissimoAbove'],
      ['ArticStaccatissimoBelow'],
      ['ArticStaccatoAbove'],
      [],
    ]);
    // Saved as Guitar Pro 7 and opened again: still staccatissimo.
    const saved = new alphaTab.exporter.Gp7Exporter().export(view.score, new alphaTab.Settings());
    const reopened = new Engraving(openScore(saved, 'staccatissimo.gp').score);
    expect(reopened.beats().map(beat => beat.notes.map(note => note.isStaccatissimo))).toEqual([
      [true],
      [true],
      [false],
      [false],
    ]);
    expect(glyphs(reopened.marks).filter(name => name.startsWith('ArticStaccatissimo'))).toHaveLength(2);
    const xml = new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><notations><articulations><staccatissimo/></articulations></notations></note></measure></part></score-partwise>',
    );
    const fromXml = openScore(xml, 'staccatissimo.musicxml').score;
    expect(fromXml.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[0]?.notes[0]?.isStaccatissimo).toBe(true);
  });

  it('REND-131…REND-133: accents, heavy accents, staccato and tenuto on their notes', () => {
    const { AccentuationType } = alphaTab.model;
    const sign = (note: alphaTab.model.Note): string[] => {
      const signs: string[] = [];
      if (note.accentuated === AccentuationType.Normal) signs.push('ArticAccent');
      if (note.accentuated === AccentuationType.Heavy) signs.push('ArticMarcato');
      if (note.accentuated === AccentuationType.Tenuto) signs.push('ArticTenuto');
      if (note.isStaccato) signs.push('ArticStaccato');
      return signs;
    };
    const views = [
      engraveFixture('alphatab/guitarpro7/accentuations.gp'),
      engraveFixture('alphatab/guitarpro7/other-effects.gp'),
      engraveTex(':4 3.3{ten} 3.3{ac} 3.3{hac} 3.3{st}'),
    ];
    const seen = new Set<string>();
    for (const view of views) {
      for (const beat of view.beats()) {
        const expected = beat.notes.flatMap(sign);
        const drawn = glyphs(view.drawnBy(beat))
          .filter(name => name.startsWith('Artic'))
          .map(name => name.replace(/(Above|Below)$/, ''));
        expect(drawn.sort(), at([beat])[0]).toEqual(expected.sort());
        for (const name of expected) seen.add(name);
      }
    }
    expect([...seen].sort()).toEqual(['ArticAccent', 'ArticMarcato', 'ArticStaccato', 'ArticTenuto']);
  });
});

describe('ornaments of rhythm', () => {
  it('REND-134: grace notes are small, slashed before the beat and not on it', () => {
    const { GraceType } = alphaTab.model;
    const views = [
      engraveFixture('alphatab/guitarpro7/grace.gp'),
      engraveFixture('alphatab/guitarpro7/bends-advanced.gp'),
    ];
    const kinds = new Set<number>();
    for (const view of views) {
      for (const beat of view.beats()) {
        if (beat.graceType === GraceType.None) continue;
        kinds.add(beat.graceType);
        const slashed = glyphs(view.over(beat)).includes('GraceNoteSlashStemUp');
        expect(slashed, at([beat])[0]).toBe(beat.graceType === GraceType.BeforeBeat);
      }
    }
    expect(kinds).toContain(GraceType.BeforeBeat);
    expect(kinds).toContain(GraceType.OnBeat);
  });

  it('REND-135: tremolo picking shows one, two or three strokes for 8ths, 16ths and 32nds', () => {
    const view = engraveFixture('alphatab/guitarpro7/trills.gp');
    const tremolos = view.beats().filter(beat => beat.isTremolo);
    // 8ths, 16ths and 32nds: one, two and three strokes through the stem, on both staves.
    expect(tremolos.map(beat => beat.tremoloPicking?.marks)).toEqual([3, 2, 1]);
    for (const beat of tremolos) {
      const marks = beat.tremoloPicking?.marks ?? 0;
      expect(glyphs(view.drawnBy(beat)).filter(name => name.startsWith('Tremolo'))).toEqual([
        `Tremolo${marks}`,
        `Tremolo${marks}`,
      ]);
    }
  });

  it('REND-136: trills: "tr" with a wavy line, the other fret in brackets on the tab', () => {
    const view = engraveFixture('alphatab/guitarpro7/trills.gp');
    const trilled = view.beats().filter(beat => beat.notes.some(note => note.isTrill));
    expect(trilled).toHaveLength(1);
    for (const beat of trilled) {
      const note = beat.notes.find(candidate => candidate.isTrill);
      expect(glyphs(view.over(beat))).toEqual(expect.arrayContaining(['OrnamentTrill', 'WiggleTrill']));
      expect(texts(view.drawnBy(beat))).toContain(`(${note?.trillFret ?? ''})`);
    }
    expect(placedAt(view, 'glyph', 'OrnamentTrill').every(position => at(trilled).includes(position))).toBe(
      true,
    );
  });

  it('REND-137: rasgueado is labelled "rasg." over its chords', () => {
    const view = engraveTex(':4 (0.1 1.2 0.3){rasg ii} (0.1 1.2 0.3){rasg mi} (0.1 1.2 0.3) (0.1 1.2 0.3)');
    expect(where(view, beat => beat.hasRasgueado)).toEqual(['0:0', '0:1']);
    expect(placedAt(view, 'text', 'rasg.')).toEqual(['0:0']);
  });
});

describe('strokes and fingering', () => {
  it('REND-138: pick strokes up and down', () => {
    const { PickStroke } = alphaTab.model;
    const view = engraveFixture('alphatab/guitarpro7/strokes.gp');
    expect(placedAt(view, 'glyph', 'StringsUpBow')).toEqual(
      where(view, beat => beat.pickStroke === PickStroke.Up),
    );
    expect(placedAt(view, 'glyph', 'StringsDownBow')).toEqual(
      where(view, beat => beat.pickStroke === PickStroke.Down),
    );
  });

  it('REND-139, REND-140: brush strokes are straight arrows, arpeggios wavy ones, up or down', () => {
    const { BrushType } = alphaTab.model;
    const views = [
      engraveFixture('alphatab/guitarpro7/strokes.gp'),
      engraveTex(':4 (0.1 1.2 0.3){au} (0.1 1.2 0.3){ad} (0.1 1.2 0.3){bu} (0.1 1.2 0.3){bd}'),
    ];
    const seen = new Set<number>();
    for (const view of views) {
      for (const beat of view.beats()) {
        if (beat.brushType === BrushType.None) continue;
        seen.add(beat.brushType);
        const own = view.drawnBy(beat);
        const wavy = glyphs(own).includes('GuitarVibratoStroke');
        const arpeggio = beat.brushType === BrushType.ArpeggioUp || beat.brushType === BrushType.ArpeggioDown;
        expect(wavy, at([beat])[0]).toBe(arpeggio);
        // A down stroke goes from the lowest string to the highest: up the staff and the tab, so
        // its arrow points up; an up stroke's points down.
        const down = beat.brushType === BrushType.BrushDown || beat.brushType === BrushType.ArpeggioDown;
        const heads = arrows(view, beat);
        expect(heads.length, at([beat])[0]).toBeGreaterThan(0);
        expect(new Set(heads), at([beat])[0]).toEqual(new Set([down ? 'up' : 'down']));
      }
    }
    expect([...seen].sort()).toEqual([
      BrushType.BrushUp,
      BrushType.BrushDown,
      BrushType.ArpeggioUp,
      BrushType.ArpeggioDown,
    ]);
  });

  it('REND-141, REND-142: left-hand fingers 1–4 and thumb, right-hand p i m a c', () => {
    const { Fingers } = alphaTab.model;
    const left = new Map<number, string>([
      [Fingers.Thumb, 'FingeringTLower'],
      [Fingers.IndexFinger, 'Fingering1'],
      [Fingers.MiddleFinger, 'Fingering2'],
      [Fingers.AnnularFinger, 'Fingering3'],
      [Fingers.LittleFinger, 'Fingering4'],
    ]);
    const right = new Map<number, string>([
      [Fingers.Thumb, 'FingeringPLower'],
      [Fingers.IndexFinger, 'FingeringILower'],
      [Fingers.MiddleFinger, 'FingeringMLower'],
      [Fingers.AnnularFinger, 'FingeringALower'],
      [Fingers.LittleFinger, 'FingeringCLower'],
    ]);
    const view = engraveFixture('alphatab/guitarpro7/fingering.gp');
    const drawn = view
      .beats()
      .map(beat => glyphs(view.drawnBy(beat)).filter(name => name.startsWith('Fingering')));
    const expected = view
      .beats()
      .map(beat =>
        beat.notes.flatMap(note =>
          [left.get(note.leftHandFinger), right.get(note.rightHandFinger)].filter(name => name !== undefined),
        ),
      );
    expect(drawn).toEqual(expected);
    expect(new Set(drawn.flat())).toEqual(new Set([...left.values(), ...right.values()]));
  });
});

describe('dynamics', () => {
  it('REND-143: every dynamic from ppp to fff, where it changes', () => {
    const view = engraveTex(
      ':4 3.3{dy ppp} 3.3{dy pp} 3.3{dy p} 3.3{dy mp} | 3.3{dy mf} 3.3{dy f} 3.3{dy ff} 3.3{dy fff} | 3.3 3.3 3.3{dy p} 3.3',
    );
    const names = [
      'DynamicPPP',
      'DynamicPP',
      'DynamicPiano',
      'DynamicMP',
      'DynamicMF',
      'DynamicForte',
      'DynamicFF',
      'DynamicFFF',
    ];
    expect(
      view.beats().map(beat => glyphs(view.over(beat)).filter(name => name.startsWith('Dynamic'))),
    ).toEqual([...names.map(name => [name]), [], [], ['DynamicPiano'], []]);
  });

  it('REND-144: hairpins open to the right for crescendo and close for decrescendo, over their beats', () => {
    const view = engraveTex(':4 3.3{cre} 3.3{cre} 3.3{dec} 3.3{dec}');
    const hairpins = view.marks.filter(
      mark => mark.kind === 'path' && mark.commands === 'MLL' && mark.beat === -1,
    );
    expect(hairpins).toHaveLength(2);
    const [crescendo, decrescendo] = [...hairpins].sort((a, b) => a.x - b.x);
    if (crescendo === undefined || decrescendo === undefined) throw new Error('Two hairpins expected.');
    const beats = view.beats();
    // Crescendo: the tip on the left; decrescendo: on the right.
    const tipX = (mark: Mark) => mark.points?.[1]?.x ?? 0;
    expect(tipX(crescendo)).toBeCloseTo(crescendo.x, 0);
    expect(tipX(decrescendo)).toBeCloseTo(decrescendo.x + decrescendo.width, 0);
    // The crescendo starts on the first beat, the decrescendo ends on the last.
    expect(view.beatsUnder({ ...crescendo, width: 0 }, beats)).toEqual([beats[0]]);
    expect(
      view.beatsUnder({ ...decrescendo, x: decrescendo.x + decrescendo.width - 1, width: 0 }, beats),
    ).toEqual([beats[3]]);
  });

  it('REND-145: fade in, fade out and volume swell', () => {
    const { FadeType } = alphaTab.model;
    const view = engraveTex(':4 3.3{f} 3.3{fo} 3.3{vs} 3.3');
    expect(placedAt(view, 'glyph', 'GuitarFadeIn')).toEqual(
      where(view, beat => beat.fade === FadeType.FadeIn),
    );
    expect(placedAt(view, 'glyph', 'GuitarFadeOut')).toEqual(
      where(view, beat => beat.fade === FadeType.FadeOut),
    );
    expect(placedAt(view, 'glyph', 'GuitarVolumeSwell')).toEqual(
      where(view, beat => beat.fade === FadeType.VolumeSwell),
    );
    const file = engraveFixture('alphatab/guitarpro7/other-effects.gp');
    expect(placedAt(file, 'glyph', 'GuitarFadeIn')).toEqual(
      where(file, beat => beat.fade === FadeType.FadeIn),
    );
  });
});
