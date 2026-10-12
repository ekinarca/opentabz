/**
 * A blank score (COMP-001): one guitar in standard tuning, written in standard notation and
 * tablature, bars of 4/4 at 120 quarter notes a minute, each empty until something is written in it.
 */
import * as alphaTab from '@coderline/alphatab';

/** How many bars a blank score starts with. */
export const BLANK_BARS = 16;

/** Standard tuning of a six-string guitar, from the highest string: E4 B3 G3 D3 A2 E2. */
const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];

/** General MIDI program of a steel-string acoustic guitar. */
const STEEL_GUITAR = 25;

export function blankScore(title: string): alphaTab.model.Score {
  const score = new alphaTab.model.Score();
  score.title = title;
  const track = new alphaTab.model.Track();
  track.name = 'Guitar';
  track.shortName = 'Gtr.';
  track.playbackInfo.program = STEEL_GUITAR;
  track.playbackInfo.primaryChannel = 0;
  track.playbackInfo.secondaryChannel = 1;
  track.ensureStaveCount(1);
  const staff = track.staves[0];
  if (staff === undefined) throw new Error('alphaTab made no staff for the track.');
  staff.stringTuning = new alphaTab.model.Tuning('Standard', STANDARD_TUNING, true);
  staff.showTablature = true;
  staff.showStandardNotation = true;
  score.addTrack(track);
  for (let index = 0; index < BLANK_BARS; index++) {
    const masterBar = new alphaTab.model.MasterBar();
    masterBar.timeSignatureNumerator = 4;
    masterBar.timeSignatureDenominator = 4;
    // 120 quarter notes a minute (a quarter note is Guitar Pro's tempo reference 2).
    if (index === 0)
      masterBar.tempoAutomations.push(alphaTab.model.Automation.buildTempoAutomation(false, 0, 120, 2));
    score.addMasterBar(masterBar);
    const bar = new alphaTab.model.Bar();
    staff.addBar(bar);
    const voice = new alphaTab.model.Voice();
    bar.addVoice(voice);
    const beat = new alphaTab.model.Beat();
    beat.isEmpty = true;
    voice.addBeat(beat);
  }
  score.finish(new alphaTab.Settings());
  return score;
}
