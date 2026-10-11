/**
 * @opentabz/core — the engine side of OpenTabz. Imports alphaTab; runs in the engine worker and
 * in Node. The UI must import only `@opentabz/core/shared`.
 */
export * from './shared/index.ts';
export { sniffFormat, type SniffResult } from './formats/sniff.ts';
export { decodeText, classifyText, type DecodedText, type TextKind } from './formats/text.ts';
export {
  readZipDirectory,
  readZipEntryPrefix,
  isZip,
  type ZipDirectory,
  type ZipEntry,
} from './formats/zip.ts';
export {
  openScore,
  OpenFailure,
  MAX_FILE_BYTES,
  createImportSettings,
  type OpenedScore,
} from './open/open.ts';
export { summarizeScore, type SummaryMeta } from './document/summary.ts';
export {
  RenderSession,
  RenderSessionError,
  classify,
  type LayoutResult,
  type PaintedPartial,
} from './render/session.ts';
export { createRenderSettings, layoutMode } from './render/settings.ts';
export { applyStaffDisplay } from './render/staff-display.ts';
export { EngineHost, EngineHostError } from './engine/host.ts';
export { ALPHATAB_VERSION } from './engine/version.ts';
