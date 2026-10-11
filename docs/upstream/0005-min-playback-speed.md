# 0005 — Allow playback at 10 % speed

## Problem

`SynthConstants.MinPlaybackSpeed` is 0.125, so `AlphaSynth.playbackSpeed` clamps anything slower
to 12.5 %. Guitar Pro's practice speed goes down to 10 %, and players working out fast passages
use it.

## Change

`src/synth/SynthConstants.ts`:

```ts
public static readonly MinPlaybackSpeed: number = 0.1;
```

Nothing else depends on the constant; the sequencer scales time by the speed and the pitch is
unaffected.

## Tests

`apps/web/e2e/practice.spec.ts` steps the speed down to 10 % in the browser;
`packages/audio/test/render-offline.test.ts` proves that half speed keeps every pitch and doubles
every duration.
