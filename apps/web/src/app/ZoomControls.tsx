import { IconButton, Popover, PopoverContent, PopoverTrigger, Slider, cx } from '@opentabz/ui';
import { Minus, Plus } from 'lucide-react';
import {
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  useDocuments,
  ZOOM_FITS,
  type DocViewState,
  type OpenDocument,
} from '../state/documents.ts';
import { strings } from '../strings.ts';
import { zoomStep } from './keymap.ts';
import { modKey } from './platform.ts';

const s = strings.zoom;
const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

/** The slider moves in even steps on a log scale, about 3.5 % each, from 10 % to 800 %. */
const SLIDER_STEP = 0.05;
const SLIDER_STEPS = Math.ceil(Math.log2(MAX_ZOOM / MIN_ZOOM) / SLIDER_STEP);
const toSlider = (zoom: number) => Math.round(Math.log2(zoom / MIN_ZOOM) / SLIDER_STEP);
const fromSlider = (value: number) => clampZoom(MIN_ZOOM * 2 ** (value * SLIDER_STEP));

const CHOICE_CLASS =
  'h-8 rounded-[var(--radius-control)] border text-[12.5px] font-medium tabular-nums transition-colors';
const choiceClass = (pressed: boolean) =>
  cx(
    CHOICE_CLASS,
    pressed
      ? 'border-accent bg-accent-soft text-accent'
      : 'border-line text-ink hover:border-line-strong hover:bg-sunken',
  );

/**
 * Zoom (REND-215…REND-217): out and in by steps, and a panel with a slider from 10 % to 800 %
 * (even steps on a log scale), presets, and the page's width or a whole page fitted to the window.
 */
export function ZoomControls({
  doc,
  size = 'md',
}: {
  readonly doc: OpenDocument;
  readonly size?: 'sm' | 'md';
}) {
  const updateView = useDocuments(state => state.updateView);
  const { zoom, fit, layout } = doc.view;
  const update = (patch: Partial<DocViewState>) => {
    updateView(doc.key, patch);
  };

  return (
    <>
      <IconButton
        size={size}
        label={strings.toolbar.zoomOut}
        shortcut={`${modKey()}+−`}
        icon={<Minus size={16} aria-hidden />}
        disabled={zoom <= MIN_ZOOM}
        onClick={() => {
          update({ zoom: zoomStep(zoom, -1) });
        }}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={strings.toolbar.zoomMenu}
            className={cx(
              'min-w-[64px] rounded-[var(--radius-control)] px-2 font-mono text-ink tabular-nums hover:bg-sunken',
              size === 'md' ? 'h-9 text-[13px]' : 'h-8 text-[12px]',
            )}
          >
            {strings.toolbar.zoomLevel(zoom)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          label={strings.toolbar.zoomMenu}
          align="center"
          className="w-[min(300px,calc(100vw-16px))] p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Slider
                className="flex-1"
                label={s.slider}
                valueText={strings.toolbar.zoomLevel(zoom)}
                value={toSlider(zoom)}
                min={0}
                max={SLIDER_STEPS}
                step={1}
                onValueChange={value => {
                  update({ zoom: fromSlider(value) });
                }}
              />
              <span className="w-12 text-right font-mono text-[12px] text-ink-muted tabular-nums" aria-hidden>
                {strings.toolbar.zoomLevel(zoom)}
              </span>
            </div>
            <div role="group" aria-label={s.presets} className="grid grid-cols-4 gap-1">
              {ZOOM_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={fit === null && Math.abs(zoom - preset) < 0.001}
                  className={choiceClass(fit === null && Math.abs(zoom - preset) < 0.001)}
                  onClick={() => {
                    update({ zoom: preset });
                  }}
                >
                  {strings.toolbar.zoomLevel(preset)}
                </button>
              ))}
            </div>
            {layout === 'page' && (
              <div role="group" aria-label={s.fit} className="grid grid-cols-2 gap-1">
                {ZOOM_FITS.map(option => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={fit === option}
                    className={choiceClass(fit === option)}
                    onClick={() => {
                      update({ fit: fit === option ? null : option });
                    }}
                  >
                    {s.fits[option]}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[12px] text-ink-muted">{s.hint(modKey())}</p>
          </div>
        </PopoverContent>
      </Popover>
      <IconButton
        size={size}
        label={strings.toolbar.zoomIn}
        shortcut={`${modKey()}+=`}
        icon={<Plus size={16} aria-hidden />}
        disabled={zoom >= MAX_ZOOM}
        onClick={() => {
          update({ zoom: zoomStep(zoom, 1) });
        }}
      />
    </>
  );
}
