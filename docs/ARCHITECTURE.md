# OpenTabz architecture

Status: living document. Sections marked **(planned, Mx)** describe the design for a later
milestone; everything else describes what the code does. Decisions and their rationale are
recorded as ADRs in [DECISIONS.md](DECISIONS.md); measurements behind them are in
[RESEARCH.md](RESEARCH.md).

## 1. Constraints that shape everything

- **No backend.** Files never leave the device. The only network traffic is the app's own static
  assets and sound packs the user explicitly downloads. No analytics, cookies or tracking.
- **The main thread is sacred.** Parsing, layout, notation rendering, MIDI generation, exporting and
  (from M4) editing run in a worker. The main thread places finished SVG, runs React and handles
  input, so scrolling, cursors and typing stay at 60 fps whatever the engine is doing.
- **Speed budgets are hard gates** (warm start < 1 s, drop → first render < 300 ms for a typical
  file and < 1.5 s for 20 tracks × 500 bars, playback start < 100 ms, initial JS < 300 KB gzip
  before the engine chunk). Every architectural choice below is checked against them.
- **alphaTab is the engine, not the ceiling.** We use its importers, model, layout/renderer,
  MIDI generator, synthesizer and exporters, patch it where it falls short (minimal, upstreamable
  patches, see [upstream/](upstream/)) and extend its model with OpenTabz data stored beside it.

## 2. Process / thread topology

```
┌───────────────────────────── main thread ──────────────────────────────┐
│ React 19 shell · Zustand stores · ScoreView (SVG placement, pages,     │
│ virtualization, cursors/overlays) · input & shortcuts · intake (drop,  │
│ picker, paste, URL)                                                    │
│            ▲ typed RPC + event stream (structured clone / transfer)    │
└────────────┼───────────────────────────────────────────────────────────┘
             ▼
┌─────────────────────────── engine worker ──────────────────────────────┐
│ alphaTab (patched) · @opentabz/core: format detection, import, open    │
│ errors, documents (Score per doc), render sessions (one ScoreRenderer  │
│ per view), SVG post-processing, exporters; from M4 the command layer   │
│ and undo stacks; from M1 MIDI + playback timeline generation           │
└────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── synth worker (§9) ─────────────────────────┐
│ alphaTab AlphaSynth (SoundFont) · metronome · count-in · loop ranges   │
│      │ MIDI from the engine worker (MessagePort, no main-thread hop)    │
│      ▼ stereo frames in a SharedArrayBuffer ring                       │
│ AudioWorklet (audio thread): reads the ring, pings for more            │
└────────────────────────────────────────────────────────────────────────┘
┌────────────── service worker (planned, M3) ─────────────────────────────┐
│ precache app + engine for offline · file handlers · share target       │
└────────────────────────────────────────────────────────────────────────┘
```

The main bundle never imports alphaTab. That keeps the initial JavaScript small, and it means a
pathological file can only ever stall the engine worker. The main thread watches the worker:
a request that exceeds its deadline terminates and respawns the worker, and the user sees a
specific error instead of a frozen tab.

## 3. Repository layout

```
apps/web/            Vite + React 19 application served at opentabz.com
  src/app/           shell, workspace, document tabs, toolbar
  src/engine/        engine worker entry + typed client used by the UI
  src/score-view/    ScoreView: placement, pagination, zoom, theming, virtualization
  src/features/      user-facing features (open, view settings, …)
  src/state/         Zustand stores
  src/strings.ts     every user-facing string (English only)
  src/audio/         audio engine controller, synth worker entry, AudioWorklet, transport FSM
  build/             build-time helpers (production headers for `vite preview`)
  e2e/               Playwright tests (formats, playback, phones, performance budgets)
packages/core/       zero-DOM library: format sniffing, import, open errors, documents,
                     render sessions, bounds, MIDI and playback timelines; later .otz,
                     commands, undo, theory, lint. Runs in Node (tests) and in workers.
  src/shared/        types and constants safe for the main thread (protocol, timelines, views)
  scripts/           generated fixtures (`pnpm fixtures`)
packages/ui/         design tokens, the four themes, accessible components (Radix + Tailwind)
packages/audio/      synth host (alphaTab AlphaSynth), the shared ring buffer, synth protocol;
                     later effects, encoders, pitch detection
fixtures/            public test fixtures (authored alphaTex + generated binaries +
                     vetted third-party files); fixtures/private/ is gitignored
patches/             pnpm patches applied to pinned dependencies (alphaTab)
docs/                research, architecture, decisions, feature matrix, parity, shortcuts
scripts/             fixture generation, budget checks, release tooling
```

Dependency rules (enforced by ESLint `no-restricted-imports` and by the bundle budget check):
`packages/core` may not use DOM APIs or import from `apps/*`/`packages/ui`; `packages/ui` may not
import alphaTab or core; `apps/web` code outside `src/engine/*.worker.ts` may not import alphaTab
at runtime (type-only imports of our own protocol types only).

## 4. Engine worker

### 4.1 Protocol

`packages/core/src/shared/protocol.ts` defines the engine's methods as one typed map
(`EngineMethods`); `apps/web/src/engine/client.ts` turns each into an awaited call. Every request
carries an id and resolves one promise; layouts carry a **generation** number, so paint results
for a superseded layout are dropped. Binary payloads (file bytes) are transferred, never copied.
Each method has a deadline; a worker that misses one is terminated and replaced (the watchdog),
and a worker that fails three times while starting is reported as unavailable.

| Method            | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `init`            | warm the JIT (alphaTex and a `.gp` round trip, layout, paint); report the version |
| `open`            | sniff + import bytes → `DocSummary`, or a typed `OpenError`                       |
| `closeDocument`   | release a document and its views                                                  |
| `layoutView`      | lay out a view (tracks, layout, staff display, width) → partials, bounds, timing  |
| `paint`           | paint laid-out partials of the current generation to SVG (viewport-driven)        |
| `closeView`       | dispose a render session                                                          |
| `connectSynth`    | receive a `MessagePort` to the synth worker                                       |
| `preparePlayback` | generate MIDI (sent straight to the synth worker) and the playback timeline       |
| `previewBeats`    | sound the given beats once (audible stepping)                                     |
| `trackNotes`      | one track's notes per beat (string, fret, pitch, flags) for instrument views      |

Layouts also return `ScoreBounds`: compact typed arrays with every system, bar and beat
rectangle, which the main thread uses for the cursor, hit testing and selections without
asking the worker again.

The worker does one thing at a time, so the order of requests matters: the player asks for
`preparePlayback` (MIDI generation, the longest step for a big score) only once the document has
painted its first systems (`whenPainted`, with a timeout), never before them.

### 4.2 Documents

A document is an alphaTab `Score` plus OpenTabz metadata (source format, file name, byte size,
detected version). `DocSummary` is a plain, cloneable projection (header fields, tracks with
tuning/capo/transposition/colors/staff kinds, bar count, tempo) that the UI uses; the UI never
holds the `Score` itself.

### 4.3 Render sessions

Each visible view owns one alphaTab `ScoreRenderer` (SVG engine, lazy partials). Layout is
synchronous inside the worker and emits one partial per staff system plus the header blocks;
painting happens only when the main thread asks for a partial that is (nearly) visible.
Width changes use alphaTab's resize path, which re-fits systems without rebuilding bar renderers.
The session adds one partial of its own when the stylesheet shows the score's instructions and
notice (REND-041): painted with alphaTab's SVG canvas, placed after the title block, with every
later partial and the bounds of the systems and bars below it moved down by its height, so the
paged view, the cursor and the exports need no special case.
From M4, edits mutate the worker's `Score` and re-render with
`renderHints.firstChangedMasterBar`, so only systems from the edit onward are laid out again.

### 4.4 Text measurement in workers

Upstream alphaTab measures text with a DOM canvas on the main thread and falls back to a
fixed 8 px/char estimate in workers. Our patch
([upstream/0001-worker-font-measurement.md](upstream/0001-worker-font-measurement.md)) measures with
`OffscreenCanvas` whenever it exists, so worker-rendered titles, lyrics, chord names and
tempo text are spaced exactly like main-thread rendering.

## 5. ScoreView (main thread)

`ScoreView` is a framework-free class wrapped by a thin React component, so the hot paths
(placement, scrolling, cursor) never go through React reconciliation.

```
.ot-scroll   (overflow: auto; the only scroll container)
  .ot-sheet  (CSS zoom = view zoom; width/height in layout units)
    .ot-page      × pages   (paged layout only: paper, header, footer, page number)
    .ot-partial   × partials (absolute; one alphaTab SVG each; content attached lazily)
    .ot-overlay   (selection ranges and handles, bar highlight, beat cursor)
```

### 5.1 Layouts

| OpenTabz layout   | alphaTab layout                 | Layout width          | Zoom         |
| ----------------- | ------------------------------- | --------------------- | ------------ |
| Page (A4/Letter…) | Page or Parchment (as authored) | page content width    | CSS, instant |
| Vertical scroll   | Page                            | viewport width ÷ zoom | re-fit       |
| Horizontal        | Horizontal                      | n/a (endless row)     | CSS, instant |

"As authored" uses alphaTab's Parchment layout, which honours the file's bars-per-system and
bar proportions (Guitar Pro 6–8). Automatic page layout is offered as the alternative.

### 5.2 Pagination

alphaTab produces an endless vertical strip. In Page layout, ScoreView distributes partials
onto physical pages: header blocks first, then systems; a system that does not fit the
remaining content height moves to the next page (systems are never split). Each placed partial
records `(sourceY, sheetY)`; a per-system offset table maps alphaTab coordinates (bounds,
cursor, hit testing) to sheet coordinates and back. Page geometry (A4, Letter, custom size,
margins, header/footer text, page numbers) is pure data in `pagination.ts` with unit tests.

Exports and print use the same page model (ADR-0005). The UI lays the score out again in an
engine view of its own, paginates it with `pagination.ts` and has the engine paint one page at
a time. The sheets worker (`export/sheets.worker.ts`) reads each painted partial with
`@opentabz/core/print` (alphaTab-free): its rectangles, paths, texts and music symbols. It writes
the page out again as a standalone SVG in the print palette. Music symbols are drawn from
Bravura's outlines (`print/music-glyphs.ts`, generated from the font alphaTab ships), so files
need no font. PNG pages are that SVG drawn by the browser at the chosen resolution. Printing
places the SVG pages in a print-only element sized with CSS paged media. PDFs are written from
the same reading (`print/pdf.ts`): one reusable form per music symbol, and text in embedded
TrueType subsets of Arimo and Gelasio (read from WOFF, `print/truetype.ts`), which are as wide as
Arial and Georgia, so text lands where alphaTab laid it out. Text in scripts those fonts lack is
drawn as an image with the device's fonts.

### 5.3 Virtualization

An `IntersectionObserver` on the scroll container (root margin ≈ one viewport) requests
partials as they approach the viewport, batched per microtask. Partials far outside the
viewport release their DOM; their SVG markup stays in an LRU cache bounded by size
(`svg-cache.ts`, 24 M UTF-16 units), so scrolling back re-attaches without a worker round trip
and a long score scrolled end to end stays light.

### 5.6 Pointer gestures and selections

ScoreView turns pointer input into gestures in engine coordinates: a tap (Shift extends), a
mouse drag (with auto-scroll near the edges), and on touch screens a long press, because a
finger drag must keep scrolling. `SelectionOverlay` maps gestures to playback ranges with pure
lookups over the timeline and bounds (`timeline-lookup.ts`): ranges snap to beats, whole bars are
highlighted edge to edge, and passes through repeats are chosen near the playback position. Its
two handles are separate elements with `touch-action: none` and zoom-independent size, so they
can be dragged with a finger. `PlaybackCursor` animates the beat line with the Web Animations API
between position reports (or jumps it from note to note, or to each beat of the meter, placed
between the notes around it) and scrolls the playing system into view: continuously, to a set
share of the view, or page by page, only when the music leaves it. The notes being played are
coloured by one scoped `<style>` rule naming their beat groups (`.b<id>`), so highlighting costs
one style change per beat and never touches the SVG. Wheel, touch, scroll keys and the
scrollbar pause the following while playing; `resume()` and pressing play bring the music back
into view.

### 5.4 Theming rendered notation

alphaTab writes colours into the SVG. The engine sets each notation colour role to a unique
near-black sentinel (`#010101`, `#020202`, …) and ScoreView's stylesheet maps every sentinel to
a CSS custom property (`[fill="#020202"] { fill: var(--score-staff-line) }`). Glyphs drawn in the
default colour carry no fill attribute and inherit `fill: var(--score-ink)`. Switching between
light, dark, sepia and stage-dark therefore never re-renders. Colours authored in the file
(note/track colours) pass through untouched. Exports and print resolve the variables to the
print palette.

### 5.5 Zoom

Range 25–400 %. The sheet uses CSS `zoom`, so SVG is re-rasterized crisply at any scale and
overlays inherit the same coordinate system. Paged and horizontal layouts never re-layout on
zoom. Vertical scroll re-fits systems to the new effective width through the worker's resize
path; during continuous gestures (pinch, ctrl+wheel) the old layout is shown scaled until the
new one arrives.

### 5.7 Instrument views

The fretboard (`app/FretboardPanel.tsx`, `app/FretboardNeck.tsx`) draws the active track's neck
as SVG: any number of strings with the highest on top as in tablature, real fret spacing blended
half-way with even spacing, inlays, a capo, left-handed mirroring. Its notes come from the
engine once per track (`trackNotes`: typed arrays of string, fret from the capo, sounding pitch
and flags per beat), cached on the main thread. A pure model (`instrument-view/fretboard.ts`)
looks up what sounds at the playback tick in the timeline the cursor uses (held notes included),
the next notes to play and the rest of the bar, and spells note names in the bar's key. The
panel reads it through `useSyncExternalStore` with a snapshot that only changes when the notes
shown change, so playback re-renders the neck once per new beat at most.

The keyboard (`app/KeyboardPanel.tsx`, `app/PianoKeys.tsx`) draws piano keys as SVG from the same
notes: the engine sends every staff with pitches, each beat tagged with its staff, so a piano's
upper and lower staves are its right and left hands, shown together in two colours or apart.
Its model (`instrument-view/keyboard.ts`) knows each instrument's range: a stringed staff's open
strings to its 24th fret, otherwise the usual range of its General MIDI sound. Keys outside the
range are greyed, and the keyboard spans the range and every note played. Both views read their
notes through one reader (`instrument-view/use-view-notes.ts`), which re-renders them only when
the notes shown change. The chords panel (`app/ChordsPanel.tsx`) asks the engine for a track's
chords (`trackChords`: each chord once, and the beats that carry them), places them in playing
order on the timeline (`instrument-view/chords.ts`) and shows the chord sounding, the next one
and the beats left until it. The lyrics pane (`app/LyricsPanel.tsx`) does the same with a
track's lyrics (`trackLyrics`): syllable by syllable on their beats, line by line as typed (the
text a track keeps through alphaTab patch 0027), the syllable being sung lit; it can take the
score's place in large type. The drum view (`app/DrumsPanel.tsx`) reads a drum track from
`trackDrums`: every sound of its kit (its own articulations, then a standard kit's, named
through alphaTab's percussion mapper, exported by patch 0028) and its notes in the views'
layout, a note's pitch being its sound, so it shares the views' model. The song overview
(`app/OverviewPanel.tsx`, Guitar Pro's global view) asks once per song which bars each track
plays in (`scoreOverview`: a byte per track and bar) and draws them as SVG squares under the
sections and bar numbers, drawn again only when the song changes; the bar being played, the
selection and the active track are overlays on top.

## 6. Opening files

1. **Intake (main thread):** drag-and-drop anywhere, file picker, clipboard paste (files),
   `?url=` / open-from-URL (subject to CORS), multiple files at once → one tab each. Later: PWA
   file handlers, share target, folders (M3).
2. **Sniffing (worker, `@opentabz/core/formats`):** by content only — GP3–5 length-prefixed
   `FICHIER GUITAR PRO v…` header, GPX `BCFZ`/`BCFS`, ZIP containers classified by entry names
   (`Content/score.gpif` → GP7/8, `META-INF/container.xml` → MusicXML `.mxl`, `score.xml` →
   Capella, `opentabz.json` → `.otz`), XML roots (`score-partwise`, `score-timewise`, Capella),
   alphaTex, plus recognition of formats we cannot open (MIDI `MThd`, PowerTab, TuxGuitar, PDF,
   images, audio) so the message can say exactly what the file is. The extension is only used to
   word messages ("named .gp5 but contains a Guitar Pro 7 file").
3. **Import:** the importer for the sniffed format is chosen directly (not trial-and-error), with
   a reader that throws on end-of-data so truncation is detected precisely.
4. **Errors:** a closed taxonomy (`empty`, `too-large`, `unrecognized`, `not-supported`,
   `unsupported-version`, `truncated`, `corrupt`, `timeout`, `internal`) with a title, an
   explanation, the detected format and technical detail. Nothing is silently swallowed.

## 7. Data model and file formats

alphaTab's `Score` is the base model. Data it cannot represent (per-note colours and comments,
arrangement blocks, saved loops, practice data, microtonal offsets, plugin data) lives in an
OpenTabz side model keyed by stable element ids. **(planned, M4)** The native format `.otz` is a
ZIP holding a standard Guitar Pro 7/8 `.gp` payload (written by alphaTab's GP7 exporter, patched
as needed) plus `opentabz.json`; every `.otz` opens in Guitar Pro minus the extras. A text form
(alphaTex superset) round-trips losslessly.

## 8. State

Zustand stores, each small and serializable: `documents` (open docs, active doc, per-doc view
options, mixer state and active track), `preferences` (theme, default layout/zoom/staff
display/paper, how the view follows playback, the fretboard's settings, persisted to
`localStorage` until the library lands in M3), `practice` (metronome and count-in
settings and the standalone metronome's tempo and meter, persisted the same way; changes go to
the synth worker as they happen) and `player` (transport, timeline, position, speed, count-in
progress, the standalone metronome, loop, selection, volume). The transport is an explicit,
typed finite-state machine (`unloaded → loading → ready ⇄ playing`, `error`) with an exhaustive
transition table under test (`transport-machine.ts`).

## 9. Audio

ADR-0015. A synth worker runs alphaTab's `AlphaSynth` (a TinySoundFont port) at 48 kHz and
writes stereo frames into a lock-free single-producer/single-consumer ring in a
`SharedArrayBuffer`; an AudioWorklet copies them to the output and pings the worker every 1,024
frames over a direct `MessagePort`, and the worker tops the ring up to 250 ms. The engine worker
generates MIDI and the playback timeline (`preparePlayback`) and posts the MIDI straight to the
synth worker; the main thread only sends commands (play, seek, speed, metronome, count-in, loop
range, channel mute/solo/volume) and receives positions about 45 times a second. The
`AudioContext` is created inside the first play gesture, everything else is prepared when a
document opens, so play starts within the budget.

Loop ranges map to alphaTab's playback range: a new range starts playback at its start, while a
range adjusted around the playhead keeps playing from where it is (a range change seeks once,
when the gesture ends). The default sound bank is discussed in ADR-0016; a full sound engine
(effects, SFZ, physical modelling) is M7.

**Metronome.** The clicks are MIDI notes, generated in the synth worker from the song's bar grid
(the engine sends the played bars with their meters) by `packages/audio/src/metronome.ts`: a
General MIDI drum kit (bank select 127, patch 0007) on a channel of its own after the song's,
centred (patch 0008), with per-sound gains that even out the SoundFont's levels. Turning the
metronome on or off and its volume are that channel's mute and level, and it stays audible when
tracks are soloed. A new pattern swaps in MIDI with the new clicks while playing (patch 0009):
the buffered audio plays out and nothing stops or repeats. The standalone metronome is the same
machinery with a song of its own: sixteen bars of clicks in the chosen meter, looped, whose
tempo changes in place keeping the position in the bar.

**Fixed tempo** replaces the song's tempo events with one (swapped in while playing, patch 0009),
and **rests between loop passes** are a silent state of the sequencer, like the count-in (patch
0011).

**Speed** changes while playing apply from the sample being generated, with no seek (patch
0010); the buffered audio plays out at its own speed and positions stay continuous. The speed
trainer and counted loops live in the synth worker: a generation-time event at each new loop
pass moves the speed on (for the whole pass) or ends playback after the last pass, and the UI
hears of a new speed when it is heard.

**Count-in and loop passes** switch while audio is generated, not when it is heard (patch 0006):
the count-in runs straight into the song and each loop pass into the next, carrying over the
part of a 64-sample block that ran past the end, so passes last exactly their length. The
synth worker fits the count-in to the start point (a start on beat 3 counts 1 2 3 4 1 2) and
reports each click as it is heard, for the visual count-in.

**What is written plays.** The MIDI generator is patched (0015–0017) so fermatas hold (a
slower tempo for the held beat, so ticks never move), hairpins ramp the velocity, linear tempo
automations ramp the tempo, the sustain pedal is controller 64 (which the synthesizer honours),
jumps follow Guitar Pro's rules, and techniques that need a sound of their own get a channel of
their own: slap bass sounds, a drum kit for golpe, a second channel for strings bent from the
same pitch. Those channels travel with the timeline (`extraChannels`), so the mixer applies a
track's settings to all of its channels; drum kits are centred so the track's pan places them.
Each track's playing style (let ring, strummed chords, palm-mute damping, accents; patch 0018)
goes with `preparePlayback`; a change regenerates the MIDI and the synth worker swaps it in
where it plays (`replace`). Events take effect on their own sample: the synthesizer splits its
64-sample blocks at them (patch 0019).

**Output delay.** The `AudioContext` keeps the latency hint it is made with. Settings offer the
shortest, a balanced or the steadiest output; a change pauses playback and closes the output,
and the next start (a user gesture) opens one with the new hint and a new port for the
AudioWorklet's pings. The dialog shows the output's delay and how much audio the ring could not
supply (its underrun counter, in shared memory).

## 10. Performance practice

- The engine worker is spawned and warmed (JIT, including the Guitar Pro 7+ zip and XML path)
  as soon as the first contentful paint is reported, before any file is dropped.
- Performance marks and measures: `ot:app-ready` (warm start), `ot:engine-ready`,
  `ot:drop-to-paint` (per document, from intake to the first painted system), `ot:layout`
  (request to placed partials) and `ot:play-start` (play pressed to the synthesizer playing).
  The Playwright budget tests read them; ADR-0017 says where they gate.
- `scripts/check-budgets.ts` checks the initial JavaScript (entry chunk and static imports,
  gzip) on every build and that no alphaTab code reaches the main thread.
- Parser hot spots are fixed in alphaTab itself when profiling shows them (patch 0003).
- No layout thrash in hot paths: geometry is computed from data, never read back from the DOM.

## 11. Testing

- **Unit (Vitest, Node and happy-dom):** sniffing, error mapping, every public fixture, render
  sessions (alphaTab runs in Node), playback timelines, pagination, theming, timeline lookups,
  the engine client's watchdog, the transport FSM, and from M4 every editor command and inverse.
- **E2E (Playwright):** against the production build with production headers, in Chromium,
  WebKit and Firefox, desktop and phone viewports: every format through the file picker, drop,
  paste and links; playback and loops; phone layouts and touch; budgets. Any console error or
  warning fails a test.
- **Fuzz:** truncated and bit-flipped fixtures through the open pipeline must yield a typed
  error or a score — never a hang or an untyped exception.
- **Audio:** scores are rendered offline through the real synth host and ring buffer; tests
  assert fundamentals (autocorrelation) at the expected times, silence in rests, loop
  boundaries without leaks (Goertzel) and playhead behaviour when ranges change.
- **Generated fixtures:** `pnpm fixtures` builds deterministic performance scores (5 × 150,
  20 × 500), `.gp` versions of the demos and corrupt files.

## 12. Security and privacy

Strict CSP via Netlify headers (`default-src 'self'`; workers and blobs from self only; no
third-party origins), no cookies, no storage of file contents outside the device. Open-from-URL
fetches only the URL the user typed. The tuner asks for the microphone only when it opens and
releases it when it closes; the sound is analysed in memory (`audio/microphone.ts`, YIN pitch
detection in `@opentabz/audio/pitch`) and never recorded, kept or sent. `vite preview` serves the same `_headers`, so the
end-to-end tests run under the production CSP, and the build never inlines assets as `data:`
URLs (the CSP would block them). **(planned, M8)** User scripts run in a sandboxed iframe /
worker with a capability-based API.

## 13. Build and deploy

Vite builds `apps/web` to static files. Netlify serves opentabz.com with immutable caching for
hashed assets, deploy previews per pull request, and the security headers in
`apps/web/public/_headers`. CI (GitHub Actions) runs typecheck, lint, unit, E2E, bundle budgets
and Lighthouse CI before anything deploys.
