/**
 * A sheet: one page of an export, the partials placed on it as the paged view places them, and
 * its running header and footer. Written out as a standalone SVG file here and as a PDF page in
 * pdf.ts; both draw the same thing.
 */
import type { PageText, TextAlign } from '../shared/page-text.ts';
import { fontFamilies } from '../shared/text-fonts.ts';
import { resolveScoreColor, type ScorePalette } from '../shared/score-colors.ts';
import { readDrawing, type DrawOp, type Shade, type TextStyle } from './drawing.ts';
import { musicGlyph, placeSymbols } from './glyphs.ts';

export interface SheetPartial {
  /** The partial's SVG as the engine painted it. */
  readonly svg: string;
  /** Its top-left corner on the sheet, in layout units. */
  readonly x: number;
  readonly y: number;
}

export interface Sheet {
  /** Paper size in layout units (CSS pixels at 96 dpi). */
  readonly width: number;
  readonly height: number;
  readonly partials: readonly SheetPartial[];
  /** The running header (the title on pages after the first, say), if any, and its alignment. */
  readonly header: PageText | null;
  /** The footer (the page number, say), if any, and its alignment. */
  readonly footer: PageText | null;
  /** How far from the paper's edges texts aligned left begin and texts aligned right end. */
  readonly margins?: { readonly left: number; readonly right: number };
}

/** Layout units per millimetre and per PDF point. */
export const UNITS_PER_MM = 96 / 25.4;
export const UNITS_PER_POINT = 96 / 72;

/** The colour of the running header and footer. */
export const PAGE_TEXT_COLOR = '#555555';
const PAGE_TEXT_STYLE: TextStyle = {
  families: ['Arial', 'sans-serif'],
  size: 11,
  bold: false,
  italic: false,
};

/** Where aligned page texts sit when a sheet does not say: the default page margins. */
const DEFAULT_SIDE = 12 * (96 / 25.4);
const ANCHORS = { left: 'start', center: 'middle', right: 'end' } as const satisfies Record<
  TextAlign,
  string
>;

/** The header and footer of a sheet as texts, where the paged view shows them. */
export function pageTexts(sheet: Sheet): Extract<DrawOp, { kind: 'text' }>[] {
  const texts: Extract<DrawOp, { kind: 'text' }>[] = [];
  const left = sheet.margins?.left ?? DEFAULT_SIDE;
  const right = sheet.width - (sheet.margins?.right ?? DEFAULT_SIDE);
  const x = (align: TextAlign) => (align === 'left' ? left : align === 'right' ? right : sheet.width / 2);
  const styleOf = (line: PageText, fallback: TextStyle): TextStyle =>
    line.font === undefined
      ? fallback
      : {
          families: fontFamilies(line.font.family),
          size: line.font.size,
          bold: line.font.bold,
          italic: line.font.italic,
        };
  if (sheet.header !== null && sheet.header.text.length > 0) {
    texts.push({
      kind: 'text',
      x: x(sheet.header.align),
      y: 22,
      text: sheet.header.text,
      style: styleOf(sheet.header, { ...PAGE_TEXT_STYLE, italic: true }),
      anchor: ANCHORS[sheet.header.align],
      baseline: 'hanging',
      fill: PAGE_TEXT_COLOR,
    });
  }
  if (sheet.footer !== null && sheet.footer.text.length > 0) {
    texts.push({
      kind: 'text',
      x: x(sheet.footer.align),
      y: sheet.height - 20,
      text: sheet.footer.text,
      style: styleOf(sheet.footer, PAGE_TEXT_STYLE),
      anchor: ANCHORS[sheet.footer.align],
      baseline: 'ideographic',
      fill: PAGE_TEXT_COLOR,
    });
  }
  return texts;
}

/** A number for SVG and PDF: at most three decimals, no exponent, no negative zero. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded === 0 || !Number.isFinite(rounded)) return '0';
  return String(rounded);
}

const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, char => XML_ESCAPES[char] ?? char);
}

/** A colour as SVG attributes; `rgba()` becomes a colour and an opacity for vector editors. */
function paintAttributes(name: 'fill' | 'stroke', value: string): string {
  const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(value);
  if (rgba === null) return ` ${name}="${escapeXml(value)}"`;
  const hex = [rgba[1], rgba[2], rgba[3]].map(part => Number(part).toString(16).padStart(2, '0')).join('');
  return ` ${name}="#${hex.toUpperCase()}" ${name}-opacity="${formatNumber(Number(rgba[4]))}"`;
}

function familyList(families: readonly string[]): string {
  return families.map(family => (/[\s,]/.test(family) ? `'${family}'` : family)).join(', ');
}

export interface SheetSvgOptions {
  readonly palette: ScorePalette;
  /** Paper colour, or null for a transparent background. */
  readonly background: string | null;
  /** Prefix of the ids in the file, unique per page when pages share a document (printing). */
  readonly idPrefix: string;
  /** Size in pixels, for drawing into an image of that size; the paper size in millimetres if absent. */
  readonly pixels?: { readonly width: number; readonly height: number };
}

/** One sheet as a standalone SVG file: vector, its music symbols drawn from their outlines. */
export function sheetSvg(sheet: Sheet, options: SheetSvgOptions): string {
  const { palette, idPrefix } = options;
  const used = new Map<number, string>();
  const paint = (name: 'fill' | 'stroke', value: Shade) => {
    if (value === false) return ` ${name}="none"`;
    // Filled in the ink: inherited from the root.
    if (value === null && name === 'fill') return '';
    return paintAttributes(name, resolveScoreColor(value, palette));
  };
  const stroke = (op: { readonly stroke: Shade; readonly strokeWidth: number }) =>
    op.stroke === false ? '' : `${paint('stroke', op.stroke)} stroke-width="${formatNumber(op.strokeWidth)}"`;

  const write = (ops: readonly DrawOp[], out: string[]) => {
    for (const op of ops) {
      switch (op.kind) {
        case 'group': {
          const transform = [
            op.translateX !== 0 || op.translateY !== 0
              ? `translate(${formatNumber(op.translateX)} ${formatNumber(op.translateY)})`
              : '',
            op.rotate !== 0 ? `rotate(${formatNumber(op.rotate)})` : '',
          ]
            .filter(part => part.length > 0)
            .join(' ');
          out.push(transform.length > 0 ? `<g transform="${transform}">` : '<g>');
          write(op.ops, out);
          out.push('</g>');
          break;
        }
        case 'rect':
          out.push(
            `<rect x="${formatNumber(op.x)}" y="${formatNumber(op.y)}" width="${formatNumber(op.width)}" height="${formatNumber(op.height)}"${paint('fill', op.fill)}${stroke(op)}/>`,
          );
          break;
        case 'path':
          out.push(`<path d="${escapeXml(op.d.trim())}"${paint('fill', op.fill)}${stroke(op)}/>`);
          break;
        case 'text': {
          const { style } = op;
          out.push(
            `<text x="${formatNumber(op.x)}" y="${formatNumber(op.y)}" font-family="${escapeXml(familyList(style.families))}" font-size="${formatNumber(style.size)}"${style.bold ? ' font-weight="bold"' : ''}${style.italic ? ' font-style="italic"' : ''}${op.anchor === 'start' ? '' : ` text-anchor="${op.anchor}"`}${op.baseline === 'alphabetic' ? '' : ` dominant-baseline="${op.baseline}"`}${paint('fill', op.fill)}>${escapeXml(op.text)}</text>`,
          );
          break;
        }
        case 'symbols':
          for (const placed of placeSymbols(op)) {
            if (placed.glyph === undefined || placed.glyph.d.length === 0) continue;
            let id = used.get(placed.codePoint);
            if (id === undefined) {
              id = `${idPrefix}g${placed.codePoint.toString(16)}`;
              used.set(placed.codePoint, id);
            }
            out.push(
              `<use xlink:href="#${id}" transform="translate(${formatNumber(placed.x)} ${formatNumber(placed.y)}) scale(${formatScale(placed.scale)} ${formatScale(-placed.scale)})"${paint('fill', op.fill)}/>`,
            );
          }
          break;
      }
    }
  };

  const body: string[] = [];
  if (options.background !== null) {
    body.push(
      `<rect width="${formatNumber(sheet.width)}" height="${formatNumber(sheet.height)}" fill="${escapeXml(options.background)}"/>`,
    );
  }
  for (const partial of sheet.partials) {
    body.push(`<g transform="translate(${formatNumber(partial.x)} ${formatNumber(partial.y)})">`);
    write(readDrawing(partial.svg).ops, body);
    body.push('</g>');
  }
  write(pageTexts(sheet), body);

  const defs = [...used].map(([codePoint, id]) => `<path id="${id}" d="${musicGlyph(codePoint)?.d ?? ''}"/>`);
  const mm = (units: number) => `${formatNumber(units / UNITS_PER_MM)}mm`;
  const width = options.pixels === undefined ? mm(sheet.width) : formatNumber(options.pixels.width);
  const height = options.pixels === undefined ? mm(sheet.height) : formatNumber(options.pixels.height);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${width}" height="${height}" viewBox="0 0 ${formatNumber(sheet.width)} ${formatNumber(sheet.height)}" fill="${escapeXml(palette.ink)}">`,
    defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '',
    ...body,
    '</svg>',
  ].join('\n');
}

/** A glyph scale (layout units per font unit, around 0.036): enough digits to stay exact. */
function formatScale(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}
