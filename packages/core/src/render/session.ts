/**
 * One render session = one rendered view of a document: an alphaTab `ScoreRenderer` (SVG engine,
 * lazy partials) plus the bookkeeping to stream layout and SVG to the UI.
 *
 * Layout is synchronous: `layout()` returns every partial's geometry at once. Painting is lazy:
 * the UI asks for the partials that approach the viewport via `paint()`.
 */
import * as alphaTab from '@coderline/alphatab';
import { sameColoring } from '../shared/note-colors.ts';
import { sameReadingAids } from '../shared/reading-aids.ts';
import { sameScoreStyle, type ScoreStyle } from '../shared/style.ts';
import {
  sameIndexes,
  sameTrackStaves,
  type PartialKind,
  type PartialLayout,
  type ViewOptions,
} from '../shared/view.ts';
import { BOUNDS_BAR_RECT_STRIDE, BOUNDS_SYSTEM_STRIDE, type ScoreBounds } from '../shared/playback.ts';
import { extractBounds } from './bounds.ts';
import { createRenderSettings } from './settings.ts';
import { applyLetRingThroughout } from './let-ring.ts';
import { applyScoreStyle, readScoreStyle } from './style.ts';
import { applyNoteColors } from './note-colors.ts';
import { applyReadingAids } from './reading-aids.ts';
import { applyVoiceColors } from './voice-colors.ts';
import { layoutDrumKey } from './drum-key.ts';
import { layoutTextBlocks, type TextBlocksLayout } from './text-blocks.ts';
import { applyConcertPitch, applyStaffDisplay } from './staff-display.ts';

export interface LayoutResult {
  /** Increases with every layout; partial ids are only valid within their generation. */
  readonly generation: number;
  readonly width: number;
  readonly height: number;
  readonly partials: readonly PartialLayout[];
  readonly bounds: ScoreBounds;
  readonly layoutMs: number;
}

export interface PaintedPartial {
  readonly id: string;
  readonly svg: string;
}

export class RenderSessionError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RenderSessionError';
  }
}

/** Ids of the session's own partials, unique across layouts and sessions. */
let blockSerial = 0;

export class RenderSession {
  private readonly renderer: alphaTab.rendering.ScoreRenderer;
  private readonly score: alphaTab.model.Score;
  private options: ViewOptions;
  private generation = 0;
  private collected: alphaTab.rendering.RenderFinishedEventArgs[] = [];
  private painted: PaintedPartial[] = [];
  /**
   * Partials of the session's own in the current layout, painted with it: the instructions and
   * notice (REND-041) and the drum key (REND-318).
   */
  private blocks: PaintedPartial[] = [];
  private finished: alphaTab.rendering.RenderFinishedEventArgs | null = null;
  private failure: Error | null = null;
  private disposed = false;
  /** The style the file brought: a view's style changes the stylesheet only where it differs. */
  private readonly fileStyle: ScoreStyle;

  public constructor(score: alphaTab.model.Score, options: ViewOptions) {
    this.score = score;
    this.options = options;
    this.fileStyle = readScoreStyle(score);
    this.renderer = new alphaTab.rendering.ScoreRenderer(createRenderSettings(options));
    this.renderer.partialLayoutFinished.on(args => this.collected.push(args));
    this.renderer.partialRenderFinished.on(args => {
      if (typeof args.renderResult === 'string') this.painted.push({ id: args.id, svg: args.renderResult });
    });
    this.renderer.renderFinished.on(args => {
      this.finished = args;
    });
    this.renderer.error.on(error => {
      this.failure = error;
    });
  }

  public get viewOptions(): ViewOptions {
    return this.options;
  }

  /** Generation of the current layout; 0 before the first layout. */
  public get currentGeneration(): number {
    return this.generation;
  }

  /** Lays out the score with new options. Uses alphaTab's fast resize path when only the width changed. */
  public layout(options: ViewOptions = this.options): LayoutResult {
    this.assertAlive();
    const onlyWidthChanged = this.generation > 0 && sameExceptWidth(this.options, options);
    this.options = options;
    const started = performance.now();
    this.begin();
    this.withStaffDisplay(() => {
      if (onlyWidthChanged) {
        this.renderer.width = options.width;
        this.renderer.resizeRender();
      } else {
        this.renderer.updateSettings(createRenderSettings(options));
        this.renderer.width = options.width;
        this.renderer.renderScore(this.score, validTrackIndexes(this.score, options.trackIndexes));
      }
    });
    return this.end(performance.now() - started);
  }

  /** Paints laid-out partials of the current generation. Unknown ids are ignored. */
  public paint(ids: readonly string[]): PaintedPartial[] {
    this.assertAlive();
    this.painted = [];
    this.failure = null;
    this.withStaffDisplay(() => {
      for (const id of ids) {
        const block = this.blocks.find(candidate => candidate.id === id);
        if (block !== undefined) this.painted.push(block);
        else this.renderer.renderResult(id);
      }
    });
    const failure = this.takeFailure();
    if (failure !== null) throw new RenderSessionError('Painting the score failed.', { cause: failure });
    const result = this.painted;
    this.painted = [];
    return result;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.destroy();
  }

  private begin(): void {
    this.generation++;
    this.collected = [];
    this.finished = null;
    this.failure = null;
  }

  private end(layoutMs: number): LayoutResult {
    const failure = this.takeFailure();
    if (failure !== null) throw new RenderSessionError('Laying out the score failed.', { cause: failure });
    const laidOut = classify(this.collected);
    const finished = this.finished;
    const width = finished?.totalWidth ?? Math.max(0, ...laidOut.map(p => p.x + p.width));
    const height = finished?.totalHeight ?? Math.max(0, ...laidOut.map(p => p.y + p.height));
    this.collected = [];
    const bounds = extractBounds(this.renderer.boundsLookup);
    const { style } = this.options;
    const laidBlocks =
      this.options.layout === 'horizontal'
        ? []
        : [
            style === undefined
              ? null
              : layoutTextBlocks(this.score, style, this.renderer.settings, this.options.width),
            this.options.drumKey === true
              ? layoutDrumKey(
                  tracksFor(this.score, this.options.trackIndexes),
                  style ?? this.fileStyle,
                  this.renderer.settings,
                  this.options.width,
                )
              : null,
          ].filter((block): block is TextBlocksLayout => block !== null);
    this.blocks = [];
    if (laidBlocks.length === 0)
      return { generation: this.generation, width, height, partials: laidOut, bounds, layoutMs };

    // The blocks go under the title block, one after another, and what follows moves down.
    const total = laidBlocks.reduce((sum, block) => sum + block.height, 0);
    const headers = laidOut.filter(partial => partial.kind === 'header');
    const top =
      headers.length > 0
        ? Math.max(...headers.map(partial => partial.y + partial.height))
        : (laidOut.find(partial => partial.kind === 'system')?.y ?? 0);
    const partials = laidOut.map(partial =>
      partial.y >= top ? { ...partial, y: partial.y + total } : partial,
    );
    let y = top;
    const placed = laidBlocks.map((block): PartialLayout => {
      blockSerial += 1;
      const id = `ot-block-${blockSerial}`;
      this.blocks.push({ id, svg: block.svg });
      const partial: PartialLayout = {
        id,
        kind: 'header',
        x: 0,
        y,
        width: this.options.width,
        height: block.height,
        firstBar: -1,
        lastBar: -1,
      };
      y += block.height;
      return partial;
    });
    // Right after the last header, or first of all.
    partials.splice(partials.findLastIndex(partial => partial.kind === 'header') + 1, 0, ...placed);
    return {
      generation: this.generation,
      width,
      height: height + total,
      partials,
      bounds: moveDown(bounds, top, total),
      layoutMs,
    };
  }

  /** Returns and clears the error reported by the renderer's error event, if any. */
  private takeFailure(): Error | null {
    const failure = this.failure;
    this.failure = null;
    return failure;
  }

  private withStaffDisplay(action: () => void): void {
    const tracks = tracksFor(this.score, this.options.trackIndexes);
    const restoreStaves = applyStaffDisplay(tracks, this.options.staffDisplay, this.options.staves);
    const restorePitch = applyConcertPitch(tracks, this.options.concertPitch === true);
    // Voices' colours first: the view's note colours win where both apply.
    const restoreVoices = applyVoiceColors(tracks, this.options.style?.voiceColors === true);
    const restoreColors = applyNoteColors(tracks, this.options.noteColors);
    const restoreAids = applyReadingAids(tracks, this.options.readingAids);
    const restoreLetRing = applyLetRingThroughout(tracks, this.options.letRing);
    const restore = () => {
      restoreLetRing();
      restoreAids();
      restoreColors();
      restoreVoices();
      restorePitch();
      restoreStaves();
    };
    const { style } = this.options;
    const restoreStyle = style === undefined ? null : applyScoreStyle(this.score, style, this.fileStyle);
    try {
      action();
    } finally {
      restoreStyle?.();
      restore();
    }
  }

  private assertAlive(): void {
    if (this.disposed) throw new RenderSessionError('The render session was disposed.');
  }
}

/**
 * Labels partials: header blocks before the first system, systems, footer blocks after the last
 * system, and alphaTab's trailing "rendered by alphaTab" annotation as `credit` (ADR-0014).
 */
export function classify(args: readonly alphaTab.rendering.RenderFinishedEventArgs[]): PartialLayout[] {
  const firstSystem = args.findIndex(a => a.firstMasterBarIndex >= 0);
  let lastSystem = -1;
  args.forEach((a, index) => {
    if (a.firstMasterBarIndex >= 0) lastSystem = index;
  });
  return args.map((a, index) => {
    let kind: PartialKind;
    if (a.firstMasterBarIndex >= 0) kind = 'system';
    else if (index === args.length - 1 && index > lastSystem) kind = 'credit';
    else if (firstSystem < 0 || index < firstSystem) kind = 'header';
    else kind = 'footer';
    return {
      id: a.id,
      kind,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      firstBar: a.firstMasterBarIndex,
      lastBar: a.lastMasterBarIndex,
    };
  });
}

function sameExceptWidth(a: ViewOptions, b: ViewOptions): boolean {
  return (
    a.layout === b.layout &&
    a.systemsLayout === b.systemsLayout &&
    a.staffDisplay === b.staffDisplay &&
    sameTrackStaves(a.staves ?? [], b.staves ?? []) &&
    a.concertPitch === b.concertPitch &&
    sameColoring(a.noteColors, b.noteColors) &&
    sameReadingAids(a.readingAids, b.readingAids) &&
    sameIndexes(a.letRing, b.letRing) &&
    a.drumKey === b.drumKey &&
    a.leftHanded === b.leftHanded &&
    a.notationScale === b.notationScale &&
    (a.style === b.style ||
      (a.style !== undefined && b.style !== undefined && sameScoreStyle(a.style, b.style))) &&
    a.bars?.first === b.bars?.first &&
    a.bars?.last === b.bars?.last &&
    sameIndexes(a.trackIndexes, b.trackIndexes)
  );
}

/** Bounds with whatever lies at or below `top` moved down by `by`. */
function moveDown(bounds: ScoreBounds, top: number, by: number): ScoreBounds {
  const move = (rects: Float32Array, stride: number): Float32Array => {
    const moved = rects.slice();
    // The second of each rectangle's values is its top.
    for (let i = 1; i < moved.length; i += stride) {
      const y = moved[i] ?? 0;
      if (y >= top) moved[i] = y + by;
    }
    return moved;
  };
  return {
    ...bounds,
    systems: move(bounds.systems, BOUNDS_SYSTEM_STRIDE),
    barRect: move(bounds.barRect, BOUNDS_BAR_RECT_STRIDE),
  };
}

function validTrackIndexes(score: alphaTab.model.Score, indexes: readonly number[]): number[] {
  const valid = indexes.filter(index => Number.isInteger(index) && index >= 0 && index < score.tracks.length);
  return valid.length > 0 ? valid : [0];
}

function tracksFor(score: alphaTab.model.Score, indexes: readonly number[]): alphaTab.model.Track[] {
  return validTrackIndexes(score, indexes).flatMap(index => {
    const track = score.tracks[index];
    return track ? [track] : [];
  });
}
