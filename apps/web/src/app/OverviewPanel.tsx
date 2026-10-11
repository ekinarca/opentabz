import { playsIn, type MasterBarSummary, type ScoreOverview, type TrackSummary } from '@opentabz/core/shared';
import { IconButton, cx } from '@opentabz/ui';
import { X } from 'lucide-react';
import { memo, useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useScoreOverview } from '../instrument-view/use-track-notes.ts';
import {
  barNumberRange,
  findBarOccurrence,
  occurrence,
  occurrenceOfMasterBar,
  rangeBars,
} from '../score-view/timeline-lookup.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { ToggleChip } from './Mixer.tsx';

const s = strings.overview;
const m = strings.mixer;

/** A bar's column and a track's row, in CSS pixels, and the square drawn inside them. */
const COLUMN = 20;
const ROW = 28;
const CELL_WIDTH = 16;
const CELL_HEIGHT = 20;
const CELL_X = (COLUMN - CELL_WIDTH) / 2;
const CELL_Y = (ROW - CELL_HEIGHT) / 2;

interface Section {
  readonly start: number;
  readonly end: number;
  readonly name: string;
}

/** Where each section starts and ends (master bar indexes), and its name. */
function sectionsOf(bars: readonly MasterBarSummary[]): Section[] {
  const starts: { start: number; name: string }[] = [];
  bars.forEach((bar, index) => {
    if (bar.section !== null)
      starts.push({ start: index, name: bar.section.text.trim() || bar.section.marker });
  });
  return starts.map((section, index) => ({ ...section, end: starts[index + 1]?.start ?? bars.length }));
}

function trackName(track: TrackSummary): string {
  return track.name.trim().length > 0 ? track.name : track.shortName;
}

/** The squares, drawn once per song: in the track's colour where it plays, hollow where it rests. */
const Cells = memo(function Cells({
  overview,
  tracks,
  sections,
}: {
  readonly overview: ScoreOverview;
  readonly tracks: readonly TrackSummary[];
  readonly sections: readonly Section[];
}) {
  const pattern = `ot-overview-${useId().replace(/[^\w-]/g, '')}`;
  const width = overview.barCount * COLUMN;
  const height = overview.trackCount * ROW;
  const played = [];
  for (let track = 0; track < overview.trackCount; track++) {
    for (let bar = 0; bar < overview.barCount; bar++) {
      if (!playsIn(overview, track, bar)) continue;
      played.push(
        <rect
          key={`${track}:${bar}`}
          data-track={track}
          data-bar={bar + 1}
          x={bar * COLUMN + CELL_X}
          y={track * ROW + CELL_Y}
          width={CELL_WIDTH}
          height={CELL_HEIGHT}
          rx={3}
          fill={tracks[track]?.color ?? 'currentColor'}
        />,
      );
    }
  }
  return (
    <svg width={width} height={height} aria-hidden className="relative block">
      <defs>
        <pattern id={pattern} width={COLUMN} height={ROW} patternUnits="userSpaceOnUse">
          <rect
            x={CELL_X + 0.5}
            y={CELL_Y + 0.5}
            width={CELL_WIDTH - 1}
            height={CELL_HEIGHT - 1}
            rx={2.5}
            className="fill-sunken stroke-line"
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${pattern})`} />
      {sections
        .filter(section => section.start > 0)
        .map(section => (
          <line
            key={section.start}
            x1={section.start * COLUMN}
            x2={section.start * COLUMN}
            y1={0}
            y2={height}
            className="stroke-line-strong"
          />
        ))}
      {played}
    </svg>
  );
});

/**
 * The song overview (VIEW-015, Guitar Pro's global view): a row per track with its mute and solo,
 * a square per bar filled where the track plays, under the sections and the bar numbers. A click
 * goes to the bar and makes the track the active one, a drag selects bars, a track's name makes it
 * the active one. As a slider, the arrow keys step bars, Page Up and Page Down sections, Home and
 * End go to the ends.
 */
export function OverviewPanel({ doc }: { readonly doc: OpenDocument }) {
  const overview = useScoreOverview(doc.engineId);
  const timeline = usePlayer(state => (state.docKey === doc.key ? state.timeline : null));
  const current = usePlayer(state => {
    const own = state.docKey === doc.key ? state.timeline : null;
    if (own === null) return -1;
    return occurrence(own, findBarOccurrence(own, state.tick))?.masterBarIndex ?? -1;
  });
  const selection = usePlayer(state => (state.docKey === doc.key ? state.selection : null));
  const seek = usePlayer(state => state.seek);
  const setSelection = usePlayer(state => state.setSelection);
  const setActiveTrack = useDocuments(state => state.setActiveTrack);
  const updateMix = useDocuments(state => state.updateMix);
  const setPreferences = usePreferences(state => state.set);
  const cursorColor = usePreferences(state => state.cursorColor);
  const scroller = useRef<HTMLDivElement>(null);
  const names = useRef<HTMLDivElement>(null);
  const drag = useRef<{ anchor: number; track: number; moved: boolean } | null>(null);

  const { tracks, masterBars } = doc.summary;
  const count = masterBars.length;
  const sections = sectionsOf(masterBars);
  const selected = timeline === null || selection === null ? null : rangeBars(timeline, selection);
  const sectionAt = (bar: number) => sections.findLast(section => section.start <= bar) ?? null;

  // The bar being played stays in view.
  useEffect(() => {
    const pane = scroller.current;
    if (pane === null || current < 0) return;
    const nameWidth = names.current?.offsetWidth ?? 0;
    const left = current * COLUMN;
    const shown = pane.clientWidth - nameWidth;
    if (left < pane.scrollLeft || left + COLUMN > pane.scrollLeft + shown) {
      pane.scrollTo({ left: Math.max(0, left - shown / 3), behavior: 'smooth' });
    }
  }, [current]);

  const goTo = (bar: number) => {
    if (timeline === null) return;
    const target = occurrenceOfMasterBar(timeline, Math.max(0, Math.min(count - 1, bar)));
    if (target !== null) seek(target.startTick);
  };
  const select = (from: number, to: number, final: boolean) => {
    if (timeline === null) return;
    const range = barNumberRange(timeline, from, to);
    if (range !== null) setSelection(range, final);
  };
  const cellAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      bar: Math.max(0, Math.min(count - 1, Math.floor((event.clientX - box.left) / COLUMN))),
      track: Math.max(0, Math.min(tracks.length - 1, Math.floor((event.clientY - box.top) / ROW))),
    };
  };
  const sectionStep = (direction: 1 | -1) => {
    if (direction < 0) {
      const here = sectionAt(current);
      if (here !== null && current > here.start) return here.start;
      return sectionAt(current - 1)?.start ?? 0;
    }
    return sections.find(section => section.start > current)?.start ?? count - 1;
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
    if (move === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    goTo(move());
  };

  const playing =
    overview === null || current < 0
      ? []
      : tracks.filter(track => playsIn(overview, track.index, current)).map(trackName);

  return (
    <section
      aria-label={s.title}
      className="ot-overview flex max-h-[min(40vh,320px)] shrink-0 flex-col border-t border-line bg-surface"
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <h2 className="text-[13px] font-semibold text-ink">{s.title}</h2>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setPreferences({ overview: false });
            }}
          />
        </div>
      </div>
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto overscroll-contain pb-2">
        <div className="flex w-max">
          {/* The tracks, kept in view while the bars scroll by. */}
          <div
            ref={names}
            role="group"
            aria-label={s.tracks}
            className="sticky left-0 z-20 w-[clamp(132px,30vw,260px)] shrink-0 border-r border-line bg-surface"
          >
            <div className="sticky top-0 z-10 h-8 bg-surface" />
            {tracks.map(track => {
              const name = trackName(track);
              const mix = doc.mix[track.index];
              const active = track.index === doc.activeTrack;
              return (
                <div
                  key={track.index}
                  className="flex items-center gap-1 pr-1.5 pl-2"
                  style={{ height: ROW }}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setActiveTrack(doc.key, track.index);
                    }}
                    className={cx(
                      'flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-left text-[12.5px]',
                      active ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-sunken',
                      mix?.mute === true && !active && 'text-ink-faint line-through',
                    )}
                  >
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ background: track.color }}
                      aria-hidden
                    />
                    <span className="truncate">{name}</span>
                  </button>
                  {/* On a phone the names need the room: the mixer has these too. */}
                  {mix !== undefined && (
                    <div className="flex items-center gap-1 max-sm:hidden">
                      <ToggleChip
                        compact
                        label={m.mute(name)}
                        pressed={mix.mute}
                        onClick={() => {
                          updateMix(doc.key, track.index, { mute: !mix.mute });
                        }}
                      >
                        {m.muteShort}
                      </ToggleChip>
                      <ToggleChip
                        compact
                        label={m.solo(name)}
                        pressed={mix.solo}
                        onClick={() => {
                          updateMix(doc.key, track.index, { solo: !mix.solo });
                        }}
                      >
                        {m.soloShort}
                      </ToggleChip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="relative shrink-0" style={{ width: count * COLUMN }}>
            {/* Sections and bar numbers, kept in view while the tracks scroll by. */}
            <div className="sticky top-0 z-10 h-8 bg-surface" aria-hidden>
              {sections.map(section => (
                <span
                  key={section.start}
                  title={section.name}
                  className="absolute top-0.5 truncate border-l-2 border-line-strong pl-1 text-[10.5px] leading-[14px] font-semibold text-ink-muted"
                  style={{ left: section.start * COLUMN, width: (section.end - section.start) * COLUMN }}
                >
                  {section.name}
                </span>
              ))}
              {masterBars.map((_, bar) => (
                <span
                  key={bar}
                  className={cx(
                    'absolute top-[17px] text-center font-mono text-[9.5px] leading-[13px] tabular-nums',
                    bar === current ? 'font-bold text-ink' : 'text-ink-faint',
                  )}
                  style={{ left: bar * COLUMN, width: COLUMN }}
                >
                  {bar + 1}
                </span>
              ))}
            </div>
            <div
              role="slider"
              tabIndex={0}
              aria-label={s.bars}
              aria-valuemin={1}
              aria-valuemax={count}
              aria-valuenow={current + 1}
              aria-valuetext={s.value(current + 1, count, sectionAt(current)?.name ?? '', playing)}
              onKeyDown={onKeyDown}
              onPointerDown={event => {
                if (event.button !== 0) return;
                const { bar, track } = cellAt(event);
                drag.current = { anchor: bar, track, moved: false };
                // A finger scrolls the overview: it goes to bars, a mouse or pen also selects them.
                if (event.pointerType !== 'touch') event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={event => {
                const dragging = drag.current;
                if (dragging === null || event.pointerType === 'touch') return;
                const { bar } = cellAt(event);
                if (bar === dragging.anchor && !dragging.moved) return;
                dragging.moved = true;
                select(dragging.anchor, bar, false);
              }}
              onPointerUp={event => {
                const dragging = drag.current;
                drag.current = null;
                if (dragging === null) return;
                const { bar } = cellAt(event);
                if (dragging.moved) {
                  select(dragging.anchor, bar, true);
                  return;
                }
                goTo(bar);
                if (dragging.track !== doc.activeTrack) setActiveTrack(doc.key, dragging.track);
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              className="relative cursor-pointer outline-none select-none focus-visible:ring-2 focus-visible:ring-focus"
              style={{ height: tracks.length * ROW }}
            >
              {/* The active track's row. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bg-accent-soft/60"
                style={{ top: doc.activeTrack * ROW, height: ROW }}
              />
              {overview !== null && <Cells overview={overview} tracks={tracks} sections={sections} />}
              {selected !== null && (
                <div
                  aria-hidden
                  data-overview-selection={`${selected.first + 1}-${selected.last + 1}`}
                  className="pointer-events-none absolute inset-y-0 rounded-[4px] bg-accent/15 ring-2 ring-accent ring-inset"
                  style={{
                    left: Math.min(selected.first, selected.last) * COLUMN,
                    width: (Math.abs(selected.last - selected.first) + 1) * COLUMN,
                  }}
                />
              )}
              {current >= 0 && (
                <div
                  aria-hidden
                  data-overview-current={current + 1}
                  className="pointer-events-none absolute inset-y-0 rounded-[4px] ring-2 ring-[var(--ot-cursor)] ring-inset"
                  style={{ left: current * COLUMN, width: COLUMN }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
