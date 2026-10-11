/**
 * Sheets as a PDF document (EXP-001): vector pages the size of the paper, drawn from the same
 * reading of the engine's SVG as the SVG pages. Music symbols are drawn from their outlines, one
 * reusable form each. Texts are set in embedded subsets of fonts as wide as the screen fonts, so
 * they line up as laid out and can be selected and searched. The file is made on the device:
 * nothing is sent anywhere.
 */
import { zlibSync } from 'fflate';
import { resolveScoreColor, type ScorePalette } from '../shared/score-colors.ts';
import { readDrawing, type DrawOp, type Shade, type TextStyle } from './drawing.ts';
import { musicGlyph, placeSymbols } from './glyphs.ts';
import { parsePath, pathBounds, type Segment } from './path.ts';
import { pageTexts, UNITS_PER_POINT, type Sheet } from './sheet.ts';
import {
  baselineShift,
  covers,
  textFace,
  type TextFace,
  type TextFontFile,
  type TextFontSource,
} from './text-fonts.ts';
import { readTrueType, type TrueTypeFont } from './truetype.ts';

export interface PdfMetadata {
  readonly title: string;
  readonly author: string;
  readonly subject: string;
  /** The application that made the document. */
  readonly creator: string;
  /** What wrote the PDF. */
  readonly producer: string;
  readonly created: Date;
}

/** Text drawn into an image, for characters no font file covers. */
export interface RasterText {
  /** Advance of the text, in layout units. */
  readonly width: number;
  /** The image's box relative to the text's origin on its alphabetic baseline, in layout units. */
  readonly left: number;
  readonly top: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** Coverage per pixel (0–255), row by row from the top. */
  readonly columns: number;
  readonly rows: number;
  readonly alpha: Uint8Array;
}

export type TextRasterizer = (text: string, style: TextStyle) => RasterText | null;

export interface PdfOptions {
  readonly palette: ScorePalette;
  readonly metadata: PdfMetadata;
  readonly fonts: TextFontSource;
  /** Draws text that no font file covers (scripts the fonts lack); without it, it is left out. */
  readonly rasterize?: TextRasterizer;
}

const encoder = new TextEncoder();

/** A number in PDF syntax: no exponent, at most `digits` decimals. */
function num(value: number, digits = 3): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0 || !Number.isFinite(rounded)) return '0';
  return rounded.toFixed(digits).replace(/\.?0+$/, '');
}

function hex4(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, '0');
}

/** A text string for the document information: ASCII as is, anything else as UTF-16. */
function pdfText(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return `(${text.replace(/[\\()]/g, char => `\\${char}`)})`;
  let hex = 'FEFF';
  for (let index = 0; index < text.length; index++) hex += hex4(text.charCodeAt(index));
  return `<${hex}>`;
}

function pdfDate(date: Date): string {
  const two = (value: number) => String(value).padStart(2, '0');
  return `(D:${date.getUTCFullYear()}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}${two(date.getUTCHours())}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}Z)`;
}

/** A colour as red, green and blue (0–1) and an opacity. */
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(color)?.[1];
  if (hex !== undefined) {
    const value = Number.parseInt(hex, 16);
    return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255, a: 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color);
  if (rgb !== null) {
    return {
      r: Number(rgb[1]) / 255,
      g: Number(rgb[2]) / 255,
      b: Number(rgb[3]) / 255,
      a: rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4])),
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function pathOperators(segments: readonly Segment[]): string {
  const out: string[] = [];
  for (const segment of segments) {
    switch (segment[0]) {
      case 'M':
        out.push(`${num(segment[1])} ${num(segment[2])} m`);
        break;
      case 'L':
        out.push(`${num(segment[1])} ${num(segment[2])} l`);
        break;
      case 'C':
        out.push(
          `${num(segment[1])} ${num(segment[2])} ${num(segment[3])} ${num(segment[4])} ${num(segment[5])} ${num(segment[6])} c`,
        );
        break;
      case 'Z':
        out.push('h');
        break;
    }
  }
  return out.join('\n');
}

/** A short hash (FNV-1a) for subset tags and the document id. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/** The objects of a PDF file, written out with their cross-reference table. */
class PdfFile {
  private readonly objects: (Uint8Array | null)[] = [];

  public alloc(): number {
    this.objects.push(null);
    return this.objects.length;
  }

  public set(id: number, body: string): void {
    this.objects[id - 1] = encoder.encode(`${id} 0 obj\n${body}\nendobj\n`);
  }

  public stream(id: number, dictionary: string, data: Uint8Array): void {
    const compressed = zlibSync(data, { level: 6 });
    const head = encoder.encode(
      `${id} 0 obj\n<< ${dictionary} /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`,
    );
    const tail = encoder.encode('\nendstream\nendobj\n');
    const object = new Uint8Array(head.length + compressed.length + tail.length);
    object.set(head);
    object.set(compressed, head.length);
    object.set(tail, head.length + compressed.length);
    this.objects[id - 1] = object;
  }

  public bytes(root: number, info: number, documentId: string): Uint8Array {
    const header = new Uint8Array([...encoder.encode('%PDF-1.7\n%'), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
    const chunks: Uint8Array[] = [header];
    const offsets: number[] = [];
    let offset = header.length;
    for (const [index, object] of this.objects.entries()) {
      if (object === null) throw new Error(`PDF object ${index + 1} was never written.`);
      offsets.push(offset);
      chunks.push(object);
      offset += object.length;
    }
    const xref = [
      'xref',
      `0 ${this.objects.length + 1}`,
      '0000000000 65535 f ',
      ...offsets.map(at => `${String(at).padStart(10, '0')} 00000 n `),
      'trailer',
      `<< /Size ${this.objects.length + 1} /Root ${root} 0 R /Info ${info} 0 R /ID [<${documentId}> <${documentId}>] >>`,
      'startxref',
      String(offset),
      '%%EOF',
      '',
    ].join('\n');
    chunks.push(encoder.encode(xref));
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const file = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
      file.set(chunk, at);
      at += chunk.length;
    }
    return file;
  }
}

interface EmbeddedFont {
  readonly resource: string;
  readonly id: number;
  readonly font: TrueTypeFont;
  /** Glyphs used, with the text each stands for. */
  readonly used: Map<number, string>;
}

/** Characters set in one font, with their glyphs and advance. */
interface FontRun {
  readonly kind: 'font';
  readonly font: EmbeddedFont;
  readonly glyphs: number[];
  width: number;
}

/** Characters no font covers, drawn as an image. */
interface ImageRun {
  readonly kind: 'image';
  text: string;
  image: RasterText | null;
  width: number;
}

type Run = FontRun | ImageRun;

/** Writes sheets into a PDF document, one page each. */
export class PdfWriter {
  private readonly file = new PdfFile();
  private readonly catalog: number;
  private readonly pagesId: number;
  private readonly info: number;
  private readonly pageIds: number[] = [];
  private readonly glyphForms = new Map<number, { readonly resource: string; readonly id: number }>();
  private readonly fonts = new Map<string, Promise<EmbeddedFont>>();
  private readonly alphaStates = new Map<string, { readonly resource: string; readonly id: number }>();
  private images = 0;

  public constructor(private readonly options: PdfOptions) {
    this.catalog = this.file.alloc();
    this.pagesId = this.file.alloc();
    this.info = this.file.alloc();
  }

  public async addSheet(sheet: Sheet): Promise<void> {
    const page = new PageContent(this, sheet.height);
    for (const partial of sheet.partials) {
      page.push(`q 1 0 0 1 ${num(partial.x)} ${num(partial.y)} cm`);
      await page.draw(readDrawing(partial.svg).ops);
      page.push('Q');
    }
    await page.draw(pageTexts(sheet));
    const contents = this.file.alloc();
    this.file.stream(contents, '', encoder.encode(page.operators()));
    const id = this.file.alloc();
    const width = sheet.width / UNITS_PER_POINT;
    const height = sheet.height / UNITS_PER_POINT;
    this.file.set(
      id,
      `<< /Type /Page /Parent ${this.pagesId} 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] /Resources ${page.resources()} /Contents ${contents} 0 R >>`,
    );
    this.pageIds.push(id);
  }

  public async finish(): Promise<Uint8Array> {
    for (const pending of this.fonts.values()) this.writeFont(await pending);
    const { metadata } = this.options;
    this.file.set(
      this.pagesId,
      `<< /Type /Pages /Kids [${this.pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${this.pageIds.length} >>`,
    );
    this.file.set(this.catalog, `<< /Type /Catalog /Pages ${this.pagesId} 0 R >>`);
    this.file.set(
      this.info,
      [
        '<<',
        metadata.title.length > 0 ? `/Title ${pdfText(metadata.title)}` : '',
        metadata.author.length > 0 ? `/Author ${pdfText(metadata.author)}` : '',
        metadata.subject.length > 0 ? `/Subject ${pdfText(metadata.subject)}` : '',
        `/Creator ${pdfText(metadata.creator)}`,
        `/Producer ${pdfText(metadata.producer)}`,
        `/CreationDate ${pdfDate(metadata.created)}`,
        '>>',
      ]
        .filter(part => part.length > 0)
        .join(' '),
    );
    const id = [
      hash(metadata.title),
      hash(String(this.pageIds.length)),
      hash(metadata.created.toISOString()),
      0,
    ]
      .map(value => value.toString(16).padStart(8, '0'))
      .join('')
      .toUpperCase();
    return this.file.bytes(this.catalog, this.info, id);
  }

  /** The form drawing a music symbol, written on first use. */
  public glyphForm(codePoint: number): { readonly resource: string; readonly id: number } | null {
    const existing = this.glyphForms.get(codePoint);
    if (existing !== undefined) return existing;
    const glyph = musicGlyph(codePoint);
    if (glyph === undefined || glyph.d.length === 0) return null;
    const segments = parsePath(glyph.d);
    const bounds = pathBounds(segments);
    const id = this.file.alloc();
    this.file.stream(
      id,
      `/Type /XObject /Subtype /Form /BBox [${num(bounds.minX)} ${num(bounds.minY)} ${num(bounds.maxX)} ${num(bounds.maxY)}]`,
      encoder.encode(`${pathOperators(segments)}\nf`),
    );
    const form = { resource: `M${codePoint.toString(16)}`, id };
    this.glyphForms.set(codePoint, form);
    return form;
  }

  /** The graphics state for an opacity. */
  public alphaState(
    kind: 'fill' | 'stroke',
    alpha: number,
  ): { readonly resource: string; readonly id: number } {
    const key = `${kind}:${num(alpha)}`;
    const existing = this.alphaStates.get(key);
    if (existing !== undefined) return existing;
    const id = this.file.alloc();
    this.file.set(id, `<< /Type /ExtGState /${kind === 'fill' ? 'ca' : 'CA'} ${num(alpha)} >>`);
    const state = { resource: `A${this.alphaStates.size + 1}`, id };
    this.alphaStates.set(key, state);
    return state;
  }

  /** An image of text: its colour, masked by the text's coverage. */
  public textImage(image: RasterText, color: string): { readonly resource: string; readonly id: number } {
    const { r, g, b } = parseColor(color);
    const mask = this.file.alloc();
    this.file.stream(
      mask,
      `/Type /XObject /Subtype /Image /Width ${image.columns} /Height ${image.rows} /ColorSpace /DeviceGray /BitsPerComponent 8`,
      image.alpha,
    );
    const pixels = new Uint8Array(image.columns * image.rows * 3);
    for (let at = 0; at < pixels.length; at += 3) {
      pixels[at] = Math.round(r * 255);
      pixels[at + 1] = Math.round(g * 255);
      pixels[at + 2] = Math.round(b * 255);
    }
    const id = this.file.alloc();
    this.file.stream(
      id,
      `/Type /XObject /Subtype /Image /Width ${image.columns} /Height ${image.rows} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${mask} 0 R`,
      pixels,
    );
    this.images += 1;
    return { resource: `I${this.images}`, id };
  }

  /** The font file covering a code point in a face, loaded on first use; null if none does. */
  public async fontFor(face: TextFace, codePoint: number): Promise<EmbeddedFont | null> {
    const faces: TextFace[] = [face, { ...face, family: face.family === 'serif' ? 'sans' : 'serif' }];
    for (const candidate of faces) {
      for (const file of this.options.fonts.files(candidate)) {
        if (!covers(file, codePoint)) continue;
        const font = await this.load(file);
        if (font.font.glyphOf(codePoint) !== 0) return font;
      }
    }
    return null;
  }

  public get rasterize(): TextRasterizer | undefined {
    return this.options.rasterize;
  }

  public color(value: string | null): string {
    return resolveScoreColor(value, this.options.palette);
  }

  private load(file: TextFontFile): Promise<EmbeddedFont> {
    let pending = this.fonts.get(file.id);
    if (pending === undefined) {
      const resource = `F${this.fonts.size + 1}`;
      const id = this.file.alloc();
      pending = this.options.fonts.load(file).then(bytes => ({
        resource,
        id,
        font: readTrueType(bytes),
        used: new Map<number, string>(),
      }));
      this.fonts.set(file.id, pending);
    }
    return pending;
  }

  /** A font as a Type 0 font over a TrueType CIDFont, subset to the glyphs used. */
  private writeFont(embedded: EmbeddedFont): void {
    const { font, used } = embedded;
    const glyphs = [...used.keys()].sort((a, b) => a - b);
    const scale = 1000 / font.unitsPerEm;
    const tag = Array.from({ length: 6 }, (_, index) =>
      String.fromCharCode(65 + ((hash(`${font.postScriptName}:${glyphs.join(',')}`) >>> (index * 5)) % 26)),
    ).join('');
    const name = `${tag}+${font.postScriptName}`;
    const fontFile = this.file.alloc();
    const program = font.subset(glyphs);
    this.file.stream(fontFile, `/Length1 ${program.length}`, program);
    const descriptor = this.file.alloc();
    const flags = 4 | (font.italicAngle !== 0 ? 64 : 0);
    this.file.set(
      descriptor,
      `<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${font.bbox.map(value => num(value * scale)).join(' ')}] /ItalicAngle ${num(font.italicAngle)} /Ascent ${num(font.ascender * scale)} /Descent ${num(font.descender * scale)} /CapHeight ${num(font.capHeight * scale)} /StemV ${font.bold ? 120 : 80} /FontFile2 ${fontFile} 0 R >>`,
    );
    const cidFont = this.file.alloc();
    const widths = glyphs.map(glyph => `${glyph} [${num(font.advanceOf(glyph) * scale)}]`).join(' ');
    this.file.set(
      cidFont,
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /W [${widths}] /CIDToGIDMap /Identity >>`,
    );
    const toUnicode = this.file.alloc();
    this.file.stream(toUnicode, '', encoder.encode(toUnicodeCMap(used)));
    this.file.set(
      embedded.id,
      `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`,
    );
  }
}

/** What each glyph of a font stands for, so text can be copied and searched. */
function toUnicodeCMap(used: ReadonlyMap<number, string>): string {
  const entries = [...used].sort(([a], [b]) => a - b);
  const blocks: string[] = [];
  for (let start = 0; start < entries.length; start += 100) {
    const block = entries.slice(start, start + 100);
    blocks.push(`${block.length} beginbfchar`);
    for (const [glyph, text] of block) {
      let unicode = '';
      for (let index = 0; index < text.length; index++) unicode += hex4(text.charCodeAt(index));
      blocks.push(`<${hex4(glyph)}> <${unicode}>`);
    }
    blocks.push('endbfchar');
  }
  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    ...blocks,
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end',
  ].join('\n');
}

/** Spaces as SVG renders texts: line breaks and tabs become spaces, runs of spaces one, ends trimmed. */
export function normalizeSpaces(text: string): string {
  return text
    .replace(/[\t\n\r]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** The operators and resources of one page. */
class PageContent {
  private readonly parts: string[] = [];
  private readonly fonts = new Map<string, number>();
  private readonly xObjects = new Map<string, number>();
  private readonly states = new Map<string, number>();

  public constructor(
    private readonly writer: PdfWriter,
    height: number,
  ) {
    // Layout units, y down, as the SVG is drawn; SVG's miter limit.
    this.parts.push(
      `q ${num(1 / UNITS_PER_POINT, 6)} 0 0 ${num(-1 / UNITS_PER_POINT, 6)} 0 ${num(height / UNITS_PER_POINT)} cm`,
      '4 M',
    );
  }

  public push(operators: string): void {
    this.parts.push(operators);
  }

  public operators(): string {
    return [...this.parts, 'Q', ''].join('\n');
  }

  public resources(): string {
    const dictionary = (entries: Map<string, number>) =>
      `<< ${[...entries].map(([name, id]) => `/${name} ${id} 0 R`).join(' ')} >>`;
    const parts = ['/ProcSet [/PDF /Text /ImageC /ImageB]'];
    if (this.fonts.size > 0) parts.push(`/Font ${dictionary(this.fonts)}`);
    if (this.xObjects.size > 0) parts.push(`/XObject ${dictionary(this.xObjects)}`);
    if (this.states.size > 0) parts.push(`/ExtGState ${dictionary(this.states)}`);
    return `<< ${parts.join(' ')} >>`;
  }

  /** Sets the fill or stroke colour; with transparency, inside a saved state the caller restores. */
  private paint(
    kind: 'fill' | 'stroke',
    value: string | null,
  ): { readonly operators: string; readonly saved: boolean } {
    const { r, g, b, a } = parseColor(this.writer.color(value));
    const color = `${num(r)} ${num(g)} ${num(b)} ${kind === 'fill' ? 'rg' : 'RG'}`;
    if (a >= 1) return { operators: color, saved: false };
    const state = this.writer.alphaState(kind, a);
    this.states.set(state.resource, state.id);
    return { operators: `q /${state.resource} gs ${color}`, saved: true };
  }

  private shape(geometry: string, fill: Shade, stroke: Shade, strokeWidth: number): void {
    if (fill !== false) {
      const paint = this.paint('fill', fill);
      this.parts.push(`${paint.operators}\n${geometry}\nf${paint.saved ? '\nQ' : ''}`);
    }
    if (stroke !== false) {
      const paint = this.paint('stroke', stroke);
      this.parts.push(`${paint.operators}\n${num(strokeWidth)} w\n${geometry}\nS${paint.saved ? '\nQ' : ''}`);
    }
  }

  public async draw(ops: readonly DrawOp[]): Promise<void> {
    for (const op of ops) {
      switch (op.kind) {
        case 'group': {
          const radians = (op.rotate * Math.PI) / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);
          this.parts.push(
            `q 1 0 0 1 ${num(op.translateX)} ${num(op.translateY)} cm${op.rotate === 0 ? '' : ` ${num(cos, 6)} ${num(sin, 6)} ${num(-sin, 6)} ${num(cos, 6)} 0 0 cm`}`,
          );
          await this.draw(op.ops);
          this.parts.push('Q');
          break;
        }
        case 'rect':
          this.shape(
            `${num(op.x)} ${num(op.y)} ${num(op.width)} ${num(op.height)} re`,
            op.fill,
            op.stroke,
            op.strokeWidth,
          );
          break;
        case 'path': {
          const segments = parsePath(op.d);
          if (segments.length > 0) this.shape(pathOperators(segments), op.fill, op.stroke, op.strokeWidth);
          break;
        }
        case 'symbols': {
          const paint = this.paint('fill', op.fill);
          const placed: string[] = [];
          for (const glyph of placeSymbols(op)) {
            const form = this.writer.glyphForm(glyph.codePoint);
            if (form === null) continue;
            this.xObjects.set(form.resource, form.id);
            placed.push(
              `q ${num(glyph.scale, 6)} 0 0 ${num(-glyph.scale, 6)} ${num(glyph.x)} ${num(glyph.y)} cm /${form.resource} Do Q`,
            );
          }
          if (placed.length > 0)
            this.parts.push(`${paint.operators}\n${placed.join('\n')}${paint.saved ? '\nQ' : ''}`);
          break;
        }
        case 'text':
          await this.text(op);
          break;
      }
    }
  }

  private async text(op: Extract<DrawOp, { kind: 'text' }>): Promise<void> {
    const text = normalizeSpaces(op.text);
    if (text.length === 0) return;
    const { style } = op;
    const face = textFace(style);
    const runs: Run[] = [];
    for (const char of text) {
      const codePoint = char.codePointAt(0) ?? 0;
      const font = await this.writer.fontFor(face, codePoint);
      const last = runs.at(-1);
      if (font === null) {
        if (last?.kind === 'image') last.text += char;
        else runs.push({ kind: 'image', text: char, image: null, width: 0 });
        continue;
      }
      const glyph = font.font.glyphOf(codePoint);
      font.used.set(glyph, char);
      const advance = (font.font.advanceOf(glyph) * style.size) / font.font.unitsPerEm;
      if (last?.kind === 'font' && last.font === font) {
        last.glyphs.push(glyph);
        last.width += advance;
      } else {
        runs.push({ kind: 'font', font, glyphs: [glyph], width: advance });
      }
    }
    for (const run of runs) {
      if (run.kind !== 'image') continue;
      run.image = this.writer.rasterize?.(run.text, style) ?? null;
      run.width = run.image?.width ?? 0;
    }
    const total = runs.reduce((sum, run) => sum + run.width, 0);
    let x = op.anchor === 'middle' ? op.x - total / 2 : op.anchor === 'end' ? op.x - total : op.x;
    const y = op.y + baselineShift(op.baseline, face.family, style.size);
    const color = this.writer.color(op.fill);
    const paint = this.paint('fill', op.fill);
    const out: string[] = [paint.operators];
    for (const run of runs) {
      if (run.kind === 'font') {
        this.fonts.set(run.font.resource, run.font.id);
        out.push(
          `BT /${run.font.resource} ${num(style.size)} Tf 1 0 0 -1 ${num(x)} ${num(y)} Tm <${run.glyphs.map(hex4).join('')}> Tj ET`,
        );
      } else if (run.image !== null) {
        const image = this.writer.textImage(run.image, color);
        this.xObjects.set(image.resource, image.id);
        const { left, top, boxWidth, boxHeight } = run.image;
        out.push(
          `q ${num(boxWidth)} 0 0 ${num(-boxHeight)} ${num(x + left)} ${num(y + top + boxHeight)} cm /${image.resource} Do Q`,
        );
      }
      x += run.width;
    }
    if (paint.saved) out.push('Q');
    this.parts.push(out.join('\n'));
  }
}
