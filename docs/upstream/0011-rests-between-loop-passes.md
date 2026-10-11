# 0011 — Rests between loop passes

## Problem

Practising a hard passage in a loop, players want a moment between passes to reset their hands:
a bar or two of silence before the loop starts again. alphaTab can only jump straight back to
the loop start (or count in, with patch 0006).

## Change

`MidiFileSequencer` gets a _rest_ state, like the count-in state: silence that lasts
`loopRestBars` bars in the meter and tempo at the loop start. When a loop pass ends and
`loopRestBars > 0`, `AlphaSynthBase` seeks to the loop start and plays the rest first; after
the rest comes the count-in (if counting in before every pass) and then the next pass. Both
switches happen while generating audio (patch 0006), so passes stay exactly in time.

While the rest is heard the song position stays at the loop start, and
`restProgress: IEventEmitterOfT<{ beat: number; beats: number }>` reports each beat of the rest
(`beat: -1` when it ends), for a visual countdown. A seek during a rest ends it; stopping in a
count-in or a rest returns to the song (alphaTab used to leave the count-in state current after a
stop).

`src/synth/MidiFileSequencer.ts` (abridged):

```ts
public loopRestBars: number = 0;
private _restState: MidiSequencerState | null = null;

public get isPlayingRest(): boolean {
    return this._restState !== null && this._currentState === this._restState;
}

public startRest(): void {
    const state = new MidiSequencerState();
    state.division = this._mainState.division;
    const bpm = this._synthesizer.currentTempo;
    const numerator = this._synthesizer.timeSignatureNumerator;
    const denominator = this._synthesizer.timeSignatureDenominator;
    state.tempoChanges.push(new MidiFileSequencerTempoChange(bpm, 0, 0));
    const beatTicks = (state.division * (4 / denominator)) | 0;
    const beatMillis = beatTicks * (60000 / (bpm * state.division));
    const beats = Math.max(1, this.loopRestBars | 0) * numerator;
    state.endTime = beats * beatMillis;
    state.endTick = beats * beatTicks;
    // ...
    this._restState = state;
    this._currentState = state;
}

public resetRest(): void {
    this._restState = null;
    this._currentState = this._mainState;
}
```

`AlphaSynthBase.continueSeamlessly` starts the rest at a loop end and, when the rest finishes,
moves on to the count-in or the song; `_onSamplesPlayed` keeps the position still during rest
segments and reports their beats.

## Tests

`packages/audio/test/practice-audio.test.ts`: a one-bar loop with a bar of rest starts its passes
at 0, 4 and 8 s at 120 BPM, is silent in between, reports the rest's four beats and keeps the
position at the loop start; with a count-in before every pass, the rest comes first, then four
clicks, then the pass. `apps/web/e2e/metronome.spec.ts` shows the rest on screen.
