# Changes to alphaTab

OpenTabz uses [alphaTab](https://github.com/CoderLine/alphaTab) 1.8.4 (MPL-2.0) with a few
small changes, applied with `pnpm patch` to the published ESM build
([`patches/@coderline__alphatab@1.8.4.patch`](../../patches/@coderline__alphatab@1.8.4.patch)),
as decided in ADR-0003. Each change is written up here as the equivalent change to alphaTab's
TypeScript sources, ready to be offered upstream. Under MPL-2.0 §3.2 the modified files are
available as source: the patch file is that source.

| #                                                    | Change                                                                             | Why                                                                        | Upstream |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0001](0001-worker-font-measurement.md)              | Measure text with `OffscreenCanvas` in workers                                     | Titles, tempo text and lyrics were spaced at 8 px per glyph                | not yet  |
| [0002](0002-io-error-exports.md)                     | Export `EndOfReaderError` and `OverflowError` at runtime                           | Callers cannot recognise truncated files                                   | not yet  |
| [0003](0003-xml-lazy-allocation.md)                  | Allocate XML child lists and attribute maps on first use                           | Large Guitar Pro 7+ files spent a third of parsing in the GC               | not yet  |
| [0004](0004-capella-beat-duration.md)                | Full-bar-rest check before a beat joins its voice                                  | No Capella file could be opened                                            | not yet  |
| [0005](0005-min-playback-speed.md)                   | Allow playback at 10 % speed                                                       | Guitar Pro practises down to 10 %; alphaTab stopped at 12.5 %              | not yet  |
| [0006](0006-seamless-count-in-and-loops.md)          | Switch count-in, song and loop passes while generating; fitted, accented count-ins | The song came in late after a count-in and loops paused between passes     | not yet  |
| [0007](0007-drum-kits-on-any-channel.md)             | Drum kits on any channel (bank 127); unloaded samples stay silent                  | A metronome needs its own drum channel; unloaded drum samples rendered NaN | not yet  |
| [0008](0008-centered-channels.md)                    | Channels that ignore the SoundFont's region pans                                   | Woodblock and hi-hat clicks came out of one ear                            | not yet  |
| [0009](0009-replace-midi-while-playing.md)           | Replace the song while it plays, keeping the position by tick                      | A new metronome pattern or tempo stuttered and restarted                   | not yet  |
| [0010](0010-speed-changes-while-playing.md)          | Change the speed while playing without a seek; per-pass and heard-speed events     | Speed changes stuttered; a speed trainer could not step on pass boundaries | not yet  |
| [0011](0011-rests-between-loop-passes.md)            | Rests between loop passes, reported beat by beat                                   | Players want silent bars between passes to reset their hands               | not yet  |
| [0012](0012-exact-text-measurement.md)               | Measure text exactly, in its font, where a canvas exists                           | Tempo marks and names came out narrower than drawn and overlapped          | not yet  |
| [0013](0013-section-markers-own-row.md)              | Section names on an effect row of their own                                        | Section names ran through effects starting on the next beat                | not yet  |
| [0014](0014-mixer-overrides.md)                      | Mixer pan and instrument that the song's events do not undo; detune in cents       | A seek undid the mixer; an unused instrument was silent                    | not yet  |
| [0015](0015-playback-techniques.md)                  | Tremolo speed, fades, ornaments in key, tapping, hairpins, fermatas, ramps, pedal  | These techniques were drawn but played wrongly or not at all               | not yet  |
| [0016](0016-jumps-after-repeats.md)                  | Jumps after pickups, inside repeats, D.S.S. after D.S., last ending after a jump   | The form was played in the wrong order                                     | not yet  |
| [0017](0017-extra-channels.md)                       | Channels of their own for slap and pop, golpe and unison bends                     | Slap and pop sounded plain, golpe was silent, unison bends shared a curve  | not yet  |
| [0018](0018-track-interpretation.md)                 | A track's playing style: let ring, strummed chords, palm-mute damping, accents     | Guitar Pro's track interpretation had no equivalent                        | not yet  |
| [0019](0019-sample-accurate-events.md)               | Events take effect on their own sample within the synthesizer's 64-sample blocks   | Notes started up to 1.45 ms early, unevenly                                | not yet  |
| [0020](0020-gpif-read-as-it-closes.md)               | Read a Guitar Pro 7+ document as its elements close, then let them go              | A large file held about 900 MB of XML nodes while it opened                | not yet  |
| [0021](0021-let-ring-label.md)                       | "let ring" as Guitar Pro writes it                                                 | Let-ring ranges were labelled "LetRing"                                    | not yet  |
| [0022](0022-octaves-below.md)                        | Octave lines below the staff (8vb, 15mb)                                           | 8vb and 15mb passages were drawn as written, without sign or line          | not yet  |
| [0023](0023-rests-of-lower-voices.md)                | Rests of lower voices move below the first voice, on any overlap                   | Second-voice rests went above the staff, or over the first voice's rest    | not yet  |
| [0024](0024-256th-flag-down.md)                      | 256th notes with their stems down get their own flag                               | They were drawn with a 128th's flag                                        | not yet  |
| [0025](0025-tempo-beat-units.md)                     | Tempo marks keep their beat unit; MusicXML metronome units converted the right way | 6/8 tempos drawn against a quarter; MusicXML eighth = 120 played at 240    | not yet  |
| [0026](0026-staccatissimo.md)                        | Staccatissimo: read, written, engraved and played short                            | Guitar Pro and MusicXML staccatissimo was dropped                          | not yet  |
| [0027](0027-lyrics-as-written.md)                    | A track keeps the lyrics it was given, as written                                  | Line breaks and comments of typed lyrics were lost after import            | not yet  |
| [0028](0028-percussion-mapper.md)                    | `PercussionMapper` exported                                                        | A drum view could not list the kit's sounds or name a note's               | not yet  |
| [0029](0029-let-ring-throughout.md)                  | "let ring throughout" over the first bar of a track whose notes all ring on        | A score played let ring throughout did not say so                          | not yet  |
| [0030](0030-tempo-decimals.md)                       | Tempo marks with their decimals, or rounded                                        | Guitar Pro 8's decimal tempos could not be printed whole                   | not yet  |
| [0031](0031-first-system-indent.md)                  | The first system indented                                                          | Every system started at the left padding                                   | not yet  |
| [0032](0032-tuplet-brackets-and-bent-pitch.md)       | Tuplets without brackets, bends without the pitch they reach                       | Guitar Pro's stylesheet can leave both out                                 | not yet  |
| [0033](0033-tablature-and-technique-switches.md)     | Tied frets, dashed rests, arpeggio arrowheads and trill notes on request           | Guitar Pro's stylesheet chooses each of them                               | not yet  |
| [0034](0034-flat-beams.md)                           | Level beams on standard and drum staves                                            | Guitar Pro's stylesheet can level them                                     | not yet  |
| [0035](0035-clefs-and-time-signatures-at-systems.md) | Clefs and time signatures at the start of systems and sections, as asked           | Guitar Pro's stylesheet chooses where they are written again               | not yet  |
| [0036](0036-lines-over-rests.md)                     | Technique lines over rests                                                         | Palm-mute lines broke at every rest                                        | not yet  |
| [0037](0037-left-handed-chord-diagrams.md)           | Chord diagrams mirrored for left-handed players                                    | Left-handed players read them with the highest string on the left          | not yet  |
| [0038](0038-chord-display-and-fingering.md)          | What each chord shows, and its fingering                                           | Chords hid their name or diagram in vain; fingering was dropped            | not yet  |
| [0039](0039-chord-diagram-size-and-spacing.md)       | Chord diagrams’ size and spacing                                                   | One size and spacing for all; diagrams above close beats overlapped        | not yet  |
| [0040](0040-technique-labels.md)                     | Technique labels as asked                                                          | Guitar Pro 8 renames P.M., let ring, H and P and the rest                  | not yet  |
| [0041](0041-tuning-legend.md)                        | The tuning legend as asked                                                         | Guitar Pro chooses what it says, its layout and frame, or the tablature    | not yet  |
| [0042](0042-four-voices.md)                          | Stems and rests of four voices                                                     | Voice 3 pointed its stems down and dropped its rests below                 | not yet  |
| [0043](0043-artificial-harmonics-in-tab.md)          | Artificial harmonics in the tablature, as asked                                    | Guitar Pro can leave out the touch or dot octaves                          | not yet  |
| [0044](0044-tab-rhythm.md)                           | The rhythm in the tablature, per voice and outside the staff                       | Guitar Pro places each voice’s tab rhythm and its stems                    | not yet  |
| [0045](0045-tab-beams-and-circles.md)                | Beams over rests and circled long notes in the tablature                           | Guitar Pro chooses both                                                    | not yet  |
| [0046](0046-slash-notation.md)                       | Slash notation as asked                                                            | Guitar Pro hides its line and barlines, and writes single notes’ frets     | not yet  |
| [0047](0047-written-pitch.md)                        | Notes written apart from where they sound, string by string                        | Guitar Pro writes guitars as if in standard tuning without a capo          | not yet  |
| [0048](0048-lyrics-place.md)                         | Where the lyrics go                                                                | Guitar Pro puts them above or below the staves                             | not yet  |
| [0049](0049-inverted-tab.md)                         | The tablature the other way up                                                     | Some players read the lowest string on top                                 | not yet  |
| [0050](0050-fingering-display.md)                    | Fingering as asked                                                                 | Guitar Pro labels, places and sizes fingering                              | not yet  |
| [0051](0051-tab-notes-without-strings.md)            | Tablature skips notes without a string                                             | A pitched part shown as tab may have notes no string reaches               | not yet  |
| [0052](0052-drum-tablature.md)                       | Drum tablature                                                                     | Guitar Pro shows a drum kit as tablature with MIDI numbers                 | not yet  |
| [0053](0053-sound-change-labels.md)                  | Sound-change labels                                                                | Guitar Pro writes a sound's label where the sound changes                  | not yet  |
| [0054](0054-tempo-steps.md)                          | Tempo changes of Guitar Pro 3–5 and Capella files                                  | Their tempo changes are steps, read as ramps                               | not yet  |
| [0055](0055-tempo-ramp-marks.md)                     | Tempo ramps marked accel. or rit.                                                  | Guitar Pro 8 marks a gradual tempo change                                  | not yet  |
| [0056](0056-detached-coda.md)                        | Detached coda                                                                      | Guitar Pro draws a coda apart, below a gap                                 | not yet  |

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
