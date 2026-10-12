/**
 * A toolbar that folds (UX-029): as many of its same-sized tools as fit beside what it always
 * shows stay on it; the rest fold into its "more" menu, which then takes a slot of its own.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';

/** How many of `count` tools of `slot` pixels fit in `available` pixels, leaving one for "more". */
export function foldedCount(available: number, slot: number, count: number): number {
  if (available >= count * slot) return count;
  return Math.max(0, Math.floor(available / slot) - 1);
}

/** How many tools stay on the toolbar, measured as it and what it always shows change size. */
export function useFolding(
  toolbar: RefObject<HTMLElement | null>,
  first: RefObject<HTMLElement | null>,
  second: RefObject<HTMLElement | null>,
  count: number,
  slot: number,
): number {
  const [visible, setVisible] = useState(count);
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (element === null) return;
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(element);
      const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const kept = [first.current, second.current].reduce(
        (width, part) => width + (part === null ? 0 : part.offsetWidth + gap),
        0,
      );
      setVisible(foldedCount(element.clientWidth - padding - kept, slot, count));
    });
    observer.observe(element);
    for (const part of [first.current, second.current]) if (part !== null) observer.observe(part);
    return () => {
      observer.disconnect();
    };
  }, [toolbar, first, second, count, slot]);
  return visible;
}
