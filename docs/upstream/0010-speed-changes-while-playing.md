# 0010 — Change the playback speed while playing without a seek

## Problem

`AlphaSynthBase.updatePlaybackSpeed` sets the sequencer's speed and then assigns `timePosition`
to rescale the position, which is a seek: the buffered audio is discarded and generation starts
again from the last _reported_ position. That position trails the audible one by up to a
progress report, so every speed change during playback repeats up to ~23 ms of audio (or skips,
depending on timing) and regenerates the whole buffer. Dragging a speed slider stutters, and a
speed trainer cannot change the speed exactly at the start of a loop pass: the change lands a
buffer later, in the middle of the bar.

## Change

**While playing**, a speed change applies from the sample being generated on, with no seek. The
sequencer runs at the new speed from there; the audio already buffered plays out at the speed it
was made with. To keep positions right meanwhile, `AlphaSynthBase` keeps a queue of speed changes
(sample index and speed) next to the segments of patch 0006; `_onSamplesPlayed` advances the song
position at the speed of the audio being heard, and segment times are stored in song time
(without speed) so a change between generating and hearing a segment cannot shift it. When
paused or stopped the old behaviour (rescale the position by seeking) is kept.

**`passGenerated`** fires while the audio of a new loop pass is generated, before its first
sample; a speed set from a handler applies to the whole pass. An application can implement a
speed trainer (and similar per-pass logic) exactly on pass boundaries.

**`heardSpeedChanged`** fires when audio made at a new speed starts to be heard, so a display
can follow the speed the listener actually hears.

`src/synth/AlphaSynthBase.ts` (abridged):

```ts
private _heardSpeed: number = 1;
private _speedChanges: { at: number; speed: number }[] = [];
private _generationPoint: number = -1;

public readonly passGenerated: IEventEmitter = new EventEmitter();
public readonly heardSpeedChanged: IEventEmitterOfT<number> = new EventEmitterOfT<number>();

protected updatePlaybackSpeed(value: number): void {
    const oldSpeed = this.sequencer.playbackSpeed;
    if (this.state === PlayerState.Playing && this._isMidiLoaded && !this.sequencer.isPlayingOneTimeMidi) {
        if (value === oldSpeed) {
            return;
        }
        this.sequencer.playbackSpeed = value;
        this._timePosition = this._timePosition * (oldSpeed / value);
        this._countInPlayedMillis = this._countInPlayedMillis * (oldSpeed / value);
        const at = this._generationPoint >= 0 ? this._generationPoint : this._generatedSamples;
        this._speedChanges.push({ at, speed: value });
        return;
    }
    this.sequencer.playbackSpeed = value;
    this.timePosition = this.timePosition * (oldSpeed / value);
    // ... clear the queue, announce the heard speed
}
```

In `_onSamplesPlayed`, chunks are split at speed changes as well as at segments, and each chunk
moves the position by `millis * (this._heardSpeed / this.sequencer.playbackSpeed)` in the current
speed's time. `onSampleRequest` sets `_generationPoint` to the sample at which a count-in or a loop
pass ends while `continueSeamlessly` runs, which triggers `passGenerated` before seeking to the
loop start.

## Tests

`packages/audio/test/practice-audio.test.ts`: halving the speed while the metronome plays keeps
every click on the grid (gaps of exactly the old beat, then exactly the new one, nothing in
between), with no seek and positions that only move forward; a speed trainer from 50 % to 70 %
in steps of 10 % every two passes starts each pass exactly where the speed predicts (within one
64-sample block), and announces each speed when it is heard; a loop counted to three passes
stops and loops again on the next play. `apps/web/e2e/metronome.spec.ts` runs the trainer in the
browser.
