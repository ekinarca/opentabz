/**
 * The editor's caret drawn over the music (EDIT-004): a box on the string of the beat the next fret
 * is written on. It follows each layout, and the view scrolls to keep it in sight as it moves.
 */
import { caretBox, spotAtPoint, type CaretBox, type CaretSpot } from './caret-geometry.ts';
import { engineToSheet } from './pagination.ts';
import type { ScoreView } from './score-view.ts';

export interface CaretMark {
  readonly track: number;
  readonly staff: number;
  readonly beatId: number;
  readonly string: number;
}

/** Room kept around the caret when the view scrolls to it (CSS pixels). */
const MARGIN = 48;

export class CaretOverlay {
  private readonly view: ScoreView;
  private readonly element: HTMLDivElement;
  private caret: CaretMark | null = null;
  private inverted = false;

  public constructor(view: ScoreView) {
    this.view = view;
    this.element = document.createElement('div');
    this.element.className = 'ot-edit-caret';
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');
    view.overlay.append(this.element);
  }

  /** Shows the caret (null hides it); `reveal` scrolls the view to it. */
  public set(caret: CaretMark | null, inverted: boolean, reveal: boolean): void {
    this.caret = caret;
    this.inverted = inverted;
    const box = this.render();
    if (reveal && box !== null) this.reveal(box);
  }

  /** Call after every layout: the beats moved. */
  public onLayout(): void {
    this.render();
  }

  /** The beat and string a click on the music at engine point (x, y) means, or null. */
  public spotAt(x: number, y: number): CaretSpot | null {
    const bounds = this.view.bounds;
    return bounds === null ? null : spotAtPoint(bounds, new Set(this.view.trackIndexes), x, y, this.inverted);
  }

  public dispose(): void {
    this.element.remove();
  }

  /** The caret's box on the sheet, drawn; null when it is not shown. */
  private render(): { x: number; y: number; w: number; h: number } | null {
    const { caret } = this;
    const bounds = this.view.bounds;
    const layout = this.view.layout;
    const box: CaretBox | null =
      caret === null || bounds === null ? null : caretBox(bounds, caret, this.inverted);
    const topLeft = box === null || layout === null ? null : engineToSheet(layout, box.x, box.y);
    if (box === null || topLeft === null) {
      this.element.hidden = true;
      return null;
    }
    this.element.hidden = false;
    this.element.dataset['on'] = box.on;
    this.element.style.transform = `translate(${String(topLeft.x)}px, ${String(topLeft.y)}px)`;
    this.element.style.width = `${String(box.w)}px`;
    this.element.style.height = `${String(box.h)}px`;
    return { x: topLeft.x, y: topLeft.y, w: box.w, h: box.h };
  }

  /** Scrolls the view, if need be, so that the caret is in sight with room around it. */
  private reveal(box: { x: number; y: number; w: number; h: number }): void {
    const scroller = this.view.scrollContainer;
    const zoom = this.view.zoom;
    const top = box.y * zoom;
    const bottom = (box.y + box.h) * zoom;
    const left = box.x * zoom;
    const right = (box.x + box.w) * zoom;
    const options: ScrollToOptions = {};
    if (top < scroller.scrollTop + MARGIN) options.top = Math.max(0, top - MARGIN);
    else if (bottom > scroller.scrollTop + scroller.clientHeight - MARGIN)
      options.top = bottom - scroller.clientHeight + MARGIN;
    if (left < scroller.scrollLeft + MARGIN) options.left = Math.max(0, left - MARGIN);
    else if (right > scroller.scrollLeft + scroller.clientWidth - MARGIN)
      options.left = right - scroller.clientWidth + MARGIN;
    if (options.top !== undefined || options.left !== undefined) scroller.scrollTo(options);
  }
}
