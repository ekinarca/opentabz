import * as alphaTab from '@coderline/alphatab';
import { SCORE_COLOR_SENTINELS } from '../shared/score-colors.ts';
import type { LayoutKind, SystemsLayout, ViewOptions } from '../shared/view.ts';
import { applyStyleSettings } from './style.ts';

/** Padding around the notation in layout units, per layout: [left, top, right, bottom]. */
const PADDING: Readonly<Record<LayoutKind, readonly [number, number, number, number]>> = {
  // Paper margins provide the whitespace on pages.
  page: [0, 0, 0, 0],
  scroll: [32, 32, 32, 32],
  horizontal: [32, 24, 32, 24],
};

export function layoutMode(layout: LayoutKind, systemsLayout: SystemsLayout): alphaTab.LayoutMode {
  if (layout === 'horizontal') return alphaTab.LayoutMode.Horizontal;
  return systemsLayout === 'model' ? alphaTab.LayoutMode.Parchment : alphaTab.LayoutMode.Page;
}

/** alphaTab settings for one render session (SVG engine, lazy partials, themable colours). */
export function createRenderSettings(options: ViewOptions): alphaTab.Settings {
  const settings = new alphaTab.Settings();
  settings.core.engine = 'svg';
  settings.core.enableLazyLoading = true;
  settings.core.useWorkers = false;
  settings.core.includeNoteBounds = true;
  settings.core.logLevel = alphaTab.LogLevel.Warning;

  const display = settings.display;
  display.scale = options.notationScale;
  display.layoutMode = layoutMode(options.layout, options.systemsLayout);
  display.padding = PADDING[options.layout].map(value => value * options.notationScale);
  if (options.bars !== undefined) {
    display.startBar = options.bars.first + 1;
    display.barCount = options.bars.last - options.bars.first + 1;
  }

  const resources = display.resources;
  resources.mainGlyphColor = color(SCORE_COLOR_SENTINELS.ink);
  resources.secondaryGlyphColor = color(SCORE_COLOR_SENTINELS['ink-secondary']);
  resources.staffLineColor = color(SCORE_COLOR_SENTINELS['staff-line']);
  resources.barSeparatorColor = color(SCORE_COLOR_SENTINELS.barline);
  resources.barNumberColor = color(SCORE_COLOR_SENTINELS['bar-number']);
  resources.scoreInfoColor = color(SCORE_COLOR_SENTINELS.info);
  if (options.style !== undefined) applyStyleSettings(settings, options.style);
  settings.notation.leftHandedDiagrams = options.leftHanded === true;
  return settings;
}

function color(hex: string): alphaTab.model.Color {
  const value = Number.parseInt(hex.slice(1), 16);
  return new alphaTab.model.Color((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff, 0xff);
}
