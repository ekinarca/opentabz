/**
 * Beat timers: the elapsed time Guitar Pro prints over a beat. They are worked out when a score
 * opens, for the first time the player reaches each beat, so every format shows them, the first
 * paint already does, and they agree with playback. (Guitar Pro files store the times Guitar Pro
 * worked out; alphaTex only asks for a timer. alphaTab fills them in while it generates MIDI,
 * which happens after the first paint.)
 */
import * as alphaTab from '@coderline/alphatab';

function hasBeatTimers(score: alphaTab.model.Score): boolean {
  return score.tracks.some(track =>
    track.staves.some(staff =>
      staff.bars.some(bar => bar.voices.some(voice => voice.beats.some(beat => beat.showTimer))),
    ),
  );
}

/** Sets `beat.timer` (milliseconds) of every beat that shows a timer and is played. */
export function fillBeatTimers(score: alphaTab.model.Score): void {
  if (!hasBeatTimers(score)) return;
  const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(new alphaTab.midi.MidiFile());
  new alphaTab.midi.MidiFileGenerator(score, new alphaTab.Settings(), handler).generate();
}
