/**
 * Pages as files (EXP-001, EXP-002, EXP-003, EXP-026, EXP-027) and as print-ready pages
 * (EXP-016): the chosen pages written by the sheets worker into one PDF document, or each drawn
 * as SVG, then kept as SVG, drawn into a PNG at the chosen resolution, or handed to the print
 * dialog. Several image files go into one ZIP archive.
 */
import type { PdfMetadata } from '@opentabz/core/print';
import { PRINT_PALETTE } from '@opentabz/core/shared';
import type { PagedScore } from './pages.ts';
import { svgToPng } from './raster.ts';
import { callSheets } from './sheets-client.ts';

export const PAGE_FORMATS = ['pdf', 'png', 'svg'] as const;
export type PageFormat = (typeof PAGE_FORMATS)[number];

/** PNG resolutions offered, in dots per inch (72: screen, 150: draft print, 300: print). */
export const PNG_RESOLUTIONS = [72, 150, 300] as const;
export type PngResolution = (typeof PNG_RESOLUTIONS)[number];

const PAPER_WHITE = '#FFFFFF';
const LAYOUT_DPI = 96;

export interface PageFilesOptions {
  readonly format: PageFormat;
  /** Page indexes (from 0), in order. */
  readonly pages: readonly number[];
  readonly dpi: PngResolution;
  readonly transparent: boolean;
}

export interface ExportedFile {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly type: string;
}

export class PagesCancelled extends Error {
  public constructor() {
    super('The export was cancelled.');
    this.name = 'PagesCancelled';
  }
}

const TYPES: Readonly<Record<PageFormat, string>> = {
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  png: 'image/png',
};

/** Pages from `from` to `to` (from 1, inclusive) as page indexes, clamped to the score. */
export function pageRange(from: number, to: number, pageCount: number): number[] {
  const first = Math.max(1, Math.min(from, to));
  const last = Math.min(pageCount, Math.max(from, to));
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first - 1 + index);
}

/** A page's file name: the score's, numbered when the score has more than one page. */
export function pageFileName(base: string, index: number, pageCount: number, extension: string): string {
  if (pageCount <= 1) return `${base}.${extension}`;
  const number = String(index + 1).padStart(String(pageCount).length, '0');
  return `${base}-${number}.${extension}`;
}

/** Share of a PDF export's progress spent drawing the pages; writing the file takes the rest. */
const PDF_DRAWING_SHARE = 0.8;

export async function exportPageFiles(
  paged: PagedScore,
  base: string,
  options: PageFilesOptions,
  metadata: PdfMetadata,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<ExportedFile> {
  if (options.format === 'pdf') {
    const sheets = [];
    for (const [done, index] of options.pages.entries()) {
      if (signal.aborted) throw new PagesCancelled();
      sheets.push(await paged.sheet(index));
      onProgress(((done + 1) / options.pages.length) * PDF_DRAWING_SHARE);
    }
    if (signal.aborted) throw new PagesCancelled();
    const { bytes } = await callSheets('pdf', { sheets, metadata, musicFont: paged.musicFont });
    onProgress(1);
    return { bytes, name: `${base}.pdf`, type: TYPES.pdf };
  }
  const files: { name: string; data: Uint8Array | string }[] = [];
  const scale = options.dpi / LAYOUT_DPI;
  const pixels = {
    width: Math.round(paged.paper.width * scale),
    height: Math.round(paged.paper.height * scale),
  };
  for (const [done, index] of options.pages.entries()) {
    if (signal.aborted) throw new PagesCancelled();
    const sheet = await paged.sheet(index);
    const { svg } = await callSheets('svg', {
      sheet,
      musicFont: paged.musicFont,
      options: {
        palette: PRINT_PALETTE,
        background: options.transparent ? null : PAPER_WHITE,
        idPrefix: '',
        ...(options.format === 'png' ? { pixels } : {}),
      },
    });
    const name = pageFileName(base, index, paged.pageCount, options.format);
    files.push({
      name,
      data: options.format === 'png' ? await svgToPng(svg, pixels.width, pixels.height) : svg,
    });
    onProgress((done + 1) / options.pages.length);
  }
  if (signal.aborted) throw new PagesCancelled();
  const [only] = files;
  if (files.length === 1 && only !== undefined) {
    const bytes = typeof only.data === 'string' ? new TextEncoder().encode(only.data) : only.data;
    return { bytes, name: only.name, type: TYPES[options.format] };
  }
  const { bytes } = await callSheets('zip', { files });
  return { bytes, name: `${base}.zip`, type: 'application/zip' };
}

/** The chosen pages as SVG for printing, each with ids of its own. */
export async function printSheets(
  paged: PagedScore,
  pages: readonly number[],
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string[]> {
  const svgs: string[] = [];
  for (const [done, index] of pages.entries()) {
    if (signal.aborted) throw new PagesCancelled();
    const sheet = await paged.sheet(index);
    const { svg } = await callSheets('svg', {
      sheet,
      musicFont: paged.musicFont,
      options: { palette: PRINT_PALETTE, background: PAPER_WHITE, idPrefix: `p${index + 1}-` },
    });
    svgs.push(svg);
    onProgress((done + 1) / pages.length);
  }
  if (signal.aborted) throw new PagesCancelled();
  return svgs;
}
