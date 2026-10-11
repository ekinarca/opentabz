import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip } from '@opentabz/ui';
import { useId, useRef, useState } from 'react';
import {
  barNumberRange,
  beatInBar,
  findBarOccurrence,
  occurrence,
  occurrenceOfMasterBar,
  rangeBars,
} from '../score-view/timeline-lookup.ts';
import type { OpenDocument } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { shortcutHint } from './keymap.ts';

function formatTime(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Elapsed and total time in score time (unaffected by the practice speed), and where playback
 * is: bar, beat, meter and live tempo. Opens "Go to" (bar number or section).
 */
export function PositionReadout({
  doc,
  status,
}: {
  readonly doc: OpenDocument;
  readonly status: string | null;
}) {
  const time = usePlayer(state => state.time);
  const endTime = usePlayer(state => state.endTime);
  const tick = usePlayer(state => state.tick);
  const tempo = usePlayer(state => state.tempo);
  const speed = usePlayer(state => state.speed);
  const timeline = usePlayer(state => state.timeline);
  const selection = usePlayer(state => state.selection);
  const seek = usePlayer(state => state.seek);
  const setSelection = usePlayer(state => state.setSelection);
  const setLoop = usePlayer(state => state.setLoop);
  const open = useUi(state => state.panel === 'goto');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const [barText, setBarText] = useState('');
  const [loopFrom, setLoopFrom] = useState('');
  const [loopTo, setLoopTo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const loopFromId = useId();
  const loopToId = useId();

  const bar = timeline === null ? null : occurrence(timeline, findBarOccurrence(timeline, tick));
  const masterBar = bar === null ? undefined : doc.summary.masterBars[bar.masterBarIndex];
  const meter = masterBar ?? { numerator: 4, denominator: 4 };
  const beat = bar === null ? 1 : beatInBar(bar, tick, meter);
  const bpm = Math.round((tempo / speed) * 10) / 10;
  const selected = timeline === null || selection === null ? null : rangeBars(timeline, selection);
  const barCount = doc.summary.barCount;
  const sections = doc.summary.masterBars.flatMap((summary, index) =>
    summary.section === null ? [] : [{ index, marker: summary.section.marker, text: summary.section.text }],
  );

  const goToMasterBar = (masterBarIndex: number) => {
    if (timeline === null) return;
    const target = occurrenceOfMasterBar(timeline, masterBarIndex);
    if (target === null) return;
    seek(target.startTick);
    setPanelOpen('goto', false);
  };

  let detail: string;
  if (status !== null) detail = status;
  else if (bar === null) detail = ' ';
  else
    detail = strings.transport.positionDetail(
      bar.masterBarIndex + 1,
      beat,
      meter.numerator,
      meter.denominator,
      bpm,
    );

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setPanelOpen('goto', next);
        if (next) {
          const current = bar === null ? '' : String(bar.masterBarIndex + 1);
          setBarText(current);
          setLoopFrom(selected === null ? current : String(selected.first + 1));
          setLoopTo(selected === null ? current : String(selected.last + 1));
        }
      }}
    >
      <Tooltip label={strings.transport.goTo} shortcut={shortcutHint('go-to')}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${strings.transport.goTo}: ${detail}`}
            className="ml-1 flex min-w-0 shrink-0 flex-col rounded-[var(--radius-control)] px-1.5 py-0.5 text-left leading-tight hover:bg-sunken"
          >
            <span className="font-mono text-[13px] text-ink tabular-nums">
              {formatTime(time * speed)}{' '}
              <span className="text-ink-faint">/ {formatTime(endTime * speed)}</span>
            </span>
            <span className="flex gap-1.5 text-[11px] text-ink-faint tabular-nums">
              {status !== null || bar === null ? (
                <span>{status ?? ' '}</span>
              ) : (
                <>
                  {selected !== null && (
                    <span className="font-medium text-accent sm:hidden">
                      {strings.transport.selection(selected.first + 1, selected.last + 1)}
                    </span>
                  )}
                  <span className={selected === null ? '' : 'max-sm:hidden'}>
                    {strings.transport.barBeat(bar.masterBarIndex + 1, beat)}
                  </span>
                  <span className="max-sm:hidden">
                    {strings.transport.meter(meter.numerator, meter.denominator)}
                  </span>
                  <span className={selected === null ? '' : 'max-sm:hidden'}>
                    {strings.transport.tempo(bpm)}
                  </span>
                </>
              )}
            </span>
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={strings.transport.goTo}
        align="start"
        side="top"
        initialFocus={inputRef}
        className="w-[min(300px,calc(100vw-16px))] p-3"
      >
        <form
          className="flex items-end gap-2"
          onSubmit={event => {
            event.preventDefault();
            const number = Number.parseInt(barText, 10);
            if (Number.isInteger(number) && number >= 1 && number <= barCount) goToMasterBar(number - 1);
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={inputId} className="text-[12px] font-medium text-ink-muted">
              {strings.transport.goToBar}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={barCount}
              value={barText}
              placeholder={strings.transport.goToBarHint(barCount)}
              onChange={event => {
                setBarText(event.target.value);
              }}
              className="h-9 rounded-[var(--radius-control)] border border-line bg-surface px-2.5 font-mono text-[14px] text-ink tabular-nums outline-none focus-visible:border-accent"
            />
          </div>
          <Button type="submit" variant="primary">
            {strings.transport.goToSubmit}
          </Button>
        </form>
        <form
          className="mt-3 flex items-end gap-2"
          aria-label={strings.transport.loopBars}
          onSubmit={event => {
            event.preventDefault();
            const from = Number.parseInt(loopFrom, 10);
            const to = Number.parseInt(loopTo, 10);
            const valid = (number: number) => Number.isInteger(number) && number >= 1 && number <= barCount;
            if (timeline === null || !valid(from) || !valid(to)) return;
            const range = barNumberRange(timeline, from - 1, to - 1);
            if (range === null) return;
            setSelection(range);
            setLoop(true);
            setPanelOpen('goto', false);
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={loopFromId} className="text-[12px] font-medium text-ink-muted">
              {strings.transport.loopBarsFrom}
            </label>
            <input
              id={loopFromId}
              type="number"
              inputMode="numeric"
              min={1}
              max={barCount}
              value={loopFrom}
              onChange={event => {
                setLoopFrom(event.target.value);
              }}
              className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2.5 font-mono text-[14px] text-ink tabular-nums outline-none focus-visible:border-accent"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={loopToId} className="text-[12px] font-medium text-ink-muted">
              {strings.transport.loopBarsTo}
            </label>
            <input
              id={loopToId}
              type="number"
              inputMode="numeric"
              min={1}
              max={barCount}
              value={loopTo}
              onChange={event => {
                setLoopTo(event.target.value);
              }}
              className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2.5 font-mono text-[14px] text-ink tabular-nums outline-none focus-visible:border-accent"
            />
          </div>
          <Button type="submit">{strings.transport.loopBarsSubmit}</Button>
        </form>
        {sections.length > 0 && (
          <div className="mt-3">
            <h3 className="mb-1 text-[12px] font-medium text-ink-muted">{strings.transport.sections}</h3>
            <ul className="flex max-h-[40vh] flex-col overflow-y-auto">
              {sections.map(section => (
                <li key={section.index}>
                  <button
                    type="button"
                    onClick={() => {
                      goToMasterBar(section.index);
                    }}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-[13px] text-ink hover:bg-sunken"
                  >
                    {section.marker.length > 0 && (
                      <span className="inline-flex min-w-6 justify-center rounded-md bg-sunken px-1 font-mono text-[11px] font-semibold">
                        {section.marker}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{section.text}</span>
                    <span className="text-[11px] text-ink-faint tabular-nums">
                      {strings.transport.sectionAt(section.index + 1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
