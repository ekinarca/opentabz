/**
 * A key to the drums (REND-318): for each drum track shown, a staff with every sound the track
 * plays on its line or space, in its notehead and with its technique symbol, named as Guitar Pro
 * names it under the staff; from the top of the staff (cymbals) down to the kick, in rows as wide
 * as the music. The render session places it under the title block, like the instructions.
 */
import * as alphaTab from '@coderline/alphatab';
import { articulationName } from '../playback/track-drums.ts';
import type { ScoreStyle } from '../shared/style.ts';
import { wrapText, type TextBlocksLayout } from './text-blocks.ts';
import { alphaTabFont } from './text-fonts.ts';

const { MusicFontSymbol, PercussionMapper, TechniqueSymbolPlacement } = alphaTab.model;
const { TextAlign, TextBaseline } = alphaTab.platform;

/** The canvas draws in the units it is given: the key is laid out at its final size. */
const UNSCALED = new alphaTab.Settings();

/** In staff spaces: the clef's room, the widest a name runs before it wraps, gaps. */
const CLEF_WIDTH = 3;
const NAME_WIDTH = 7;
const CELL_PADDING = 1.5;
const MIN_CELL = 2.5;
const SYMBOL_GAP = 1.5;
const NAME_GAP = 1;
const ROW_GAP = 1.5;
/** Lines are this many times their text's size apart. */
const LINE_HEIGHT = 1.25;
/** Steps (half spaces) of the staff's top and bottom lines. */
const TOP_LINE = 0;
const BOTTOM_LINE = 8;

export interface KeySound {
  readonly articulation: alphaTab.model.InstrumentArticulation;
  /** Its name as Guitar Pro shows it: "Snare (hit)", "Hi-Hat (open)". */
  readonly name: string;
}

/** The sounds a track plays, from the top of the staff down. */
export function playedSounds(track: alphaTab.model.Track): KeySound[] {
  const found = new Map<string, alphaTab.model.InstrumentArticulation>();
  for (const staff of track.staves) {
    if (!staff.isPercussion) continue;
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          for (const note of beat.notes) {
            const articulation = PercussionMapper.getArticulation(note);
            if (articulation !== null) found.set(articulation.uniqueId, articulation);
          }
        }
      }
    }
  }
  return [...found.values()]
    .map(articulation => ({ articulation, name: articulationName(articulation) }))
    .sort((a, b) => a.articulation.staffLine - b.articulation.staffLine || a.name.localeCompare(b.name));
}

interface Cell {
  readonly sound: KeySound;
  readonly lines: readonly string[];
  readonly width: number;
}

interface Row {
  readonly title: string | null;
  readonly cells: readonly Cell[];
  /** From the row's top: the staff's top line, and the names' first line. */
  readonly staffTop: number;
  readonly namesTop: number;
  readonly height: number;
}

function above(placement: alphaTab.model.TechniqueSymbolPlacement): boolean {
  return placement === TechniqueSymbolPlacement.Above || placement === TechniqueSymbolPlacement.Outside;
}

/** The key to the drums of the shown tracks, laid out and painted, or null when none plays drums. */
export function layoutDrumKey(
  tracks: readonly alphaTab.model.Track[],
  style: ScoreStyle,
  settings: alphaTab.Settings,
  width: number,
): TextBlocksLayout | null {
  const keys = tracks
    .map(track => ({ track, sounds: playedSounds(track) }))
    .filter(key => key.sounds.length > 0);
  if (keys.length === 0) return null;

  const { display } = settings;
  const engraving = display.resources.engravingSettings;
  const scale = display.scale;
  const space = engraving.oneStaffSpace * scale;
  // Text grows with the score, unless the stylesheet keeps its size.
  const textScale = scale / (style.keepTextSize ? style.scale : 1);
  const nameFont = alphaTabFont(style.fonts.tuning, style.fonts.tuning.size * textScale);
  const titleFont = alphaTabFont(
    { ...style.fonts.tuning, bold: true, italic: false },
    style.fonts.tuning.size * textScale,
  );
  const lineHeight = nameFont.size * LINE_HEIGHT;
  const [left = 0, , right = 0] = display.padding;
  const room = Math.max(space * (CLEF_WIDTH + MIN_CELL + CELL_PADDING), width - left - right);

  // The canvas alphaTab paints its SVG partials with.
  const canvas = alphaTab.Environment.getRenderEngineFactory('svg').createCanvas();
  canvas.settings = UNSCALED;
  canvas.font = nameFont;
  const measure = (line: string) => canvas.measureText(line).width;

  // Each sound a cell, wide enough for its name; cells fill rows as wide as the music.
  const rows: Row[] = [];
  for (const { track, sounds } of keys) {
    const cells = sounds.map(sound => {
      const lines = wrapText(sound.name, NAME_WIDTH * space, measure);
      const widest = Math.max(MIN_CELL * space, ...lines.map(measure));
      return { sound, lines, width: widest + CELL_PADDING * space };
    });
    let row: Cell[] = [];
    let used = CLEF_WIDTH * space;
    const rowsOfTrack: Cell[][] = [];
    for (const cell of cells) {
      if (row.length > 0 && used + cell.width > room) {
        rowsOfTrack.push(row);
        row = [];
        used = CLEF_WIDTH * space;
      }
      row.push(cell);
      used += cell.width;
    }
    rowsOfTrack.push(row);
    rowsOfTrack.forEach((cellsOfRow, index) => {
      // More than one drum track: each key says whose it is.
      const title = keys.length > 1 && index === 0 ? track.name : null;
      const lines = cellsOfRow.map(cell => cell.sound.articulation.staffLine);
      const highest = Math.min(TOP_LINE, ...lines);
      const lowest = Math.max(BOTTOM_LINE, ...lines);
      const symbolAbove = cellsOfRow.some(
        cell =>
          cell.sound.articulation.techniqueSymbol !== MusicFontSymbol.None &&
          above(cell.sound.articulation.techniqueSymbolPlacement),
      );
      const symbolBelow = cellsOfRow.some(
        cell =>
          cell.sound.articulation.techniqueSymbol !== MusicFontSymbol.None &&
          cell.sound.articulation.techniqueSymbolPlacement === TechniqueSymbolPlacement.Below,
      );
      const staffTop =
        (title === null ? 0 : lineHeight) +
        space +
        ((TOP_LINE - highest) / 2) * space +
        (symbolAbove ? SYMBOL_GAP * space : 0);
      const namesTop =
        staffTop + (lowest / 2) * space + (symbolBelow ? SYMBOL_GAP * space : 0) + NAME_GAP * space;
      const nameLines = Math.max(1, ...cellsOfRow.map(cell => cell.lines.length));
      rows.push({ title, cells: cellsOfRow, staffTop, namesTop, height: namesTop + nameLines * lineHeight });
    });
  }

  const height = Math.ceil(rows.reduce((sum, row) => sum + row.height + ROW_GAP * space, 0));
  const { resources } = display;
  const lineThickness = engraving.staffLineThickness * scale;
  const ledgerThickness = engraving.legerLineThickness * scale;
  canvas.beginRender(width, height);
  canvas.textBaseline = TextBaseline.Top;
  let rowTop = 0;
  for (const row of rows) {
    const top = rowTop + row.staffTop;
    const end = left + CLEF_WIDTH * space + row.cells.reduce((sum, cell) => sum + cell.width, 0);
    if (row.title !== null) {
      canvas.color = resources.mainGlyphColor;
      canvas.font = titleFont;
      canvas.textAlign = TextAlign.Left;
      canvas.fillText(row.title, left, rowTop);
    }
    // The staff, closed by a barline.
    canvas.color = resources.staffLineColor;
    for (let line = 0; line < 5; line++) {
      canvas.fillRect(left, top + line * space - lineThickness / 2, end - left, lineThickness);
    }
    canvas.fillRect(end - lineThickness, top, lineThickness, 4 * space);
    canvas.color = resources.mainGlyphColor;
    canvas.fillMusicFontSymbol(
      left + space / 2,
      top + 2 * space,
      scale,
      MusicFontSymbol.UnpitchedPercussionClef1,
    );

    let x = left + CLEF_WIDTH * space;
    for (const cell of row.cells) {
      const { articulation } = cell.sound;
      const centre = x + cell.width / 2;
      const y = top + (articulation.staffLine / 2) * space;
      // Ledger lines above or below the staff.
      canvas.color = resources.staffLineColor;
      for (let step = TOP_LINE - 2; step >= articulation.staffLine; step -= 2) {
        canvas.fillRect(
          centre - space,
          top + (step / 2) * space - ledgerThickness / 2,
          2 * space,
          ledgerThickness,
        );
      }
      for (let step = BOTTOM_LINE + 2; step <= articulation.staffLine; step += 2) {
        canvas.fillRect(
          centre - space,
          top + (step / 2) * space - ledgerThickness / 2,
          2 * space,
          ledgerThickness,
        );
      }
      canvas.color = resources.mainGlyphColor;
      const head =
        articulation.noteHeadDefault === MusicFontSymbol.None
          ? MusicFontSymbol.NoteheadBlack
          : articulation.noteHeadDefault;
      canvas.fillMusicFontSymbol(centre, y, scale, head, true);
      const symbol = articulation.techniqueSymbol;
      if (symbol !== MusicFontSymbol.None) {
        const placement = articulation.techniqueSymbolPlacement;
        const symbolY =
          placement === TechniqueSymbolPlacement.Inside
            ? y
            : placement === TechniqueSymbolPlacement.Below
              ? Math.max(top + 4 * space, y) + SYMBOL_GAP * space
              : Math.min(top, y) - SYMBOL_GAP * space;
        canvas.fillMusicFontSymbol(centre, symbolY, scale, symbol, true);
      }
      canvas.font = nameFont;
      canvas.textAlign = TextAlign.Center;
      cell.lines.forEach((line, index) => {
        canvas.fillText(line, centre, rowTop + row.namesTop + index * lineHeight);
      });
      x += cell.width;
    }
    rowTop += row.height + ROW_GAP * space;
  }
  const svg = canvas.endRender();
  return typeof svg === 'string' ? { height, svg } : null;
}
