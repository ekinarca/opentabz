import {
  NOTE_COLOR_MODES,
  NOTE_PALETTES,
  noteColors,
  STRING_COLORS,
  type NoteColorMode,
} from '@opentabz/core/shared';
import { Popover, PopoverContent, PopoverTrigger, SegmentedControl, Tooltip } from '@opentabz/ui';
import { Paintbrush } from 'lucide-react';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.noteColors;

/** What each colour of a mode stands for, in its order. */
function legend(mode: Exclude<NoteColorMode, 'off'>): readonly string[] {
  switch (mode) {
    case 'string':
      return s.legend.strings;
    case 'interval':
      return s.legend.intervals;
    case 'degree':
      return s.legend.degrees;
    case 'chordTone':
      return s.legend.chordTones;
  }
}

/**
 * Notes coloured to read the music by (REND-300…REND-303, REND-316): by string, by interval above
 * the tonic, by degree, or by their part in the chord; in standard colours, colour-blind safe
 * ones, or string colours of one's own; with what each colour stands for.
 */
export function NoteColorsControl() {
  const open = useUi(state => state.panel === 'noteColors');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const mode = usePreferences(state => state.noteColors);
  const palette = usePreferences(state => state.notePalette);
  const stringColors = usePreferences(state => state.stringColors);
  const setPreferences = usePreferences(state => state.set);
  const colors = mode === 'off' ? [] : noteColors(mode, palette, stringColors);
  const labels = mode === 'off' ? [] : legend(mode);

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setPanelOpen('noteColors', next);
      }}
    >
      <Tooltip label={s.open}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.open}
            aria-pressed={mode !== 'off'}
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors hover:bg-sunken hover:text-ink ${
              mode === 'off' ? 'text-ink-muted' : 'bg-accent-soft text-accent'
            }`}
          >
            <Paintbrush size={18} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent label={s.title} align="end" className="w-[min(380px,calc(100vw-16px))] p-4">
        <div className="flex flex-col gap-4">
          <Field label={s.mode}>
            <SegmentedControl
              label={s.mode}
              value={mode}
              segments={NOTE_COLOR_MODES.map(value => ({ value, label: s.modes[value] }))}
              onValueChange={noteColors => {
                setPreferences({ noteColors });
              }}
            />
          </Field>
          {mode !== 'off' && (
            <Field
              label={s.palette}
              {...(palette === 'custom' && mode !== 'string' ? { hint: s.customHint } : {})}
            >
              <SegmentedControl
                label={s.palette}
                value={palette}
                segments={NOTE_PALETTES.map(value => ({ value, label: s.palettes[value] }))}
                onValueChange={notePalette => {
                  setPreferences({ notePalette });
                }}
              />
            </Field>
          )}
          {mode !== 'off' && (
            <ul aria-label={s.legendLabel} className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {labels.map((label, index) => {
                const color = colors[index % colors.length] ?? '#888888';
                const own = mode === 'string' && palette === 'custom';
                return (
                  <li key={label} className="flex items-center gap-2 text-[12.5px] text-ink">
                    {own ? (
                      <input
                        type="color"
                        aria-label={s.stringColor(label)}
                        value={color}
                        onChange={event => {
                          const next = [...(stringColors.length > 0 ? stringColors : STRING_COLORS.standard)];
                          next[index] = event.target.value.toUpperCase();
                          setPreferences({ stringColors: next });
                        }}
                        className="size-5 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="inline-block size-3.5 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                    )}
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
