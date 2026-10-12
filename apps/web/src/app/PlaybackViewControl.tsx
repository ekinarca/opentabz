import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Slider,
  Switch,
  Tooltip,
} from '@opentabz/ui';
import { ScanLine } from 'lucide-react';
import {
  CURSOR_COLORS,
  CURSOR_STYLES,
  MAX_SCROLL_OFFSET,
  MIN_SCROLL_OFFSET,
  SCROLL_MODES,
  usePreferences,
  type CursorColor,
} from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.playbackView;

/** Swatches of the cursor colours, matching score-view.css. */
const SWATCH: Readonly<Record<CursorColor, string>> = {
  accent: 'var(--ot-accent)',
  blue: '#2f7cf6',
  green: '#16a34a',
  violet: '#8b5cf6',
  rose: '#e11d63',
};

/**
 * How the view follows playback: scrolling (continuous, page by page or off) and where the
 * playing line sits, the cursor's style and colour, and the bar and note highlights.
 */
export function PlaybackViewControl() {
  const open = useUi(state => state.panel === 'following');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const preferences = usePreferences();
  const set = preferences.set;
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setPanelOpen('following', next);
      }}
    >
      <Tooltip label={s.open}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.open}
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <ScanLine size={18} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={s.title}
        align="end"
        side="bottom"
        className="w-[min(360px,calc(100vw-16px))] p-4"
      >
        <div className="flex flex-col gap-4">
          <Field label={s.scrolling} hint={s.scrollHints[preferences.scrollMode]}>
            <SegmentedControl
              label={s.scrolling}
              value={preferences.scrollMode}
              segments={SCROLL_MODES.map(mode => ({ value: mode, label: s.scrollModes[mode] }))}
              onValueChange={scrollMode => {
                set({ scrollMode });
              }}
            />
          </Field>
          {preferences.scrollMode === 'continuous' && (
            <Field label={s.offset} value={s.offsetValue(preferences.scrollOffset)}>
              <Slider
                label={s.offset}
                valueText={s.offsetValue(preferences.scrollOffset)}
                value={preferences.scrollOffset}
                min={MIN_SCROLL_OFFSET}
                max={MAX_SCROLL_OFFSET}
                step={0.01}
                onValueChange={scrollOffset => {
                  set({ scrollOffset });
                }}
              />
            </Field>
          )}
          <Field label={s.cursor}>
            <SegmentedControl
              label={s.cursor}
              value={preferences.cursorStyle}
              segments={CURSOR_STYLES.map(style => ({ value: style, label: s.cursorStyles[style] }))}
              onValueChange={cursorStyle => {
                set({ cursorStyle });
              }}
            />
          </Field>
          <Field label={s.colour}>
            <div role="radiogroup" aria-label={s.colour} className="flex gap-2">
              {CURSOR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={preferences.cursorColor === color}
                  aria-label={s.colours[color]}
                  onClick={() => {
                    set({ cursorColor: color });
                  }}
                  className="size-8 rounded-full border-2 border-transparent ring-offset-2 ring-offset-raised aria-checked:border-raised aria-checked:ring-2 aria-checked:ring-ink"
                  style={{ background: SWATCH[color] }}
                />
              ))}
            </div>
          </Field>
          <Switch
            label={s.barHighlight}
            checked={preferences.barHighlight}
            onCheckedChange={barHighlight => {
              set({ barHighlight });
            }}
          />
          <Switch
            label={s.noteHighlight}
            checked={preferences.noteHighlight}
            onCheckedChange={noteHighlight => {
              set({ noteHighlight });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
