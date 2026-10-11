# 0006 — Seamless count-in and loop passes, fitted count-ins, count-in progress

## Problem

`AlphaSynthBase` reacts to the end of the count-in and to the end of a loop pass when the
output reports the samples as _played_: it then switches the sequencer (count-in to song, or
song end to loop start) and asks for new audio. Everything buffered after that point is thrown
away and regenerated, so:

- the first note after the count-in comes late (19 ms on our measurements with a 250 ms buffer),
- each loop pass has a gap of a buffer refill before it starts again,
- with a deeper buffer, both get worse.

The count-in itself is always exactly one bar of the meter at the playback position, clicks
without an accent, and cannot be repeated before loop passes or followed by an application.
Starting in the middle of a bar (beat 3, say) counts a whole bar and then starts on beat 3, which
puts the downbeat in the wrong place for the player. Guitar Pro counts in one or two bars, can
count in before every loop pass, and accents the first beat.

## Change

**Generation-time switching.** `onSampleRequest` checks `sequencer.isFinished` after every
micro-buffer. When the count-in finishes it switches to the song, and when a pass of a loop
finishes it seeks to the loop start (counting in again if asked to), in the same buffer, and
keeps synthesizing. A list of _segments_ (sample index where each part starts, whether it is a
count-in, its song time, whether it wrapped) lets `_onSamplesPlayed` report positions, count-in
progress and `finished` (once per pass) as each part is actually heard.

**Exact pass lengths.** Events are dispatched per micro-buffer (64 samples), so the block that
reaches the end of a part runs past it by up to 63 samples. `MidiFileSequencer.currentOvershoot`
measures that; `advanceCurrent(overshoot)` moves what plays next on by the same amount without
dispatching (the events in between go out with the next block). Every loop pass then lasts
exactly the length of its range instead of up to one block more, and nothing drifts.

**Fitted count-in.** New properties `countInBars` (whole bars, default 1) and `countInLeadBeats`
(extra clicks for a start in mid-bar, or on a pickup) on `AlphaSynthBase`, forwarded to the
sequencer: `generateCountInMidi` emits `countInBars × numerator + countInLeadBeats` clicks.
Starting on beat 3 of a 4/4 bar with one bar of count-in gives 1 2 3 4 1 2, and the song comes in
on its beat 3.

**Accents.** The first beat of each bar of the count-in is played at full velocity, the others at
80/127.

**Every loop pass.** `countInEveryLoop`: when a loop pass ends, the count-in plays again before
the next pass.

**Progress.** `countInProgress: IEventEmitterOfT<{ beat: number; beats: number }>` fires for
each click as it is heard and with `beat: -1` when the song comes in, for visual count-ins.

**Play resumes where the listener is.** `play()` with a count-in seeks to the position that was
_heard_, not to where generation had got to, before counting in.

`src/synth/MidiFileSequencer.ts` (abridged):

```ts
public countInBars: number = 1;
public countInLeadBeats: number = 0;

public get currentOvershoot(): number {
    return Math.max(0, this._currentState.currentTime - this.internalEndTime);
}

public advanceCurrent(milliseconds: number): void {
    this._currentState.currentTime += milliseconds;
}

// generateCountInMidi():
const countInClicks =
    Math.max(1, this.countInBars | 0) * timeSignatureNumerator +
    Math.max(0, Math.min(timeSignatureNumerator - 1, this.countInLeadBeats | 0));
for (let i = 0; i < countInClicks; i++) {
    const metronome = SynthEvent.newMetronomeEvent(
        state.synthData.length, metronomeTick, i % timeSignatureNumerator,
        metronomeLengthInTicks, metronomeLengthInMillis);
    // ...
}
```

`src/synth/AlphaSynthBase.ts` (abridged):

```ts
// onSampleRequest(), per micro-buffer:
if (this.sequencer.isFinished) {
    if (this.continueSeamlessly(this._generatedSamples + bufferPos)) {
        continue;
    }
    break;
}

private continueSeamlessly(at: number): boolean {
    const overshoot = this.sequencer.currentOvershoot;
    if (this.sequencer.isPlayingCountIn) {
        this.sequencer.resetCountIn();
        this.synthesizer.setupMetronomeChannel(this.sequencer.metronomeChannel, this.metronomeVolume);
        const time = this.sequencer.currentTime;
        this.sequencer.advanceCurrent(overshoot);
        this._segments.push({ at, countIn: false, time, wrapped: false });
        return true;
    }
    if (this.sequencer.isPlayingMain && this.isLooping) {
        const startTick = this.playbackRange ? this.playbackRange.startTick : 0;
        const startTime = this.sequencer.mainTickPositionToTimePosition(startTick);
        this.sequencer.mainSeek(startTime);
        const countIn = this.countInEveryLoop && this._countInVolume > 0;
        if (countIn) {
            this.sequencer.startCountIn();
            this.synthesizer.setupMetronomeChannel(this.sequencer.metronomeChannel, this._countInVolume);
        }
        this.sequencer.advanceCurrent(overshoot);
        this._segments.push({ at, countIn, time: startTime, wrapped: true });
        return true;
    }
    return false;
}
```

`_onSamplesPlayed` walks the segments: samples before the next segment are reported against the
part being heard (count-in progress, or song positions); at a segment boundary it switches,
fires `countInProgress({ beat: -1 })` when the song comes in and `finished` for a wrap.
`checkForFinish` runs only when no segment is pending.

## Tests

`packages/audio/test/practice-audio.test.ts` renders through the real synth path and measures
the audio: one and two bars of count-in with the song's first note exactly a beat after the last
click; a start on beat 3 counting 1 2 3 4 1 2 and coming in on E5; a count-in before every loop
pass (and none when not asked); loop passes of exactly the range's length (within one 64-sample
block, no drift over passes); the `countIn` events. `packages/audio/test/render-offline.test.ts`
checks that nothing of the bar after a loop range leaks into the wrap and that `finished` fires
for every pass. `apps/web/e2e/metronome.spec.ts` shows the visual count-in in the browser.
