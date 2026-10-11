# Changes to alphaTab

OpenTabz uses [alphaTab](https://github.com/CoderLine/alphaTab) 1.8.4 (MPL-2.0) with a few
small changes, applied with `pnpm patch` to the published ESM build
([`patches/@coderline__alphatab@1.8.4.patch`](../../patches/@coderline__alphatab@1.8.4.patch)),
as decided in ADR-0003. Each change is written up here as the equivalent change to alphaTab's
TypeScript sources, ready to be offered upstream. Under MPL-2.0 §3.2 the modified files are
available as source: the patch file is that source.

| #                                           | Change                                                                             | Why                                                                        | Upstream |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0001](0001-worker-font-measurement.md)     | Measure text with `OffscreenCanvas` in workers                                     | Titles, tempo text and lyrics were spaced at 8 px per glyph                | not yet  |
| [0002](0002-io-error-exports.md)            | Export `EndOfReaderError` and `OverflowError` at runtime                           | Callers cannot recognise truncated files                                   | not yet  |
| [0003](0003-xml-lazy-allocation.md)         | Allocate XML child lists and attribute maps on first use                           | Large Guitar Pro 7+ files spent a third of parsing in the GC               | not yet  |
| [0004](0004-capella-beat-duration.md)       | Full-bar-rest check before a beat joins its voice                                  | No Capella file could be opened                                            | not yet  |
| [0005](0005-min-playback-speed.md)          | Allow playback at 10 % speed                                                       | Guitar Pro practises down to 10 %; alphaTab stopped at 12.5 %              | not yet  |
| [0006](0006-seamless-count-in-and-loops.md) | Switch count-in, song and loop passes while generating; fitted, accented count-ins | The song came in late after a count-in and loops paused between passes     | not yet  |
| [0007](0007-drum-kits-on-any-channel.md)    | Drum kits on any channel (bank 127); unloaded samples stay silent                  | A metronome needs its own drum channel; unloaded drum samples rendered NaN | not yet  |
| [0008](0008-centered-channels.md)           | Channels that ignore the SoundFont's region pans                                   | Woodblock and hi-hat clicks came out of one ear                            | not yet  |
| [0009](0009-replace-midi-while-playing.md)  | Replace the song while it plays, keeping the position by tick                      | A new metronome pattern or tempo stuttered and restarted                   | not yet  |
| [0010](0010-speed-changes-while-playing.md) | Change the speed while playing without a seek; per-pass and heard-speed events     | Speed changes stuttered; a speed trainer could not step on pass boundaries | not yet  |
| [0011](0011-rests-between-loop-passes.md)   | Rests between loop passes, reported beat by beat                                   | Players want silent bars between passes to reset their hands               | not yet  |
| [0012](0012-exact-text-measurement.md)      | Measure text exactly, in its font, where a canvas exists                           | Tempo marks and names came out narrower than drawn and overlapped          | not yet  |
| [0013](0013-section-markers-own-row.md)     | Section names on an effect row of their own                                        | Section names ran through effects starting on the next beat                | not yet  |
| [0014](0014-mixer-overrides.md)             | Mixer pan and instrument that the song's events do not undo; detune in cents       | A seek undid the mixer; an unused instrument was silent                    | not yet  |
| [0015](0015-playback-techniques.md)         | Tremolo speed, fades, ornaments in key, tapping, hairpins, fermatas, ramps, pedal  | These techniques were drawn but played wrongly or not at all               | not yet  |
| [0016](0016-jumps-after-repeats.md)         | Jumps after pickups, inside repeats, D.S.S. after D.S., last ending after a jump   | The form was played in the wrong order                                     | not yet  |
| [0017](0017-extra-channels.md)              | Channels of their own for slap and pop, golpe and unison bends                     | Slap and pop sounded plain, golpe was silent, unison bends shared a curve  | not yet  |
| [0018](0018-track-interpretation.md)        | A track's playing style: let ring, strummed chords, palm-mute damping, accents     | Guitar Pro's track interpretation had no equivalent                        | not yet  |
| [0019](0019-sample-accurate-events.md)      | Events take effect on their own sample within the synthesizer's 64-sample blocks   | Notes started up to 1.45 ms early, unevenly                                | not yet  |
| [0020](0020-gpif-read-as-it-closes.md)      | Read a Guitar Pro 7+ document as its elements close, then let them go              | A large file held about 900 MB of XML nodes while it opened                | not yet  |
| [0021](0021-let-ring-label.md)              | "let ring" as Guitar Pro writes it                                                 | Let-ring ranges were labelled "LetRing"                                    | not yet  |

## Working on a patch

```bash
pnpm patch @coderline/alphatab@1.8.4 --edit-dir /tmp/alphatab-edit
# edit /tmp/alphatab-edit/dist/alphaTab.core.mjs (the existing patch is already applied)
pnpm patch-commit /tmp/alphatab-edit
```

Only `dist/alphaTab.core.mjs` is patched: the web app bundles it directly (see `vite.config.ts`)
and the Node entry point (`dist/alphaTab.mjs`, used by the unit tests) imports it.
After changing a patch, run `pnpm test` and `pnpm test:e2e`. `packages/core/test/import-golden.test.ts`
fingerprints the score of every fixture: a change that alters an imported score fails it, and
its snapshot is updated (`pnpm vitest run packages/core/test/import-golden.test.ts -u`) only when
the change is meant to.
