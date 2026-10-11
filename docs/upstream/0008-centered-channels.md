# 0008 — Channels that ignore the SoundFont's pan

## Problem

General MIDI drum kits spread their percussion across the stereo field, and SoundFonts encode it
as a pan per region: in the bundled sonivox SoundFont the woodblocks are hard right, the hi-hats
44 % right and claves and cowbell 20 % right. A metronome built from those sounds comes out of one
ear. The channel's pan (`CC 10`) only adds to the region's pan, so it can centre one sound but not
a channel that plays several keys with different pans.

## Change

A channel can be _centered_: its voices ignore the region pan and use only the channel's own.

`src/synth/synthesis/TinySoundFont.ts`:

```ts
private _centeredChannels: Map<number, boolean> = new Map();

public channelSetCentered(channel: number, centered: boolean): void {
    if (centered) {
        this._centeredChannels.set(channel, true);
    } else {
        this._centeredChannels.delete(channel);
    }
    // Re-apply the channel's pan to the voices that are sounding.
    this.channelSetPan(channel, this.channelInit(channel).panOffset + 0.5);
}

public channelIsCentered(channel: number): boolean {
    return this._centeredChannels.has(channel);
}

// channelSetPan(): const newPan = (this.channelIsCentered(channel) ? 0 : v.region!.pan) + pan - 0.5;
// resetChannelStates(): this._centeredChannels = new Map();
```

`src/synth/synthesis/Channels.ts`, `setupVoice`:

```ts
const newpan = (tinySoundFont.channelIsCentered(this.activeChannel) ? 0 : voice.region!.pan) + c.panOffset;
```

`AlphaSynthBase.setChannelCentered(channel, centered)` forwards to the synthesizer, like
`setChannelMute`; the backing-track synthesizer implements it as a no-op. Like mute and solo, the
setting survives `resetSoft()` and is cleared by `resetChannelStates()`.

## Tests

`packages/audio/test/practice-audio.test.ts` renders every metronome sound and checks that the
left and right channels are within 0.1 dB of each other (the woodblock was silent on the left).
