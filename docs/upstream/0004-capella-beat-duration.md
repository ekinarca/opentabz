# 0004 — Full-bar-rest check before a beat joins its voice

## Problem

alphaTab 1.8.4 cannot open any Capella file. `CapellaParser` computes a beat's duration
(`beat.updateDurations()`) before adding the beat to its voice, and before a chord's note heads
are parsed, so the beat still counts as a rest. `Beat.isFullBarRest` then reads
`this.voice.beats` while `voice` is still unset:

```
TypeError: Cannot read properties of undefined (reading 'beats')
    at get isFullBarRest (Beat.ts)
    at Beat._calculateDuration
    at Beat.updateDurations
    at CapellaParser._parseVoice
```

alphaTab's test data has no Capella files, so the regression went unnoticed.

## Change

`src/model/Beat.ts`:

```ts
public get isFullBarRest(): boolean {
    return this.isRest && this.voice !== undefined && this.voice.beats.length === 1 && this.duration === Duration.Whole;
}
```

A beat that is not in a voice yet cannot be its bar's only beat, so it is not a full-bar rest; its
duration is then computed from its note value, which is what the Capella parser needs to track
the position in the bar. (Calling `updateDurations()` after `addBeat()` in `CapellaParser` would
fix this importer too, but the guard also protects other callers.)

## Tests

`fixtures/capella/original-air.capx` (and the same CapXML uncompressed) is an original
two-staff score with lyrics, triplets, a tie across a system break, accents and staccato.
`packages/core/test/open.test.ts` checks tracks, bars, time signature, tempo, lyrics, triplets, the
tie and that every bar is exactly full; the end-to-end tests open it in the browser.
