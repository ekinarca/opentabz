/**
 * The music of a score, written out as lines to compare: what a file saved and opened again must
 * keep (tracks and tunings, bars and their meters, repeats and endings, every beat's length and
 * every note's fret or pitch and techniques, bends and whammy bars at the same height).
 */
import type * as alphaTab from '@coderline/alphatab';

/** The farthest a curve goes from where it starts, or null without one. */
export function peak(points: readonly alphaTab.model.BendPoint[] | null): number | null {
  const origin = points?.[0];
  if (points === null || origin === undefined) return null;
  return points.reduce(
    (far, point) => (Math.abs(point.value - origin.value) > Math.abs(far - origin.value) ? point.value : far),
    origin.value,
  );
}

/** The music of a score, as lines to compare. */
export function music(score: alphaTab.model.Score): string[] {
  const lines = [
    JSON.stringify(['score', score.title, score.artist, score.album, score.tempo]),
    ...score.masterBars.map(bar =>
      JSON.stringify([
        'bar',
        bar.index,
        bar.timeSignatureNumerator,
        bar.timeSignatureDenominator,
        bar.isRepeatStart,
        bar.repeatCount,
        bar.alternateEndings,
        bar.tripletFeel,
        bar.section?.text ?? null,
        bar.isAnacrusis,
        bar.tempoAutomations.map(tempo => tempo.value),
        // The key, as the first track writes it: Guitar Pro keeps one for every track.
        score.tracks[0]?.staves[0]?.bars[bar.index]?.keySignature ?? null,
      ]),
    ),
  ];
  for (const track of score.tracks) {
    lines.push(JSON.stringify(['track', track.index, track.name, track.playbackInfo.program]));
    for (const staff of track.staves) {
      lines.push(
        JSON.stringify([
          'staff',
          track.index,
          staff.index,
          staff.tuning,
          staff.capo,
          staff.transpositionPitch,
          staff.isPercussion,
          staff.showTablature,
          staff.showStandardNotation,
        ]),
      );
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const at = [track.index, staff.index, bar.index, voice.index, beat.index];
            lines.push(
              JSON.stringify([
                'beat',
                ...at,
                beat.duration,
                beat.dots,
                beat.tupletNumerator,
                beat.tupletDenominator,
                beat.isRest,
                beat.isEmpty,
                beat.graceType,
                beat.text,
                beat.dynamics,
                beat.slashed,
                beat.vibrato,
                beat.brushType,
                beat.pickStroke,
                peak(beat.whammyBarPoints),
              ]),
            );
            for (const note of beat.notes) {
              lines.push(
                JSON.stringify([
                  'note',
                  ...at,
                  note.isStringed
                    ? `${String(note.string)}:${String(note.fret)}`
                    : note.isPiano
                      ? `${String(note.octave)}:${String(note.tone)}`
                      : `drum ${String(note.percussionArticulation)}`,
                  note.isTieDestination,
                  note.isDead,
                  note.isGhost,
                  note.harmonicType,
                  note.vibrato,
                  note.slideOutType,
                  note.slideInType,
                  note.isHammerPullOrigin,
                  note.isLetRing,
                  note.isPalmMute,
                  note.accentuated,
                  note.isStaccato,
                  note.isTrill,
                  peak(note.bendPoints),
                ]),
              );
            }
          }
        }
      }
    }
  }
  return lines;
}
