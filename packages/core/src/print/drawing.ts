/**
 * What a painted partial draws, read from the SVG alphaTab's SVG canvas writes (rectangles,
 * paths, texts, music symbols, and groups that move, rotate or only tag what they hold). The same
 * drawing is written out again as a page of SVG or as PDF content.
 */

/** A colour as alphaTab writes it (`#RRGGBB` or `rgba(r,g,b,a)`); null where the ink is used. */
export type Paint = string | null;

/** How a shape is filled or outlined: in a colour (see Paint), or not at all (false). */
export type Shade = Paint | false;

export type TextAnchor = 'start' | 'middle' | 'end';
export type TextBaseline = 'alphabetic' | 'hanging' | 'middle' | 'ideographic';

export interface TextStyle {
  /** Font families in order of preference, generic families included. */
  readonly families: readonly string[];
  /** Size in layout units (CSS pixels). */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
}

export type DrawOp =
  | {
      readonly kind: 'group';
      readonly translateX: number;
      readonly translateY: number;
      /** Degrees, clockwise on the page. */
      readonly rotate: number;
      readonly ops: readonly DrawOp[];
    }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      /** A filled rectangle has a fill; an outlined one a stroke. */
      readonly fill: Shade;
      readonly stroke: Shade;
      readonly strokeWidth: number;
    }
  | {
      readonly kind: 'path';
      readonly d: string;
      readonly fill: Shade;
      readonly stroke: Shade;
      readonly strokeWidth: number;
    }
  | {
      readonly kind: 'text';
      readonly x: number;
      readonly y: number;
      readonly text: string;
      readonly style: TextStyle;
      readonly anchor: TextAnchor;
      readonly baseline: TextBaseline;
      readonly fill: Paint;
    }
  | {
      /** SMuFL symbols set in a row from (x, y) on their baseline, at `scale` times the music font size. */
      readonly kind: 'symbols';
      readonly x: number;
      readonly y: number;
      readonly codePoints: readonly number[];
      readonly scale: number;
      readonly anchor: TextAnchor;
      readonly fill: Paint;
    };

export interface Drawing {
  readonly ops: readonly DrawOp[];
  /** Elements the reader did not recognise (none for what alphaTab paints; tests check this). */
  readonly unknown: readonly string[];
}

const TAG = /<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g;
const ATTRIBUTE = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

function attributes(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) map.set(match[1] ?? '', match[2] ?? match[3] ?? '');
  return map;
}

/** Decodes the character references alphaTab writes into text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (entity: string, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(Number(body.slice(1)));
    return ENTITIES[body] ?? entity;
  });
}

function styleOf(source: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const declaration of (source ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    map.set(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim());
  }
  return map;
}

/** Reads a CSS `font` shorthand as alphaTab writes it: `[bold ][italic ]12px Family, generic`. */
export function readFont(shorthand: string): TextStyle {
  const match = /^(.*?)([\d.]+)px\s+(.*)$/.exec(shorthand.trim());
  if (match === null) return { families: ['sans-serif'], size: 12, bold: false, italic: false };
  const modifiers = (match[1] ?? '').toLowerCase().split(/\s+/);
  const families = (match[3] ?? '')
    .split(',')
    .map(family => family.trim().replace(/^["']|["']$/g, ''))
    .filter(family => family.length > 0);
  return {
    families: families.length > 0 ? families : ['sans-serif'],
    size: Number(match[2]),
    bold: modifiers.includes('bold') || modifiers.some(modifier => Number(modifier) >= 600),
    italic: modifiers.includes('italic') || modifiers.includes('oblique'),
  };
}

function anchorOf(value: string | undefined): TextAnchor {
  return value === 'middle' || value === 'end' ? value : 'start';
}

function baselineOf(value: string | undefined): TextBaseline {
  switch (value) {
    case 'hanging':
    case 'middle':
    case 'ideographic':
      return value;
    default:
      return 'alphabetic';
  }
}

function shadeOf(value: string | undefined, none: boolean): Shade {
  if (none || value === 'none' || value === 'transparent') return false;
  return value ?? null;
}

const number = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** The translation and rotation of a group's `transform`. */
function readTransform(value: string): { x: number; y: number; rotate: number } {
  const result = { x: 0, y: 0, rotate: 0 };
  for (const match of value.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const args = (match[2] ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter(arg => arg.length > 0)
      .map(Number);
    if (match[1] === 'translate') {
      result.x += args[0] ?? 0;
      result.y += args[1] ?? 0;
    } else if (match[1] === 'rotate') {
      result.rotate += args[0] ?? 0;
    }
  }
  return result;
}

/** The code points of a text, one per symbol. */
function codePointsOf(text: string): number[] {
  const points: number[] = [];
  for (const char of text) points.push(char.codePointAt(0) ?? 0);
  return points;
}

interface Frame {
  readonly ops: DrawOp[];
  /** A group that moves what it holds (else it only tags it and adds no frame). */
  readonly transform: { x: number; y: number; rotate: number } | null;
  /** A music-symbol group: its text is a row of symbols drawn at the group's origin. */
  readonly symbols: boolean;
}

/** Reads the SVG of one painted partial. */
export function readDrawing(svg: string): Drawing {
  const root: DrawOp[] = [];
  const stack: Frame[] = [];
  const unknown: string[] = [];
  const current = () => stack.at(-1)?.ops ?? root;
  TAG.lastIndex = 0;
  for (let match = TAG.exec(svg); match !== null; match = TAG.exec(svg)) {
    const [, closing, name = '', source = '', selfClosing] = match;
    if (closing === '/') {
      if (name === 'g') {
        const frame = stack.pop();
        if (frame?.transform !== null && frame !== undefined) {
          const ops = frame.ops;
          current().push({
            kind: 'group',
            translateX: frame.transform.x,
            translateY: frame.transform.y,
            rotate: frame.transform.rotate,
            ops,
          });
        } else if (frame !== undefined) {
          current().push(...frame.ops);
        }
      }
      continue;
    }
    const attrs = attributes(source);
    switch (name) {
      case 'svg':
        break;
      case 'g': {
        const transform = attrs.get('transform');
        const symbols = attrs.get('class') === 'at';
        stack.push({
          ops: [],
          transform: transform === undefined ? null : readTransform(transform),
          symbols,
        });
        break;
      }
      case 'rect': {
        const strokeWidth = attrs.get('stroke-width');
        current().push({
          kind: 'rect',
          x: number(attrs.get('x')),
          y: number(attrs.get('y')),
          width: number(attrs.get('width')),
          height: number(attrs.get('height')),
          fill: shadeOf(attrs.get('fill'), false),
          stroke: attrs.has('stroke') ? shadeOf(attrs.get('stroke'), false) : false,
          strokeWidth: strokeWidth === undefined ? 1 : number(strokeWidth),
        });
        break;
      }
      case 'path': {
        const style = styleOf(attrs.get('style'));
        const strokeWidth = attrs.get('stroke-width');
        current().push({
          kind: 'path',
          d: attrs.get('d') ?? '',
          fill: shadeOf(attrs.get('fill'), style.get('fill') === 'none'),
          stroke: attrs.has('stroke') ? shadeOf(attrs.get('stroke'), style.get('stroke') === 'none') : false,
          strokeWidth: strokeWidth === undefined ? 1 : number(strokeWidth),
        });
        break;
      }
      case 'text': {
        const end = svg.indexOf('</text>', TAG.lastIndex);
        const content = decodeEntities(svg.slice(TAG.lastIndex, end < 0 ? svg.length : end));
        TAG.lastIndex = end < 0 ? svg.length : end + '</text>'.length;
        if (selfClosing === '/') break;
        const style = styleOf(attrs.get('style'));
        const fill = attrs.get('fill') ?? null;
        const frame = stack.at(-1);
        if (frame?.symbols === true) {
          const percent = /^([\d.]+)%$/.exec(style.get('font-size') ?? '')?.[1];
          const transform = frame.transform ?? { x: 0, y: 0, rotate: 0 };
          // The symbol group only places the text: draw the symbols at its origin instead.
          stack[stack.length - 1] = { ops: frame.ops, transform: null, symbols: true };
          frame.ops.push({
            kind: 'symbols',
            x: transform.x + number(attrs.get('x')),
            y: transform.y + number(attrs.get('y')),
            codePoints: codePointsOf(content),
            scale: percent === undefined ? 1 : Number(percent) / 100,
            anchor: anchorOf(attrs.get('text-anchor')),
            fill,
          });
        } else {
          current().push({
            kind: 'text',
            x: number(attrs.get('x')),
            y: number(attrs.get('y')),
            text: content,
            style: readFont(style.get('font') ?? ''),
            anchor: anchorOf(attrs.get('text-anchor')),
            baseline: baselineOf(style.get('dominant-baseline')),
            fill,
          });
        }
        break;
      }
      default:
        unknown.push(name);
    }
  }
  return { ops: root, unknown };
}

/** Calls `visit` for every rectangle, path, text and symbol row, with the groups around it. */
export function walkDrawing(
  ops: readonly DrawOp[],
  visit: (
    op: Exclude<DrawOp, { kind: 'group' }>,
    groups: readonly Extract<DrawOp, { kind: 'group' }>[],
  ) => void,
  groups: readonly Extract<DrawOp, { kind: 'group' }>[] = [],
): void {
  for (const op of ops) {
    if (op.kind === 'group') walkDrawing(op.ops, visit, [...groups, op]);
    else visit(op, groups);
  }
}
