import { IconButton, Popover, PopoverContent, PopoverTrigger, Slider, Tooltip } from '@opentabz/ui';
import { ChevronDown, Focus, Headphones, RotateCcw, SlidersHorizontal, VolumeX } from 'lucide-react';
import { useId, useState } from 'react';
import type { TrackSummary } from '@opentabz/core/shared';
import { MAX_DETUNE, MAX_TRANSPOSE } from '../state/mixer-memory.ts';
import { useDocuments, type OpenDocument, type TrackMix } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { strings } from '../strings.ts';
import { SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.mixer;

function ToggleChip({
  label,
  pressed,
  onClick,
  children,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
          pressed
            ? 'border-accent bg-accent text-on-accent'
            : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Instrument, transposition and fine tuning of one track. */
function TrackDetails({
  track,
  name,
  mix,
  onChange,
}: {
  readonly track: TrackSummary;
  readonly name: string;
  readonly mix: TrackMix;
  readonly onChange: (patch: Partial<TrackMix>) => void;
}) {
  const instrumentId = useId();
  const transposeId = useId();
  if (track.isPercussion) return null;
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2 pl-[18px]">
      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor={instrumentId} className="text-[11px] font-medium text-ink-muted">
          {s.instrument}
        </label>
        <select
          id={instrumentId}
          value={mix.program}
          onChange={event => {
            onChange({ program: Number(event.target.value) });
          }}
          className={SELECT_CLASS}
        >
          {s.programGroups.map((group, groupIndex) => (
            <optgroup key={group} label={group}>
              {s.programs.slice(groupIndex * 8, groupIndex * 8 + 8).map((program, offset) => (
                <option key={program} value={groupIndex * 8 + offset}>
                  {program}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={transposeId} className="text-[11px] font-medium text-ink-muted">
          {s.transpose}
        </label>
        <select
          id={transposeId}
          value={mix.transpose}
          onChange={event => {
            onChange({ transpose: Number(event.target.value) });
          }}
          className={SELECT_CLASS}
        >
          {Array.from({ length: MAX_TRANSPOSE * 2 + 1 }, (_, index) => index - MAX_TRANSPOSE).map(
            semitones => (
              <option key={semitones} value={semitones}>
                {s.transposeValue(semitones)}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex justify-between text-[11px] font-medium text-ink-muted">
          <span>{s.detune}</span>
          <span className="font-mono tabular-nums">{s.detuneValue(mix.detune)}</span>
        </span>
        <Slider
          className="h-9"
          label={`${name}: ${s.detune}`}
          valueText={s.detuneValue(mix.detune)}
          value={mix.detune}
          min={-MAX_DETUNE}
          max={MAX_DETUNE}
          step={1}
          origin={0}
          onValueChange={value => {
            onChange({ detune: value });
          }}
        />
      </div>
    </div>
  );
}

/**
 * The mixer of the active document: per track mute, solo, level, pan, focus, instrument,
 * transposition and fine tuning; the master balance. Changes are remembered for the file.
 */
export function Mixer({ doc }: { readonly doc: OpenDocument }) {
  const updateMix = useDocuments(state => state.updateMix);
  const setFocus = useDocuments(state => state.setFocus);
  const resetMix = useDocuments(state => state.resetMix);
  const balance = usePlayer(state => state.balance);
  const setBalance = usePlayer(state => state.setBalance);
  const [expanded, setExpanded] = useState<number | null>(null);
  const shown = new Set(doc.view.trackIndexes);
  const practiceMuted = doc.summary.tracks.every(
    track => !shown.has(track.index) || doc.mix[track.index]?.mute === true,
  );

  return (
    <Popover>
      <Tooltip label={s.open}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.open}
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <SlidersHorizontal size={17} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent label={s.title} align="end" side="top" className="w-[min(440px,calc(100vw-16px))] p-2">
        <div className="flex items-center gap-1 px-2 pt-1 pb-2">
          <h2 className="flex-1 text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            {s.title}
          </h2>
          <IconButton
            size="sm"
            label={s.reset}
            icon={<RotateCcw size={15} aria-hidden />}
            onClick={() => {
              resetMix(doc.key);
            }}
          />
          <IconButton
            size="sm"
            label={s.practice}
            pressed={practiceMuted}
            icon={<Headphones size={16} aria-hidden />}
            onClick={() => {
              for (const track of doc.summary.tracks) {
                if (shown.has(track.index)) updateMix(doc.key, track.index, { mute: !practiceMuted });
              }
            }}
          />
        </div>
        <ul className="flex max-h-[55vh] flex-col gap-1 overflow-y-auto">
          {doc.summary.tracks.map(track => {
            const mix = doc.mix[track.index];
            if (mix === undefined) return null;
            const name = track.name.trim().length > 0 ? track.name : track.shortName;
            const change = (patch: Partial<TrackMix>) => {
              updateMix(doc.key, track.index, patch);
            };
            const open = expanded === track.index;
            return (
              <li key={track.index} className="rounded-[10px] px-2 py-1.5 hover:bg-sunken">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: track.color }}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] ${mix.mute ? 'text-ink-faint line-through' : 'text-ink'}`}
                  >
                    {name}
                  </span>
                  <ToggleChip
                    label={s.focus(name)}
                    pressed={doc.focus === track.index}
                    onClick={() => {
                      setFocus(doc.key, doc.focus === track.index ? null : track.index);
                    }}
                  >
                    <Focus size={13} aria-hidden />
                  </ToggleChip>
                  <ToggleChip
                    label={s.mute(name)}
                    pressed={mix.mute}
                    onClick={() => {
                      change({ mute: !mix.mute });
                    }}
                  >
                    {s.muteShort}
                  </ToggleChip>
                  <ToggleChip
                    label={s.solo(name)}
                    pressed={mix.solo}
                    onClick={() => {
                      change({ solo: !mix.solo });
                    }}
                  >
                    {s.soloShort}
                  </ToggleChip>
                  <Slider
                    className="w-24 shrink-0"
                    label={s.volume(name)}
                    valueText={strings.transport.speedValue(mix.volume)}
                    value={mix.volume}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={value => {
                      change({ volume: value });
                    }}
                  />
                  {mix.volume === 0 && <VolumeX size={14} className="shrink-0 text-ink-faint" aria-hidden />}
                </div>
                <div className="mt-1 flex items-center gap-2 pl-[18px]">
                  <span aria-hidden className="w-16 shrink-0 text-[11px] text-ink-faint tabular-nums">
                    {s.panValue(mix.pan)}
                  </span>
                  <Slider
                    className="flex-1"
                    label={s.pan(name)}
                    valueText={s.panValue(mix.pan)}
                    value={mix.pan}
                    min={-1}
                    max={1}
                    step={0.05}
                    origin={0}
                    onValueChange={value => {
                      change({ pan: Math.abs(value) < 0.025 ? 0 : value });
                    }}
                  />
                  {!track.isPercussion && (
                    <button
                      type="button"
                      aria-label={s.more(name)}
                      aria-expanded={open}
                      onClick={() => {
                        setExpanded(open ? null : track.index);
                      }}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-raised hover:text-ink"
                    >
                      <ChevronDown size={15} aria-hidden className={open ? 'rotate-180' : ''} />
                    </button>
                  )}
                </div>
                {open && <TrackDetails track={track} name={name} mix={mix} onChange={change} />}
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center gap-3 border-t border-line px-2 pt-2">
          <span className="text-[12px] font-medium text-ink-muted">{s.balance}</span>
          <Slider
            className="flex-1"
            label={s.balance}
            valueText={s.panValue(balance)}
            value={balance}
            min={-1}
            max={1}
            step={0.05}
            origin={0}
            onValueChange={value => {
              setBalance(Math.abs(value) < 0.025 ? 0 : value);
            }}
          />
          <span aria-hidden className="w-16 text-right text-[11px] text-ink-faint tabular-nums">
            {s.panValue(balance)}
          </span>
        </div>
        <p className="px-2 pt-2 text-[11px] text-ink-faint">{s.remembered}</p>
      </PopoverContent>
    </Popover>
  );
}
