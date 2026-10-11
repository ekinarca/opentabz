import { IconButton, Popover, PopoverContent, PopoverTrigger, Slider, Tooltip } from '@opentabz/ui';
import { Headphones, SlidersHorizontal, VolumeX } from 'lucide-react';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';

function ToggleChip({
  label,
  pressed,
  onClick,
  children,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly children: string;
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

/** Per-track mute, solo and level for the active document. */
export function Mixer({ doc }: { readonly doc: OpenDocument }) {
  const updateMix = useDocuments(state => state.updateMix);
  const shown = new Set(doc.view.trackIndexes);
  const practiceMuted = doc.summary.tracks.every(
    track => !shown.has(track.index) || doc.mix[track.index]?.mute === true,
  );

  return (
    <Popover>
      <Tooltip label={strings.mixer.open}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={strings.mixer.open}
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <SlidersHorizontal size={17} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={strings.mixer.title}
        align="end"
        side="top"
        className="w-[min(380px,calc(100vw-16px))] p-2"
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <h2 className="text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            {strings.mixer.title}
          </h2>
          <IconButton
            size="sm"
            label={strings.mixer.practice}
            pressed={practiceMuted}
            icon={<Headphones size={16} aria-hidden />}
            onClick={() => {
              for (const track of doc.summary.tracks) {
                if (shown.has(track.index)) updateMix(doc.key, track.index, { mute: !practiceMuted });
              }
            }}
          />
        </div>
        <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {doc.summary.tracks.map(track => {
            const mix = doc.mix[track.index] ?? { mute: false, solo: false, volume: 1 };
            const name = track.name.trim().length > 0 ? track.name : track.shortName;
            return (
              <li
                key={track.index}
                className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-sunken"
              >
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
                  label={strings.mixer.mute(name)}
                  pressed={mix.mute}
                  onClick={() => {
                    updateMix(doc.key, track.index, { mute: !mix.mute });
                  }}
                >
                  M
                </ToggleChip>
                <ToggleChip
                  label={strings.mixer.solo(name)}
                  pressed={mix.solo}
                  onClick={() => {
                    updateMix(doc.key, track.index, { solo: !mix.solo });
                  }}
                >
                  S
                </ToggleChip>
                <Slider
                  className="w-24 shrink-0"
                  label={strings.mixer.volume(name)}
                  valueText={strings.transport.speedValue(mix.volume)}
                  value={mix.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={value => {
                    updateMix(doc.key, track.index, { volume: value });
                  }}
                />
                {mix.volume === 0 && <VolumeX size={14} className="shrink-0 text-ink-faint" aria-hidden />}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
