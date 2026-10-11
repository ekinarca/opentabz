# Research

Findings that ground OpenTabz's architecture, scope and fixtures. Written before application
code (M0) and extended as milestones dig deeper. Sources are primary (source code, specs,
licence files) unless noted.

## 1. Method

- Read alphaTab 1.8.4's published typings (`dist/alphaTab.d.ts`, 16.6k lines) and its TypeScript
  sources at tag `v1.8.4` (layouts, renderer, worker protocol, importers, SVG canvas, font
  measurement, MIDI generator, browser UI facade).
- Parsed every file of alphaTab's `test-data` with the real importers in Node to inventory
  metadata, sizes and timings (§4).
- Built a throwaway browser spike that runs alphaTab's `ScoreRenderer` inside a plain module
  worker and places SVG partials on the main thread (§3).
- Researched file formats, licences and Guitar Pro's public feature lists (§5–§8).

## 2. alphaTab 1.8.4 — what the engine gives us

Package `@coderline/alphatab` (MPL-2.0, Daniel Kuschny and contributors). Latest stable is 1.8.4
(2026-08); 1.9.0 is in alpha. Its own toolchain is TypeScript 6.0, Vite 8 and Vitest 4.

**Distribution.** ESM (`alphaTab.mjs` → `alphaTab.core.mjs`, 2.2 MB unminified, 1.1 MB minified,
≈ 278 KB gzip), UMD, a worker entry and an AudioWorklet entry (both thin stubs that import the
core), a Vite plugin and a webpack plugin (they rewrite worker/worklet URLs and copy assets),
Bravura (woff2 313 KB, woff, otf, svg, eot; SIL OFL 1.1) and the SONiVOX GM SoundFont
(`sonivox.sf2` 1.35 MB, `sonivox.sf3` 0.98 MB; Apache-2.0). The bundle embeds TinySoundFont,
SFZero, Haxe std (XML, inflate), SharpZipLib (deflate) and NVorbis — all MIT — plus code adopted
from libvorbis (BSD-3-Clause).

**Importers** (`Environment.buildImporters()`): Guitar Pro 3–5, Guitar Pro 6 (`.gpx`), Guitar Pro
7–8 (`.gp`), MusicXML (plain and `.mxl`), Capella (`.capx`), alphaTex. `ScoreLoader` tries them in
order and only moves on when an importer throws `UnsupportedFormatError`; any other error aborts.
No MIDI, ASCII tab, ChordPro, PowerTab or TuxGuitar importer exists — OpenTabz writes those.

**Exporters:** Guitar Pro 7 (`Gp7Exporter`, writes `.gp` with `score.gpif`), alphaTex. MIDI files
come from `MidiFileGenerator` + `MidiFile.toBinary()`. `exportAudio()` (since 1.6) renders PCM
chunks; there is no MusicXML exporter and no compressed-audio encoder.

**Model.** `Score → MasterBar[] + Track[] → Staff[] → Bar[] → Voice[] → Beat[] → Note[]`, with
automations, sync points (audio tracks), stylesheet, per-element `style` colours, lyrics,
chords, sections, directions, repeat groups. `JsonConverter` serializes the whole model to plain
objects (used to cross worker boundaries).

**Rendering.** `ScoreRenderer` (public) lays out and paints with an SVG engine (strings) or
canvas engines. Layouts: `Page` (vertical, automatic wrapping), `Parchment` (vertical, honours
the file's bars-per-system and bar proportions from Guitar Pro 6–8), `Horizontal`. Layout emits
one partial per header block and **one partial per staff system**; with lazy loading each
partial is painted on request (`renderResult(id)`). `render({ firstChangedMasterBar })`
re-lays out only from the system containing that bar, and the resize path re-fits systems
without rebuilding bar renderers. There is no notion of paper size, margins or page breaks.

**Notation coverage** (`NotationElement`, 58 toggles) includes every Guitar Pro effect family
we need to render: bends with tied-bend parentheses, whammy (dive, dip, hold, predive), slides,
pick slides, hammer/pull text, tapping (both hands), slap/pop, six harmonic types, vibrato
(note/beat, slight/wide), palm mute, let ring, dead/ghost notes, accentuations, grace notes,
tremolo picking, trills, rasgueado, pick strokes, brushes/arpeggios, fingering, dynamics,
crescendo, fades, ottava, tuplets, fermatas, triplet feel, free time, repeats, alternate endings,
directions, sections, barline styles, beat text, chord names and diagrams (inline and block),
lyrics, drum notation, golpe, wah, sustain pedal, barré, ornaments, beat timer, bar numbers,
multibar rests, simile marks, numbered (jianpu) notation and slash notation. Fidelity is
verified fixture by fixture in M2; any gap is patched rather than hidden.

**Player.** `AlphaSynth` (TinySoundFont port) plays SF2/SF3, with metronome, count-in, looping,
playback range, speed, per-channel mute/solo/volume/transpose and backing-track sync points.
Web output modes: AudioWorklet or ScriptProcessor; synthesis itself runs in a worker that
streams samples to the output.

**High-level API.** `AlphaTabApi` couples all of the above to the DOM: it parses on the main
thread, keeps the `Score` on the main thread and, with workers enabled, serializes the whole score
into its render worker on every render. It positions partials with an `IntersectionObserver`,
draws cursors and handles selection. OpenTabz does not use it (ADR-0004).

**Text measurement.** The SVG engine measures text with per-family character-width tables
(11 px reference, 0x20–0xFE). Tables are built with a DOM canvas on the main thread; inside a
worker alphaTab falls back to a constant 8 px per character, which misplaces titles, tempo
text, chord names and lyrics. OpenTabz patches the table builder to use `OffscreenCanvas`
when available (patch 0001, see `docs/upstream/`).

**SVG output.** `<svg width="…px" height="…px" class="at-surface-svg">` without `viewBox`;
music glyphs are `<text>` elements of class `at` (SMuFL code points) that rely on a CSS rule
providing the music font family and size; colours are emitted as `fill`/`stroke` attributes,
omitted for pure black text and paths. Observed colour roles: staff lines `#A5A5A5`, bar
separators `#222211`, bar numbers `#C80000`, everything else black — all configurable through
`RenderingResources`, which ADR-0006 builds on.

**alphaTex tooling.** The repository also ships an alphaTex language server and a Monaco
integration (`packages/lsp`, `packages/monaco`), relevant to the M5 text editor.

## 3. Spike: alphaTab rendering in a worker

Throwaway Vite app; Chromium on an Apple-silicon Mac; times measured from bytes arriving in
the worker to the first system being painted on screen (`requestAnimationFrame` after
`innerHTML`). Warm JIT unless noted.

| File (tracks / bars / notes)                | Tracks rendered | Parse        | Layout      | First paint |
| ------------------------------------------- | --------------- | ------------ | ----------- | ----------- |
| effects.gp (1 / 32 / 121)                   | 1               | 5.6–15.9 ms  | 7.6–19.3 ms | 31–44 ms    |
| serenade.gpx (4 / 78 / 2,474)               | 1               | 17.8 ms      | 16.9 ms     | 40 ms       |
| serenade.gpx                                | all 4           | 13.6 ms      | 35.8 ms     | 55 ms       |
| canon.gp5 (9 / 224 / 10,143)                | 1               | 7.5–9.7 ms   | 22–26 ms    | 33–39 ms    |
| canon.gp5                                   | all 9           | 12.4–13.4 ms | 91–105 ms   | 120–127 ms  |
| effects.gp, cold worker (first ever render) | 1               | 20 ms        | 56 ms       | 93 ms       |

Other observations: painting a partial costs ≈ 0.2 ms in the worker; the first screen of SVG is
45–60 KB and `innerHTML` for it ≈ 1 ms; laying out one track of a 224-bar song produces 136
system partials. Conclusions: (1) the 300 ms and 1.5 s budgets are achievable with layout in a
worker, provided the worker is spawned and JIT-warmed before the first drop; (2) reading
layout from the DOM during placement must be avoided (an early spike version that read
`offsetHeight` per partial cost 200–700 ms); (3) the songs used here are real recordings'
transcriptions and only exist in the scratch spike, never in this repository (ADR-0010).

## 4. alphaTab test data inventory

All files in `packages/alphatab/test-data` at `v1.8.4` were parsed in Node with alphaTab's
importers (title, artist, album, copyright, tab author, tracks, bars, notes, timings).

- **Feature files without song content** (empty or placeholder metadata such as
  "Title/Artist/Album" or "Effects", feature-describing beat texts and section names):
  `guitarpro3/` 18 of 18, `guitarpro4/` 22 of 23, `guitarpro5/` 44 of 49, `guitarpro6/` 34 of 35,
  `guitarpro7/` 49 of 50 (plus a `BinaryStylesheet` sample), `guitarpro8/` 41 of 44 `.gp` files,
  `audio/` 13 of 14, `corrupt/healthy.*`, `lyrics/template.gpx`. They were written by alphaTab's
  authors to exercise one feature each (bends, slides, harmonics, …) and are usable under
  MPL-2.0 with attribution.
- **Real songs or lyrics (excluded):** `fade-to-black.gp4`, `canon.gp5`, `canon-audio-track.gp`,
  `chord-name-overflow.gp5`, `nightwish.gp5`, `conversion/full-song.*`, `audio/full-song.gp5`,
  `serenade.*` (all formats), `faulty.gp`, `orphan-tempo-automation.gp`, and
  `beat-text-lyrics.gp5`, whose beat texts are a published song's lyrics. The `visual-tests/`
  folder is not used at all: its layout tests carry another published song's lyrics.
- **How this was checked:** every file was parsed and its title, artist, album, words, music,
  notices, track names, section names, chord names, beat texts and lyrics were printed and read.
- **Parse cost:** biggest real-world-sized file (10k notes) parses in 18–69 ms in Node;
  `JsonConverter` round trip 35–40 ms (to JS) + 14–22 ms (back) for 10k notes — the reason the
  UI never receives the full model (ADR-0004).

## 5. File formats

Full note: [research/formats.md](research/formats.md) (signatures, container layouts, GP 5.00 vs
5.10 differences, BCFZ/BCFS, GPIF, MusicXML encodings, MIDI, Power Tab, TuxGuitar, TablEdit,
Capella, ChordPro, ASCII tab heuristics, parser licences). What shaped the code:

- Detection runs by content in this order: ZIP family (classified by entry names — `opentabz.json`,
  `Content/score.gpif`, TuxGuitar 2's `version.txt`, MuseScore `.mscx` _before_ `container.xml`
  because `.mscz` uses it too, `.mxl`, Capella `score.xml`), GPX `BCFZ`/`BCFS`, length-prefixed
  headers (GP1–5, both clipboard variants, TuxGuitar ≤ 1.5 in UTF-16BE), gzip (unwrapped and
  re-sniffed; Power Tab Editor 2 is gzip-compressed JSON), binary signatures, then text
  (XML root, HTML, alphaTex, ASCII tab, ChordPro). Implemented in `packages/core/src/formats/`.
- Guitar Pro 7/8 cannot be told apart by the `VERSION` entry (always `7.0`); the GPIF
  `<GPVersion>` is read from the first inflated bytes of `score.gpif` instead.
- A ZIP holding exactly one score (ignoring `__MACOSX/` and AppleDouble entries) is unwrapped.
- Guitar Pro 3–5 strings have no declared encoding. OpenTabz reads them as Windows-1252 and
  re-reads as UTF-8 when the result shows UTF-8 mojibake; other code pages (Cyrillic, East Asian)
  need a manual choice, planned with the song-info panel.
- alphaTab caps Guitar Pro 3–5 input at 1,000 bars and 100 tracks; longer legitimate files fail
  with a clear "corrupt" explanation today and the caps are a candidate for an engine patch.
- ChordSheetJS is GPL-2.0-only and therefore unusable; MIT alternatives exist.

## 6. Licences of dependencies and assets

Full note: [research/licenses.md](research/licenses.md); shipped components are listed in
`THIRD_PARTY_NOTICES.md`. Decisions that follow from it:

- **SoundFonts:** MuseScore_General (MIT), FluidR3_GM (MIT), GeneralUser GS (permissive) and
  CC0 FreePats/Karoryfer sets are clean; Arachno (all rights reserved) and TimGM6mb (unclear) are
  not used. alphaTab's bundled SONiVOX file is labelled Apache-2.0 upstream but was uploaded to
  a community site as CC-BY-3.0 with a murky description — M1 resolves this by rebuilding the
  compact default bank from the Apache-2.0 Android SONiVOX sources or choosing a cleaner bank.
- **Encoders:** every MP3 encoder embeds LAME (LGPL), so it ships as a separately loaded module;
  FLAC, Vorbis and Opus have BSD cores. mediabunny is MPL-2.0 (compatible).
- **Audio DSP:** signalsmith-stretch (MIT) for time-stretching; pitchy (MIT) for pitch detection.
- **PDF:** jsPDF + svg2pdf.js (MIT), with music glyphs converted to vector outlines (opentype.js)
  so Bravura's Reserved Font Name terms are respected.
- **Impulse responses:** no verified CC0 cabinet set was found; OpenTabz will generate its own IRs
  and publish them as CC0.
- **Docking:** FlexLayout (MIT) is the preferred React 19 docking library for M3.

## 7. Guitar Pro 8 feature inventory

See [PARITY.md](PARITY.md) for the parity inventory built from Guitar Pro's public feature
lists and how each item maps onto [FEATURE_MATRIX.md](FEATURE_MATRIX.md).

## 8. alphaTex

alphaTex is alphaTab's text notation and the language of OpenTabz's public fixtures. The
verified syntax reference used to author fixtures is in [research/alphatex.md](research/alphatex.md).

## 9. UX references

- **Songsterr** (web player): one track at a time with instant track switching, tab-first
  display, speed slider and loop selection directly on the score, countdown, "solo" and
  "mute" per track, autoscroll that keeps the cursor at a fixed offset.
- **Soundslice** (web player/editor): synchronized real recordings, A/B loops by dragging,
  "slow down" with time-stretch, fretboard and keyboard visualizers, a strong keyboard model.
- **MuseScore** (desktop): editing ergonomics — note input mode, palettes, inspector,
  shortcut-first workflow, consistent selection model.
- **TuxGuitar**: Guitar Pro–style editor semantics, effect dialogs, multi-format importers.

OpenTabz's home page follows the brief: the whole window is the drop zone; no modal before the
first note renders.
