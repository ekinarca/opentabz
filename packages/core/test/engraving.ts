/**
 * Reads what a render session painted, for tests of the engraving: every glyph, text, path and
 * rectangle of the painted SVG, placed on the page and tagged with the beat whose group drew it,
 * and where each beat sits. Glyphs are named after alphaTab's SMuFL symbols (`MusicFontSymbol`),
 * so tests read like the notation they check.
 */
import * as alphaTab from '@coderline/alphatab';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import {
  BOUNDS_BAR_INDEX_STRIDE,
  BOUNDS_BEAT_INDEX_STRIDE,
  BOUNDS_BEAT_RECT_STRIDE,
  BOUNDS_SYSTEM_STRIDE,
} from '../src/shared/playback.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

export type MarkKind = 'glyph' | 'text' | 'path' | 'rect';

export interface Mark {
  readonly kind: MarkKind;
  /** A glyph's SMuFL name, a text's content, 'fill' or 'stroke' for a path, '' for a rectangle. */
  readonly name: string;
  /** Left edge on the page (a text's width is estimated from its font size). */
  readonly x: number;
  /** Top of a shape, the baseline (or middle) of a glyph or text. */
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Id of the beat whose group drew the mark, or -1. */
  readonly beat: number;
  /** A path's commands (`M`, `L`, `Q`, `C`, `A`, `z`) and its points on the page (arcs left out). */
  readonly commands?: string;
  readonly points?: readonly { readonly x: number; readonly y: number }[];
}

/** Where a beat sits on the page: its horizontal extent, its notes, and the system it is in. */
export interface Span {
  readonly left: number;
  readonly right: number;
  readonly notes: number;
  readonly system: number;
}

const VIEW: ViewOptions = {
  trackIndexes: [0],
  layout: 'page',
  systemsLayout: 'auto',
  staffDisplay: 'default',
  width: 1200,
  notationScale: 1,
};

/** A six-string guitar track in standard notation and tablature, for alphaTex bodies. */
export const GUITAR = ['\\track "Guitar"', '\\staff {score tabs}', '\\tuning (E4 B3 G3 D3 A2 E2)'].join('\n');

/** Average advance of a character of the score's sans-serif text, in ems. */
const TEXT_ADVANCE = 0.55;

const NUMBER = String.raw`(-?[\d.]+(?:e-?\d+)?)`;
const TOKENS = new RegExp(
  [
    String.raw`<g class="([^"]*)">`,
    String.raw`<g transform="translate\(${NUMBER} ,${NUMBER}\) rotate\( ${NUMBER}\)">`,
    String.raw`<g transform="translate\(${NUMBER} ${NUMBER}\)" class="at" ><text([^>]*)>([^<]*)</text></g>`,
    String.raw`</g>`,
    String.raw`<text x="${NUMBER}" y="${NUMBER}"([^>]*)>([^<]*)</text>`,
    String.raw`<rect x="${NUMBER}" y="${NUMBER}" width="${NUMBER}" height="${NUMBER}"[^>]*/>`,
    String.raw`<path d="([^"]*)"([^>]*)/>`,
  ].join('|'),
  'g',
);

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', quot: '"', lt: '<', gt: '>' };

function decode(text: string): string {
  return text.replace(/&(#\d+|[a-z]+);/g, (entity: string, body: string) =>
    body.startsWith('#') ? String.fromCodePoint(Number(body.slice(1))) : (ENTITIES[body] ?? entity),
  );
}

const SYMBOLS: Readonly<Record<number, string | undefined>> = alphaTab.model.MusicFontSymbol;
const SYMBOL_OF_CODE = new Map<number, alphaTab.model.MusicFontSymbol>(
  Object.values(alphaTab.model.MusicFontSymbol)
    .filter((value): value is alphaTab.model.MusicFontSymbol => typeof value === 'number')
    .map(symbol => [symbol, symbol]),
);
const ENGRAVING = new alphaTab.Settings().display.resources.engravingSettings;

/** SMuFL name of a code point, as alphaTab names it. */
export function glyphName(codePoint: number): string {
  return SYMBOLS[codePoint] ?? `U+${codePoint.toString(16).toUpperCase()}`;
}

/** Width and height of a glyph at the default size, from the font's metrics. */
function glyphSize(codePoint: number): { width: number; height: number } {
  const symbol = SYMBOL_OF_CODE.get(codePoint);
  if (symbol === undefined) return { width: 0, height: 0 };
  return {
    width: ENGRAVING.glyphWidths.get(symbol) ?? 0,
    height: ENGRAVING.glyphHeights.get(symbol) ?? 0,
  };
}

/** The code points of a text (SMuFL glyphs are single code points). */
function codePoints(text: string): number[] {
  const points: number[] = [];
  for (const char of text) points.push(char.codePointAt(0) ?? 0);
  return points;
}

/** Where a glyph or text anchored at `x` starts, from its SVG text-anchor. */
function leftOf(x: number, width: number, attributes: string): number {
  const anchor = /text-anchor="(\w+)"/.exec(attributes)?.[1];
  if (anchor === 'middle') return x - width / 2;
  if (anchor === 'end') return x - width;
  return x;
}

/** A path's commands and points; arcs ("A1,1 0 0,0 x,y", circles) carry flags, so are left out. */
function readPath(d: string, dx: number, dy: number) {
  const commands = d.replace(/[^MLQCAz]/g, '');
  const values = [...d.replace(/A[^MLQCz]*/g, '').matchAll(/-?[\d.]+(?:e-?\d+)?/g)].map(match =>
    Number(match[0]),
  );
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({ x: dx + (values[index] ?? 0), y: dy + (values[index + 1] ?? 0) });
  }
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { commands, points, x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Marks of one painted partial, offset by the partial's place on the page. */
export function readMarks(svg: string, offsetX: number, offsetY: number): Mark[] {
  const marks: Mark[] = [];
  const groups: { beat: number; dx: number; dy: number }[] = [];
  for (const match of svg.matchAll(TOKENS)) {
    const [
      ,
      groupClass,
      rotateX,
      rotateY,
      ,
      glyphX,
      glyphY,
      glyphAttributes = '',
      glyphText,
      textX,
      textY,
      textAttributes = '',
      text,
      rectX,
      rectY,
      rectW,
      rectH,
      pathD,
      pathAttributes = '',
    ] = match;
    const { beat, dx, dy } = groups.at(-1) ?? { beat: -1, dx: offsetX, dy: offsetY };
    if (groupClass !== undefined) {
      const beatId = /^b(\d+)$/.exec(groupClass)?.[1];
      groups.push({ beat: beatId === undefined ? beat : Number(beatId), dx, dy });
    } else if (rotateX !== undefined && rotateY !== undefined) {
      groups.push({ beat, dx: dx + Number(rotateX), dy: dy + Number(rotateY) });
    } else if (glyphText !== undefined) {
      const scale = Number(/font-size: ([\d.]+)%/.exec(glyphAttributes)?.[1] ?? 100) / 100;
      const symbols = codePoints(decode(glyphText));
      const sizes = symbols.map(glyphSize);
      const total = sizes.reduce((sum, size) => sum + size.width * scale, 0);
      let x = leftOf(dx + Number(glyphX), total, glyphAttributes);
      symbols.forEach((symbol, index) => {
        const size = sizes[index] ?? { width: 0, height: 0 };
        marks.push({
          kind: 'glyph',
          name: glyphName(symbol),
          x,
          y: dy + Number(glyphY),
          width: size.width * scale,
          height: size.height * scale,
          beat,
        });
        x += size.width * scale;
      });
    } else if (text !== undefined) {
      const name = decode(text).trim();
      const size = Number(/font:\s*(?:\w+\s+)*?([\d.]+)px/.exec(textAttributes)?.[1] ?? 12);
      const width = name.length * size * TEXT_ADVANCE;
      marks.push({
        kind: 'text',
        name,
        x: leftOf(dx + Number(textX), width, textAttributes),
        y: dy + Number(textY),
        width,
        height: size,
        beat,
      });
    } else if (rectX !== undefined) {
      marks.push({
        kind: 'rect',
        name: '',
        x: dx + Number(rectX),
        y: dy + Number(rectY),
        width: Number(rectW),
        height: Number(rectH),
        beat,
      });
    } else if (pathD !== undefined) {
      const name = pathAttributes.includes('style="stroke: none"') ? 'fill' : 'stroke';
      marks.push({ kind: 'path', name, ...readPath(pathD, dx, dy), beat });
    } else {
      groups.pop();
    }
  }
  return marks;
}

function centre(mark: Mark): number {
  return mark.x + mark.width / 2;
}

export class Engraving {
  public readonly score: alphaTab.model.Score;
  public readonly marks: readonly Mark[];
  private readonly spans = new Map<number, Span>();
  /** Top and bottom of each system on the page. */
  private readonly systems: { readonly top: number; readonly bottom: number }[] = [];

  public constructor(score: alphaTab.model.Score, options: Partial<ViewOptions> = {}) {
    this.score = score;
    const session = new RenderSession(score, { ...VIEW, ...options });
    try {
      const layout = session.layout();
      const partials = new Map(layout.partials.map(partial => [partial.id, partial]));
      this.marks = session.paint(layout.partials.map(partial => partial.id)).flatMap(painted => {
        const partial = partials.get(painted.id);
        return partial === undefined ? [] : readMarks(painted.svg, 0, partial.y);
      });
      const { beatIndex, beatRect, barIndex, systems } = layout.bounds;
      for (let i = 0; i * BOUNDS_SYSTEM_STRIDE < systems.length; i++) {
        const top = systems[i * BOUNDS_SYSTEM_STRIDE + 1] ?? 0;
        this.systems.push({ top, bottom: top + (systems[i * BOUNDS_SYSTEM_STRIDE + 3] ?? 0) });
      }
      for (let i = 0; i * BOUNDS_BEAT_INDEX_STRIDE < beatIndex.length; i++) {
        const id = beatIndex[i * BOUNDS_BEAT_INDEX_STRIDE] ?? -1;
        const bar = beatIndex[i * BOUNDS_BEAT_INDEX_STRIDE + 3] ?? 0;
        const system = barIndex[bar * BOUNDS_BAR_INDEX_STRIDE + 1] ?? 0;
        const notes = beatRect[i * BOUNDS_BEAT_RECT_STRIDE] ?? 0;
        const left = beatRect[i * BOUNDS_BEAT_RECT_STRIDE + 1] ?? 0;
        const right = left + (beatRect[i * BOUNDS_BEAT_RECT_STRIDE + 2] ?? 0);
        const known = this.spans.get(id);
        this.spans.set(id, {
          left: Math.min(left, known?.left ?? left),
          right: Math.max(right, known?.right ?? right),
          notes: known?.notes ?? notes,
          system,
        });
      }
    } finally {
      session.dispose();
    }
  }

  /** The beats of one voice of a track's staff, in order. */
  public beats(track = 0, staff = 0, voice = 0): alphaTab.model.Beat[] {
    return (this.score.tracks[track]?.staves[staff]?.bars ?? []).flatMap(
      bar => bar.voices[voice]?.beats ?? [],
    );
  }

  /** Where a beat sits across its staves (standard notation and tablature). */
  public span(beat: alphaTab.model.Beat): Span {
    const span = this.spans.get(beat.id);
    if (span === undefined) throw new Error(`Beat ${beat.id} was not drawn.`);
    return span;
  }

  /** The system a mark belongs to: the one it is in, or else the nearest above or below. */
  public systemOf(mark: Mark): number {
    let best = -1;
    let distance = Number.POSITIVE_INFINITY;
    this.systems.forEach((system, index) => {
      const away = mark.y < system.top ? system.top - mark.y : Math.max(0, mark.y - system.bottom);
      if (away < distance) {
        best = index;
        distance = away;
      }
    });
    return best;
  }

  /** Marks centred within the extent of a beat, above or below it in its system. */
  public over(beat: alphaTab.model.Beat, marks: readonly Mark[] = this.marks): Mark[] {
    const span = this.span(beat);
    return marks.filter(mark => this.within(mark, span));
  }

  /** Marks drawn by the beat's own glyphs (noteheads, fret numbers, stems, effects on its notes). */
  public drawnBy(beat: alphaTab.model.Beat): Mark[] {
    return this.marks.filter(mark => mark.beat === beat.id);
  }

  /** Marks of a kind and name, everywhere. */
  public find(kind: MarkKind, name: string): Mark[] {
    return this.marks.filter(mark => mark.kind === kind && mark.name === name);
  }

  /** The beats, among `beats`, a mark is centred over. */
  public beatsUnder(mark: Mark, beats: readonly alphaTab.model.Beat[]): alphaTab.model.Beat[] {
    return beats.filter(beat => {
      const span = this.spans.get(beat.id);
      return span !== undefined && this.within(mark, span);
    });
  }

  /** The beat, among `beats` in the mark's system, whose notes are nearest the mark's centre. */
  public nearest(mark: Mark, beats: readonly alphaTab.model.Beat[]): alphaTab.model.Beat | null {
    const system = this.systemOf(mark);
    let best: alphaTab.model.Beat | null = null;
    let distance = Number.POSITIVE_INFINITY;
    for (const beat of beats) {
      const span = this.spans.get(beat.id);
      if (span?.system !== system) continue;
      const away = Math.abs(centre(mark) - span.notes);
      if (away < distance) {
        best = beat;
        distance = away;
      }
    }
    return best;
  }

  private within(mark: Mark, span: Span): boolean {
    const x = centre(mark);
    return x >= span.left && x < span.right && this.systemOf(mark) === span.system;
  }

  /** For each mark of a kind and name, the beat whose notes it is nearest. */
  public placed(kind: MarkKind, name: string, beats: readonly alphaTab.model.Beat[]): alphaTab.model.Beat[] {
    return this.find(kind, name).flatMap(mark => this.nearest(mark, beats) ?? []);
  }
}

/** Glyph names among marks. */
export function glyphs(marks: readonly Mark[]): string[] {
  return marks.filter(mark => mark.kind === 'glyph').map(mark => mark.name);
}

/** Texts among marks. */
export function texts(marks: readonly Mark[]): string[] {
  return marks.filter(mark => mark.kind === 'text').map(mark => mark.name);
}

/** Engraves a public fixture (a path below fixtures/). */
export function engraveFixture(path: string, options: Partial<ViewOptions> = {}): Engraving {
  const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
  return new Engraving(score, options);
}

/** Engraves alphaTex: a guitar track with standard notation and tablature unless `body` sets its own. */
export function engraveTex(body: string, options: Partial<ViewOptions> = {}): Engraving {
  const tex = body.trimStart().startsWith('\\') ? body : `${GUITAR}\n${body}`;
  const { score } = openScore(new TextEncoder().encode(tex), 'engraving.atex');
  return new Engraving(score, options);
}
