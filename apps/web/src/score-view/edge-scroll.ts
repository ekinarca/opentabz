/**
 * Scrolls a container while a drag holds the pointer near (or beyond) one of its edges, so a
 * selection can be extended past what is visible.
 */

/** Distance from an edge, in CSS pixels, where scrolling starts. */
export const EDGE_ZONE = 48;
/** Scroll speed, in pixels per frame, with the pointer at or beyond an edge. */
export const EDGE_MAX_SPEED = 18;

/** Signed scroll speed along one axis for a pointer at `position` in a box from `min` to `max`. */
export function edgeVelocity(position: number, min: number, max: number): number {
  const zone = Math.min(EDGE_ZONE, (max - min) / 4);
  if (zone <= 0) return 0;
  if (position < min + zone) return -Math.ceil(EDGE_MAX_SPEED * Math.min(1, (min + zone - position) / zone));
  if (position > max - zone) return Math.ceil(EDGE_MAX_SPEED * Math.min(1, (position - (max - zone)) / zone));
  return 0;
}

export class EdgeScroller {
  private readonly element: HTMLElement;
  private readonly onScroll: () => void;
  private frame = 0;
  private velocityX = 0;
  private velocityY = 0;

  /** `onScroll` runs after every automatic scroll step (re-evaluate the drag there). */
  public constructor(element: HTMLElement, onScroll: () => void) {
    this.element = element;
    this.onScroll = onScroll;
  }

  /** Call with every pointer move of the drag. */
  public update(clientX: number, clientY: number): void {
    const rect = this.element.getBoundingClientRect();
    this.velocityX = edgeVelocity(clientX, rect.left, rect.right);
    this.velocityY = edgeVelocity(clientY, rect.top, rect.bottom);
    if ((this.velocityX !== 0 || this.velocityY !== 0) && this.frame === 0) {
      this.frame = requestAnimationFrame(this.step);
    }
  }

  public stop(): void {
    if (this.frame !== 0) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  private readonly step = (): void => {
    this.frame = 0;
    if (this.velocityX === 0 && this.velocityY === 0) return;
    const { scrollLeft, scrollTop } = this.element;
    this.element.scrollBy(this.velocityX, this.velocityY);
    if (this.element.scrollLeft === scrollLeft && this.element.scrollTop === scrollTop) return;
    this.onScroll();
    this.frame = requestAnimationFrame(this.step);
  };
}
