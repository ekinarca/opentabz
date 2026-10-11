# 0015 — Playback techniques: tremolo speed, fades, ornaments in key, tapping, hairpins, fermatas, tempo ramps, sustain pedal

## Problem

alphaTab 1.8.4 draws these techniques but plays several of them wrongly, or not at all:

- **Tremolo picking** halves the _note_ value once per mark. That is right for quarter notes only:
  a half note with an eighth-note tremolo plays two quarters instead of four eighths, a whole note
  two halves.
- **Fade-out and volume swell** end at channel volume 0 and nothing restores it: every later note
  of the track is silent.
- **Mordents and turns** take their neighbouring notes from a fixed C major table (and always one
  semitone below), whatever the key: an upper mordent on E in D major goes to F instead of F♯.
- **Tapping** (either hand) plays with a full pick attack.
- **Crescendo and diminuendo hairpins** do nothing.
- **Fermatas** do not hold the music.
- **Linear tempo automations** (Guitar Pro's ramps: accelerando, ritardando) change the tempo in
  one step at the next automation.
- **The sustain pedal** is never sent, and the synthesizer ignores controller 64.

## Change

In `MidiFileGenerator`:

- Tremolo picking picks every `QuarterTime / 2^marks` ticks (marks 1, 2, 3: eighths, sixteenths,
  thirty-seconds), scaled by the beat's duration factor (tuplets), for any note value.
- After a fade-out or a volume swell, the track volume is set again on both channels where the
  faded beat ends.
- `_ornamentStep(note, key, ±1)`: semitones to the next note of the bar's key above or below,
  with the note taken as written (minus the staff's transposition and display transposition,
  since the key signature belongs to the notation). Turns and mordents use it.
- `_getNoteVelocity`: a tapped note (`beat.tap`, `note.isLeftHandTapped`) is one dynamic step
  softer, like a hammer-on.
- `_hairpinVelocity`: inside a hairpin (consecutive beats of a voice with the same
  `crescendo`), the velocity moves linearly, by playback position, from the dynamic where the
  hairpin starts to the dynamic of the beat after it, or one step (16 velocity units) on when
  that beat is not louder (softer) than the start. The note's own adjustments (accents, ghost
  notes…) still apply.
- `_generateFermata`: a fermata holds its beat by slowing the tempo for the beat's length:
  `tempo / (1 + hold)` at its start and the tempo again at its end, once per tick for all tracks.
  `hold` is the fermata's length when the file gives one, otherwise 0.5, 1 and 2 for short,
  medium and long. Ticks (and so every timeline and cursor) do not move.
- `_generateTempoRamps`: after a tempo automation with `isLinear`, tempo events every sixteenth
  note interpolate linearly to the next tempo automation. Positions are taken in score order
  (`MasterBar.start`), so a ramp inside repeated bars plays again on every pass.
- `_generateSustainPedals`: each bar's sustain pedal markers become controller 64 on both
  channels of the track: 127 for down and hold (so jumps into a held bar are right), 0 for up.

In `TinySoundFont`:

- `Channel.sustain` follows controller 64 (`HoldPedal`, down from 64). While it is down,
  `channelNoteOff` marks the voices `sustained` instead of ending them; when it comes up,
  `_releaseSustained(channel)` ends them. `ResetControllers` and `resetSoft` (stop, seek, loop)
  lift the pedal.

```js
case ControllerType.HoldPedal:
    c.sustain = controlValue >= 64;
    if (!c.sustain) this._releaseSustained(channel);
    return;
```

## Proof

`packages/core/test/playback-realism.test.ts`: the MIDI of each technique (picks, controller
values, tempo events, velocities, keys) and, through alphaTab's own synthesizer and the bundled
SoundFont, the audio: the chord after a fade-out or swell is as loud as one after none, fermatas
and ramps lengthen the song by the expected time, and a note released under the pedal keeps
sounding (four times the level of the same note without pedal) until the pedal comes up. Before
the patch, eleven of the twelve tests fail.

## Upstream

Not yet proposed. The tremolo, fade, ornament and pedal parts are bug fixes; fermatas, hairpins
and ramps are features alphaTab's maintainers may want behind settings.
