# 0009 — Replace the song while it plays

## Problem

An application that generates part of the MIDI itself (metronome clicks with a pattern, swing or
dropped bars; a click track whose tempo the user changes) has to load a new MIDI file for every
change. `loadMidiFile` stops playback, and seeking back to the previous position discards the
buffered audio and restarts from the last _reported_ position, which trails the audible one by up
to one progress report: the listener hears a short stutter (we measured up to 23 ms repeated)
and, without care, a pause and a restart of the count-in.

## Change

`MidiFileSequencer.replaceMain(midiFile)` builds the state of the new file and carries the
position over **by tick** — so a change of tempo keeps the place in the bar — together with the
playback range (its times recomputed in the new tempo) and the sync points. Events before the
position count as played. Nothing is stopped, no voice is cut, and the audio already buffered
plays out unchanged; everything generated afterwards comes from the new file.

`AlphaSynthBase.replaceMidiFile(midi)` calls it (or `loadMidiFile` if nothing is loaded yet).
The new file must have the same bars as the old one: notes may differ, and so may the tempo.

`src/synth/MidiFileSequencer.ts`:

```ts
public replaceMain(midiFile: MidiFile): void {
    const previous = this._mainState;
    const state = this.createStateFromFile(midiFile);
    const tick = MidiFileSequencer.timeToTick(previous, previous.currentTime);
    state.currentTime = this.tickPositionToTimePositionWithSpeed(state, tick, 1);
    if (state.tempoChanges.length > 0) {
        this.updateCurrentTempo(state, state.currentTime);
    }
    state.syncPoints = previous.syncPoints;
    state.syncPointIndex = previous.syncPointIndex;
    if (state.syncPoints.length > 0) {
        state.syncPointTempo = previous.syncPointTempo;
    }
    const range = previous.playbackRange;
    if (range) {
        state.playbackRange = range;
        state.playbackRangeStartTime = this.tickPositionToTimePositionWithSpeed(state, range.startTick, 1);
        state.playbackRangeEndTime = this.tickPositionToTimePositionWithSpeed(state, range.endTick, 1);
    }
    let eventIndex = 0;
    while (eventIndex < state.synthData.length && state.synthData[eventIndex].time < state.currentTime) {
        eventIndex++;
    }
    state.eventIndex = eventIndex;
    if (this._currentState === previous) {
        this._currentState = state;
    }
    this._mainState = state;
}

/** The (fractional) tick at a time of the song, without speed. */
private static timeToTick(state: MidiSequencerState, timePosition: number): number {
    let ticks = 0;
    let time = 0;
    let bpm = 120;
    for (const c of state.tempoChanges) {
        if (timePosition < c.time) {
            break;
        }
        ticks = c.ticks;
        time = c.time;
        bpm = c.bpm;
    }
    return ticks + (timePosition - time) / (60000.0 / (MidiFileSequencer.sanitizeBpm(bpm) * state.division));
}
```

A count-in that is playing while the song is replaced goes on and then continues with the new
song.

## Tests

`packages/audio/test/practice-audio.test.ts`: changing the metronome pattern while playing (to
eighths) keeps every click on the beat grid within 3 ms, reports no pause and positions that only
move forward a block at a time; changing the tempo of the click track from 120 to 60 BPM
mid-bar goes on from the same place in the bar, with no gap shorter than the old beat or longer
than the new one.
