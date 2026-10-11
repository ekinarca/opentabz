# 0007 — Drum kits on any channel; unloaded samples stay silent

## Problem

alphaTab plays percussion only on MIDI channel 10 (index 9). General MIDI level 2 and XG select a
drum kit on any channel with bank select MSB 127, which is what an application needs to play its
own percussion (a metronome) on a channel of its own next to a song that uses channel 10.

Selecting the kit is not enough. To save memory alphaTab loads only the samples a song uses: the
sequencer collects `percussionKeys` from note-ons on channel 9 only, so the samples of every
other drum channel's keys are left out. Such a region has `samples.length === 0` but keeps its
offsets into the SoundFont, and `Voice.render` then reads `input[pos]` past the end of the empty
array: `undefined × alpha` is `NaN`. A single such note turns the output into `NaN` for as long
as it sounds — even on a muted channel, because a muted voice still renders at gain 0 and
`NaN × 0` is `NaN`. Browsers play `NaN` samples as silence or clicks, and a `NaN` reaching a
filter downstream can silence the output for good.

## Change

`src/synth/synthesis/TinySoundFont.ts`, program change (bank select MSB 127 makes the channel a
drum channel, with or without a following LSB):

```ts
case MidiEventType.ProgramChange:
    const programChange = e as ProgramChangeEvent;
    const programBank = this.channelInit(programChange.channel).bank;
    const programBankMsb = (programBank & 0x8000) !== 0 ? programBank & 0x7f : (programBank >> 7) & 0x7f;
    const xgDrums = programBankMsb === 127;
    this.channelSetPresetNumber(programChange.channel, programChange.program,
        programChange.channel === 9 || xgDrums);
    break;
```

`src/synth/MidiFileSequencer.ts`, `createStateFromFile`: track the channels switched to a drum
kit, and collect their keys like channel 9's:

```ts
const xgDrumChannels = new Set<number>();
// ...
} else if (mEvent.type === MidiEventType.ControlChange) {
    const control = mEvent as ControlChangeEvent;
    if (control.controller === ControllerType.BankSelectCoarse) {
        if (control.value === 127) {
            xgDrumChannels.add(control.channel);
        } else {
            xgDrumChannels.delete(control.channel);
        }
    }
} else if (mEvent.type === MidiEventType.ProgramChange) {
    // ...
    if (!(channel === SynthConstants.PercussionChannel || xgDrumChannels.has(channel))) {
        this.instrumentPrograms.add(programChange.program);
    }
} else if (mEvent.type === MidiEventType.NoteOn) {
    const noteOn = mEvent as NoteOnEvent;
    if (noteOn.channel === SynthConstants.PercussionChannel || xgDrumChannels.has(noteOn.channel)) {
        this.percussionKeys.add(noteOn.noteKey);
    }
    // ...
}
```

`TinySoundFont.noteOn`: a region whose samples were not loaded is skipped, so a note that was not
foreseen (a one-time MIDI file with other keys, say) is silent instead of corrupting the output:

```ts
if (region.samples.length === 0) {
  continue;
}
```

## Tests

`packages/audio/test/offline.ts` fails every offline render that contains a sample that is not
a finite number; before this change every render with the metronome's accent (key 34 on its own
channel) did. `packages/audio/test/practice-audio.test.ts` plays each of the metronome's sounds
(General MIDI percussion keys 33, 34, 37, 42, 46, 56, 75, 76, 77) on its own channel and
measures them.
