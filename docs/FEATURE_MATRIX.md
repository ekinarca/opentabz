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
| OPEN-001 | Drag-and-drop a file anywhere in the window                                                     | GP+ | M0  | —                   | —    | planned |
| OPEN-002 | File picker (Open button and shortcut)                                                          | GP  | M0  | —                   | —    | planned |
| OPEN-003 | Paste files from the clipboard                                                                  | OT  | M0  | —                   | —    | planned |
| OPEN-004 | Paste plain-text tabs from the clipboard                                                        | OT  | M5  | —                   | —    | planned |
| OPEN-005 | Open from URL (CORS permitting), including `?url=` deep links                                   | OT  | M0  | —                   | —    | planned |
| OPEN-006 | OS file-handler registration via the PWA manifest                                               | OT  | M3  | —                   | —    | planned |
| OPEN-007 | Web Share Target on mobile                                                                      | OT  | M3  | —                   | —    | planned |
| OPEN-008 | Open a whole folder                                                                             | OT  | M3  | —                   | —    | planned |
| OPEN-009 | Multiple documents in tabs                                                                      | GP  | M0  | —                   | —    | planned |
| OPEN-010 | Guitar Pro 3 (.gp3)                                                                             | GP  | M0  | alphatab/guitarpro3 | —    | planned |
| OPEN-011 | Guitar Pro 4 (.gp4)                                                                             | GP  | M0  | alphatab/guitarpro4 | —    | planned |
| OPEN-012 | Guitar Pro 5 (.gp5, v5.00 and v5.10)                                                            | GP  | M0  | alphatab/guitarpro5 | —    | planned |
| OPEN-013 | Guitar Pro 6 (.gpx, BCFZ and BCFS containers)                                                   | GP  | M0  | alphatab/guitarpro6 | —    | planned |
| OPEN-014 | Guitar Pro 7 (.gp)                                                                              | GP  | M0  | alphatab/guitarpro7 | —    | planned |
| OPEN-015 | Guitar Pro 8 (.gp), including files with audio tracks                                           | GP  | M0  | alphatab/guitarpro8 | —    | planned |
| OPEN-016 | OpenTabz project (.otz)                                                                         | OT  | M4  | —                   | —    | planned |
| OPEN-017 | MusicXML (.xml, .musicxml; partwise and timewise)                                               | GP  | M0  | —                   | —    | planned |
| OPEN-018 | Compressed MusicXML (.mxl)                                                                      | GP  | M0  | —                   | —    | planned |
| OPEN-019 | alphaTex (.atex, .tex, .alphatex)                                                               | OT  | M0  | alphatex            | —    | planned |
| OPEN-020 | Capella (.capx)                                                                                 | OT  | M0  | —                   | —    | planned |
| OPEN-021 | ASCII / plain-text tabs with rhythm inference and chord-line detection                          | GP+ | M5  | —                   | —    | planned |
| OPEN-022 | ChordPro                                                                                        | OT  | M5  | —                   | —    | planned |
| OPEN-023 | MIDI import with pitch → string/fret mapping per tuning                                         | GP  | M5  | —                   | —    | planned |
| OPEN-024 | PowerTab (.ptb)                                                                                 | GP  | S   | —                   | —    | planned |
| OPEN-025 | TuxGuitar (.tg)                                                                                 | OT  | S   | —                   | —    | planned |
| OPEN-026 | Format detection by content, never by extension                                                 | OT  | M0  | corrupt             | —    | planned |
| OPEN-027 | Files with wrong or missing extensions and odd names open correctly                             | OT  | M0  | corrupt             | —    | planned |
| OPEN-028 | Truncated files produce a specific "truncated" error                                            | OT  | M0  | corrupt             | —    | planned |
| OPEN-029 | Corrupted files produce a specific error naming the format and the problem                      | OT  | M0  | corrupt             | —    | planned |
| OPEN-030 | Recognized but unsupported formats (MIDI, PDF, images, audio, archives…) are named in the error | OT  | M0  | corrupt             | —    | planned |
| OPEN-031 | Parsing runs off the main thread; a hung parse is cancelled by a watchdog                       | OT  | M0  | —                   | —    | planned |
| OPEN-032 | Fuzzed (bit-flipped, truncated) inputs never hang or crash the app                              | OT  | M0  | corrupt             | —    | planned |

## Score rendering

| ID       | Feature                                                                           | Src | M   | Fixture                                                     | Test | Status  |
| -------- | --------------------------------------------------------------------------------- | --- | --- | ----------------------------------------------------------- | ---- | ------- |
| REND-001 | Standard notation + tablature                                                     | GP  | M0  | alphatex                                                    | —    | planned |
| REND-002 | Tablature only                                                                    | GP  | M0  | alphatex                                                    | —    | planned |
| REND-003 | Standard notation only                                                            | GP  | M0  | alphatex                                                    | —    | planned |
| REND-004 | Rhythm / slash notation                                                           | GP  | M2  | alphatab/guitarpro7/slash.gp                                | —    | planned |
| REND-005 | Numbered (jianpu) notation                                                        | OT  | M2  | —                                                           | —    | planned |
| REND-006 | Lead-sheet / chord-chart layout (chords over lyrics)                              | OT  | M5  | —                                                           | —    | planned |
| REND-007 | Up to 4 voices with correct stem directions and rest placement                    | GP  | M2  | —                                                           | —    | planned |
| REND-010 | Page layout on A4 paper                                                           | GP  | M0  | —                                                           | —    | planned |
| REND-011 | Page layout on US Letter paper                                                    | GP  | M0  | —                                                           | —    | planned |
| REND-012 | Custom paper size and margins                                                     | GP  | M2  | —                                                           | —    | planned |
| REND-013 | Horizontal (continuous) layout                                                    | GP  | M0  | —                                                           | —    | planned |
| REND-014 | Vertical scroll layout                                                            | GP  | M0  | —                                                           | —    | planned |
| REND-015 | Zoom 25–400 %                                                                     | GP  | M0  | —                                                           | —    | planned |
| REND-016 | Respect the file's own systems layout (bars per system, bar proportions)          | GP  | M0  | alphatab/guitarpro7/layout-configuration-multi-track-all.gp | —    | planned |
| REND-017 | HiDPI-crisp vector rendering                                                      | GP  | M0  | —                                                           | —    | planned |
| REND-018 | Smooth reflow on window resize                                                    | GP  | M0  | —                                                           | —    | planned |
| REND-019 | Virtualized rendering: only visible systems are painted and attached              | OT  | M0  | —                                                           | —    | planned |
| REND-020 | Notation layout and rendering in a Web Worker                                     | OT  | M0  | —                                                           | —    | planned |
| REND-021 | Instant theme switch of rendered notation (no re-render)                          | OT  | M0  | —                                                           | —    | planned |
| REND-030 | Show all tracks or any subset of tracks                                           | GP  | M0  | alphatab/guitarpro5/staves.gp5                              | —    | planned |
| REND-031 | Per-track staff visibility (standard / tab / slash / numbered)                    | GP  | M2  | —                                                           | —    | planned |
| REND-032 | Transposing instruments: concert vs written pitch display                         | GP  | M2  | alphatab/guitarpro8/transposition-tonality-a.gp             | —    | planned |
| REND-033 | Capo display                                                                      | GP  | M2  | —                                                           | —    | planned |
| REND-034 | Tuning display (score header)                                                     | GP  | M0  | alphatab/guitarpro5/hide-tuning.gp5                         | —    | planned |
| REND-035 | Track names and short names on systems                                            | GP  | M0  | alphatab/guitarpro8/track-names.gp                          | —    | planned |
| REND-036 | Track colours                                                                     | GP  | M2  | alphatab/guitarpro7/colors.gp                               | —    | planned |
| REND-040 | Score header: title, subtitle, artist, album, words, music, copyright, tab author | GP  | M0  | alphatab/guitarpro7/score-info.gp                           | —    | planned |
| REND-041 | Score header: instructions and notice                                             | GP  | M2  | —                                                           | —    | planned |
| REND-042 | Page header and footer (page numbers, title on following pages)                   | GP  | M0  | alphatab/guitarpro8/header-footer.gp                        | —    | planned |
| REND-100 | Bend (any amount, quarter-tone steps)                                             | GP  | M2  | alphatab/guitarpro7/bends.gp                                | —    | planned |
| REND-101 | Bend and release                                                                  | GP  | M2  | alphatab/guitarpro7/bends.gp                                | —    | planned |
| REND-102 | Bend, release, bend                                                               | GP  | M2  | alphatab/guitarpro7/bends-advanced.gp                       | —    | planned |
| REND-103 | Pre-bend                                                                          | GP  | M2  | alphatab/guitarpro7/bends.gp                                | —    | planned |
| REND-104 | Pre-bend and release                                                              | GP  | M2  | alphatab/guitarpro7/bends.gp                                | —    | planned |
| REND-105 | Pre-bend and bend                                                                 | GP  | M2  | alphatab/guitarpro7/bends-advanced.gp                       | —    | planned |
| REND-106 | Bend and hold                                                                     | GP  | M2  | alphatab/guitarpro7/bends-advanced.gp                       | —    | planned |
| REND-107 | Whammy bar: dive                                                                  | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | —    | planned |
| REND-108 | Whammy bar: dip                                                                   | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | —    | planned |
| REND-109 | Whammy bar: hold, return, pre-dive, pre-dive and dive                             | GP  | M2  | alphatab/guitarpro7/whammy-advanced.gp                      | —    | planned |
| REND-110 | Legato slide                                                                      | GP  | M2  | alphatab/guitarpro7/slides.gp                               | —    | planned |
| REND-111 | Shift slide                                                                       | GP  | M2  | alphatab/guitarpro7/slides.gp                               | —    | planned |
| REND-112 | Slide into the note from below / from above                                       | GP  | M2  | alphatab/guitarpro7/slides.gp                               | —    | planned |
| REND-113 | Slide out of the note downwards / upwards                                         | GP  | M2  | alphatab/guitarpro7/slides.gp                               | —    | planned |
| REND-114 | Pick slide (scrape) up / down                                                     | GP  | M2  | alphatab/guitarpro7/pick-slide.gp                           | —    | planned |
| REND-115 | Hammer-on / pull-off with slur                                                    | GP  | M2  | alphatab/guitarpro7/hammer.gp                               | —    | planned |
| REND-116 | Left-hand tapping                                                                 | GP  | M2  | alphatab/guitarpro7/left-hand-tap.gp                        | —    | planned |
| REND-117 | Right-hand tapping                                                                | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | —    | planned |
| REND-118 | Slap and pop                                                                      | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | —    | planned |
| REND-119 | Natural harmonic                                                                  | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-120 | Artificial harmonic                                                               | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-121 | Pinch harmonic                                                                    | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-122 | Tapped harmonic                                                                   | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-123 | Semi harmonic                                                                     | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-124 | Feedback harmonic                                                                 | GP  | M2  | alphatab/guitarpro7/harmonics.gp                            | —    | planned |
| REND-125 | Note vibrato, slight and wide                                                     | GP  | M2  | alphatab/guitarpro7/vibrato.gp                              | —    | planned |
| REND-126 | Beat (whammy) vibrato, slight and wide                                            | GP  | M2  | alphatab/guitarpro7/tremolo-vibrato.gp                      | —    | planned |
| REND-127 | Palm mute                                                                         | GP  | M2  | alphatab/guitarpro7/effects.gp                              | —    | planned |
| REND-128 | Let ring                                                                          | GP  | M2  | alphatab/guitarpro7/effects.gp                              | —    | planned |
| REND-129 | Dead (muted) notes                                                                | GP  | M2  | alphatab/guitarpro7/dead.gp                                 | —    | planned |
| REND-130 | Ghost notes                                                                       | GP  | M2  | alphatab/guitarpro7/effects.gp                              | —    | planned |
| REND-131 | Accent and heavy accent                                                           | GP  | M2  | alphatab/guitarpro7/accentuations.gp                        | —    | planned |
| REND-132 | Staccato and staccatissimo                                                        | GP  | M2  | alphatab/guitarpro7/accentuations.gp                        | —    | planned |
| REND-133 | Tenuto                                                                            | GP  | M2  | alphatab/guitarpro7/accentuations.gp                        | —    | planned |
| REND-134 | Grace notes (before and on the beat)                                              | GP  | M2  | alphatab/guitarpro7/grace.gp                                | —    | planned |
| REND-135 | Tremolo picking (8th / 16th / 32nd)                                               | GP  | M2  | alphatab/guitarpro7/tremolo.gp                              | —    | planned |
| REND-136 | Trills with speed                                                                 | GP  | M2  | alphatab/guitarpro7/trills.gp                               | —    | planned |
| REND-137 | Rasgueado                                                                         | GP  | M2  | —                                                           | —    | planned |
| REND-138 | Pick strokes (up / down)                                                          | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | —    | planned |
| REND-139 | Brush strokes (up / down)                                                         | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | —    | planned |
| REND-140 | Arpeggio (up / down)                                                              | GP  | M2  | alphatab/guitarpro7/strokes.gp                              | —    | planned |
| REND-141 | Left-hand fingering                                                               | GP  | M2  | alphatab/guitarpro7/fingering.gp                            | —    | planned |
| REND-142 | Right-hand fingering (p i m a c)                                                  | GP  | M2  | alphatab/guitarpro7/fingering.gp                            | —    | planned |
| REND-143 | Dynamics ppp–fff                                                                  | GP  | M2  | —                                                           | —    | planned |
| REND-144 | Hairpins (crescendo / decrescendo)                                                | GP  | M2  | —                                                           | —    | planned |
| REND-145 | Fade in, fade out, volume swell                                                   | GP  | M2  | alphatab/guitarpro7/other-effects.gp                        | —    | planned |
| REND-146 | Ottava lines (8va, 8vb, 15ma, 15mb)                                               | GP  | M2  | alphatab/guitarpro7/ottavia.gp                              | —    | planned |
| REND-147 | Tuplets of any ratio                                                              | GP  | M2  | alphatab/guitarpro7/tuplets.gp                              | —    | planned |
| REND-148 | Nested tuplets                                                                    | GP  | M2  | —                                                           | —    | planned |
| REND-149 | Ties                                                                              | GP  | M2  | alphatab/guitarpro7/notes.gp                                | —    | planned |
| REND-150 | Dotted and double-dotted durations                                                | GP  | M2  | —                                                           | —    | planned |
| REND-151 | Rests of every duration, positioned per voice                                     | GP  | M2  | —                                                           | —    | planned |
| REND-152 | Fermatas (short / medium / long)                                                  | GP  | M2  | alphatab/guitarpro7/fermata.gp                              | —    | planned |
| REND-153 | Time signature changes, including common and cut time                             | GP  | M2  | alphatab/guitarpro7/time-signatures.gp                      | —    | planned |
| REND-154 | Key signature changes (major and minor)                                           | GP  | M2  | alphatab/guitarpro7/key-signatures.gp                       | —    | planned |
| REND-155 | Tempo changes and tempo text                                                      | GP  | M2  | alphatab/guitarpro8/beat-tempo-change.gp                    | —    | planned |
| REND-156 | Tempo ramps (accelerando / ritardando)                                            | GP  | M2  | —                                                           | —    | planned |
| REND-157 | Swing / triplet-feel indicators                                                   | GP  | M2  | —                                                           | —    | planned |
| REND-158 | Anacrusis (pickup bar)                                                            | GP  | M2  | alphatab/guitarpro7/anacrusis.gp                            | —    | planned |
| REND-159 | Free time                                                                         | GP  | M2  | —                                                           | —    | planned |
| REND-160 | Repeats with play count                                                           | GP  | M2  | alphatab/guitarpro7/repeat-close-multi.gp                   | —    | planned |
| REND-161 | Alternate endings                                                                 | GP  | M2  | alphatab/guitarpro7/repeat-close-alternate-endings.gp       | —    | planned |
| REND-162 | Segno, Segno Segno, Coda, Double Coda symbols                                     | GP  | M2  | alphatab/guitarpro8/directions.gp                           | —    | planned |
| REND-163 | Fine, To Coda, To Double Coda                                                     | GP  | M2  | alphatab/guitarpro8/directions.gp                           | —    | planned |
| REND-164 | Every D.C. variant (D.C., al Fine, al Coda, al Double Coda)                       | GP  | M2  | alphatab/guitarpro8/directions.gp                           | —    | planned |
| REND-165 | Every D.S. / D.S.S. variant (al Fine, al Coda, al Double Coda)                    | GP  | M2  | alphatab/guitarpro8/directions.gp                           | —    | planned |
| REND-166 | Markers / sections                                                                | GP  | M2  | —                                                           | —    | planned |
| REND-167 | Barline types (single, double, final, dashed, dotted, heavy, tick, short…)        | GP  | M2  | alphatab/guitarpro8/extended-barlines.gp                    | —    | planned |
| REND-168 | Text annotations on beats                                                         | GP  | M2  | —                                                           | —    | planned |
| REND-169 | Chord names above the staff                                                       | GP  | M2  | alphatab/guitarpro7/chords.gp                               | —    | planned |
| REND-170 | Chord diagrams in the staff                                                       | GP  | M2  | alphatab/guitarpro8/show-diagrams-in-score.gp               | —    | planned |
| REND-171 | Chord diagram block at the top of the score                                       | GP  | M2  | alphatab/guitarpro8/hide-diagrams.gp                        | —    | planned |
| REND-172 | Multi-line lyrics with syllable alignment                                         | GP  | M2  | alphatab/guitarpro7/lyrics-template.gp                      | —    | planned |
| REND-173 | Drum notation with correct noteheads and positions                                | GP  | M2  | alphatab/guitarpro5/percussion-all.gp5                      | —    | planned |
| REND-174 | Clefs (treble, bass, alto, tenor, neutral; octave clefs)                          | GP  | M2  | —                                                           | —    | planned |
| REND-175 | Beaming modes and custom beaming                                                  | GP  | M2  | alphatab/guitarpro8/custom-beaming.gp                       | —    | planned |
| REND-176 | Multibar rests                                                                    | GP  | M2  | alphatab/guitarpro8/multibar-rest.gp                        | —    | planned |
| REND-177 | Simile marks (one and two bars)                                                   | GP  | M2  | alphatab/guitarpro7/simile-mark.gp                          | —    | planned |
| REND-178 | Golpe                                                                             | GP  | M2  | —                                                           | —    | planned |
| REND-179 | Wah pedal open / closed                                                           | GP  | M2  | alphatab/guitarpro5/wah-wah.gp5                             | —    | planned |
| REND-180 | Sustain pedal                                                                     | GP  | M2  | —                                                           | —    | planned |
| REND-181 | Barré indication                                                                  | GP  | M2  | —                                                           | —    | planned |
| REND-182 | Ornaments (turns, mordents)                                                       | GP  | M2  | —                                                           | —    | planned |
| REND-183 | Slurs                                                                             | GP  | M2  | —                                                           | —    | planned |
| REND-184 | Bar numbers (every bar / first of system / hidden)                                | GP  | M2  | alphatab/guitarpro8/barnumbers-all.gp                       | —    | planned |
| REND-185 | Beat timer (absolute time above beats)                                            | GP  | M2  | alphatab/guitarpro8/timer.gp                                | —    | planned |
| REND-300 | Note colouring by string                                                          | OT  | M2  | —                                                           | —    | planned |
| REND-301 | Note colouring by interval                                                        | OT  | M2  | —                                                           | —    | planned |
| REND-302 | Note colouring by scale degree                                                    | OT  | M2  | —                                                           | —    | planned |
| REND-303 | Note colouring by chord tone                                                      | OT  | M2  | —                                                           | —    | planned |
| REND-304 | Roman numeral analysis row                                                        | OT  | M5  | —                                                           | —    | planned |
| REND-305 | Nashville number row                                                              | OT  | M5  | —                                                           | —    | planned |
| REND-306 | Note names in tablature                                                           | OT  | M2  | —                                                           | —    | planned |
| REND-307 | Microtonal accidentals                                                            | OT  | M5  | —                                                           | —    | planned |
| REND-308 | Per-note annotations                                                              | OT  | M5  | —                                                           | —    | planned |
| REND-309 | Comment layer                                                                     | OT  | M5  | —                                                           | —    | planned |
| REND-310 | Custom notation styling presets                                                   | OT  | M2  | —                                                           | —    | planned |

## Playback

| ID       | Feature                                               | Src | M   | Fixture                                               | Test | Status  |
| -------- | ----------------------------------------------------- | --- | --- | ----------------------------------------------------- | ---- | ------- |
| PLAY-001 | Play / pause / stop                                   | GP  | M1  | —                                                     | —    | planned |
| PLAY-002 | Click any beat to seek                                | GP  | M1  | —                                                     | —    | planned |
| PLAY-003 | Bar stepping (previous / next bar)                    | GP  | M1  | —                                                     | —    | planned |
| PLAY-004 | Jump to section                                       | GP  | M1  | —                                                     | —    | planned |
| PLAY-005 | Go to bar                                             | GP  | M1  | —                                                     | —    | planned |
| PLAY-006 | Mini-map / timeline scrubber                          | OT  | M1  | —                                                     | —    | planned |
| PLAY-007 | Tap tempo                                             | OT  | M1  | —                                                     | —    | planned |
| PLAY-008 | Keyboard shortcuts for every transport action         | GP  | M1  | —                                                     | —    | planned |
| PLAY-010 | Beat cursor                                           | GP  | M1  | —                                                     | —    | planned |
| PLAY-011 | Bar highlight                                         | GP  | M1  | —                                                     | —    | planned |
| PLAY-012 | Note highlighting                                     | OT  | M1  | —                                                     | —    | planned |
| PLAY-013 | Auto-scroll: continuous                               | GP  | M1  | —                                                     | —    | planned |
| PLAY-014 | Auto-scroll: page flip                                | GP  | M1  | —                                                     | —    | planned |
| PLAY-015 | Auto-scroll: off                                      | GP  | M1  | —                                                     | —    | planned |
| PLAY-016 | Configurable auto-scroll offset                       | OT  | M1  | —                                                     | —    | planned |
| PLAY-017 | Cursor and auto-scroll work in every layout           | GP  | M1  | —                                                     | —    | planned |
| PLAY-020 | Repeat traversal identical to Guitar Pro              | GP  | M1  | alphatab/guitarpro7/repeat-close-multi.gp             | —    | planned |
| PLAY-021 | Alternate-ending traversal                            | GP  | M1  | alphatab/guitarpro7/repeat-close-alternate-endings.gp | —    | planned |
| PLAY-022 | Direction traversal (D.C., D.S., Coda, Fine variants) | GP  | M1  | alphatab/guitarpro8/directions.gp                     | —    | planned |
| PLAY-023 | Full tempo map including ramps                        | GP  | M1  | —                                                     | —    | planned |
| PLAY-024 | Dynamics affect velocity                              | GP  | M1  | —                                                     | —    | planned |
| PLAY-025 | Volume and pan automation                             | GP  | M1  | —                                                     | —    | planned |
| PLAY-030 | Audible bends as pitch-bend curves                    | GP  | M1  | alphatab/guitarpro7/bends.gp                          | —    | planned |
| PLAY-031 | Audible vibrato                                       | GP  | M1  | —                                                     | —    | planned |
| PLAY-032 | Audible slides                                        | GP  | M1  | —                                                     | —    | planned |
| PLAY-033 | Audible hammer-ons / pull-offs                        | GP  | M1  | —                                                     | —    | planned |
| PLAY-034 | Harmonics sound at the correct pitch                  | GP  | M1  | —                                                     | —    | planned |
| PLAY-035 | Audible palm mute                                     | GP  | M1  | —                                                     | —    | planned |
| PLAY-036 | Audible let ring                                      | GP  | M1  | —                                                     | —    | planned |
| PLAY-037 | Audible dead notes                                    | GP  | M1  | —                                                     | —    | planned |
| PLAY-038 | Audible tremolo picking                               | GP  | M1  | —                                                     | —    | planned |
| PLAY-039 | Audible trills                                        | GP  | M1  | —                                                     | —    | planned |
| PLAY-040 | Audible slap / pop                                    | GP  | M1  | —                                                     | —    | planned |
| PLAY-041 | Audible grace notes                                   | GP  | M1  | —                                                     | —    | planned |
| PLAY-042 | Audible staccato                                      | GP  | M1  | —                                                     | —    | planned |
| PLAY-043 | Audible fades and swells                              | GP  | M1  | —                                                     | —    | planned |
| PLAY-044 | Audible whammy bar                                    | GP  | M1  | —                                                     | —    | planned |
| PLAY-050 | Mixer: per-track volume                               | GP  | M1  | —                                                     | —    | planned |
| PLAY-051 | Mixer: per-track pan                                  | GP  | M1  | —                                                     | —    | planned |
| PLAY-052 | Mixer: mute                                           | GP  | M1  | —                                                     | —    | planned |
| PLAY-053 | Mixer: solo                                           | GP  | M1  | —                                                     | —    | planned |
| PLAY-054 | Mixer: program and bank                               | GP  | M1  | —                                                     | —    | planned |
| PLAY-055 | Mixer: playback transpose                             | GP  | M1  | —                                                     | —    | planned |
| PLAY-056 | Practice mode: mute my track                          | OT  | M1  | —                                                     | —    | planned |
| PLAY-057 | Master volume                                         | GP  | M1  | —                                                     | —    | planned |
| PLAY-058 | Mixer state persisted per song                        | OT  | M1  | —                                                     | —    | planned |
| PLAY-060 | Buses and sends                                       | OT  | M7  | —                                                     | —    | planned |
| PLAY-061 | Automation lanes                                      | OT  | M7  | —                                                     | —    | planned |
| PLAY-062 | Per-track EQ with spectrum analyzer                   | OT  | M7  | —                                                     | —    | planned |
| PLAY-063 | Master limiter                                        | OT  | M7  | —                                                     | —    | planned |
| PLAY-064 | Stereo width                                          | OT  | M7  | —                                                     | —    | planned |
| PLAY-065 | Humanize (timing / velocity)                          | OT  | M7  | —                                                     | —    | planned |
| PLAY-066 | Groove templates                                      | OT  | M7  | —                                                     | —    | planned |
| PLAY-070 | Web MIDI output to external synths                    | OT  | M7  | —                                                     | —    | planned |

## Practice and performance

| ID       | Feature                                                         | Src | M   | Fixture                               | Test | Status  |
| -------- | --------------------------------------------------------------- | --- | --- | ------------------------------------- | ---- | ------- |
| PRAC-001 | Metronome: BPM and tap tempo                                    | GP  | M1  | —                                     | —    | planned |
| PRAC-002 | Metronome: subdivisions                                         | OT  | M1  | —                                     | —    | planned |
| PRAC-003 | Metronome: accent patterns                                      | OT  | M1  | —                                     | —    | planned |
| PRAC-004 | Metronome: programmable patterns                                | OT  | M1  | —                                     | —    | planned |
| PRAC-005 | Metronome: polyrhythms                                          | OT  | M1  | —                                     | —    | planned |
| PRAC-006 | Metronome: swing amount                                         | OT  | M1  | —                                     | —    | planned |
| PRAC-007 | Metronome: multiple click sounds                                | OT  | M1  | —                                     | —    | planned |
| PRAC-008 | Metronome: visual conductor / flash                             | OT  | M1  | —                                     | —    | planned |
| PRAC-009 | Metronome: random beat-drop training                            | OT  | M1  | —                                     | —    | planned |
| PRAC-010 | Metronome-only page usable without a song                       | OT  | M1  | —                                     | —    | planned |
| PRAC-011 | Count-in of 1–2 bars, audible and visual                        | GP  | M1  | —                                     | —    | planned |
| PRAC-020 | Speed 10–300 % without pitch change                             | GP+ | M1  | —                                     | —    | planned |
| PRAC-021 | Fine-grained speed steps                                        | GP  | M1  | —                                     | —    | planned |
| PRAC-022 | Progressive speed trainer (start %, step per loop, target %)    | GP  | M1  | —                                     | —    | planned |
| PRAC-023 | Per-section target tempos                                       | OT  | M6  | —                                     | —    | planned |
| PRAC-024 | Auto-slowdown of trouble bars (tempo-map override)              | OT  | M6  | —                                     | —    | planned |
| PRAC-030 | Loop a bar or beat range                                        | GP  | M1  | —                                     | —    | planned |
| PRAC-031 | A/B loop points                                                 | OT  | M1  | —                                     | —    | planned |
| PRAC-032 | Multiple named saved loops per song                             | OT  | M6  | —                                     | —    | planned |
| PRAC-033 | Loop playlists with auto-advance                                | OT  | M6  | —                                     | —    | planned |
| PRAC-034 | Loop count                                                      | OT  | M1  | —                                     | —    | planned |
| PRAC-035 | Rest bars between loops                                         | OT  | M1  | —                                     | —    | planned |
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
| PRAC-100 | Tuner: microphone pitch detection (YIN / MPM)                   | GP  | M2  | —                                     | —    | planned |
| PRAC-101 | Tuner: cents readout                                            | GP  | M2  | —                                     | —    | planned |
| PRAC-102 | Tuner follows the track's tuning (drop / open / custom)         | GP+ | M2  | —                                     | —    | planned |

## Views

| ID       | Feature                                                   | Src | M   | Fixture | Test | Status  |
| -------- | --------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| VIEW-001 | Virtual fretboard per track (any string count and tuning) | GP  | M1  | —       | —    | planned |
| VIEW-002 | Fretboard: left-handed                                    | GP  | M1  | —       | —    | planned |
| VIEW-003 | Fretboard: current and upcoming notes                     | OT  | M1  | —       | —    | planned |
| VIEW-004 | Fretboard: interval / scale / CAGED overlays              | OT  | M5  | —       | —    | planned |
| VIEW-005 | Piano keyboard view                                       | GP  | M2  | —       | —    | planned |
| VIEW-006 | Drum pad view                                             | GP  | M2  | —       | —    | planned |
| VIEW-007 | Chord diagram panel                                       | GP  | M2  | —       | —    | planned |
| VIEW-008 | Scale diagrams                                            | GP  | M5  | —       | —    | planned |
| VIEW-009 | Note-name view                                            | OT  | M2  | —       | —    | planned |
| VIEW-010 | Lyrics pane                                               | GP  | M2  | —       | —    | planned |
| VIEW-011 | Song info / notice page                                   | GP  | M2  | —       | —    | planned |
| VIEW-012 | Section navigator                                         | OT  | M2  | —       | —    | planned |
| VIEW-013 | Fullscreen / presentation mode                            | GP  | M2  | —       | —    | planned |
| VIEW-014 | Shortcut cheat sheet                                      | OT  | M1  | —       | —    | planned |

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

## Audio engine

| ID      | Feature                                                                                          | Src | M   | Fixture | Test | Status  |
| ------- | ------------------------------------------------------------------------------------------------ | --- | --- | ------- | ---- | ------- |
| AUD-001 | AudioWorklet-based, glitch-free, low-latency output                                              | OT  | M1  | —       | —    | planned |
| AUD-002 | Correct playback when the tab is backgrounded                                                    | OT  | M1  | —       | —    | planned |
| AUD-003 | Sample-accurate scheduling                                                                       | OT  | M1  | —       | —    | planned |
| AUD-004 | Per-track stereo panning                                                                         | GP  | M1  | —       | —    | planned |
| AUD-005 | Compact default GM SoundFont for instant playback                                                | GP  | M1  | —       | —    | planned |
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

## Export and print

| ID      | Feature                                                               | Src | M   | Fixture | Test | Status  |
| ------- | --------------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| EXP-001 | PDF (vector, fonts embedded, correct pagination)                      | GP  | M2  | —       | —    | planned |
| EXP-002 | PNG                                                                   | GP  | M2  | —       | —    | planned |
| EXP-003 | SVG                                                                   | OT  | M2  | —       | —    | planned |
| EXP-004 | MIDI (effects as pitch bend / CC, tempo map, markers)                 | GP  | M2  | —       | —    | planned |
| EXP-005 | WAV                                                                   | GP  | M2  | —       | —    | planned |
| EXP-006 | MP3                                                                   | GP  | M7  | —       | —    | planned |
| EXP-007 | OGG                                                                   | GP  | M7  | —       | —    | planned |
| EXP-008 | FLAC                                                                  | GP  | M7  | —       | —    | planned |
| EXP-009 | Per-track stems                                                       | OT  | M7  | —       | —    | planned |
| EXP-010 | Guitar Pro 7/8 (.gp)                                                  | GP  | M4  | —       | —    | planned |
| EXP-011 | OpenTabz project (.otz)                                               | OT  | M4  | —       | —    | planned |
| EXP-012 | alphaTex                                                              | OT  | M4  | —       | —    | planned |
| EXP-013 | ASCII tab                                                             | GP  | M5  | —       | —    | planned |
| EXP-014 | ChordPro                                                              | OT  | M5  | —       | —    | planned |
| EXP-015 | MusicXML                                                              | GP  | M5  | —       | —    | planned |
| EXP-016 | Print via CSS with proper pagination                                  | GP  | M2  | —       | —    | planned |
| EXP-017 | Batch export of a folder                                              | OT  | M8  | —       | —    | planned |
| EXP-018 | Video: scrolling score with cursor and audio → MP4 / WebM (WebCodecs) | OT  | M7  | —       | —    | planned |
| EXP-019 | GIF of a selected lick                                                | OT  | M7  | —       | —    | planned |
| EXP-020 | Round-trip fidelity .gp → OpenTabz → .gp locked by tests              | OT  | M4  | —       | —    | planned |

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
| PLAT-030 | Settings: theme                                             | GP  | M0  | —       | —    | planned |
| PLAT-031 | Settings: default layout and workspace                      | GP  | M3  | —       | —    | planned |
| PLAT-032 | Settings: notation preferences                              | GP  | M2  | —       | —    | planned |
| PLAT-033 | Settings: synth and sound-pack selection                    | GP  | M7  | —       | —    | planned |
| PLAT-034 | Settings: audio latency hint                                | OT  | M1  | —       | —    | planned |
| PLAT-035 | Settings: left-handed                                       | GP  | M1  | —       | —    | planned |
| PLAT-036 | Settings: rebindable shortcuts                              | GP  | M3  | —       | —    | planned |
| PLAT-040 | Sandboxed scripting API that reads and transforms the score | OT  | M8  | —       | —    | planned |
| PLAT-041 | Scripts add commands and panels                             | OT  | M8  | —       | —    | planned |
| PLAT-042 | Scripts register exporters                                  | OT  | M8  | —       | —    | planned |
| PLAT-043 | Scripts shareable as files                                  | OT  | M8  | —       | —    | planned |
| PLAT-044 | Theme API                                                   | OT  | M8  | —       | —    | planned |

## Workspace and UX

| ID     | Feature                                                                                                                     | Src | M   | Fixture  | Test | Status  |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | --- | --- | -------- | ---- | ------- |
| UX-001 | Home page is the drop zone; no onboarding, sign-up or modal before the first note                                           | OT  | M0  | —        | —    | planned |
| UX-002 | **New** button on the home page; blank page to first note in under five seconds                                             | OT  | M4  | —        | —    | planned |
| UX-003 | Original demo scores openable from the home page                                                                            | OT  | M0  | alphatex | —    | planned |
| UX-010 | Dockable workspace (score, fretboard, mixer, tuner, chord palette, lyrics, arrangement, piano roll, drum grid, text editor) | OT  | M3  | —        | —    | planned |
| UX-011 | Drag, dock and pop out panels                                                                                               | OT  | M3  | —        | —    | planned |
| UX-012 | Named workspace layouts                                                                                                     | OT  | M3  | —        | —    | planned |
| UX-013 | Split view: two documents, or two views of one                                                                              | OT  | M3  | —        | —    | planned |
| UX-014 | Command palette (Ctrl/Cmd+K) exposing every action                                                                          | OT  | M3  | —        | —    | planned |
| UX-015 | Every action reachable within one click or one shortcut                                                                     | OT  | M3  | —        | —    | planned |
| UX-020 | Themes: light, dark, sepia, stage-dark                                                                                      | OT  | M0  | —        | —    | planned |
| UX-021 | Desktop and mobile first-class; no feature removed on mobile                                                                | OT  | M3  | —        | —    | planned |
| UX-022 | All user-facing strings in one module                                                                                       | OT  | M0  | —        | —    | planned |

## Performance budgets (hard gates)

| ID       | Feature                                                | Src | M   | Fixture   | Test | Status  |
| -------- | ------------------------------------------------------ | --- | --- | --------- | ---- | ------- |
| PERF-001 | Warm start to interactive < 1 s                        | OT  | M0  | —         | —    | planned |
| PERF-002 | File drop → first render < 300 ms (5 tracks, 150 bars) | OT  | M0  | generated | —    | planned |
| PERF-003 | File drop → first render < 1.5 s (20 tracks, 500 bars) | OT  | M0  | generated | —    | planned |
| PERF-004 | Local operations under 100 ms, never a spinner         | OT  | M0  | —         | —    | planned |
| PERF-005 | Steady 60 fps cursor, scrolling and editing            | OT  | M1  | —         | —    | planned |
| PERF-006 | Playback starts < 100 ms after pressing space          | OT  | M1  | —         | —    | planned |
| PERF-007 | Pitch-detection feedback < 50 ms                       | OT  | M6  | —         | —    | planned |
| PERF-008 | Initial JS < 300 KB gzip before the engine chunk       | OT  | M0  | —         | —    | planned |
| PERF-009 | Zero console errors or warnings in production          | OT  | M0  | —         | —    | planned |

## Project and compliance

| ID       | Feature                                                                                 | Src | M   | Fixture | Test | Status  |
| -------- | --------------------------------------------------------------------------------------- | --- | --- | ------- | ---- | ------- |
| PROJ-001 | CI: typecheck, lint, unit, E2E, bundle budgets, Lighthouse ≥ 95                         | OT  | M0  | —       | —    | planned |
| PROJ-002 | Deploys to opentabz.com with preview deploys per PR                                     | OT  | M0  | —       | —    | planned |
| PROJ-003 | Repository hygiene: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE, templates | OT  | M0  | —       | —    | planned |
| PROJ-004 | THIRD_PARTY_NOTICES covers every dependency and asset                                   | OT  | M0  | —       | —    | planned |
| PROJ-005 | Trademark disclaimer in footer and README                                               | OT  | M0  | —       | —    | planned |
| PROJ-006 | No network requests except own assets and user-requested sound packs                    | OT  | M0  | —       | —    | planned |
| PROJ-007 | Conventional commits, changelog, semantic versioning, Renovate                          | OT  | M0  | —       | —    | planned |
