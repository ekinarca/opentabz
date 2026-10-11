/**
 * MIDI generation for playback (engine worker): alphaTab's MidiFileGenerator plus a compact
 * timeline of when each beat sounds, used by the UI for the playback cursor.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  TIMELINE_ITEM_STRIDE,
  TIMELINE_SLICE_STRIDE,
  type PlaybackTimeline,
  type TrackInterpretation,
} from '../shared/playback.ts';

export interface GeneratedPlayback {
  /** alphaTab MidiFile as a cloneable object (JsonConverter.midiFileToJsObject). */
  readonly midi: unknown;
  readonly tickShift: number;
  readonly transpositionPitches: readonly (readonly [number, number])[];
  readonly timeline: PlaybackTimeline;
  /** Played bars: [startTick, numerator, denominator], for the metronome and count-ins. */
  readonly bars: Int32Array;
}

export function generatePlayback(
  score: alphaTab.model.Score,
  playbackId: string,
  settings: alphaTab.Settings = new alphaTab.Settings(),
  interpretations: readonly TrackInterpretation[] = [],
  /** Silence after the song, in seconds, for the last notes to die away (audio export). */
  tailSeconds = 0,
): GeneratedPlayback {
  const midiFile = new alphaTab.midi.MidiFile();
  const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile);
  const generator = new alphaTab.midi.MidiFileGenerator(score, settings, handler);
  // Transposition is applied by the synthesizer per channel, like alphaTab's own player.
  generator.applyTranspositionPitches = false;
  // How each track is played (alphaTab patch 0018).
  interpretations.forEach((interpretation, trackIndex) => {
    generator.trackInterpretations.set(trackIndex, { ...interpretation });
  });
  generator.generate();
  if (tailSeconds > 0) extendWithSilence(midiFile, tailSeconds);

  return {
    midi: alphaTab.model.JsonConverter.midiFileToJsObject(midiFile),
    tickShift: handler.tickShift,
    transpositionPitches: [...generator.transpositionPitches.entries()],
    timeline: buildTimeline(generator.tickLookup, playbackId, generator.extraChannels),
    bars: Int32Array.from(
      generator.tickLookup.masterBars.flatMap(bar => [
        bar.start,
        bar.masterBar.timeSignatureNumerator,
        bar.masterBar.timeSignatureDenominator,
      ]),
    ),
  };
}

/**
 * Lets the song run on for `seconds` after its last event: the sequencer ends at its last event,
 * and alphaTab cuts the voices still sounding when it does.
 */
function extendWithSilence(midiFile: alphaTab.midi.MidiFile, seconds: number): void {
  const events = midiFile.events;
  let end = 0;
  let bpm = 120;
  for (const event of events) {
    end = Math.max(end, event.tick);
    if (event instanceof alphaTab.midi.TempoChangeEvent) bpm = event.beatsPerMinute;
  }
  const ticks = Math.round(seconds * (bpm / 60) * midiFile.division);
  midiFile.addEvent(new alphaTab.midi.AlphaTabRestEvent(0, end + ticks, 0));
}

function buildTimeline(
  lookup: alphaTab.midi.MidiTickLookup,
  playbackId: string,
  extraChannels: readonly number[],
): PlaybackTimeline {
  const bars: number[] = [];
  const slices: number[] = [];
  const items: number[] = [];
  let endTick = 0;
  for (const bar of lookup.masterBars) {
    const firstSlice = slices.length / TIMELINE_SLICE_STRIDE;
    let sliceCount = 0;
    // alphaTab stores slice and beat ticks relative to the start of the played bar.
    for (let slice = bar.firstBeat; slice !== null; slice = slice.nextBeat) {
      const firstItem = items.length / TIMELINE_ITEM_STRIDE;
      for (const item of slice.highlightedBeats) {
        items.push(item.beat.id, item.beat.voice.bar.staff.track.index, bar.start + item.playbackStart);
      }
      slices.push(bar.start + slice.start, bar.start + slice.end, firstItem, slice.highlightedBeats.length);
      sliceCount += 1;
    }
    bars.push(bar.start, bar.end, bar.masterBar.index, firstSlice, sliceCount);
    endTick = Math.max(endTick, bar.end);
  }
  return {
    playbackId,
    endTick,
    bars: Int32Array.from(bars),
    slices: Int32Array.from(slices),
    items: Int32Array.from(items),
    extraChannels: Int32Array.from(extraChannels),
  };
}
