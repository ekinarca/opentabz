/**
 * What alphaTab works out from a score's written notes, written out to compare: where each beat
 * and note falls, which beat follows which, the notes a tie, slur, hammer-on or slide joins, the
 * slurs over legato runs, the let-ring and palm-mute spans, tuplet and grace groups, fermatas. Places
 * are written as addresses (track/staff/bar/voice/beat/note); a link to a note or beat no longer in
 * the score is written as "detached", which a score opened afresh never has.
 *
 * Left out: each beat's notes by pitch, which alphaTab fills while it links the notes, before a
 * tied note takes its origin's pitch. It reads them only to find the origins of ties between notes
 * without strings, and those ties are compared.
 */
import type * as alphaTab from '@coderline/alphatab';

function beatPlace(beat: alphaTab.model.Beat | null): string | null {
  if (beat === null) return null;
  const voice = beat.voice;
  const bar = voice.bar;
  const staff = bar.staff;
  const track = staff.track;
  const attached =
    track.score.tracks[track.index]?.staves[staff.index]?.bars[bar.index]?.voices[voice.index]?.beats[
      beat.index
    ] === beat;
  return attached
    ? `${String(track.index)}/${String(staff.index)}/${String(bar.index)}/${String(voice.index)}/${String(beat.index)}`
    : 'detached';
}

function notePlace(note: alphaTab.model.Note | null): string | null {
  if (note === null) return null;
  const beat = beatPlace(note.beat);
  return beat === 'detached' || note.beat.notes[note.index] !== note
    ? 'detached'
    : `${String(beat)}/${String(note.index)}`;
}

interface SlurSegment {
  readonly fromNote: alphaTab.model.Note;
  readonly toNote: alphaTab.model.Note;
  readonly kind: unknown;
}

/** The slur alphaTab keeps (to itself) on the first note of a legato run. */
function effectSlur(note: alphaTab.model.Note): unknown {
  const slur: unknown = Reflect.get(note, 'effectSlur');
  if (slur === null || typeof slur !== 'object') return slur;
  const destination: unknown = Reflect.get(slur, 'destinationNote');
  const segments: unknown = Reflect.get(slur, 'segments');
  return {
    destination: notePlace(destination as alphaTab.model.Note | null),
    segments: (segments as readonly SlurSegment[]).map(segment => [
      notePlace(segment.fromNote),
      notePlace(segment.toNote),
      segment.kind,
    ]),
  };
}

function noteLinks(note: alphaTab.model.Note): unknown {
  return {
    at: notePlace(note),
    fret: note.fret,
    string: note.string,
    realValue: note.realValue,
    isTieDestination: note.isTieDestination,
    tieOrigin: notePlace(note.tieOrigin),
    tieDestination: notePlace(note.tieDestination),
    isSlurDestination: note.isSlurDestination,
    slurOrigin: notePlace(note.slurOrigin),
    slurDestination: notePlace(note.slurDestination),
    isHammerPullOrigin: note.isHammerPullOrigin,
    hammerPullOrigin: notePlace(note.hammerPullOrigin),
    hammerPullDestination: notePlace(note.hammerPullDestination),
    slideOutType: note.slideOutType,
    slideOrigin: notePlace(note.slideOrigin),
    slideTarget: notePlace(note.slideTarget),
    isEffectSlurOrigin: note.isEffectSlurOrigin,
    hasEffectSlur: note.hasEffectSlur,
    effectSlurOrigin: notePlace(note.effectSlurOrigin),
    effectSlurDestination: notePlace(note.effectSlurDestination),
    effectSlur: effectSlur(note),
    letRingDestination: notePlace(note.letRingDestination),
    palmMuteDestination: notePlace(note.palmMuteDestination),
    bendOrigin: notePlace(note.bendOrigin),
  };
}

function beatLinks(beat: alphaTab.model.Beat): unknown {
  return {
    at: beatPlace(beat),
    previous: beatPlace(beat.previousBeat),
    next: beatPlace(beat.nextBeat),
    isEmpty: beat.isEmpty,
    displayStart: beat.displayStart,
    displayDuration: beat.displayDuration,
    playbackStart: beat.playbackStart,
    playbackDuration: beat.playbackDuration,
    isLetRing: beat.isLetRing,
    isPalmMute: beat.isPalmMute,
    isEffectSlurOrigin: beat.isEffectSlurOrigin,
    effectSlurOrigin: beatPlace(beat.effectSlurOrigin),
    effectSlurDestination: beatPlace(beat.effectSlurDestination),
    tuplet: beat.tupletGroup?.beats.map(beatPlace) ?? null,
    grace: beat.graceGroup?.beats.map(beatPlace) ?? null,
    fermata: beat.fermata === null ? null : [beat.fermata.type, beat.fermata.length],
    notes: beat.notes.map(noteLinks),
  };
}

/** Everything alphaTab worked out from the score's written notes, as JSON. */
export function links(score: alphaTab.model.Score): string {
  return JSON.stringify({
    masterBars: score.masterBars.map(masterBar => ({
      start: masterBar.start,
      fermatas: masterBar.fermata === null ? null : [...masterBar.fermata.keys()].sort((a, b) => a - b),
    })),
    tracks: score.tracks.map(track =>
      track.staves.map(staff =>
        staff.bars.map(bar => ({
          isEmpty: bar.isEmpty,
          isRestOnly: bar.isRestOnly,
          voices: bar.voices.map(voice => ({
            isEmpty: voice.isEmpty,
            isRestOnly: voice.isRestOnly,
            beats: voice.beats.map(beatLinks),
          })),
        })),
      ),
    ),
  });
}
