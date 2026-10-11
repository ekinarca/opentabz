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
┌────────────────── audio (planned, M1 — see §9) ────────────────────────┐
│ AudioWorklet render thread · synth · effects · metronome               │
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
  e2e/               Playwright tests (render, budgets, visual regression)
packages/core/       zero-DOM library: format sniffing, import, open errors, documents,
                     render sessions, SVG post-processing; later .otz, commands, undo,
                     theory, lint. Runs in Node (tests) and in workers.
packages/ui/         design tokens, the four themes, accessible components (Radix + Tailwind)
packages/audio/      (planned, M1) synth integration, metronome, effects, encoders, pitch detection
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

`apps/web/src/engine/protocol.ts` defines a discriminated union of requests, responses and
events. Requests carry an id and resolve one promise; events (render results) stream back
tagged with the view id and a **generation** number, so results from a superseded layout are
dropped. Binary payloads (file bytes) are transferred, never copied.

| Request          | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `open`           | sniff + import bytes → `DocSummary` or a typed `OpenError`        |
| `closeDocument`  | release a document                                                |
| `openView`       | create a render session (tracks, layout, notation options, width) |
| `updateView`     | change options; re-layouts and bumps the generation               |
| `renderPartials` | paint specific laid-out partials (lazy, viewport-driven)          |
| `closeView`      | dispose a render session                                          |

| Event           | Payload                                                              |
| --------------- | -------------------------------------------------------------------- |
| `layoutStart`   | view id, generation, reason                                          |
| `partialLayout` | id, kind (header/tuning/chords/system/footer), x, y, w, h, bar range |
| `layoutEnd`     | total size, staff-system list, timings                               |
| `partialSvg`    | id, SVG markup (post-processed, see §5.4)                            |
| `viewError`     | typed error for a view                                               |

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
    .ot-overlay   (cursor, selection, annotations — planned M1+)
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

### 5.3 Virtualization

An `IntersectionObserver` on the scroll container (root margin ≈ one viewport) requests
partials as they approach the viewport, batched per frame. Partials far outside the viewport
release their DOM; their SVG markup stays in an LRU cache bounded by bytes, so scrolling back
re-attaches without a worker round trip.

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
options), `preferences` (theme, default layout/zoom, persisted to `localStorage` until the
library lands in M3), `ui` (panels, dialogs, toasts). **(planned, M1)** The transport is an
explicit, typed finite-state machine (`idle → loading → ready ⇄ playing ⇄ paused`, count-in,
seeking) whose transitions are unit-tested.

## 9. Audio **(planned, M1/M7)**

Requirements: AudioWorklet-based, glitch-free, correct when the tab is backgrounded,
sample-accurate scheduling, < 100 ms to start. alphaTab's own design synthesizes in a worker
and streams samples to an AudioWorklet. M1 starts with a spike comparing (a) that design and
(b) running the synthesizer inside the AudioWorklet itself, measuring start latency, underruns
under main-thread and engine-worker load, and CPU at 64+ voices; the result becomes an ADR.
MIDI and the playback timeline (tick → beat → bounds) are generated in the engine worker and
sent to the main thread as compact typed arrays for the cursor.

## 10. Performance practice

- Engine worker is spawned and warmed (JIT) right after first paint, before any file is dropped.
- Performance marks: `ot:intake`, `ot:parsed`, `ot:layout-end`, `ot:first-partial-painted`.
  Playwright reads them and fails CI when a budget is exceeded.
- Bundle budgets are checked on every build (main entry, CSS, engine worker).
- No layout thrash in hot paths: geometry is computed from data, never read back from the DOM.

## 11. Testing

- **Unit (Vitest, Node):** sniffing, error mapping, pagination, theming map, summaries, render
  sessions (alphaTab runs in Node), and from M4 every editor command and inverse.
- **E2E (Playwright, Chromium + WebKit + Firefox):** open every public fixture, assert no
  console errors/warnings, screenshot visual regression, budgets, keyboard-only flows.
- **Fuzz:** truncated and bit-flipped fixtures through the open pipeline must yield a typed
  error or a score — never a hang or an untyped exception.
- **Audio (M1):** offline render → FFT → assert fundamentals at expected times.

## 12. Security and privacy

Strict CSP via Netlify headers (`default-src 'self'`; workers and blobs from self only; no
third-party origins), no cookies, no storage of file contents outside the device. Open-from-URL
fetches only the URL the user typed. **(planned, M8)** User scripts run in a sandboxed iframe /
worker with a capability-based API.

## 13. Build and deploy

Vite builds `apps/web` to static files. Netlify serves opentabz.com with immutable caching for
hashed assets, deploy previews per pull request, and the security headers in
`apps/web/public/_headers`. CI (GitHub Actions) runs typecheck, lint, unit, E2E, bundle budgets
and Lighthouse CI before anything deploys.
