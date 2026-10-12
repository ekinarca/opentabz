/**
 * @opentabz/core/print — pages of a score as files: SVG pages and PDF documents, drawn from the
 * SVG the engine paints. alphaTab-free: runs in an export worker.
 */
export {
  readDrawing,
  readFont,
  walkDrawing,
  decodeEntities,
  type DrawOp,
  type Drawing,
  type Paint,
  type Shade,
  type TextAnchor,
  type TextBaseline,
  type TextStyle,
} from './drawing.ts';
export { parsePath, pathBounds, type Segment } from './path.ts';
export {
  MUSIC_FONT_SIZE,
  musicGlyph,
  placeSymbols,
  type MusicGlyph,
  type MusicGlyphs,
  type PlacedGlyph,
} from './glyphs.ts';
export { musicGlyphsOf, OUTLINE_UNITS_PER_EM, readOutlines, type FontOutlines } from './outlines.ts';
export {
  sheetSvg,
  pageTexts,
  formatNumber,
  escapeXml,
  PAGE_TEXT_COLOR,
  UNITS_PER_MM,
  UNITS_PER_POINT,
  type Sheet,
  type SheetPartial,
  type SheetSvgOptions,
} from './sheet.ts';
export {
  PdfWriter,
  normalizeSpaces,
  type PdfMetadata,
  type PdfOptions,
  type RasterText,
  type TextRasterizer,
} from './pdf.ts';
export {
  baselineShift,
  covers,
  parseUnicodeRanges,
  textFace,
  SCREEN_METRICS,
  type TextFace,
  type TextFamily,
  type TextFontFile,
  type TextFontSource,
} from './text-fonts.ts';
export { readTrueType, FontFormatError, type TrueTypeFont } from './truetype.ts';
