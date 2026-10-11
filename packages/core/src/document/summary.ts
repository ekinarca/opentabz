import type * as alphaTab from '@coderline/alphatab';
import type { FormatId } from '../shared/formats.ts';
import type { DocSummary, StaffSummary, TrackSummary } from '../shared/summary.ts';

export interface SummaryMeta {
  readonly id: string;
  readonly fileName: string;
  readonly byteLength: number;
  readonly format: FormatId;
  readonly formatVersion: string | null;
  readonly extensionMismatch: boolean;
  readonly truncated: boolean;
}

/** Projects an alphaTab score onto the plain `DocSummary` the UI works with. */
export function summarizeScore(score: alphaTab.model.Score, meta: SummaryMeta): DocSummary {
  return {
    ...meta,
    title: score.title,
    subtitle: score.subTitle,
    artist: score.artist,
    album: score.album,
    words: score.words,
    music: score.music,
    copyright: score.copyright,
    tab: score.tab,
    instructions: score.instructions,
    notices: score.notices,
    tempo: score.tempo,
    tempoLabel: score.tempoLabel,
    barCount: score.masterBars.length,
    tracks: score.tracks.map(summarizeTrack),
    hasModelLayout:
      score.systemsLayout.length > 0 || score.tracks.some(track => track.systemsLayout.length > 0),
    hasBackingTrack: score.backingTrack !== undefined && (score.backingTrack.rawAudioFile?.length ?? 0) > 0,
  };
}

function summarizeTrack(track: alphaTab.model.Track): TrackSummary {
  return {
    index: track.index,
    name: track.name,
    shortName: track.shortName,
    color: cssColor(track.color),
    isPercussion: track.isPercussion,
    program: track.playbackInfo.program,
    staves: track.staves.map(summarizeStaff),
  };
}

function summarizeStaff(staff: alphaTab.model.Staff): StaffSummary {
  return {
    index: staff.index,
    showStandardNotation: staff.showStandardNotation,
    showTablature: staff.showTablature,
    showSlash: staff.showSlash,
    showNumbered: staff.showNumbered,
    isPercussion: staff.isPercussion,
    stringCount: staff.isStringed ? staff.tuning.length : 0,
    tuning: [...staff.tuning],
    tuningName: staff.tuningName,
    capo: staff.capo,
    displayTransposition: staff.displayTranspositionPitch,
  };
}

/** alphaTab colours serialize as `#RRGGBB` or `rgba(…)`; both are valid CSS. */
function cssColor(color: alphaTab.model.Color): string {
  return color.rgba;
}
