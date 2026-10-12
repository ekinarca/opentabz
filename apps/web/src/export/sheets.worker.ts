/**
 * Sheets worker: turns the pages of a score into files (SVG pages, PDF documents, ZIP archives
 * of several files) off the main thread. Pages come in as the partials the engine painted and
 * where they sit.
 */
import {
  musicGlyphsOf,
  PdfWriter,
  readOutlines,
  sheetSvg,
  type MusicGlyphs,
  type PdfMetadata,
  type RasterText,
  type Sheet,
  type SheetSvgOptions,
  type TextStyle,
} from '@opentabz/core/print';
import { PRINT_PALETTE } from '@opentabz/core/shared';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { TEXT_FONTS } from './text-fonts.ts';

/** Where a music font's outlines are read from (an .otf, .ttf or WOFF 1.0 file); Bravura if null. */
export interface MusicFontFile {
  readonly id: string;
  readonly url: string;
}

export interface SheetsMethods {
  /** One page as a standalone SVG file. */
  svg(args: {
    readonly sheet: Sheet;
    readonly options: SheetSvgOptions;
    readonly musicFont?: MusicFontFile | null;
  }): Promise<{ readonly svg: string }>;
  /** Pages as a PDF document. */
  pdf(args: {
    readonly sheets: readonly Sheet[];
    readonly metadata: PdfMetadata;
    readonly musicFont?: MusicFontFile | null;
  }): Promise<{
    readonly bytes: Uint8Array;
  }>;
  /** Files in a ZIP archive, in order. */
  zip(args: { readonly files: readonly { readonly name: string; readonly data: Uint8Array | string }[] }): {
    readonly bytes: Uint8Array;
  };
}

export type SheetsMethod = keyof SheetsMethods;

export interface SheetsRequest<M extends SheetsMethod = SheetsMethod> {
  readonly id: number;
  readonly method: M;
  readonly args: Parameters<SheetsMethods[M]>[0];
}

export type SheetsResponse =
  | { readonly id: number; readonly ok: true; readonly result: unknown }
  | { readonly id: number; readonly ok: false; readonly message: string };

interface WorkerScope {
  postMessage(message: SheetsResponse, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<SheetsRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;

/** Pixels per layout unit of text drawn as an image (384 dpi). */
const RASTER_SCALE = 4;

/**
 * Text in scripts the PDF's fonts lack (Chinese, Japanese, Arabic…), drawn with the device's own
 * fonts into an image of the text's coverage.
 */
function rasterize(text: string, style: TextStyle): RasterText | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  const families = style.families.map(family => (/\s/.test(family) ? `"${family}"` : family)).join(', ');
  const font = `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${style.size * RASTER_SCALE}px ${families}`;
  const measuring = new OffscreenCanvas(1, 1).getContext('2d');
  if (measuring === null) return null;
  measuring.font = font;
  const metrics = measuring.measureText(text);
  const left = Math.floor(-metrics.actualBoundingBoxLeft) - 1;
  const right = Math.ceil(metrics.actualBoundingBoxRight) + 1;
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent) + 1;
  const descent = Math.ceil(metrics.actualBoundingBoxDescent) + 1;
  const columns = Math.max(1, right - left);
  const rows = Math.max(1, ascent + descent);
  const context = new OffscreenCanvas(columns, rows).getContext('2d');
  if (context === null) return null;
  context.font = font;
  context.fillStyle = '#000';
  context.textBaseline = 'alphabetic';
  context.fillText(text, -left, ascent);
  const pixels = context.getImageData(0, 0, columns, rows).data;
  const alpha = new Uint8Array(columns * rows);
  for (let index = 0; index < alpha.length; index++) alpha[index] = pixels[index * 4 + 3] ?? 0;
  return {
    width: metrics.width / RASTER_SCALE,
    left: left / RASTER_SCALE,
    top: -ascent / RASTER_SCALE,
    boxWidth: columns / RASTER_SCALE,
    boxHeight: rows / RASTER_SCALE,
    columns,
    rows,
    alpha,
  };
}

/** Music fonts' glyphs, read once per font (REND-241). */
const musicFonts = new Map<string, Promise<MusicGlyphs>>();

/** A music font's glyphs, Bravura's where it lacks one; nothing for Bravura itself. */
async function glyphsOf(font: MusicFontFile | null | undefined): Promise<{ glyphs?: MusicGlyphs }> {
  if (font === null || font === undefined) return {};
  let glyphs = musicFonts.get(font.id);
  if (glyphs === undefined) {
    glyphs = fetch(font.url)
      .then(response => {
        if (!response.ok) throw new Error(`The music font could not be loaded (${response.status}).`);
        return response.arrayBuffer();
      })
      .then(buffer => musicGlyphsOf(readOutlines(new Uint8Array(buffer))));
    musicFonts.set(font.id, glyphs);
    glyphs.catch(() => musicFonts.delete(font.id));
  }
  return { glyphs: await glyphs };
}

const methods: SheetsMethods = {
  svg: async ({ sheet, options, musicFont }) => ({
    svg: sheetSvg(sheet, { ...options, ...(await glyphsOf(musicFont)) }),
  }),
  pdf: async ({ sheets, metadata, musicFont }) => {
    const writer = new PdfWriter({
      palette: PRINT_PALETTE,
      metadata,
      fonts: TEXT_FONTS,
      rasterize,
      ...(await glyphsOf(musicFont)),
    });
    for (const sheet of sheets) await writer.addSheet(sheet);
    return { bytes: await writer.finish() };
  },
  zip: ({ files }) => {
    const entries: Zippable = {};
    for (const file of files) {
      // Text compresses well; images are compressed already.
      entries[file.name] =
        typeof file.data === 'string' ? [strToU8(file.data), { level: 6 }] : [file.data, { level: 0 }];
    }
    return { bytes: zipSync(entries) };
  },
};

function run(request: SheetsRequest): unknown {
  switch (request.method) {
    case 'svg':
      return methods.svg(request.args as SheetsRequest<'svg'>['args']);
    case 'pdf':
      return methods.pdf(request.args as SheetsRequest<'pdf'>['args']);
    case 'zip':
      return methods.zip(request.args as SheetsRequest<'zip'>['args']);
  }
}

scope.addEventListener('message', event => {
  const request = event.data;
  void (async () => {
    try {
      const result: unknown = await run(request);
      const transfer =
        typeof result === 'object' &&
        result !== null &&
        'bytes' in result &&
        result.bytes instanceof Uint8Array
          ? [result.bytes.buffer]
          : [];
      scope.postMessage({ id: request.id, ok: true, result }, transfer);
    } catch (error) {
      scope.postMessage({
        id: request.id,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
});
