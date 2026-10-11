# Feature matrix

The single source of truth for what OpenTabz does. One row per feature.

- **Src** — `GP`: Guitar Pro 8 parity · `OT`: OpenTabz-only (beyond Guitar Pro) · `GP+`: parity
  with an OpenTabz extension. Parity rows are cross-referenced in [PARITY.md](PARITY.md).
- **M** — milestone that ships it (M0–M8, `S` = stretch).
- **Fixture** — public fixture(s) that exercise it (paths relative to `fixtures/`).
- **Test** — test file(s) that lock it (paths relative to the repository root).
- **Status** — `planned` · `in progress` · `done`. A row may only be `done` when its tests exist
  and pass in CI; `scripts/feature-matrix.ts` enforces unique ids, valid statuses and that
  every test path of a `done` row exists.

## Opening files

| ID       | Feature                                                                                         | Src | M   | Fixture             | Test | Status  |
| -------- | ----------------------------------------------------------------------------------------------- | --- | --- | ------------------- | ---- | ------- |
| OPEN-001 | Drag-and-drop a file anywhere in the window                                                     | GP+ | M0  | — | apps/web/e2e/budgets.spec.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-002 | File picker (Open button and shortcut)                                                          | GP  | M0  | — | apps/web/e2e/open.spec.ts | done |
| OPEN-003 | Paste files from the clipboard                                                                  | OT  | M0  | — | apps/web/e2e/open.spec.ts | done |
| OPEN-004 | Paste plain-text tabs from the clipboard                                                        | OT  | M5  | —                   | —    | planned |
| OPEN-005 | Open from URL (CORS permitting), including `?url=` deep links                                   | OT  | M0  | — | apps/web/e2e/open.spec.ts, apps/web/src/features/open/intake.test.ts | done |
| OPEN-006 | OS file-handler registration via the PWA manifest                                               | OT  | M3  | —                   | —    | planned |
| OPEN-007 | Web Share Target on mobile                                                                      | OT  | M3  | —                   | —    | planned |
| OPEN-008 | Open a whole folder                                                                             | OT  | M3  | —                   | —    | planned |
| OPEN-009 | Multiple documents in tabs                                                                      | GP  | M0  | — | apps/web/e2e/open.spec.ts | done |
| OPEN-010 | Guitar Pro 3 (.gp3)                                                                             | GP  | M0  | alphatab/guitarpro3 | packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-011 | Guitar Pro 4 (.gp4)                                                                             | GP  | M0  | alphatab/guitarpro4 | packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-012 | Guitar Pro 5 (.gp5, v5.00 and v5.10)                                                            | GP  | M0  | alphatab/guitarpro5 | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-013 | Guitar Pro 6 (.gpx, BCFZ and BCFS containers)                                                   | GP  | M0  | alphatab/guitarpro6 | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-014 | Guitar Pro 7 (.gp)                                                                              | GP  | M0  | alphatab/guitarpro7 | packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-015 | Guitar Pro 8 (.gp), including files with audio tracks                                           | GP  | M0  | alphatab/guitarpro8, alphatab/audio | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts | done |
| OPEN-016 | OpenTabz project (.otz)                                                                         | OT  | M4  | —                   | —    | planned |
| OPEN-017 | MusicXML (.xml, .musicxml; partwise and timewise)                                               | GP  | M0  | musicxml-testsuite, musicxml/original-timewise.musicxml | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-018 | Compressed MusicXML (.mxl)                                                                      | GP  | M0  | alphatab/musicxml3/compressed.mxl | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-019 | alphaTex (.atex, .tex, .alphatex)                                                               | OT  | M0  | alphatex/demos | packages/core/test/alphatex-fixtures.test.ts, packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-020 | Capella (.capx)                                                                                 | OT  | M0  | capella/original-air.capx, capella/original-air.capxml | packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-021 | ASCII / plain-text tabs with rhythm inference and chord-line detection                          | GP+ | M5  | —                   | —    | planned |
| OPEN-022 | ChordPro                                                                                        | OT  | M5  | —                   | —    | planned |
| OPEN-023 | MIDI import with pitch → string/fret mapping per tuning                                         | GP  | M5  | —                   | —    | planned |
| OPEN-024 | PowerTab (.ptb)                                                                                 | GP  | M8  | —                   | —    | planned |
| OPEN-025 | TuxGuitar (.tg)                                                                                 | OT  | S   | —                   | —    | planned |
| OPEN-026 | Format detection by content, never by extension                                                 | OT  | M0  | — | packages/core/test/sniff.test.ts, packages/core/test/open.test.ts | done |
| OPEN-027 | Files with wrong or missing extensions and odd names open correctly                             | OT  | M0  | — | packages/core/test/open.test.ts | done |
| OPEN-028 | Truncated files produce a specific "truncated" error                                            | OT  | M0  | — | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts | done |
| OPEN-029 | Corrupted files produce a specific error naming the format and the problem                      | OT  | M0  | — | packages/core/test/open.test.ts, apps/web/e2e/open.spec.ts | done |
| OPEN-030 | Recognized but unsupported formats (MIDI, PDF, images, audio, archives…) are named in the error | OT  | M0  | — | packages/core/test/open.test.ts, packages/core/test/sniff.test.ts | done |
| OPEN-031 | Parsing runs off the main thread; a hung parse is cancelled by a watchdog                       | OT  | M0  | — | apps/web/src/engine/client.test.ts, packages/core/test/engine-host.test.ts | done |
| OPEN-032 | Fuzzed (bit-flipped, truncated) inputs never hang or crash the app                              | OT  | M0  | alphatab/corrupt | packages/core/test/fuzz.test.ts | done |
| OPEN-033 | Guitar Pro 1–2 (.gtp)                                                                           | GP  | M8  | —                   | —    | planned |
| OPEN-034 | TablEdit (.tef)                                                                                 | GP  | M8  | —                   | —    | planned |
| OPEN-035 | Protected Guitar Pro files: edit-locked files open read-only, open-locked files ask for the password | GP  | M4  | —                   | —    | planned |
| OPEN-036 | MIDI import into the open document, appending tracks after the last one                         | GP  | M5  | —                   | —    | planned |
| OPEN-037 | MIDI import track mapping: pick tracks, merge several into one, detect piano grand staves, instrument from Program Change | GP  | M5  | —                   | —    | planned |
| OPEN-038 | MIDI import per-track options: notations, staves, tuning, sound, colour and icon                | GP  | M5  | —                   | —    | planned |
| OPEN-039 | MIDI import quantize and clean-up: grid, shortest note, gap filling, dotted notes, voices from overlaps, triplet detection | GP  | M5  | —                   | —    | planned |
| OPEN-040 | MIDI import score options: keep or ignore time signatures, key signatures and tempo             | GP  | M5  | —                   | —    | planned |
| OPEN-041 | Live preview of the MIDI import result while options change                                     | GP  | M5  | —                   | —    | planned |

## Score rendering

| ID       | Feature                                                                           | Src | M   | Fixture                                                     | Test | Status  |
| -------- | --------------------------------------------------------------------------------- | --- | --- | ----------------------------------------------------------- | ---- | ------- |
| REND-001 | Standard notation + tablature                                                     | GP  | M0  | — | packages/core/test/render-session.test.ts, apps/web/e2e/budgets.spec.ts | done |
| REND-002 | Tablature only                                                                    | GP  | M0  | — | packages/core/test/render-session.test.ts, apps/web/e2e/budgets.spec.ts | done |
| REND-003 | Standard notation only                                                            | GP  | M0  | — | packages/core/test/render-session.test.ts, apps/web/e2e/budgets.spec.ts | done |
| REND-004 | Rhythm / slash notation                                                           | GP  | M2  | alphatab/guitarpro7/slash.gp                                | packages/core/test/track-staves.test.ts, apps/web/e2e/track-staves.spec.ts | done |
| REND-005 | Numbered (jianpu) notation                                                        | GP  | M2  | —                                                           | packages/core/test/track-staves.test.ts, apps/web/e2e/track-staves.spec.ts | done |
| REND-006 | Lead-sheet / chord-chart layout (chords over lyrics)                              | OT  | M5  | —                                                           | —    | planned |
| REND-007 | Up to 4 voices with correct stem directions and rest placement                    | GP  | M2  | —                                                           | —    | planned |
| REND-010 | Page layout on A4 paper                                                           | GP  | M0  | — | apps/web/src/score-view/pagination.test.ts | done |
| REND-011 | Page layout on US Letter paper                                                    | GP  | M0  | — | apps/web/src/score-view/pagination.test.ts | done |
| REND-012 | Custom paper size and margins                                                     | GP  | M2  | —                                                           | apps/web/e2e/page-setup.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-013 | Horizontal (continuous) layout                                                    | GP  | M0  | — | packages/core/test/render-session.test.ts | done |
| REND-014 | Vertical scroll layout                                                            | GP  | M0  | — | apps/web/e2e/open.spec.ts | done |
| REND-015 | Zoom 25–400 %                                                                     | GP  | M0  | — | apps/web/e2e/app.spec.ts | done |
| REND-016 | Respect the file's own systems layout (bars per system, bar proportions)          | GP  | M0  | — | packages/core/test/render-session.test.ts | done |
| REND-017 | HiDPI-crisp vector rendering                                                      | GP  | M0  | — | packages/core/test/render-session.test.ts | done |
| REND-018 | Smooth reflow on window resize                                                    | GP  | M0  | — | apps/web/e2e/open.spec.ts, packages/core/test/render-session.test.ts | done |
| REND-019 | Virtualized rendering: only visible systems are painted and attached              | OT  | M0  | — | apps/web/e2e/open.spec.ts, apps/web/src/score-view/svg-cache.test.ts | done |
| REND-020 | Notation layout and rendering in a Web Worker                                     | OT  | M0  | — | packages/core/test/shared-isolation.test.ts, scripts/check-budgets.ts | done |
| REND-021 | Instant theme switch of rendered notation (no re-render)                          | OT  | M0  | — | packages/core/test/score-colors.test.ts, packages/core/test/render-session.test.ts | done |
| REND-022 | Text marks (tempo, section names, effect texts) never run into other text | OT | M0 | alphatex/rendering/text-collisions.atex | apps/web/e2e/engraving.spec.ts | done |
| REND-030 | Show all tracks or any subset of tracks                                           | GP  | M0  | alphatex/demos/twelve-bar-shuffle.atex | packages/core/test/render-content.test.ts | done |
| REND-031 | Per-track staff visibility (standard / tab / slash / numbered)                    | GP  | M2  | —                                                           | packages/core/test/track-staves.test.ts, apps/web/e2e/track-staves.spec.ts | done |
| REND-032 | Transposing instruments: concert vs written pitch display                         | GP  | M2  | alphatab/guitarpro8/transposition-tonality-a.gp | packages/core/test/notation-toggles.test.ts, apps/web/e2e/notation-toggles.spec.ts | done |
| REND-033 | Capo display                                                                      | GP  | M2  | alphatex/views/fretboard.atex | packages/core/test/render-details.test.ts, apps/web/src/instrument-view/fretboard.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| REND-034 | Tuning display (score header)                                                     | GP  | M0  | alphatex/demos/twelve-bar-shuffle.atex | packages/core/test/render-content.test.ts | done |
| REND-035 | Track names and short names on systems                                            | GP  | M0  | alphatex/demos/twelve-bar-shuffle.atex | packages/core/test/render-content.test.ts | done |
| REND-036 | Track colours                                                                     | GP  | M2  | alphatab/guitarpro7/colors.gp                               | —    | planned |
| REND-040 | Score header: title, subtitle, artist, album, words, music, copyright, tab author | GP  | M0  | alphatex/demos/twelve-bar-shuffle.atex | packages/core/test/render-content.test.ts | done |
| REND-041 | Score header: instructions and notice                                             | GP  | M2  | —                                                           | —    | planned |
| REND-042 | Page header and footer (page numbers, title on following pages)                   | GP  | M0  | — | apps/web/e2e/app.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-100 | Bend (any amount, quarter-tone steps)                                             | GP  | M2  | alphatab/guitarpro7/bends.gp                                | packages/core/test/render-techniques.test.ts | done |
| REND-101 | Bend and release                                                                  | GP  | M2  | alphatab/guitarpro7/bends.gp                                | packages/core/test/render-techniques.test.ts | done |
| REND-102 | Bend, release, bend                                                               | GP  | M2  | — | packages/core/test/render-techniques.test.ts | done |
| REND-103 | Pre-bend                                                                          | GP  | M2  | alphatab/guitarpro7/bends.gp                                | packages/core/test/render-techniques.test.ts | done |
| REND-104 | Pre-bend and release                                                              | GP  | M2  | alphatab/guitarpro7/bends.gp                                | packages/core/test/render-techniques.test.ts | done |
| REND-105 | Pre-bend and bend                                                                 | GP  | M2  | alphatab/guitarpro7/bends-advanced.gp                       | packages/core/test/render-techniques.test.ts | done |
| REND-106 | Bend and hold                                                                     | GP  | M2  | alphatab/guitarpro7/bends-advanced.gp                       | packages/core/test/render-techniques.test.ts | done |
| REND-107 | Whammy bar: dive                                                                  | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | packages/core/test/render-techniques.test.ts | done |
| REND-108 | Whammy bar: dip                                                                   | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | packages/core/test/render-techniques.test.ts | done |
| REND-109 | Whammy bar: hold, return, pre-dive, pre-dive and dive                             | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | packages/core/test/render-techniques.test.ts | done |
| REND-110 | Legato slide                                                                      | GP  | M2  | alphatab/guitarpro7/slides.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-111 | Shift slide                                                                       | GP  | M2  | alphatab/guitarpro7/slides.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-112 | Slide into the note from below / from above                                       | GP  | M2  | alphatab/guitarpro7/slides.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-113 | Slide out of the note downwards / upwards                                         | GP  | M2  | alphatab/guitarpro7/slides.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-114 | Pick slide (scrape) up / down                                                     | GP  | M2  | alphatab/guitarpro7/pick-slide.gp                           | packages/core/test/render-techniques.test.ts | done |
| REND-115 | Hammer-on / pull-off with slur                                                    | GP  | M2  | alphatab/guitarpro7/hammer.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-116 | Left-hand tapping                                                                 | GP  | M2  | alphatab/guitarpro7/left-hand-tap.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-117 | Right-hand tapping                                                                | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-118 | Slap and pop                                                                      | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-119 | Natural harmonic                                                                  | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-120 | Artificial harmonic                                                               | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-121 | Pinch harmonic                                                                    | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-122 | Tapped harmonic                                                                   | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-123 | Semi harmonic                                                                     | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-124 | Feedback harmonic                                                                 | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-125 | Note vibrato, slight and wide                                                     | GP  | M2  | alphatab/guitarpro7/vibrato.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-126 | Beat (whammy) vibrato, slight and wide                                            | GP  | M2  | alphatab/guitarpro7/tremolo-vibrato.gp                      | packages/core/test/render-techniques.test.ts | done |
| REND-127 | Palm mute                                                                         | GP  | M2  | alphatab/guitarpro7/effects.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-128 | Let ring                                                                          | GP  | M2  | alphatab/guitarpro7/effects.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-129 | Dead (muted) notes                                                                | GP  | M2  | alphatab/guitarpro7/dead.gp                                 | packages/core/test/render-techniques.test.ts | done |
| REND-130 | Ghost notes                                                                       | GP  | M2  | alphatab/guitarpro7/effects.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-131 | Accent and heavy accent                                                           | GP  | M2  | alphatab/guitarpro7/accentuations.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-132 | Staccato and staccatissimo                                                        | GP  | M2  | alphatab/guitarpro7/accentuations.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-133 | Tenuto                                                                            | GP  | M2  | — | packages/core/test/render-techniques.test.ts | done |
| REND-134 | Grace notes (before and on the beat)                                              | GP  | M2  | alphatab/guitarpro7/grace.gp                                | packages/core/test/render-techniques.test.ts | done |
| REND-135 | Tremolo picking (8th / 16th / 32nd)                                               | GP  | M2  | alphatab/guitarpro7/tremolo.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-136 | Trills with speed                                                                 | GP  | M2  | alphatab/guitarpro7/trills.gp                               | packages/core/test/render-techniques.test.ts | done |
| REND-137 | Rasgueado                                                                         | GP  | M2  | —                                                           | packages/core/test/render-techniques.test.ts | done |
| REND-138 | Pick strokes (up / down)                                                          | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-139 | Brush strokes (up / down)                                                         | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-140 | Arpeggio (up / down)                                                              | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | packages/core/test/render-techniques.test.ts | done |
| REND-141 | Left-hand fingering                                                               | GP  | M2  | alphatab/guitarpro7/fingering.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-142 | Right-hand fingering (p i m a c)                                                  | GP  | M2  | alphatab/guitarpro7/fingering.gp                            | packages/core/test/render-techniques.test.ts | done |
| REND-143 | Dynamics ppp–fff                                                                  | GP  | M2  | —                                                           | packages/core/test/render-techniques.test.ts | done |
| REND-144 | Hairpins (crescendo / decrescendo)                                                | GP  | M2  | —                                                           | packages/core/test/render-techniques.test.ts | done |
| REND-145 | Fade in, fade out, volume swell                                                   | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | packages/core/test/render-techniques.test.ts | done |
| REND-146 | Ottava lines (8va, 8vb, 15ma, 15mb)                                               | GP  | M2  | alphatab/guitarpro7/ottavia.gp                              | packages/core/test/render-notation.test.ts | done |
| REND-147 | Tuplets of any ratio                                                              | GP  | M2  | alphatab/guitarpro7/tuplets.gp                              | packages/core/test/render-notation.test.ts | done |
| REND-148 | Nested tuplets                                                                    | GP  | M2  | —                                                           | —    | planned |
| REND-149 | Ties                                                                              | GP  | M2  | — | packages/core/test/render-notation.test.ts | done |
| REND-150 | Dotted and double-dotted durations                                                | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-151 | Rests of every duration, positioned per voice                                     | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-152 | Fermatas (short / medium / long)                                                  | GP  | M2  | alphatab/guitarpro7/fermata.gp                              | packages/core/test/render-notation.test.ts | done |
| REND-153 | Time signature changes, including common and cut time                             | GP  | M2  | alphatab/guitarpro7/time-signatures.gp                      | packages/core/test/render-notation.test.ts | done |
| REND-154 | Key signature changes (major and minor)                                           | GP  | M2  | alphatab/guitarpro7/key-signatures.gp                       | packages/core/test/render-notation.test.ts | done |
| REND-155 | Tempo changes and tempo text                                                      | GP  | M2  | alphatab/guitarpro8/beat-tempo-change.gp                    | packages/core/test/render-notation.test.ts | done |
| REND-156 | Tempo ramps (accelerando / ritardando)                                            | GP  | M2  | —                                                           | —    | planned |
| REND-157 | Swing / triplet-feel indicators                                                   | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-158 | Anacrusis (pickup bar)                                                            | GP  | M2  | alphatab/guitarpro7/anacrusis.gp                            | packages/core/test/render-details.test.ts | done |
| REND-159 | Free time                                                                         | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-160 | Repeats with play count                                                           | GP  | M2  | alphatab/guitarpro7/repeat-close-multi.gp                   | packages/core/test/render-notation.test.ts | done |
| REND-161 | Alternate endings                                                                 | GP  | M2  | alphatab/guitarpro7/repeat-close-alternate-endings.gp       | packages/core/test/render-notation.test.ts | done |
| REND-162 | Segno, Segno Segno, Coda, Double Coda symbols                                     | GP  | M2  | alphatab/guitarpro8/directions.gp                           | packages/core/test/render-notation.test.ts | done |
| REND-163 | Fine, To Coda, To Double Coda                                                     | GP  | M2  | alphatab/guitarpro8/directions.gp                           | packages/core/test/render-notation.test.ts | done |
| REND-164 | Every D.C. variant (D.C., al Fine, al Coda, al Double Coda)                       | GP  | M2  | alphatab/guitarpro8/directions.gp                           | packages/core/test/render-notation.test.ts | done |
| REND-165 | Every D.S. / D.S.S. variant (al Fine, al Coda, al Double Coda)                    | GP  | M2  | alphatab/guitarpro8/directions.gp                           | packages/core/test/render-notation.test.ts | done |
| REND-166 | Markers / sections                                                                | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-167 | Barline types (single, double, final, dashed, dotted, heavy, tick, short…)        | GP  | M2  | alphatab/guitarpro8/extended-barlines.gp                    | packages/core/test/render-details.test.ts | done |
| REND-168 | Text annotations on beats                                                         | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-169 | Chord names above the staff                                                       | GP  | M2  | alphatab/guitarpro7/chords.gp                               | packages/core/test/render-symbols.test.ts | done |
| REND-170 | Chord diagrams in the staff                                                       | GP  | M2  | alphatab/guitarpro8/show-diagrams-in-score.gp               | packages/core/test/render-symbols.test.ts | done |
| REND-171 | Chord diagram block at the top of the score                                       | GP  | M2  | alphatab/guitarpro8/hide-diagrams.gp                        | packages/core/test/render-symbols.test.ts | done |
| REND-172 | Multi-line lyrics with syllable alignment                                         | GP  | M2  | alphatab/guitarpro7/beat-lyrics.gp | packages/core/test/render-symbols.test.ts | done |
| REND-173 | Drum notation with correct noteheads and positions                                | GP  | M2  | alphatab/guitarpro5/percussion-all.gp5                      | packages/core/test/render-symbols.test.ts | done |
| REND-174 | Clefs (treble, bass, alto, tenor, neutral; octave clefs)                          | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-175 | Beaming modes and custom beaming                                                  | GP  | M2  | alphatab/guitarpro8/beaming-mode.gp | packages/core/test/beaming.test.ts | done |
| REND-176 | Multibar rests                                                                    | GP  | M2  | — | packages/core/test/render-symbols.test.ts | done |
| REND-177 | Simile marks (one and two bars)                                                   | GP  | M2  | alphatab/guitarpro7/simile-mark.gp                          | packages/core/test/render-symbols.test.ts | done |
| REND-178 | Golpe                                                                             | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-179 | Wah pedal open / closed                                                           | GP  | M2  | alphatab/guitarpro5/wah-wah.gp5                             | packages/core/test/render-symbols.test.ts | done |
| REND-180 | Sustain pedal                                                                     | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-181 | Barré indication                                                                  | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-182 | Ornaments (turns, mordents)                                                       | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-183 | Slurs                                                                             | GP  | M2  | —                                                           | packages/core/test/render-symbols.test.ts | done |
| REND-184 | Bar numbers (every bar / first of system / hidden)                                | GP  | M2  | alphatab/guitarpro8/barnumbers-all.gp                       | packages/core/test/render-symbols.test.ts | done |
| REND-185 | Beat timer (absolute time above beats)                                            | GP  | M2  | alphatab/guitarpro8/timer.gp                                | packages/core/test/render-symbols.test.ts | done |
| REND-300 | Note colouring by string                                                          | OT  | M2  | —                                                           | packages/core/test/note-colors.test.ts, apps/web/e2e/note-colors.spec.ts | done |
| REND-301 | Note colouring by interval                                                        | OT  | M2  | —                                                           | packages/core/test/note-colors.test.ts, apps/web/e2e/note-colors.spec.ts | done |
| REND-302 | Note colouring by scale degree                                                    | OT  | M2  | —                                                           | packages/core/test/note-colors.test.ts, apps/web/e2e/note-colors.spec.ts | done |
| REND-303 | Note colouring by chord tone                                                      | OT  | M2  | —                                                           | packages/core/test/note-colors.test.ts, apps/web/e2e/note-colors.spec.ts | done |
| REND-304 | Roman numeral analysis row                                                        | OT  | M5  | —                                                           | —    | planned |
| REND-305 | Nashville number row                                                              | OT  | M5  | —                                                           | —    | planned |
| REND-306 | Note names in tablature                                                           | OT  | M2  | —                                                           | packages/core/test/reading-aids.test.ts, apps/web/e2e/reading-aids.spec.ts | done |
| REND-307 | Microtonal accidentals                                                            | OT  | M5  | —                                                           | —    | planned |
| REND-308 | Per-note annotations                                                              | OT  | M5  | —                                                           | —    | planned |
| REND-309 | Comment layer                                                                     | OT  | M5  | —                                                           | —    | planned |
| REND-310 | Custom notation styling presets                                                   | OT  | M2  | —                                                           | apps/web/src/state/stylesheets.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-186 | Grand staff: two staves of one track joined by a brace                            | GP  | M2  | alphatex/views/keyboard.atex | packages/core/test/track-staves.test.ts | done |
| REND-187 | Partial capo display                                                              | GP  | M2  | —                                                           | —    | planned |
| REND-188 | "Let ring throughout" marking for tracks with automatic let ring                  | GP  | M2  | —                                                           | —    | planned |
| REND-189 | Note values from quadruple whole down to 256th                                    | GP+ | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-190 | Tablature for any pitched instrument (keyboards, voice, orchestral)               | GP  | M2  | —                                                           | —    | planned |
| REND-191 | Drum tablature labelled with MIDI note numbers                                    | GP  | M2  | —                                                           | —    | planned |
| REND-192 | Accidentals: sharp, flat, natural                                                 | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-193 | Double sharp and double flat                                                      | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-194 | Courtesy (bracketed) accidentals                                                  | GP  | M2  | —                                                           | —    | planned |
| REND-195 | Automatic accidentals from the key and earlier notes in the bar, including across ties | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-196 | Slash noteheads inside standard and drum staves, keeping the underlying pitches   | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-197 | Forced grouping of consecutive identical tuplets                                  | GP  | M2  | —                                                           | —    | planned |
| REND-198 | Stem directions forced in the file                                                | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-199 | Forced and prevented system breaks from the file                                  | GP  | M2  | —                                                           | —    | planned |
| REND-200 | Detached coda drawn apart from the main score, with a configurable gap            | GP  | M2  | —                                                           | —    | planned |
| REND-201 | Release of a bend begun on an earlier note                                        | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-202 | Whammy-bar amounts in quarter tones                                               | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-203 | Piano fingering (1–5) with collision avoidance                                    | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-204 | Circled string numbers on the standard staff                                      | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-205 | Dead slap                                                                         | GP  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-206 | Sound-change labels where sound automations fire (custom text)                    | GP  | M2  | —                                                           | —    | planned |
| REND-207 | Bracketed comments in lyrics are hidden in the score                              | GP  | M2  | alphatex/views/lyrics.atex | packages/core/test/notation-toggles.test.ts | done |
| REND-208 | Per-chord display toggles: name, diagram, fingering                               | GP  | M2  | —                                                           | —    | planned |
| REND-209 | Scale diagrams attached to beats (geometry, custom dots, grid spacing)            | GP  | M2  | —                                                           | —    | planned |
| REND-210 | Show or hide tempo-automation marks                                               | GP  | M2  | —                                                           | packages/core/test/notation-toggles.test.ts, apps/web/e2e/notation-toggles.spec.ts | done |
| REND-211 | Tempo marks against any beat unit (e.g. dotted quarter)                           | GP  | M2  | —                                                           | packages/core/test/render-notation.test.ts | done |
| REND-212 | Page layout with pages side by side, scrolling horizontally                       | GP  | M2  | —                                                           | apps/web/e2e/pages.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-213 | Page grid: as many pages per row as the window fits                               | GP  | M2  | —                                                           | apps/web/e2e/pages.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-214 | Continuous page-width layout without page breaks                                  | GP  | M2  | —                                                           | apps/web/e2e/pages.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-215 | Zoom range 10–800 % (presets, slider, keyboard, Ctrl/Cmd+wheel, pinch)            | GP  | M2  | —                                                           | apps/web/e2e/zoom.spec.ts, apps/web/e2e/app.spec.ts | done |
| REND-216 | Zoom to fit the page width                                                        | GP  | M2  | —                                                           | apps/web/e2e/zoom.spec.ts | done |
| REND-217 | Zoom to fit a whole page                                                          | GP  | M2  | —                                                           | apps/web/e2e/zoom.spec.ts | done |
| REND-218 | Stylesheet panel: per-document engraving options (page, systems, header/footer, text, notation), saved with the document | GP  | M2  | —                                                           | apps/web/e2e/stylesheet.spec.ts, apps/web/e2e/header-footer.spec.ts, packages/core/test/score-style.test.ts | done |
| REND-219 | Stylesheet settings stored in Guitar Pro files are honoured                       | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-220 | Stylesheet presets: bundled looks, user stylesheets, one chosen as the default for new documents | GP  | M2  | —                                                           | apps/web/src/state/stylesheets.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-221 | Stylesheet: paper-size presets (twelve formats) and custom sizes                  | GP  | M2  | —                                                           | apps/web/e2e/page-setup.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-222 | Stylesheet: portrait or landscape                                                 | GP  | M2  | —                                                           | apps/web/e2e/page-setup.spec.ts, apps/web/src/score-view/pagination.test.ts | done |
| REND-223 | Stylesheet: overall score scale, optionally keeping text and diagram sizes        | GP  | M2  | —                                                           | —    | planned |
| REND-224 | Stylesheet: rhythmic spacing factor                                               | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-225 | Stylesheet: tuning legend (show, position, detail level, layout, frame)           | GP  | M2  | —                                                           | —    | planned |
| REND-226 | Stylesheet: chord-symbol spelling (classic, jazz, rock)                           | GP  | M2  | —                                                           | packages/core/test/chord-spelling.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-227 | Stylesheet: chord-diagram placement (top grid, in score, both), size and spacing  | GP  | M2  | —                                                           | —    | planned |
| REND-228 | Stylesheet: staff-line thickness, system spacing, first-system indent             | GP  | M2  | —                                                           | —    | planned |
| REND-229 | Stylesheet: slash-notation staff lines, barlines, and fret/string for single notes | GP  | M2  | —                                                           | —    | planned |
| REND-230 | Stylesheet: barlines drawn through all staves of a system                         | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-231 | Stylesheet: repeat clef and time signature on every system or at sections         | GP  | M2  | —                                                           | —    | planned |
| REND-232 | Stylesheet: capo and tuning reflected in standard notation (sounding pitch) or not | GP  | M2  | —                                                           | —    | planned |
| REND-233 | Stylesheet: staff brackets (none, tab with its staff, similar instruments)        | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-234 | Stylesheet: system separator mark                                                 | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-235 | Stylesheet: track names (placement, single/multi-track, full or short, orientation) | GP  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-236 | Stylesheet: header/footer tokens for every score field, page number and page count | GP  | M2  | —                                                           | packages/core/test/page-text.test.ts, packages/core/test/title-block.test.ts, apps/web/e2e/header-footer.spec.ts | done |
| REND-237 | Stylesheet: header/footer element formatting (visibility, prefix label, font, size, style, alignment), separate set for later pages | GP  | M2  | —                                                           | packages/core/test/text-fonts.test.ts, apps/web/e2e/header-footer.spec.ts | done |
| REND-238 | Stylesheet: font, size and style for every text element                           | GP  | M2  | —                                                           | packages/core/test/text-fonts.test.ts, apps/web/e2e/header-footer.spec.ts | done |
| REND-239 | Stylesheet: lyrics above, below or hidden                                         | GP  | M2  | —                                                           | —    | planned |
| REND-240 | Stylesheet: tempo decimals shown or hidden                                        | GP  | M2  | —                                                           | —    | planned |
| REND-241 | Stylesheet: music font (engraved or handwritten; any SMuFL font)                  | GP+ | M2  | —                                                           | —    | planned |
| REND-242 | Stylesheet: rename printed technique labels                                       | GP  | M2  | —                                                           | —    | planned |
| REND-243 | Stylesheet: technique extension lines continue across rests                       | GP  | M2  | —                                                           | —    | planned |
| REND-244 | Stylesheet: rhythm in tablature (stems in the tab, hidden when the staff shows, per-voice above/below/none) | GP  | M2  | —                                                           | —    | planned |
| REND-245 | Stylesheet: beams across tab rests, circled half and whole notes in tab           | GP  | M2  | —                                                           | —    | planned |
| REND-246 | Stylesheet: flat beams on standard and drum staves                                | GP  | M2  | —                                                           | —    | planned |
| REND-247 | Stylesheet: artificial-harmonic tab display (touch fret, octave dot)              | GP  | M2  | —                                                           | —    | planned |
| REND-248 | Stylesheet: notation toggles (C and cut-C, bent pitch in the staff, extra rests, dynamics, tuplet brackets) | GP  | M2  | —                                                           | —    | planned |
| REND-249 | Stylesheet: technique toggles (arpeggio arrowheads, trill auxiliary note, slide label) | GP  | M2  | —                                                           | —    | planned |
| REND-250 | Stylesheet: tablature toggles (repeat tied frets, dashed quarter rests, coloured frets for voices 2–4) | GP  | M2  | —                                                           | —    | planned |
| REND-251 | Stylesheet: hammer-on/pull-off display (H/P letters, collision avoidance, outer-note slurs, one slur per group) | GP  | M2  | —                                                           | —    | planned |
| REND-252 | Stylesheet: fingering display (left- and right-hand label sets, position on staff and tab, size) | GP  | M2  | —                                                           | —    | planned |
| REND-311 | Multi-bar rests in multi-track views and per-part printing                        | OT  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |
| REND-312 | Extended dynamics: pppp–ffffff, sf, sfz, sffz, fp, rf, rfz, niente                | OT  | M2  | —                                                           | packages/core/test/render-details.test.ts | done |
| REND-313 | Lyrics on any staff, any number of verses, per-verse styling                      | OT  | M5  | —                                                           | —    | planned |
| REND-314 | Left-handed (mirrored) chord and scale diagrams                                   | OT  | M2  | —                                                           | —    | planned |
| REND-315 | Inverted tablature string order (lowest string on top)                            | OT  | M2  | —                                                           | —    | planned |
| REND-316 | Colour-blind-safe palettes and custom string colours                              | OT  | M2  | —                                                           | packages/core/test/note-colors.test.ts, apps/web/e2e/note-colors.spec.ts | done |
| REND-317 | Beat counts written above notes (1 e & a)                                         | OT  | M2  | —                                                           | packages/core/test/reading-aids.test.ts, apps/web/e2e/reading-aids.spec.ts | done |
| REND-318 | Percussion legend for drum staves                                                 | OT  | M2  | —                                                           | —    | planned |
| REND-319 | Unfolded view: repeats and jumps written out in performance order                 | OT  | M2  | —                                                           | —    | planned |
| REND-320 | Hide staves that rest for a whole system                                          | OT  | M2  | —                                                           | packages/core/test/score-style.test.ts, apps/web/e2e/stylesheet.spec.ts | done |

## Playback

| ID       | Feature                                               | Src | M   | Fixture                                               | Test | Status  |
| -------- | ----------------------------------------------------- | --- | --- | ----------------------------------------------------- | ---- | ------- |
| PLAY-001 | Play / pause / stop                                   | GP  | M1  | — | apps/web/e2e/playback.spec.ts, apps/web/src/audio/transport-machine.test.ts | done |
| PLAY-002 | Click any beat to seek                                | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-003 | Bar stepping (previous / next bar)                    | GP  | M1  | — | apps/web/e2e/practice.spec.ts, apps/web/src/app/keymap.test.ts | done |
| PLAY-004 | Jump to section                                       | GP  | M1  | — | apps/web/e2e/practice.spec.ts, apps/web/src/app/keymap.test.ts | done |
| PLAY-005 | Go to bar                                             | GP  | M1  | — | apps/web/e2e/practice.spec.ts | done |
| PLAY-006 | Mini-map / timeline scrubber                          | OT  | M1  | —                                                     | apps/web/e2e/song-map.spec.ts | done |
| PLAY-007 | Tap tempo                                             | OT  | M1  | —                                                     | apps/web/e2e/practice.spec.ts, apps/web/e2e/metronome.spec.ts, apps/web/src/state/practice.test.ts | done |
| PLAY-008 | Keyboard shortcuts for every transport action         | GP  | M1  | — | apps/web/src/app/keymap.test.ts, apps/web/src/app/shortcuts-doc.test.ts, apps/web/e2e/practice.spec.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-009 | A sound engine that cannot start or load says why and can be retried (never loads forever) | OT | M1 | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-010 | Beat cursor                                           | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-011 | Bar highlight                                         | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-012 | Note highlighting                                     | OT  | M1  | —                                                     | apps/web/src/state/preferences.test.ts, apps/web/e2e/follow.spec.ts | done |
| PLAY-013 | Auto-scroll: continuous                               | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-014 | Auto-scroll: page flip                                | GP  | M1  | —                                                     | apps/web/e2e/follow.spec.ts | done |
| PLAY-015 | Auto-scroll: off                                      | GP  | M1  | —                                                     | apps/web/e2e/follow.spec.ts | done |
| PLAY-016 | Configurable auto-scroll offset                       | OT  | M1  | —                                                     | apps/web/e2e/follow.spec.ts | done |
| PLAY-017 | Cursor and auto-scroll work in every layout           | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-020 | Repeat traversal identical to Guitar Pro              | GP  | M1  | alphatab/guitarpro7/repeat-close-multi.gp             | packages/core/test/playback-traversal.test.ts | done |
| PLAY-021 | Alternate-ending traversal                            | GP  | M1  | alphatab/guitarpro7/repeat-close-alternate-endings.gp | packages/core/test/playback-traversal.test.ts | done |
| PLAY-022 | Direction traversal (D.C., D.S., Coda, Fine variants) | GP  | M1  | alphatab/guitarpro8/directions.gp                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-023 | Full tempo map including ramps                        | GP  | M1  | —                                                     | packages/core/test/playback-tempo-dynamics.test.ts, packages/core/test/playback-realism.test.ts | done |
| PLAY-024 | Dynamics affect velocity                              | GP  | M1  | —                                                     | packages/core/test/playback-tempo-dynamics.test.ts | done |
| PLAY-025 | Volume and pan automation                             | GP  | M1  | —                                                     | packages/core/test/playback-tempo-dynamics.test.ts | done |
| PLAY-030 | Audible bends as pitch-bend curves                    | GP  | M1  | alphatab/guitarpro7/bends.gp                          | packages/core/test/playback-pitch-effects.test.ts | done |
| PLAY-031 | Audible vibrato                                       | GP  | M1  | —                                                     | packages/core/test/playback-pitch-effects.test.ts | done |
| PLAY-032 | Audible slides                                        | GP  | M1  | —                                                     | packages/core/test/playback-pitch-effects.test.ts | done |
| PLAY-033 | Audible hammer-ons / pull-offs                        | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-034 | Harmonics sound at the correct pitch                  | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-035 | Audible palm mute                                     | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-036 | Audible let ring                                      | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-037 | Audible dead notes                                    | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-038 | Audible tremolo picking                               | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts, packages/core/test/playback-realism.test.ts | done |
| PLAY-039 | Audible trills                                        | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-040 | Audible slap / pop                                    | GP  | M1  | —                                                     | packages/core/test/playback-channels.test.ts, apps/web/src/state/track-channels.test.ts | done |
| PLAY-041 | Audible grace notes                                   | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-042 | Audible staccato                                      | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-043 | Audible fades and swells                              | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts, packages/core/test/playback-realism.test.ts | done |
| PLAY-044 | Audible whammy bar                                    | GP  | M1  | —                                                     | packages/core/test/playback-pitch-effects.test.ts | done |
| PLAY-050 | Mixer: per-track volume                               | GP  | M1  | — | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-051 | Mixer: per-track pan                                  | GP  | M1  | —                                                     | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-052 | Mixer: mute                                           | GP  | M1  | — | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-053 | Mixer: solo                                           | GP  | M1  | — | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-054 | Mixer: program and bank                               | GP  | M1  | —                                                     | packages/audio/test/render-offline.test.ts, apps/web/src/audio/soundfont-presets.test.ts, apps/web/e2e/style.spec.ts | done |
| PLAY-055 | Mixer: playback transpose                             | GP  | M1  | —                                                     | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-056 | Practice mode: mute my track                          | OT  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| PLAY-057 | Master volume                                         | GP  | M1  | — | packages/audio/test/render-offline.test.ts | done |
| PLAY-058 | Mixer state persisted per song                        | OT  | M1  | —                                                     | apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-060 | Buses and sends                                       | OT  | M7  | —                                                     | —    | planned |
| PLAY-061 | Automation lanes                                      | GP  | M7  | —                                                     | —    | planned |
| PLAY-062 | Per-track EQ with spectrum analyzer                   | GP  | M7  | —                                                     | —    | planned |
| PLAY-063 | Master limiter                                        | OT  | M7  | —                                                     | —    | planned |
| PLAY-064 | Stereo width                                          | OT  | M7  | —                                                     | —    | planned |
| PLAY-065 | Humanize (timing / velocity)                          | OT  | M7  | —                                                     | —    | planned |
| PLAY-066 | Groove templates                                      | OT  | M7  | —                                                     | —    | planned |
| PLAY-070 | Web MIDI output to external synths                    | OT  | M7  | —                                                     | —    | planned |
| PLAY-071 | Position display: bar, beat, time signature and live tempo including automation | GP  | M1  | — | apps/web/e2e/practice.spec.ts | done |
| PLAY-072 | Manual scrolling pauses auto-scroll; a Resume button re-attaches the view to the cursor | GP  | M1  | —                                                     | apps/web/e2e/follow.spec.ts | done |
| PLAY-073 | Audible stepping: move beat by beat and hear each one without starting playback | GP  | M1  | — | packages/core/test/engine-host.test.ts, packages/audio/test/render-offline.test.ts, apps/web/e2e/practice.spec.ts | done |
| PLAY-074 | Cursor styles: none, smooth, jump per note, jump per metronome beat | GP  | M1  | —                                                     | apps/web/e2e/follow.spec.ts | done |
| PLAY-075 | Elapsed and total time display in score time, unaffected by practice speed | GP  | M1  | — | apps/web/e2e/practice.spec.ts | done |
| PLAY-076 | Playback detune in cents                              | GP  | M1  | —                                                     | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-077 | Focus/unfocus: boost or duck the active track against the rest | GP  | M1  | —                                                     | apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/playback.spec.ts | done |
| PLAY-078 | Master pan (balance)                                  | GP  | M1  | —                                                     | apps/web/e2e/playback.spec.ts | done |
| PLAY-079 | Audible accents and heavy accents                     | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-080 | Audible ghost notes                                   | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-081 | Fermatas (short, medium, long) hold time in playback  | GP  | M1  | —                                                     | packages/core/test/playback-realism.test.ts | done |
| PLAY-082 | Hairpins ramp velocity toward the next dynamic        | GP  | M1  | —                                                     | packages/core/test/playback-realism.test.ts | done |
| PLAY-083 | Feel playback: 8th triplet feel                       | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-084 | Feel playback: 16th triplet feel                      | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-085 | Feel playback: dotted 8th feel                        | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-086 | Feel playback: dotted 16th feel                       | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-087 | Feel playback: Scottish (reverse-dotted) 8th feel     | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-088 | Feel playback: Scottish 16th feel                     | GP  | M1  | —                                                     | packages/core/test/playback-feel.test.ts | done |
| PLAY-089 | Ottava lines and octave clefs sound at the right octave | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-090 | One- and two-bar simile marks play the repeated bars  | GP  | M1  | —                                                     | packages/core/test/playback-articulations.test.ts | done |
| PLAY-091 | Audible brush strokes and arpeggios honouring their duration and spread | GP  | M1  | —                                                     | packages/core/test/playback-strokes.test.ts | done |
| PLAY-092 | Audible rasgueado, all 18 patterns                    | GP  | M1  | —                                                     | packages/core/test/playback-strokes.test.ts | done |
| PLAY-093 | Audible mordents and turns, following the key         | GP  | M1  | —                                                     | packages/core/test/playback-realism.test.ts | done |
| PLAY-094 | Audible tapping (both hands) without a pick attack    | GP  | M1  | —                                                     | packages/core/test/playback-realism.test.ts | done |
| PLAY-095 | Audible golpe (finger and thumb)                      | GP  | M1  | —                                                     | packages/core/test/playback-channels.test.ts, apps/web/src/state/track-channels.test.ts | done |
| PLAY-096 | Sustain pedal (down, hold, up) holds notes in playback | GP  | M1  | —                                                     | packages/core/test/playback-realism.test.ts | done |
| PLAY-097 | Bend timing styles: as drawn, spread over the beat, fast before the next note | GP  | M1  | —                                                     | packages/core/test/playback-pitch-effects.test.ts | done |
| PLAY-098 | Simultaneous bends on different strings play independently (one channel per string) | GP  | M1  | —                                                     | packages/core/test/playback-pitch-effects.test.ts, packages/core/test/playback-channels.test.ts | done |
| PLAY-099 | Decimal tempos and tempos below 30 BPM                | GP  | M1  | —                                                     | packages/core/test/playback-tempo-dynamics.test.ts | done |
| PLAY-100 | Traversal: Da Capo, landing after a pickup bar        | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-101 | Traversal: D.C. al Coda                               | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-102 | Traversal: D.C. al Double Coda                        | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-103 | Traversal: D.C. al Fine                               | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-104 | Traversal: Dal Segno, firing on the last pass inside a repeat | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-105 | Traversal: D.S. al Coda                               | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-106 | Traversal: D.S. al Double Coda                        | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-107 | Traversal: D.S. al Fine                               | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-108 | Traversal: Dal Segno Segno                            | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-109 | Traversal: D.S.S. al Coda                             | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-110 | Traversal: D.S.S. al Double Coda                      | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-111 | Traversal: D.S.S. al Fine                             | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-112 | Traversal: To Coda, firing on the first pass inside a repeat and armed by an "al Coda" jump | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-113 | Traversal: To Double Coda                             | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-114 | Traversal: Fine ends playback only after a jump       | GP  | M1  | —                                                     | packages/core/test/playback-traversal.test.ts | done |
| PLAY-115 | Track interpretation: automatic let ring              | GP  | M1  | —                                                     | packages/core/test/playback-interpretation.test.ts, apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/style.spec.ts | done |
| PLAY-116 | Track interpretation: automatic brush on chords       | GP  | M1  | —                                                     | packages/core/test/playback-interpretation.test.ts, apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/style.spec.ts | done |
| PLAY-117 | Track interpretation: palm-mute intensity             | GP  | M1  | —                                                     | packages/core/test/playback-interpretation.test.ts, apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/style.spec.ts | done |
| PLAY-118 | Track interpretation: accentuation of strong beats    | GP  | M1  | —                                                     | packages/core/test/playback-interpretation.test.ts, apps/web/src/state/mixer-memory.test.ts, apps/web/e2e/style.spec.ts | done |
| PLAY-119 | Per-note audio settings (length, timing offset, velocity), including grace notes | GP  | M7  | —                                                     | —    | planned |
| PLAY-120 | Automation editor: points snapped to beats or bars, drag, delete, clear, text labels | GP  | M7  | —                                                     | —    | planned |
| PLAY-121 | Automation points either hold (step) or ramp to the next | GP  | M7  | —                                                     | —    | planned |
| PLAY-122 | Automation: track volume                              | GP  | M7  | —                                                     | —    | planned |
| PLAY-123 | Automation: track pan                                 | GP  | M7  | —                                                     | —    | planned |
| PLAY-124 | Automation: master volume                             | GP  | M7  | —                                                     | —    | planned |
| PLAY-125 | Automation: master pan                                | GP  | M7  | —                                                     | —    | planned |
| PLAY-126 | Automation: sound change                              | GP  | M7  | —                                                     | —    | planned |
| PLAY-127 | Per-track automation on/off switches                  | GP  | M7  | —                                                     | —    | planned |
| PLAY-128 | Level meters per track and on the master              | GP+ | M7  | —                                                     | —    | planned |
| PLAY-129 | Drum mix: per-piece volume, pan, mute and solo; kit mono or stereo | GP  | M7  | —                                                     | —    | planned |
| PLAY-130 | Per-track MIDI port and channel routing (one or two channels, percussion on channel 10) | GP  | M7  | —                                                     | —    | planned |
| PLAY-131 | Up to four MIDI output ports, each testable           | GP  | M7  | —                                                     | —    | planned |
| PLAY-132 | MIDI output latency compensation                      | GP  | M7  | —                                                     | —    | planned |
| PLAY-133 | Play a connected MIDI keyboard live through the built-in sounds | GP  | M7  | —                                                     | —    | planned |
| PLAY-134 | Audible pick scrape and dead slap                     | OT  | M7  | —                                                     | —    | planned |
| PLAY-135 | Wah open/closed marks drive an auto-wah sweep         | OT  | M7  | —                                                     | —    | planned |
| PLAY-136 | Choice of colour and style for the cursor and bar highlight | OT  | M1  | —                                                     | apps/web/src/state/preferences.test.ts, apps/web/e2e/follow.spec.ts | done |
| PLAY-137 | Track autoswitch: the view follows another part while yours rests | OT  | M6  | —                                                     | —    | planned |

## Practice and performance

| ID       | Feature                                                         | Src | M   | Fixture                               | Test | Status  |
| -------- | --------------------------------------------------------------- | --- | --- | ------------------------------------- | ---- | ------- |
| PRAC-001 | Metronome: BPM and tap tempo                                    | GP  | M1  | —                                     | apps/web/e2e/metronome.spec.ts, apps/web/src/state/practice.test.ts, packages/audio/test/practice-audio.test.ts | done |
| PRAC-002 | Metronome: subdivisions                                         | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-003 | Metronome: accent patterns                                      | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-004 | Metronome: programmable patterns                                | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, apps/web/src/state/practice.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-005 | Metronome: polyrhythms                                          | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, packages/audio/test/practice-audio.test.ts | done |
| PRAC-006 | Metronome: swing amount                                         | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, packages/audio/test/practice-audio.test.ts | done |
| PRAC-007 | Metronome: multiple click sounds                                | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-008 | Metronome: visual conductor / flash                             | OT  | M1  | —                                     | apps/web/e2e/metronome.spec.ts | done |
| PRAC-009 | Metronome: random beat-drop training                            | OT  | M1  | —                                     | packages/audio/test/metronome.test.ts, packages/audio/test/practice-audio.test.ts | done |
| PRAC-010 | Metronome-only page usable without a song                       | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-011 | Count-in of 1–2 bars, audible and visual                        | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts, packages/audio/test/metronome.test.ts | done |
| PRAC-020 | Speed 10–300 % without pitch change                             | GP+ | M1  | — | apps/web/e2e/practice.spec.ts, packages/audio/test/render-offline.test.ts, packages/audio/test/practice-audio.test.ts | done |
| PRAC-021 | Fine-grained speed steps                                        | GP  | M1  | — | apps/web/e2e/practice.spec.ts | done |
| PRAC-022 | Progressive speed trainer (start %, step per loop, target %)    | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, packages/audio/test/trainer.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-023 | Per-section target tempos                                       | OT  | M6  | —                                     | —    | planned |
| PRAC-024 | Auto-slowdown of trouble bars (tempo-map override)              | OT  | M6  | —                                     | —    | planned |
| PRAC-030 | Loop a bar or beat range                                        | GP  | M1  | — | apps/web/e2e/playback.spec.ts, packages/audio/test/render-offline.test.ts | done |
| PRAC-031 | A/B loop points                                                 | OT  | M1  | — | apps/web/e2e/playback.spec.ts, apps/web/e2e/mobile.spec.ts | done |
| PRAC-032 | Multiple named saved loops per song                             | OT  | M6  | —                                     | —    | planned |
| PRAC-033 | Loop playlists with auto-advance                                | OT  | M6  | —                                     | —    | planned |
| PRAC-034 | Loop count                                                      | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-035 | Rest bars between loops                                         | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-040 | Play-along with microphone / audio interface input              | OT  | M6  | —                                     | —    | planned |
| PRAC-041 | Real-time pitch detection                                       | OT  | M6  | —                                     | —    | planned |
| PRAC-042 | Note-by-note feedback on fretboard and score                    | OT  | M6  | —                                     | —    | planned |
| PRAC-043 | Accuracy and timing scoring                                     | OT  | M6  | —                                     | —    | planned |
| PRAC-044 | Difficulty heatmap per bar from attempts                        | OT  | M6  | —                                     | —    | planned |
| PRAC-045 | Automatic trouble-spot detection with suggested loops           | OT  | M6  | —                                     | —    | planned |
| PRAC-050 | Sight-reading mode (hide tab)                                   | OT  | M6  | —                                     | —    | planned |
| PRAC-051 | Fading tab (hints disappear as accuracy rises)                  | OT  | M6  | —                                     | —    | planned |
| PRAC-052 | Call-and-response mode                                          | OT  | M6  | —                                     | —    | planned |
| PRAC-053 | Per-string isolation                                            | OT  | M6  | —                                     | —    | planned |
| PRAC-054 | Per-hand isolation                                              | OT  | M6  | —                                     | —    | planned |
| PRAC-060 | Practice journal: time per song and section                     | OT  | M6  | —                                     | —    | planned |
| PRAC-061 | Practice history                                                | OT  | M6  | —                                     | —    | planned |
| PRAC-062 | Practice streaks                                                | OT  | M6  | —                                     | —    | planned |
| PRAC-063 | Spaced-repetition queue of hard sections                        | OT  | M6  | —                                     | —    | planned |
| PRAC-070 | Setlists with auto-advance                                      | OT  | M6  | —                                     | —    | planned |
| PRAC-071 | Bluetooth page-turner support (keyboard events)                 | OT  | M6  | —                                     | —    | planned |
| PRAC-072 | Live mode: huge fonts and stage-dark theme                      | OT  | M6  | —                                     | —    | planned |
| PRAC-073 | Auto-scroll at tempo with sound off                             | OT  | M6  | —                                     | —    | planned |
| PRAC-080 | Live amp sim: monitor your instrument through the effects chain | GP+ | M6  | —                                     | —    | planned |
| PRAC-090 | Audio track: load the original recording                        | GP  | M6  | alphatab/audio/syncpoints-testfile.gp | —    | planned |
| PRAC-091 | Audio track: beat-sync to the score                             | GP  | M6  | alphatab/audio/syncpoints-testfile.gp | —    | planned |
| PRAC-092 | Audio track: time-stretch and pitch-shift with tempo/transpose  | GP+ | M6  | —                                     | —    | planned |
| PRAC-093 | Audio track: A/B between synth and recording                    | OT  | M6  | —                                     | —    | planned |
| PRAC-100 | Tuner: microphone pitch detection (YIN / MPM)                   | GP  | M2  | —                                     | packages/audio/test/pitch.test.ts, apps/web/e2e/tuner.spec.ts | done |
| PRAC-101 | Tuner: cents readout                                            | GP  | M2  | —                                     | packages/audio/test/pitch.test.ts, apps/web/e2e/tuner.spec.ts | done |
| PRAC-102 | Tuner follows the track's tuning (drop / open / custom)         | GP+ | M2  | —                                     | packages/audio/test/pitch.test.ts, apps/web/e2e/tuner.spec.ts | done |
| PRAC-103 | Fixed-tempo practice: one BPM ignoring tempo changes (presets, 10–300 BPM) | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/practice.spec.ts | done |
| PRAC-104 | Speed presets (25–100 %) with one-tap half speed                | GP+ | M1  | — | apps/web/e2e/practice.spec.ts | done |
| PRAC-105 | Speed trainer: number of passes at each step                    | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, packages/audio/test/trainer.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-106 | Metronome volume; zero gives a silent visual metronome          | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts | done |
| PRAC-107 | Count-in before every loop pass                                 | GP  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, apps/web/e2e/metronome.spec.ts | done |
| PRAC-108 | Keyboard loop control: toggle, resize, jump to the loop start   | GP+ | M1  | — | apps/web/e2e/practice.spec.ts, apps/web/e2e/playback.spec.ts, apps/web/src/app/keymap.test.ts | done |
| PRAC-109 | Loop range entered by bar numbers                               | OT  | M1  | —                                     | apps/web/src/score-view/timeline-lookup.test.ts, apps/web/e2e/practice.spec.ts | done |
| PRAC-110 | Separate count-in and click volumes; click at half or double the beat | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, packages/audio/test/metronome.test.ts | done |
| PRAC-111 | Count-in fitted to the start point: a full bar of the meter, extra beats mid-bar or on a pickup | OT  | M1  | —                                     | packages/audio/test/practice-audio.test.ts, packages/audio/test/metronome.test.ts | done |
| PRAC-112 | Polyphonic tuner: every string from one strum, per-string cents, click a string for single mode | GP  | M6  | —                                     | —    | planned |
| PRAC-113 | Tuner reference pitch (A4 calibration)                          | OT  | M2  | —                                     | packages/audio/test/pitch.test.ts, apps/web/src/state/practice.test.ts, apps/web/e2e/tuner.spec.ts | done |
| PRAC-114 | Tuner chromatic and strobe modes                                | OT  | M2  | —                                     | packages/audio/test/pitch.test.ts, apps/web/src/state/practice.test.ts, apps/web/e2e/tuner.spec.ts | done |
| PRAC-115 | Tuner alternative temperaments                                  | OT  | S   | —                                     | —    | planned |
| PRAC-116 | Foot-pedal command mapping (USB HID, MIDI pedals, Bluetooth page turners) | GP+ | M6  | —                                     | —    | planned |
| PRAC-117 | Audio-track formats: MP3, M4A/AAC, WAV, FLAC, AIFF, OGG         | GP  | M6  | —                                     | —    | planned |
| PRAC-118 | Audio-track panel: show or hide, bypass, replace or remove the file | GP  | M6  | —                                     | —    | planned |
| PRAC-119 | Waveform overlaid with the score's bar and beat grid and bar numbers | GP  | M6  | —                                     | —    | planned |
| PRAC-120 | Time ruler and bar blocks under the waveform; drag to select bars | GP  | M6  | —                                     | —    | planned |
| PRAC-121 | Playable zone with start and end brackets; add bars beyond it   | GP  | M6  | —                                     | —    | planned |
| PRAC-122 | Audio start offset aligning bar 1 (drag, reset)                 | GP  | M6  | —                                     | —    | planned |
| PRAC-123 | Sync-point editing: add, drag, remove, clear all; local tempo recomputed | GP  | M6  | —                                     | —    | planned |
| PRAC-124 | Convert sync points to tempo automation and back                | GP  | M6  | —                                     | —    | planned |
| PRAC-125 | Audio-track fine tuning in cents                                | GP  | M6  | —                                     | —    | planned |
| PRAC-126 | Audio-track frequency filters (presets that bring out bass, mid or treble) | GP  | M6  | —                                     | —    | planned |
| PRAC-127 | Audio-track mixer strip: volume, pan, EQ, mute, solo            | GP  | M6  | —                                     | —    | planned |
| PRAC-128 | Waveform zoom                                                   | GP  | M6  | —                                     | —    | planned |
| PRAC-129 | Score selection mirrored on the waveform; press and hold a bar to play it, Shift to loop it | GP  | M6  | —                                     | —    | planned |
| PRAC-130 | Audio stored inside the document by default, or kept as a linked file | GP  | M6  | —                                     | —    | planned |
| PRAC-131 | Extract the embedded audio to a file                            | GP  | M6  | —                                     | —    | planned |
| PRAC-132 | Line-in input gain and monitor level                            | GP  | M6  | —                                     | —    | planned |
| PRAC-133 | Line-in effect-chain bypass                                     | GP  | M6  | —                                     | —    | planned |
| PRAC-134 | Line-in noise gate                                              | GP  | M6  | —                                     | —    | planned |
| PRAC-135 | Line-in limiter                                                 | GP  | M6  | —                                     | —    | planned |
| PRAC-136 | Live tone follows the score's sound changes at the cursor       | GP  | M6  | —                                     | —    | planned |
| PRAC-137 | Lock the live tone across tracks and documents                  | GP  | M6  | —                                     | —    | planned |
| PRAC-138 | Several recordings per piece, each synced, switchable           | OT  | M6  | —                                     | —    | planned |
| PRAC-139 | Audio track follows unfolded repeats and jumps                  | OT  | M6  | —                                     | —    | planned |
| PRAC-140 | Click the waveform to seek the score (two-way linking)          | OT  | M6  | —                                     | —    | planned |
| PRAC-141 | A/B loop points on the waveform                                 | GP+ | M6  | —                                     | —    | planned |
| PRAC-142 | Tap-to-sync: create sync points by tapping downbeats            | OT  | M6  | —                                     | —    | planned |
| PRAC-143 | Beat and tempo detection on the audio track with automatic sync points | OT  | M6  | —                                     | —    | planned |
| PRAC-144 | Metronome follows the synced recording's tempo drift            | OT  | M6  | —                                     | —    | planned |
| PRAC-145 | Audio-track channel tools: left, right, mono, centre (vocal) reduction | OT  | M6  | —                                     | —    | planned |
| PRAC-146 | Audio-track octave shift (up to three octaves) to hear low parts | OT  | M6  | —                                     | —    | planned |
| PRAC-147 | On-device stem separation of the audio track                    | OT  | S   | —                                     | —    | planned |
| PRAC-148 | Synced video panel (local file) beside the notation: resize, hide, dock | OT  | M6  | —                                     | —    | planned |
| PRAC-149 | Mirror the synced video for left-handed players                 | OT  | M6  | —                                     | —    | planned |
| PRAC-150 | Pitch step trainer: transpose by a step on each loop pass       | OT  | M6  | —                                     | —    | planned |
| PRAC-151 | Speed-trainer end action: hold the target, restart or stop      | OT  | M6  | —                                     | —    | planned |
| PRAC-152 | Adaptive tempo from play-along accuracy                         | OT  | M6  | —                                     | —    | planned |
| PRAC-153 | Adaptive difficulty with adjustable levelling speed             | OT  | S   | —                                     | —    | planned |
| PRAC-154 | Difficulty filters: hide chosen techniques or notes; per-section difficulty | OT  | M6  | —                                     | —    | planned |
| PRAC-155 | Wait mode: playback waits for the right note                    | OT  | M6  | —                                     | —    | planned |
| PRAC-156 | Adjustable error tolerance for pitch and timing                 | OT  | M6  | —                                     | —    | planned |
| PRAC-157 | Chord-change drills (changes per minute)                        | OT  | M6  | —                                     | —    | planned |
| PRAC-158 | Focus mode: show and play only the looped range                 | OT  | M6  | —                                     | —    | planned |
| PRAC-159 | Loop by dragging across lyric words                             | OT  | M6  | —                                     | —    | planned |
| PRAC-160 | Performance scoring: points, streak multiplier, stars per song  | OT  | M6  | —                                     | —    | planned |
| PRAC-161 | Chord trainer with live feedback                                | OT  | M6  | —                                     | —    | planned |
| PRAC-162 | Relaxed practice mode and scored performance mode               | OT  | M6  | —                                     | —    | planned |
| PRAC-163 | Mark a song or section as learned                               | OT  | M6  | —                                     | —    | planned |
| PRAC-164 | Record yourself (audio, optional video) over the practice track | OT  | M6  | —                                     | —    | planned |
| PRAC-165 | Practice paths and generated daily challenges, offline          | OT  | S   | —                                     | —    | planned |
| PRAC-166 | Fretboard and ear-training mini-games                           | OT  | S   | —                                     | —    | planned |
| PRAC-167 | Spectrum view with note guesses for the audio track             | OT  | M8  | —                                     | —    | planned |

## Views

| ID       | Feature                                                   | Src | M   | Fixture | Test | Status  |
| -------- | --------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| VIEW-001 | Virtual fretboard per track (any string count and tuning) | GP  | M1  | —       | packages/core/test/track-notes.test.ts, apps/web/src/instrument-view/fretboard.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| VIEW-002 | Fretboard: left-handed                                    | GP  | M1  | —       | apps/web/e2e/fretboard.spec.ts | done |
| VIEW-003 | Fretboard: current and upcoming notes                     | OT  | M1  | —       | apps/web/src/instrument-view/fretboard.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| VIEW-004 | Fretboard: interval / scale / CAGED overlays              | OT  | M5  | —       | —    | planned |
| VIEW-005 | Piano keyboard view                                       | GP  | M2  | —       | packages/core/test/track-notes.test.ts, apps/web/src/instrument-view/keyboard.test.ts, apps/web/e2e/keyboard.spec.ts | done |
| VIEW-006 | Drum pad view                                             | GP  | M2  | —       | packages/core/test/track-drums.test.ts, apps/web/src/instrument-view/drums.test.ts, apps/web/e2e/drums.spec.ts | done |
| VIEW-007 | Chord diagram panel                                       | GP  | M2  | —       | packages/core/test/track-chords.test.ts, apps/web/src/instrument-view/chords.test.ts, apps/web/e2e/chords.spec.ts | done |
| VIEW-008 | Scale diagrams                                            | GP  | M5  | —       | —    | planned |
| VIEW-009 | Note-name view                                            | OT  | M2  | —       | packages/core/test/reading-aids.test.ts, apps/web/e2e/reading-aids.spec.ts | done |
| VIEW-010 | Lyrics pane                                               | GP  | M2  | —       | packages/core/test/track-lyrics.test.ts, apps/web/src/instrument-view/lyrics.test.ts, apps/web/e2e/lyrics.spec.ts | done |
| VIEW-011 | Song info / notice page                                   | GP  | M2  | alphatex/views/lyrics.atex | apps/web/e2e/song-info.spec.ts | done |
| VIEW-012 | Section navigator                                         | OT  | M2  | —       | apps/web/e2e/practice.spec.ts, apps/web/e2e/song-map.spec.ts | done |
| VIEW-013 | Fullscreen / presentation mode                            | GP  | M2  | —       | apps/web/e2e/full-screen.spec.ts, apps/web/src/app/full-screen.test.ts | done |
| VIEW-014 | Shortcut cheat sheet                                      | OT  | M1  | — | apps/web/e2e/practice.spec.ts, apps/web/src/app/shortcuts-doc.test.ts | done |
| VIEW-015 | Song overview: one cell per bar per track with sections and bar numbers; click to jump, drag to select, click a track to make it the active one | GP  | M2  | alphatex/demos/twelve-bar-shuffle.atex | apps/web/e2e/overview.spec.ts, packages/core/test/score-overview.test.ts | done |
| VIEW-016 | Active-track switcher (dropdown, next/previous-track keys) | GP  | M1  | —       | apps/web/e2e/fretboard.spec.ts | done |
| VIEW-017 | Fretboard note-name labels: off, on hover, always (with octave) | GP+ | M1  | —       | apps/web/src/instrument-view/fretboard.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| VIEW-018 | Instrument views can show the whole current bar           | GP  | M1  | —       | apps/web/src/instrument-view/fretboard.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| VIEW-019 | Keyboard view greys keys outside the instrument's range   | GP  | M2  | —       | packages/core/test/track-notes.test.ts, apps/web/src/instrument-view/keyboard.test.ts, apps/web/e2e/keyboard.spec.ts | done |
| VIEW-020 | Drum view MIDI mode listing every kit sound, with a GM-only filter | GP  | M2  | —       | packages/core/test/track-drums.test.ts, apps/web/src/instrument-view/drums.test.ts, apps/web/e2e/drums.spec.ts | done |
| VIEW-021 | Drum view labels: never, on hover or always, with MIDI numbers; large labels | GP  | M2  | —       | packages/core/test/track-drums.test.ts, apps/web/src/instrument-view/drums.test.ts, apps/web/e2e/drums.spec.ts | done |
| VIEW-022 | Lyrics-only view with karaoke highlighting; click a word to seek | OT  | M2  | —       | packages/core/test/track-lyrics.test.ts, apps/web/src/instrument-view/lyrics.test.ts, apps/web/e2e/lyrics.spec.ts | done |
| VIEW-023 | Keyboard view split by hand (left, right, both)           | OT  | M2  | —       | packages/core/test/track-notes.test.ts, apps/web/src/instrument-view/keyboard.test.ts, apps/web/e2e/keyboard.spec.ts | done |
| VIEW-024 | Orchestral views: violin-family fingerboard, trumpet valves, trombone positions | OT  | S   | —       | —    | planned |
| VIEW-025 | Note highway (game-style scrolling lanes)                 | OT  | S   | —       | —    | planned |
| VIEW-026 | Bouncing-ball timing guide                                | OT  | M6  | —       | —    | planned |
| VIEW-027 | Next-chord preview with countdown                         | OT  | M2  | —       | packages/core/test/track-chords.test.ts, apps/web/src/instrument-view/chords.test.ts, apps/web/e2e/chords.spec.ts | done |

## Editor

| ID       | Feature                                                          | Src | M   | Fixture | Test | Status  |
| -------- | ---------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| EDIT-001 | UI-agnostic command layer (commands, inverses, serialization)    | OT  | M4  | —       | —    | planned |
| EDIT-002 | Note entry with the mouse on tablature                           | GP  | M4  | —       | —    | planned |
| EDIT-003 | Note entry with the mouse on standard notation                   | GP  | M4  | —       | —    | planned |
| EDIT-004 | Keyboard entry: fret numbers, duration keys, arrow navigation    | GP  | M4  | —       | —    | planned |
| EDIT-005 | Guitar Pro–compatible default shortcuts where sensible           | GP  | M4  | —       | —    | planned |
| EDIT-006 | MIDI keyboard step entry                                         | GP  | M4  | —       | —    | planned |
| EDIT-007 | MIDI real-time recording with quantize and click                 | OT  | M4  | —       | —    | planned |
| EDIT-008 | Text entry (alphaTex superset)                                   | OT  | M5  | —       | —    | planned |
| EDIT-010 | Durations, dots, tuplets, ties, rests                            | GP  | M4  | —       | —    | planned |
| EDIT-011 | Up to 4 voices                                                   | GP  | M4  | —       | —    | planned |
| EDIT-012 | Beam control                                                     | GP  | M4  | —       | —    | planned |
| EDIT-013 | Enharmonic spelling                                              | GP  | M4  | —       | —    | planned |
| EDIT-014 | Every effect and articulation editable with a shortcut           | GP  | M4  | —       | —    | planned |
| EDIT-020 | Bars: insert / delete / copy / cut / paste                       | GP  | M4  | —       | —    | planned |
| EDIT-021 | Time and key signatures                                          | GP  | M4  | —       | —    | planned |
| EDIT-022 | Tempo and tempo ramps                                            | GP  | M4  | —       | —    | planned |
| EDIT-023 | Repeats and alternate endings                                    | GP  | M4  | —       | —    | planned |
| EDIT-024 | Markers / sections                                               | GP  | M4  | —       | —    | planned |
| EDIT-025 | Directions                                                       | GP  | M5  | —       | —    | planned |
| EDIT-026 | Barline types                                                    | GP  | M4  | —       | —    | planned |
| EDIT-027 | Free time, swing feel, anacrusis                                 | GP  | M4  | —       | —    | planned |
| EDIT-030 | Tracks: add / remove / reorder / duplicate                       | GP  | M4  | —       | —    | planned |
| EDIT-031 | Instrument and program                                           | GP  | M4  | —       | —    | planned |
| EDIT-032 | Tuning editor (any string count, capo, presets, custom)          | GP  | M4  | —       | —    | planned |
| EDIT-033 | Microtonal tuning offsets                                        | OT  | M4  | —       | —    | planned |
| EDIT-034 | Percussion tracks with drum-map editing                          | GP  | M4  | —       | —    | planned |
| EDIT-035 | Track name, short name, colour                                   | GP  | M4  | —       | —    | planned |
| EDIT-036 | Transposing-instrument settings                                  | GP  | M4  | —       | —    | planned |
| EDIT-040 | Chord library and custom diagram editor                          | GP  | M5  | —       | —    | planned |
| EDIT-041 | Chord-name recognition from notes                                | GP  | M5  | —       | —    | planned |
| EDIT-042 | Lyrics editor with syllable alignment and counting               | GP+ | M5  | —       | —    | planned |
| EDIT-043 | Text, fingering and dynamics editing                             | GP  | M4  | —       | —    | planned |
| EDIT-050 | Transpose selection                                              | GP  | M4  | —       | —    | planned |
| EDIT-051 | Octave shift                                                     | GP  | M4  | —       | —    | planned |
| EDIT-052 | Move notes across strings                                        | GP  | M4  | —       | —    | planned |
| EDIT-053 | Automatic re-fret / fingering                                    | GP  | M5  | —       | —    | planned |
| EDIT-054 | Convert between tunings and instruments (drop D, bass, ukulele…) | GP+ | M5  | —       | —    | planned |
| EDIT-055 | Harmonize (3rds / 6ths / octaves)                                | OT  | M5  | —       | —    | planned |
| EDIT-056 | Double a track                                                   | OT  | M5  | —       | —    | planned |
| EDIT-057 | Simplify for beginners                                           | OT  | M5  | —       | —    | planned |
| EDIT-058 | Quantize                                                         | OT  | M5  | —       | —    | planned |
| EDIT-059 | Mirror                                                           | OT  | M5  | —       | —    | planned |
| EDIT-060 | Unlimited undo / redo                                            | GP+ | M4  | —       | —    | planned |
| EDIT-061 | Autosave                                                         | GP  | M4  | —       | —    | planned |
| EDIT-062 | Version history with diffs                                       | OT  | M5  | —       | —    | planned |
| EDIT-063 | Native save as .otz                                              | OT  | M4  | —       | —    | planned |
| EDIT-064 | Save as .gp (Guitar Pro 7/8) with round-trip tests               | GP  | M4  | —       | —    | planned |
| EDIT-065 | Save as alphaTex                                                 | OT  | M4  | —       | —    | planned |
| EDIT-066 | Track-creation wizard: family and instrument, name, colour, icon, notations, tuning and sound, each with a preview | GP  | M4  | —       | —    | planned |
| EDIT-067 | Instrument library: 100+ instruments with family, range, clef, default tuning and sound | GP  | M4  | —       | —    | planned |
| EDIT-068 | Track icon                                                       | GP  | M4  | —       | —    | planned |
| EDIT-069 | Split one staff into two (at a pitch, or everything to the upper or lower staff) | GP  | M4  | —       | —    | planned |
| EDIT-070 | Merge two staves into one (both, upper only, lower only)         | GP  | M4  | —       | —    | planned |
| EDIT-071 | Tuning preview: play the whole tuning or one string              | GP  | M4  | —       | —    | planned |
| EDIT-072 | User tuning library: save, rename, delete                        | GP  | M4  | —       | —    | planned |
| EDIT-073 | Custom tuning label shown in the score                           | GP  | M4  | —       | —    | planned |
| EDIT-074 | Banjo drone (short fifth) string: fret numbering, fingering, string moves | GP  | M4  | —       | —    | planned |
| EDIT-075 | Partial capo on chosen strings, combinable with a full capo      | GP  | M4  | —       | —    | planned |
| EDIT-076 | Stringed or non-stringed track mode                              | GP  | M4  | —       | —    | planned |
| EDIT-077 | Editing palette: grouped symbol buttons, parameter pop-ups, long-press variants | GP  | M4  | —       | —    | planned |
| EDIT-078 | Score inspector: information, notation settings, mastering       | GP  | M4  | —       | —    | planned |
| EDIT-079 | Track inspector: information, notation, tuning, transposition, sound, interpretation | GP  | M4  | —       | —    | planned |
| EDIT-080 | Click-to-edit: editable elements highlight on hover and open their editor on click | GP  | M4  | —       | —    | planned |
| EDIT-081 | Selection: drag across beats and bars                            | GP  | M1  | — | apps/web/e2e/playback.spec.ts | done |
| EDIT-082 | Selection handles to grow or shrink a selection                  | GP  | M1  | — | apps/web/e2e/playback.spec.ts, apps/web/e2e/mobile.spec.ts | done |
| EDIT-083 | Select a whole track (select all, triple-click)                  | GP  | M1  | — | apps/web/e2e/practice.spec.ts, apps/web/e2e/playback.spec.ts | done |
| EDIT-084 | Keyboard selection by beat, by bar, to the start or end          | GP  | M1  | — | apps/web/e2e/practice.spec.ts | done |
| EDIT-085 | Multi-track bar selection in the overview                        | GP  | M4  | —       | —    | planned |
| EDIT-086 | Select a whole section                                           | GP  | M1  | —       | apps/web/e2e/practice.spec.ts | done |
| EDIT-087 | Edit cursor coloured by voice; inactive voices dimmed and locked | GP  | M4  | —       | —    | planned |
| EDIT-088 | Multivoice mode: edit all four voices at once                    | GP  | M4  | —       | —    | planned |
| EDIT-089 | Score-information editor: every header field, notice and instructions, multi-line values | GP  | M4  | —       | —    | planned |
| EDIT-090 | Master track: song-wide tempo, sections, repeats, directions, key and master automations | GP  | M4  | —       | —    | planned |
| EDIT-091 | Keyboard entry on standard notation with a chosen string (1–9) or automatic string (0) | GP  | M4  | —       | —    | planned |
| EDIT-092 | Entry in any shown notation (tab, staff, slash, numbered) updates all of them | GP  | M4  | —       | —    | planned |
| EDIT-093 | Insert and delete beats; delete a note; clear the selection      | GP  | M4  | —       | —    | planned |
| EDIT-094 | Repeat the previous beat at the cursor                           | GP  | M4  | —       | —    | planned |
| EDIT-095 | Cursor moves on when a bar is full, adding a bar at the end of the score | GP  | M4  | —       | —    | planned |
| EDIT-096 | Notes sound as they are entered                                  | GP  | M4  | —       | —    | planned |
| EDIT-097 | Note entry by clicking the fretboard, keyboard, drum or scale views | GP  | M4  | —       | —    | planned |
| EDIT-098 | Slash (rhythm) entry; convert notes to slashes keeping their pitches | GP  | M4  | —       | —    | planned |
| EDIT-099 | Beat-range copy, cut and paste across bar lines, all voices, between instruments | GP  | M4  | —       | —    | planned |
| EDIT-100 | Multitrack copy and cut of whole bars                            | GP  | M4  | —       | —    | planned |
| EDIT-101 | Special paste: repeat count, include the current bar, choose element types | GP  | M4  | —       | —    | planned |
| EDIT-102 | Move, copy or swap voice contents                                | GP  | M4  | —       | —    | planned |
| EDIT-103 | Live bar-completeness indicator naming the faulty voice          | GP  | M4  | —       | —    | planned |
| EDIT-104 | Nested-tuplet entry, inner or outer first                        | GP  | M4  | —       | —    | planned |
| EDIT-105 | Default beam grouping per time signature                         | GP  | M4  | —       | —    | planned |
| EDIT-106 | Flip stem direction                                              | GP  | M4  | —       | —    | planned |
| EDIT-107 | Clefs and clef changes, optionally keeping pitches               | GP  | M4  | —       | —    | planned |
| EDIT-108 | One- and two-bar simile marks                                    | GP  | M4  | —       | —    | planned |
| EDIT-109 | Force or prevent a system break at a bar                         | GP  | M4  | —       | —    | planned |
| EDIT-110 | Accidentals: sharp, flat, natural, double, courtesy              | GP  | M4  | —       | —    | planned |
| EDIT-111 | Bend editor: pitch curve with draggable points and presets       | GP  | M4  | —       | —    | planned |
| EDIT-112 | Whammy-bar editor: pitch curve with presets in quarter-tone steps | GP  | M4  | —       | —    | planned |
| EDIT-113 | Harmonic dialog: type, resulting pitch, automatic touch fret     | GP  | M4  | —       | —    | planned |
| EDIT-114 | Brush and arpeggio settings: duration, spread, start position    | GP  | M4  | —       | —    | planned |
| EDIT-115 | Drum entry: keys cycle the articulations on a staff line         | GP  | M4  | —       | —    | planned |
| EDIT-116 | Transpose by interval (quality, direction, compound), optionally updating the key | GP  | M4  | —       | —    | planned |
| EDIT-117 | Diatonic transposition by scale degrees                          | GP  | M4  | —       | —    | planned |
| EDIT-118 | Transpose scope: selection or whole score, one track or all      | GP  | M4  | —       | —    | planned |
| EDIT-119 | MIDI capture settings: chord window, MIDI-guitar channel-to-string mapping, automatic fret choice | GP  | M4  | —       | —    | planned |
| EDIT-120 | Finalize: document read-only until unlocked                      | GP  | M4  | —       | —    | planned |
| EDIT-121 | Edit lock: a password is needed to edit                          | GP  | M4  | —       | —    | planned |
| EDIT-122 | Open lock: password-encrypted documents                          | GP+ | M4  | —       | —    | planned |
| EDIT-123 | Unsaved-changes guard: modified indicator, confirmation on close | GP  | M4  | —       | —    | planned |
| EDIT-124 | Recovery of unsaved documents after a crash, reload or closed tab | GP  | M4  | —       | —    | planned |
| EDIT-125 | Palm-mute assistant: chosen strings across a range               | GP  | M5  | —       | —    | planned |
| EDIT-126 | Let-ring assistant: chosen strings across a range                | GP  | M5  | —       | —    | planned |
| EDIT-127 | Bar arranger: re-bar music to fit time signatures, splitting and tying notes | GP  | M5  | —       | —    | planned |
| EDIT-128 | Bars per system: default count, redistribution, per-system change | GP  | M5  | —       | —    | planned |
| EDIT-129 | Design mode for single- and multi-track scores                   | GP  | M5  | —       | —    | planned |
| EDIT-130 | Design mode: drag bar widths, changed bars marked                | GP  | M5  | —       | —    | planned |
| EDIT-131 | Design mode: drag individual beats                               | GP  | M5  | —       | —    | planned |
| EDIT-132 | Design mode: alignment guide while dragging                      | GP  | M5  | —       | —    | planned |
| EDIT-133 | Design mode: reset spacing per system or for the whole score     | GP  | M5  | —       | —    | planned |
| EDIT-134 | Chord builder: root and quality                                  | GP  | M5  | —       | —    | planned |
| EDIT-135 | Chord builder: extensions (7, 9, 11, 13)                         | GP  | M5  | —       | —    | planned |
| EDIT-136 | Chord builder: altered fifths, ninths, elevenths, thirteenths    | GP  | M5  | —       | —    | planned |
| EDIT-137 | Chord builder: slash-chord bass note                             | GP  | M5  | —       | —    | planned |
| EDIT-138 | Chord builder: inversions                                        | GP  | M5  | —       | —    | planned |
| EDIT-139 | Chord builder: omitted tones                                     | GP  | M5  | —       | —    | planned |
| EDIT-140 | Custom chord names kept exactly as typed                         | GP  | M5  | —       | —    | planned |
| EDIT-141 | Automatic barre in chord diagrams                                | GP  | M5  | —       | —    | planned |
| EDIT-142 | Chord preview playback                                           | GP  | M5  | —       | —    | planned |
| EDIT-143 | Write a diagram's notes into an empty beat                       | GP  | M5  | —       | —    | planned |
| EDIT-144 | Transpose chord diagrams and names with the notes                | GP  | M5  | —       | —    | planned |
| EDIT-145 | Scale diagram: insert, resize, reset, delete                     | GP  | M5  | —       | —    | planned |
| EDIT-146 | Scale-diagram geometry: 3–10 strings, 4–24 frets, start fret, orientation, fret markers | GP  | M5  | —       | —    | planned |
| EDIT-147 | Scale-diagram dots: shape, colour, short text, text colour       | GP  | M5  | —       | —    | planned |
| EDIT-148 | Fill a scale diagram from the selected notes                     | GP  | M5  | —       | —    | planned |
| EDIT-149 | Named, coloured markers at sections, bars or beats               | OT  | M4  | —       | —    | planned |

## Composition and songwriting

| ID       | Feature                                                                                                                                   | Src | M   | Fixture | Test | Status  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| COMP-001 | New document: blank                                                                                                                       | GP  | M4  | —       | —    | planned |
| COMP-002 | Templates: solo guitar, acoustic + vocal, rock band, metal 7/8-string, jazz trio, classical, bass, ukulele, drums only, piano, lead sheet | GP+ | M5  | —       | —    | planned |
| COMP-003 | Lead-sheet / chord-chart mode                                                                                                             | OT  | M5  | —       | —    | planned |
| COMP-004 | Convert chord chart ⇄ full score                                                                                                          | OT  | M5  | —       | —    | planned |
| COMP-005 | Accompaniment generator (strums, picking, bass, drum grooves)                                                                             | OT  | M5  | —       | —    | planned |
| COMP-010 | Chord palette by key                                                                                                                      | OT  | M5  | —       | —    | planned |
| COMP-011 | Chord detection                                                                                                                           | GP  | M5  | —       | —    | planned |
| COMP-012 | Roman numeral / Nashville display                                                                                                         | OT  | M5  | —       | —    | planned |
| COMP-013 | Voicing and inversion browser on the fretboard                                                                                            | OT  | M5  | —       | —    | planned |
| COMP-014 | CAGED shapes                                                                                                                              | OT  | M5  | —       | —    | planned |
| COMP-015 | Functional-harmony progression suggestions (offline, rule-based)                                                                          | OT  | M5  | —       | —    | planned |
| COMP-020 | Scale and mode browser with fretboard overlay                                                                                             | GP+ | M5  | —       | —    | planned |
| COMP-021 | Key detection                                                                                                                             | OT  | M5  | —       | —    | planned |
| COMP-022 | "Which scales fit these chords"                                                                                                           | OT  | M5  | —       | —    | planned |
| COMP-023 | Interval and scale-degree colouring                                                                                                       | OT  | M5  | —       | —    | planned |
| COMP-030 | alphaTex-superset editor with live preview and two-way sync                                                                               | OT  | M5  | —       | —    | planned |
| COMP-031 | ASCII tab import / export                                                                                                                 | GP+ | M5  | —       | —    | planned |
| COMP-032 | ChordPro import / export                                                                                                                  | OT  | M5  | —       | —    | planned |
| COMP-040 | Drum grid / step sequencer with groove library                                                                                            | OT  | M5  | —       | —    | planned |
| COMP-041 | Piano-roll view for any track                                                                                                             | OT  | M5  | —       | —    | planned |
| COMP-050 | Arrangement view: drag, repeat and reuse song-structure blocks                                                                            | OT  | M5  | —       | —    | planned |
| COMP-051 | Variations / takes per section                                                                                                            | OT  | M5  | —       | —    | planned |
| COMP-060 | Mic-to-tab transcription (monophonic)                                                                                                     | OT  | M8  | —       | —    | planned |
| COMP-061 | Mic-to-tab transcription (polyphonic)                                                                                                     | OT  | S   | —       | —    | planned |
| COMP-070 | Score lint: unplayable stretches, impossible fingerings                                                                                   | OT  | M5  | —       | —    | planned |
| COMP-071 | Score lint: bar-duration errors, empty bars, missing rests                                                                                | OT  | M5  | —       | —    | planned |
| COMP-072 | Score lint: out-of-range notes                                                                                                            | OT  | M5  | —       | —    | planned |
| COMP-073 | One-click lint fixes                                                                                                                      | OT  | M5  | —       | —    | planned |
| COMP-080 | Exercise generator: scales, arpeggios and chords across positions                                                                         | OT  | M8  | —       | —    | planned |
| COMP-081 | Speed-building sequences                                                                                                                  | OT  | M8  | —       | —    | planned |
| COMP-082 | Random riff generator in a key and style                                                                                                  | OT  | M8  | —       | —    | planned |
| COMP-083 | Save the document as a personal template; rename and delete templates                                                                     | GP  | M5  | —       | —    | planned |
| COMP-084 | Default template for new documents                                                                                                        | GP  | M5  | —       | —    | planned |
| COMP-085 | Lint results drawn on the score while editing (red bars and notes)                                                                        | GP  | M5  | —       | —    | planned |
| COMP-086 | Lint rules switchable one by one                                                                                                          | GP  | M5  | —       | —    | planned |
| COMP-087 | Score lint: invalid tuplets                                                                                                               | GP  | M5  | —       | —    | planned |
| COMP-088 | Score lint: unplayable hammer-ons and pull-offs                                                                                           | GP  | M5  | —       | —    | planned |
| COMP-089 | Score lint: bars playback can never reach                                                                                                 | GP  | M5  | —       | —    | planned |
| COMP-090 | Scale library: 1,000+ scales and modes, searchable by name and tag                                                                        | GP  | M5  | —       | —    | planned |
| COMP-091 | Scale details: intervals, step pattern, playback                                                                                          | GP  | M5  | —       | —    | planned |
| COMP-092 | Scale finder: keys and scales ranked by fit to the selected notes                                                                         | GP  | M5  | —       | —    | planned |
| COMP-093 | Scale diagrams named automatically and placed freely                                                                                      | OT  | M5  | —       | —    | planned |
| COMP-094 | Capo suggestion and easier shapes that keep the key                                                                                       | OT  | M5  | —       | —    | planned |
| COMP-095 | Chord and lyric recognition from audio                                                                                                    | OT  | S   | —       | —    | planned |
| COMP-096 | Key detection from audio                                                                                                                  | OT  | S   | —       | —    | planned |
| COMP-097 | Section detection from audio                                                                                                              | OT  | S   | —       | —    | planned |
| COMP-098 | Sheet-music scanning (OMR) from PDF or photo                                                                                              | OT  | S   | —       | —    | planned |
| COMP-099 | Accompaniment that follows your live tempo and dynamics                                                                                   | OT  | S   | —       | —    | planned |

## Audio engine

| ID      | Feature                                                                                          | Src | M   | Fixture | Test | Status  |
| ------- | ------------------------------------------------------------------------------------------------ | --- | --- | ------- | ---- | ------- |
| AUD-001 | AudioWorklet-based, glitch-free, low-latency output                                              | OT  | M1  | —       | packages/audio/test/ring.test.ts, apps/web/e2e/settings.spec.ts | done |
| AUD-002 | Correct playback when the tab is backgrounded                                                    | OT  | M1  | —       | apps/web/e2e/background.spec.ts | done |
| AUD-003 | Sample-accurate scheduling                                                                       | OT  | M1  | —       | packages/core/test/playback-timing.test.ts | done |
| AUD-004 | Per-track stereo panning                                                                         | GP  | M1  | —       | packages/audio/test/render-offline.test.ts, apps/web/e2e/playback.spec.ts | done |
| AUD-005 | Compact default GM SoundFont for instant playback                                                | GP  | M1  | — | packages/audio/test/render-offline.test.ts | done |
| AUD-006 | Downloadable higher-quality sound packs, cached locally                                          | GP  | M7  | —       | —    | planned |
| AUD-007 | User SF2 / SF3 SoundFonts                                                                        | OT  | M7  | —       | —    | planned |
| AUD-008 | SFZ instruments via sfizz (WASM)                                                                 | OT  | M7  | —       | —    | planned |
| AUD-009 | Physical-modeling string synth responding to bends, vibrato, palm mute, harmonics, pick position | OT  | M7  | —       | —    | planned |
| AUD-010 | Per-track synth engine selection                                                                 | OT  | M7  | —       | —    | planned |
| AUD-020 | Effects: EQ                                                                                      | GP  | M7  | —       | —    | planned |
| AUD-021 | Effects: compressor                                                                              | GP  | M7  | —       | —    | planned |
| AUD-022 | Effects: overdrive / distortion                                                                  | GP  | M7  | —       | —    | planned |
| AUD-023 | Effects: chorus                                                                                  | GP  | M7  | —       | —    | planned |
| AUD-024 | Effects: delay                                                                                   | GP  | M7  | —       | —    | planned |
| AUD-025 | Effects: convolution reverb with permissively licensed IRs                                       | GP  | M7  | —       | —    | planned |
| AUD-026 | Effects: cabinet simulation                                                                      | GP  | M7  | —       | —    | planned |
| AUD-027 | Effect presets per instrument family                                                             | GP  | M7  | —       | —    | planned |
| AUD-028 | Per-track playing style (pick, fingers, picking, slap) shapes the synthesized articulation       | GP  | M7  | —       | —    | planned |
| AUD-029 | Several sounds per track (e.g. clean and distorted), switched by automation                      | GP  | M7  | —       | —    | planned |
| AUD-030 | Drum kits by style (rock, metal, jazz, world…) with previews                                     | GP  | M7  | —       | —    | planned |
| AUD-031 | Drum stroke type: sticks or brushes                                                              | GP  | M7  | —       | —    | planned |
| AUD-032 | Sound preset library (~1,000 instrument plus effect-chain presets) with a categorised browser    | GP  | M7  | —       | —    | planned |
| AUD-033 | Signature-style tone presets (clean, overdrive, distortion, jazz…)                               | GP  | M7  | —       | —    | planned |
| AUD-034 | Sound slots: rename, reorder, delete, copy, paste, save as preset                                | GP  | M7  | —       | —    | planned |
| AUD-035 | Lock a track's sound over sound automations                                                      | GP  | M7  | —       | —    | planned |
| AUD-036 | Audition presets live during playback                                                            | GP  | M7  | —       | —    | planned |
| AUD-037 | Choose the instrument soundbank behind a preset                                                  | GP  | M7  | —       | —    | planned |
| AUD-038 | Soundbank settings: mono or stereo, microphone position                                          | GP  | M7  | —       | —    | planned |
| AUD-039 | Effect chain per sound: up to six slots with bypass, presets, copy, paste, reorder               | GP+ | M7  | —       | —    | planned |
| AUD-040 | Pedalboard view: drag pedals from a browser, reorder, resize, duplicate; heard live              | GP  | M7  | —       | —    | planned |
| AUD-041 | User sound presets: save, organise, import and export as files                                   | GP  | M7  | —       | —    | planned |
| AUD-042 | Amp models: guitar combos                                                                        | GP  | M7  | —       | —    | planned |
| AUD-043 | Amp models: guitar stacks                                                                        | GP  | M7  | —       | —    | planned |
| AUD-044 | Amp models: small amp and rotary speaker                                                         | GP  | M7  | —       | —    | planned |
| AUD-045 | Amp models: bass amps                                                                            | GP  | M7  | —       | —    | planned |
| AUD-046 | Effects: fuzz                                                                                    | GP  | M7  | —       | —    | planned |
| AUD-047 | Effects: flanger                                                                                 | GP  | M7  | —       | —    | planned |
| AUD-048 | Effects: phaser                                                                                  | GP  | M7  | —       | —    | planned |
| AUD-049 | Effects: vibe and tremolo                                                                        | GP  | M7  | —       | —    | planned |
| AUD-050 | Effects: octaver and pitch shifter                                                               | GP  | M7  | —       | —    | planned |
| AUD-051 | Effects: volume pedal                                                                            | GP  | M7  | —       | —    | planned |
| AUD-052 | Effects: wah and auto-wah                                                                        | GP  | M7  | —       | —    | planned |
| AUD-053 | Master effects chain: compressor/limiter, reverb, EQ with bypass and presets                     | GP  | M7  | —       | —    | planned |

## Export and print

| ID      | Feature                                                               | Src | M   | Fixture | Test | Status  |
| ------- | --------------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| EXP-001 | PDF (vector, fonts embedded, correct pagination)                      | GP  | M2  | —       | packages/core/test/print-pdf.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-002 | PNG                                                                   | GP  | M2  | —       | packages/core/test/print-sheet.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-003 | SVG                                                                   | OT  | M2  | —       | packages/core/test/print-sheet.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-004 | MIDI (effects as pitch bend / CC, tempo map, markers)                 | GP  | M2  | —       | packages/core/test/export-midi.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-005 | WAV                                                                   | GP  | M2  | —       | packages/audio/test/export-render.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-006 | MP3                                                                   | GP  | M7  | —       | —    | planned |
| EXP-007 | OGG                                                                   | GP  | M7  | —       | —    | planned |
| EXP-008 | FLAC                                                                  | GP  | M7  | —       | —    | planned |
| EXP-009 | Per-track stems                                                       | GP  | M7  | —       | —    | planned |
| EXP-010 | Guitar Pro 7/8 (.gp)                                                  | GP  | M4  | —       | —    | planned |
| EXP-011 | OpenTabz project (.otz)                                               | OT  | M4  | —       | —    | planned |
| EXP-012 | alphaTex                                                              | OT  | M4  | —       | —    | planned |
| EXP-013 | ASCII tab                                                             | GP  | M5  | —       | —    | planned |
| EXP-014 | ChordPro                                                              | OT  | M5  | —       | —    | planned |
| EXP-015 | MusicXML                                                              | GP  | M5  | —       | —    | planned |
| EXP-016 | Print via CSS with proper pagination                                  | GP  | M2  | —       | apps/web/e2e/export.spec.ts | done |
| EXP-017 | Batch export of a folder                                              | OT  | M8  | —       | —    | planned |
| EXP-018 | Video: scrolling score with cursor and audio → MP4 / WebM (WebCodecs) | OT  | M7  | —       | —    | planned |
| EXP-019 | GIF of a selected lick                                                | OT  | M7  | —       | —    | planned |
| EXP-020 | Round-trip fidelity .gp → OpenTabz → .gp locked by tests              | OT  | M4  | —       | —    | planned |
| EXP-021 | Guitar Pro 6 (.gpx)                                                   | GP  | M5  | —       | —    | planned |
| EXP-022 | Guitar Pro 5 (.gp5)                                                   | GP  | M5  | —       | —    | planned |
| EXP-023 | AIFF                                                                  | GP  | M7  | —       | —    | planned |
| EXP-024 | MIDI options: muted tracks left out, one or two channels per track    | GP  | M2  | —       | packages/core/test/export-midi.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-025 | MIDI round trip keeps decimal tempos and note-level audio settings    | GP  | M5  | —       | —    | planned |
| EXP-026 | Page choice for PDF and image export: all pages, one page, a range, or the selection | GP  | M2  | —       | packages/core/test/render-session.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-027 | Image export options: resolution and transparent background           | GP  | M2  | —       | packages/core/test/print-sheet.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-028 | File-name templates with tokens (title, track name, number and count, date, time) and a preview | GP  | M2  | —       | apps/web/src/export/file-names.test.ts, apps/web/src/state/preferences.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-029 | Audio export of the selected bars only                                | GP  | M2  | —       | packages/audio/test/export-render.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-030 | Metronome click and count-in in audio export                          | GP  | M2  | —       | packages/audio/test/export-render.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-031 | Audio export applies the current practice speed and transpose         | GP  | M2  | —       | packages/audio/test/export-render.test.ts, apps/web/e2e/export.spec.ts | done |
| EXP-032 | MP3 settings: quality and bitrate mode (CBR, VBR, ABR)                | GP  | M7  | —       | —    | planned |
| EXP-033 | Loudness normalization for audio export                               | GP+ | M7  | —       | —    | planned |
| EXP-034 | LilyPond                                                              | OT  | S   | —       | —    | planned |
| EXP-035 | ABC notation                                                          | OT  | S   | —       | —    | planned |
| EXP-036 | MEI                                                                   | OT  | S   | —       | —    | planned |

## Library, offline and platform

| ID       | Feature                                                     | Src | M   | Fixture | Test | Status  |
| -------- | ----------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| LIB-001  | Local library (IndexedDB / OPFS)                            | OT  | M3  | —       | —    | planned |
| LIB-002  | Import files and folders into the library                   | OT  | M3  | —       | —    | planned |
| LIB-003  | Search and filter by title / artist / tags                  | OT  | M3  | —       | —    | planned |
| LIB-004  | Favorites                                                   | OT  | M3  | —       | —    | planned |
| LIB-005  | Recents                                                     | GP  | M3  | —       | —    | planned |
| LIB-006  | Setlists                                                    | OT  | M3  | —       | —    | planned |
| LIB-007  | Practice stats per song                                     | OT  | M6  | —       | —    | planned |
| LIB-008  | Per-song saved settings                                     | OT  | M3  | —       | —    | planned |
| LIB-009  | Save in place with the File System Access API               | GP  | M4  | —       | —    | planned |
| PLAT-001 | Installable PWA                                             | OT  | M3  | —       | —    | planned |
| PLAT-002 | Fully offline after first load                              | OT  | M3  | —       | —    | planned |
| PLAT-003 | File-handler registration for every supported extension     | OT  | M3  | —       | —    | planned |
| PLAT-004 | Share target                                                | OT  | M3  | —       | —    | planned |
| PLAT-010 | Responsive down to 360 px                                   | OT  | M3  | —       | —    | planned |
| PLAT-011 | Touch gestures: pinch zoom, tap-to-seek, swipe              | OT  | M3  | —       | —    | planned |
| PLAT-012 | Bottom transport bar on mobile                              | OT  | M3  | —       | —    | planned |
| PLAT-020 | Full keyboard operation and focus management                | GP+ | M3  | —       | —    | planned |
| PLAT-021 | ARIA semantics and live-region announcements                | OT  | M3  | —       | —    | planned |
| PLAT-022 | High-contrast support                                       | OT  | M3  | —       | —    | planned |
| PLAT-023 | Reduced-motion support                                      | OT  | M3  | —       | —    | planned |
| PLAT-024 | WCAG 2.2 AA audit passed                                    | OT  | M3  | —       | —    | planned |
| PLAT-030 | Settings: theme                                             | GP  | M0  | — | apps/web/e2e/app.spec.ts | done |
| PLAT-031 | Settings: default layout and workspace                      | GP  | M3  | —       | —    | planned |
| PLAT-032 | Settings: notation preferences                              | GP  | M2  | —       | —    | planned |
| PLAT-033 | Settings: synth and sound-pack selection                    | GP  | M7  | —       | —    | planned |
| PLAT-034 | Settings: audio latency hint                                | OT  | M1  | —       | apps/web/src/state/preferences.test.ts, apps/web/e2e/settings.spec.ts | done |
| PLAT-035 | Settings: left-handed                                       | GP  | M1  | —       | apps/web/src/state/preferences.test.ts, apps/web/e2e/fretboard.spec.ts | done |
| PLAT-036 | Settings: rebindable shortcuts                              | GP  | M3  | —       | —    | planned |
| PLAT-040 | Sandboxed scripting API that reads and transforms the score | OT  | M8  | —       | —    | planned |
| PLAT-041 | Scripts add commands and panels                             | OT  | M8  | —       | —    | planned |
| PLAT-042 | Scripts register exporters                                  | OT  | M8  | —       | —    | planned |
| PLAT-043 | Scripts shareable as files                                  | OT  | M8  | —       | —    | planned |
| PLAT-044 | Theme API                                                   | OT  | M8  | —       | —    | planned |
| LIB-010  | Linked local folder re-scanned to keep the library in sync (follows links) | GP+ | M3  | —       | —    | planned |
| LIB-011  | One home-page search over recents, library, templates and demo scores, with counts per group | GP  | M3  | —       | —    | planned |
| LIB-012  | Hover or long-press preview: score thumbnail and short audio snippet | GP  | M3  | —       | —    | planned |
| LIB-013  | Reveal the open document in the library or its linked folder | GP  | M3  | —       | —    | planned |
| LIB-014  | Library filters by tuning, instruments, key, tempo, difficulty and tags | OT  | M3  | —       | —    | planned |
| LIB-015  | Library backup and restore as one file                      | OT  | M3  | —       | —    | planned |
| PLAT-045 | New-version notice with one-click reload                    | GP  | M3  | —       | —    | planned |
| PLAT-046 | Opt-in preview channel with a way back to stable            | GP  | M3  | —       | —    | planned |
| PLAT-047 | Supported platforms: current Chromium, Firefox and Safari on Windows, macOS, Linux, ChromeOS, Android and iOS | GP+ | M0  | —       | —    | in progress |
| PLAT-048 | Settings: override a file's own stylesheet, layout, zoom, notation or sound when opening | GP  | M3  | —       | —    | planned |
| PLAT-049 | Settings: default author details for new documents          | GP  | M4  | —       | —    | planned |
| PLAT-050 | Settings: editing preferences (diagrams in normal paste, duration-key direction) | GP  | M4  | —       | —    | planned |
| PLAT-051 | Settings: audio input and output devices with test sound and input level meter | GP  | M6  | —       | —    | planned |
| PLAT-052 | Selectable Guitar Pro keymap preset covering the full default map | GP  | M4  | —       | —    | planned |
| PLAT-053 | Fretlight LED-guitar support (WebHID / Web Bluetooth)       | GP  | M8  | —       | —    | planned |
| PLAT-054 | Fretlight modes: notes at the cursor, current chord, chosen scale; left-handed; fret range | GP  | M8  | —       | —    | planned |
| PLAT-055 | Embeddable read-only player for other sites                 | OT  | M8  | —       | —    | planned |

## Workspace and UX

| ID     | Feature                                                                                                                     | Src | M   | Fixture  | Test | Status  |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | --- | --- | -------- | ---- | ------- |
| UX-001 | Home page is the drop zone; no onboarding, sign-up or modal before the first note                                           | OT  | M0  | — | apps/web/e2e/open.spec.ts | done |
| UX-002 | **New** button on the home page; blank page to first note in under five seconds                                             | OT  | M4  | —        | —    | planned |
| UX-003 | Original demo scores openable from the home page                                                                            | OT  | M0  | alphatex/demos | apps/web/e2e/open.spec.ts | done |
| UX-010 | Dockable workspace (score, fretboard, mixer, tuner, chord palette, lyrics, arrangement, piano roll, drum grid, text editor) | OT  | M3  | —        | —    | planned |
| UX-011 | Drag, dock and pop out panels                                                                                               | OT  | M3  | —        | —    | planned |
| UX-012 | Named workspace layouts                                                                                                     | OT  | M3  | —        | —    | planned |
| UX-013 | Split view: two documents, or two views of one                                                                              | OT  | M3  | —        | —    | planned |
| UX-014 | Command palette (Ctrl/Cmd+K) exposing every action, with each action's shortcut | OT  | M3  | —        | —    | planned |
| UX-015 | Every action reachable within one click or one shortcut                                                                     | OT  | M3  | —        | —    | planned |
| UX-020 | Themes: light, dark, sepia, stage-dark                                                                                      | OT  | M0  | — | apps/web/e2e/app.spec.ts, packages/core/test/score-colors.test.ts | done |
| UX-021 | Desktop and mobile first-class; no feature removed on mobile                                                                | OT  | M3  | —        | —    | planned |
| UX-022 | All user-facing strings in one module                                                                                       | OT  | M0  | — | scripts/strings.test.ts | done |
| UX-023 | Localizable UI with language switching without a reload                                                                     | GP+ | M3  | —        | —    | planned |
| UX-024 | Translations for at least the 13 languages Guitar Pro ships                                                                 | GP  | M8  | —        | —    | planned |
| UX-025 | Help links: user guide, issue tracker, community                                                                            | GP  | M8  | —        | —    | planned |
| UX-026 | What's-new area on the home page                                                                                            | GP  | M3  | —        | —    | planned |
| UX-027 | Choose which home-page sections are shown                                                                                   | GP  | M3  | —        | —    | planned |
| UX-028 | Optionally reopen the previous session's documents                                                                          | GP  | M3  | —        | —    | planned |
| UX-029 | Responsive main toolbar folding into overflow menus                                                                         | GP  | M3  | —        | —    | planned |
| UX-030 | Context menus (right-click or long-press) on tracks, bars, symbols, document tabs and the waveform                          | GP  | M3  | —        | —    | planned |
| UX-031 | Shortcut hints in tooltips and menus | GP  | M1  | —        | apps/web/e2e/practice.spec.ts, apps/web/e2e/mobile.spec.ts | done |
| UX-032 | Command palette lists every command; unavailable ones disabled with the reason                                              | GP  | M3  | —        | —    | planned |
| UX-033 | Command palette search by prefix, abbreviation, alias and localized name                                                    | GP  | M3  | —        | —    | planned |
| UX-034 | Command palette quick toggles for effects (run again to remove)                                                             | GP  | M4  | —        | —    | planned |
| UX-035 | Command palette commands with arguments (e.g. tempo 120, bend 1.5, add 4 bars)                                              | GP  | M4  | —        | —    | planned |
| UX-036 | Command palette argument completion (Tab cycles options)                                                                    | GP  | M4  | —        | —    | planned |
| UX-037 | Command palette expression text: type a chord, dynamic, key, clef, ottava or direction to insert it                         | GP  | M5  | —        | —    | planned |
| UX-038 | Command palette jump prefixes for sections and bar numbers                                                                  | GP  | M3  | —        | —    | planned |
| UX-039 | Command palette shorthand for tuplets (n:m) and time signatures (4/4)                                                       | GP  | M4  | —        | —    | planned |
| UX-040 | Command palette pattern commands fill a selection (strokes, brush, arpeggio, golpe, fingering, picking, slap/pop, wah)      | GP  | M5  | —        | —    | planned |
| UX-041 | Command palette command that removes chosen elements or effects from the selection                                          | GP  | M4  | —        | —    | planned |
| UX-042 | Command palette selection and structure commands (select bars or section, insert or repeat bars, line breaks)               | GP  | M4  | —        | —    | planned |
| UX-043 | Command palette view and playback commands with values (zoom, speed, transpose, focus, show scale…)                         | GP  | M3  | —        | —    | planned |
| UX-044 | Command palette stays open for a run of commands (flow mode)                                                                | GP  | M4  | —        | —    | planned |

## Performance budgets (hard gates)

| ID       | Feature                                                | Src | M   | Fixture   | Test | Status  |
| -------- | ------------------------------------------------------ | --- | --- | --------- | ---- | ------- |
| PERF-001 | Warm start to interactive < 1 s                        | OT  | M0  | — | apps/web/e2e/budgets.spec.ts | done |
| PERF-002 | File drop → first render < 300 ms (5 tracks, 150 bars) | OT  | M0  | — | apps/web/e2e/budgets.spec.ts | done |
| PERF-003 | File drop → first render < 1.5 s (20 tracks, 500 bars) | OT  | M0  | — | apps/web/e2e/budgets.spec.ts | done |
| PERF-004 | Local operations under 100 ms, never a spinner         | OT  | M0  | — | apps/web/e2e/budgets.spec.ts | done |
| PERF-005 | Steady 60 fps cursor and scrolling while playing | OT  | M1  | —         | apps/web/e2e/budgets.spec.ts | done |
| PERF-011 | Steady 60 fps while editing                            | OT  | M4  | —         | —    | planned |
| PERF-006 | Playback starts < 100 ms after pressing space          | OT  | M1  | — | apps/web/e2e/budgets.spec.ts | done |
| PERF-007 | Pitch-detection feedback < 50 ms                       | OT  | M6  | —         | —    | planned |
| PERF-008 | Initial JS < 300 KB gzip before the engine chunk       | OT  | M0  | — | scripts/check-budgets.ts | done |
| PERF-009 | Zero console errors or warnings in production          | OT  | M0  | — | apps/web/e2e/support.ts | done |
| PERF-010 | Budgets also met on a low-end reference laptop and a mid-range phone | GP+ | M3  | —         | —    | planned |

## Project and compliance

| ID       | Feature                                                                                 | Src | M   | Fixture | Test | Status  |
| -------- | --------------------------------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| PROJ-001 | CI: typecheck, lint, unit, E2E, bundle budgets, Lighthouse ≥ 95                         | OT  | M0  | —       | —    | in progress |
| PROJ-002 | Deploys to opentabz.com with preview deploys per PR                                     | OT  | M0  | —       | —    | planned |
| PROJ-003 | Repository hygiene: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE, templates | OT  | M0  | — | scripts/repository.test.ts | done |
| PROJ-004 | THIRD_PARTY_NOTICES covers every dependency and asset                                   | OT  | M0  | — | scripts/repository.test.ts | done |
| PROJ-005 | Trademark disclaimer in footer and README                                               | OT  | M0  | — | scripts/repository.test.ts, apps/web/e2e/app.spec.ts | done |
| PROJ-006 | No network requests except own assets and user-requested sound packs                    | OT  | M0  | — | apps/web/e2e/app.spec.ts, scripts/repository.test.ts | done |
| PROJ-007 | Conventional commits, changelog, semantic versioning, Renovate                          | OT  | M0  | —       | —    | in progress |
