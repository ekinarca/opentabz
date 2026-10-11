import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  findBarOccurrence,
  occurrence,
  occurrenceOfMasterBar,
  rangeBars,
} from '../score-view/timeline-lookup.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { strings } from '../strings.ts';

const s = strings.songMap;

/**
 * The song at a glance, above the playback bar: one cell per bar in score order, sections shaded
 * in turn and named, the bar being played lit and the selection marked. Click or drag to go to a
 * bar. As a slider, the arrow keys step bars, Page Up and Page Down sections, Home and End go to
 * the ends.
 */
export function SongMap({ doc }: { readonly doc: OpenDocument }) {
  const timeline = usePlayer(state => (state.docKey === doc.key ? state.timeline : null));
  const current = usePlayer(state => {
    const own = state.docKey === doc.key ? state.timeline : null;
    if (own === null) return -1;
    return occurrence(own, findBarOccurrence(own, state.tick))?.masterBarIndex ?? -1;
  });
  const selection = usePlayer(state => (state.docKey === doc.key ? state.selection : null));
  const seek = usePlayer(state => state.seek);
  const dragging = useRef(false);
  const bars = doc.summary.masterBars;
  const count = bars.length;
  const selected = timeline === null || selection === null ? null : rangeBars(timeline, selection);

  // Sections: where each starts and its name, and which section each bar belongs to.
  const sections: { readonly start: number; readonly name: string }[] = [];
  const sectionOf: number[] = [];
  bars.forEach((bar, index) => {
    if (bar.section !== null || index === 0) {
      const name = bar.section === null ? '' : bar.section.text.trim() || bar.section.marker;
      sections.push({ start: index, name });
    }
    sectionOf.push(sections.length - 1);
  });

  const goTo = (index: number) => {
    if (timeline === null) return;
    const target = occurrenceOfMasterBar(timeline, Math.max(0, Math.min(count - 1, index)));
    if (target !== null) seek(target.startTick);
  };
  const barAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.floor(((event.clientX - box.left) / Math.max(1, box.width)) * count);
  };
  const sectionStep = (direction: 1 | -1) => {
    const here = sectionOf[current] ?? 0;
    const section = sections[here + direction];
    if (direction < 0 && current > (sections[here]?.start ?? 0)) return sections[here]?.start ?? 0;
    return section?.start ?? (direction > 0 ? count - 1 : 0);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => number> = {
      ArrowRight: () => current + 1,
      ArrowUp: () => current + 1,
      ArrowLeft: () => current - 1,
      ArrowDown: () => current - 1,
      PageDown: () => sectionStep(1),
      PageUp: () => sectionStep(-1),
      Home: () => 0,
      End: () => count - 1,
    };
    const move = moves[event.key];
    if (move === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    goTo(move());
  };

  const name = sections[sectionOf[current] ?? -1]?.name ?? '';
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={s.label}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={current + 1}
      aria-valuetext={s.value(current + 1, count, name)}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
        goTo(barAt(event));
      }}
      onPointerMove={event => {
        if (dragging.current) goTo(barAt(event));
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className="ot-song-map relative flex h-6 shrink-0 cursor-pointer touch-none overflow-hidden border-t border-line bg-surface outline-none select-none focus-visible:ring-2 focus-visible:ring-focus max-sm:h-7"
    >
      {bars.map((bar, index) => {
        const section = sectionOf[index] ?? 0;
        const inSelection = selected !== null && index >= selected.first && index <= selected.last;
        return (
          <div
            key={index}
            data-bar={index + 1}
            data-current={index === current || undefined}
            data-selected={inSelection || undefined}
            className={`min-w-0 flex-1 border-r border-canvas/60 ${
              index === current
                ? 'bg-accent'
                : inSelection
                  ? 'bg-accent-soft'
                  : section % 2 === 0
                    ? 'bg-sunken'
                    : 'bg-raised'
            }`}
            title={s.value(index + 1, count, sections[section]?.name ?? '')}
            aria-hidden
          >
            {bar.section !== null && (
              <span className="pointer-events-none absolute top-0 mt-[3px] ml-1 max-w-[30%] truncate text-[10px] font-semibold text-ink-muted">
                {sections[section]?.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
