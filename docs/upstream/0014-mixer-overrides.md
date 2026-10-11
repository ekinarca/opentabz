# 0014 — Mixer pan and instrument that the song's events do not undo; detune

## Problem

A mixer sets a channel's pan or instrument (program) while the song plays. In alphaTab both are
also set by the song's own MIDI events, and every seek or loop pass replays those events from
the start (`resetSoft` followed by silent processing): a pan or program chosen in the mixer is
undone the next time the user clicks in the score. A program the song never used also has no
samples loaded, so switching to it is silent. And there is no way to detune a channel by a
number of cents.

## Change

`TinySoundFont` keeps mixer _overrides_ next to mute and solo:

- `channelSetPanOverride(channel, pan | null)`: while set, `channelSetPan` (called by the song's
  pan controllers) and `Channels.setupVoice` use the mixer's pan; `null` gives the song's back.
- `channelSetProgramOverride(channel, program | null)`: program changes from the song select the
  override instead (the song's own program is remembered per channel, for `null`). Drum kits
  stay drum kits.
- `channelSetDetune(channel, cents)`: kept on the channel (not reset by `resetSoft`) and added to
  the pitch of every voice, including the ones sounding.

`resetChannelStates()` clears all three.

`AlphaSynthBase` exposes `setChannelPan(channel, -1…1 | null)`,
`setChannelDetune(channel, cents)` and `setChannelProgram(channel, program | null)`, which first
loads the program's samples if the song did not use it:

```ts
public setChannelProgram(channel: number, program: number | null): void {
    if (program !== null && !this.sequencer.instrumentPrograms.has(program)) {
        this.sequencer.instrumentPrograms.add(program);
        let append = false;
        for (const soundFont of this._loadedSoundFonts) {
            this.synthesizer.loadPresets(soundFont, this.sequencer.instrumentPrograms, this.sequencer.percussionKeys, append);
            append = true;
        }
    }
    this.synthesizer.channelSetProgramOverride(channel, program);
}
```

```ts
// Voice.updatePitchRatio
const pitchShift =
  (pitchWheel === 8192 ? c.tuning : (pitchWheel / 16383) * c.pitchRange * 2 - c.pitchRange + c.tuning) +
  c.detune / 100;
```

## Tests

`packages/audio/test/render-offline.test.ts` renders a duet and measures, after a seek that
replays the song's own events: a track panned hard left is silent on the right; a flute switched
to a square lead has ten times the third harmonic, and switching back restores the flute; a
transposition of +12 plays at 880 Hz; a detune of +50 cents plays within 0.5 % of 452.9 Hz.
`apps/web/e2e/playback.spec.ts` drives the mixer in the browser.
