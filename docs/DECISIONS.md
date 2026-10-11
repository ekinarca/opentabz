# Architecture decision records

Each ADR states the context, the decision and its consequences. ADRs are append-only: a
reversed decision gets a new ADR that supersedes the old one. Routine choices are made by the
lead engineer; the owner is consulted only on fixtures, deploy access and licensing.

---

## ADR-0001 — Record decisions as ADRs in this file

- **Date:** 2026-10-11 · **Status:** accepted
- **Decision:** Every non-routine technical or product decision is recorded here, including
  any change to a performance budget (which additionally needs measurements).
- **Consequences:** Reviewers can trace why the code looks the way it does; reversals are visible.

## ADR-0002 — License: AGPL-3.0-or-later

- **Date:** 2026-10-11 · **Status:** accepted (owner may switch to MIT before v1.0)
- **Context:** The brief defaults to AGPL so hosted forks stay open.
- **Decision:** The application and packages are AGPL-3.0-or-later. Every dependency, font,
  SoundFont, impulse response and encoder is checked individually and listed in
  `THIRD_PARTY_NOTICES.md`. Copyleft-incompatible or unclear assets are not used.
- **Consequences:** MPL-2.0 (alphaTab), MIT, BSD, Apache-2.0, ISC, OFL-1.1 and LGPL components
  are compatible. GPL-2.0-only components are not.

## ADR-0003 — alphaTab 1.8.4 pinned, patched with `pnpm patch`

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab (MPL-2.0) parses Guitar Pro 3–8, MusicXML, Capella and alphaTex,
  renders SVG, synthesizes SoundFonts and exports GP7 and alphaTex. 1.8.4 is the latest stable
  release (1.9 is alpha). Some behaviour needs changing (first: text measurement in workers).
- **Decision:** Pin exactly `@coderline/alphatab@1.8.4`. Changes are applied with `pnpm patch`
  to the published ESM build and kept minimal. Each patch has a write-up in `docs/upstream/`
  describing the equivalent change to alphaTab's TypeScript sources, ready to be offered upstream.
  A vendored fork is the fallback if patches grow large.
- **Consequences:** Upgrading alphaTab means re-applying patches; unit and visual tests catch
  regressions. MPL-2.0 file-level copyleft applies to patched alphaTab files: the patches are public.

## ADR-0004 — The engine runs in a worker; the main thread never loads alphaTab

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab's high-level `AlphaTabApi` parses on the main thread, keeps the
  authoritative `Score` on the main thread and re-serializes the whole score to its render worker
  on every change. That conflicts with "parsing off the main thread", the < 100 ms editing
  budget on large files, and our need to control placement (pagination, overlays). Its public
  lower-level classes (`ScoreRenderer`, importers, `JsonConverter`, `MidiFileGenerator`,
  exporters) are enough to build our own orchestration.
- **Measurement (spike, Chromium, M-series Mac):** worker-side parse + layout + first painted
  system: 31–44 ms for a 1-track file, 33–39 ms for one track of a 9-track/224-bar/10k-note file,
  120–127 ms for all 9 tracks; partial paint ≈ 0.2 ms; `innerHTML` of the first screen ≈ 1 ms.
  See RESEARCH.md §3.
- **Decision:** A dedicated engine worker owns documents (`Score`), render sessions and later the
  command layer. The UI talks to it through a typed RPC/event protocol and receives SVG
  partials. The main bundle never imports alphaTab (lint rule + bundle budget).
- **Consequences:** We implement placement, lazy loading, cursor mapping and player glue ourselves
  instead of using `AlphaTabApi`. In exchange: no main-thread parsing, incremental re-render
  after edits without whole-score serialization, a small initial bundle and full control of layout.

## ADR-0005 — Physical pages are composed in the view

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab lays out an endless vertical strip; it has no paper size, margins or page
  breaks. It does emit one partial per staff system with exact sizes.
- **Decision:** ScoreView paginates: partials are distributed onto pages of the chosen paper size
  with margins, header and footer; systems never split across pages. A per-system offset table
  maps engine coordinates to sheet coordinates for overlays, hit testing and scrolling.
- **Consequences:** No engine patch is needed for pagination, and print/PDF reuse the same page
  model. A system taller than a page (very large multi-track systems) overflows its page;
  print/PDF scale such a system down to fit.

## ADR-0006 — Notation colours are themed with sentinel colours and CSS variables

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab bakes colours into SVG; re-rendering for a theme switch is wasteful.
- **Decision:** Each colour role is rendered as a unique near-black sentinel and mapped to a CSS
  custom property by attribute selectors; default-coloured glyphs inherit `fill` from CSS.
- **Consequences:** Theme switches are instant. Exporters substitute concrete colours. A file that
  colours a note with exactly a sentinel value would be themed — acceptable (values are chosen to
  be visually indistinguishable from black).

## ADR-0007 — Viewing zoom uses CSS `zoom`

- **Date:** 2026-10-11 · **Status:** accepted
- **Decision:** The sheet element gets `zoom: z` (25–400 %). Paged and horizontal layouts never
  re-layout on zoom; vertical scroll re-fits systems to the effective width through the
  worker's resize path.
- **Consequences:** Crisp vector output at any zoom and DPR; overlay coordinates stay in layout
  units. Requires browsers with standard `zoom` (Chrome, Edge, Safari, Firefox ≥ 126).

## ADR-0008 — Deploy on Netlify

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** The brief suggested Cloudflare Pages or GitHub Pages; the owner created a Netlify
  project that already serves opentabz.com with HTTPS and the www redirect.
- **Decision:** Netlify static hosting with `netlify.toml`, security headers in `_headers`,
  immutable caching for hashed assets, and deploy previews per pull request via Netlify's GitHub
  integration.
- **Consequences:** Needs either the repository connected to the Netlify site or a Netlify access
  token for CLI deploys (requested from the owner).

## ADR-0009 — Toolchain versions

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** TypeScript 7.0 (native compiler) is current, but `typescript-eslint` 8.71 supports
  TypeScript `<6.1`; `eslint-plugin-jsx-a11y` 6.10 supports ESLint ≤ 9. alphaTab itself builds with
  TypeScript 6.0.
- **Decision:** TypeScript 6.0.3, ESLint 9.39, typescript-eslint 8.71 (type-aware rules), Vite 8,
  React 19.3, Tailwind CSS 4.3, Vitest 5, Playwright 1.64, pnpm 10.34 (via `packageManager`).
- **Consequences:** Renovate proposes TypeScript 7 / ESLint 10 once the lint stack supports them.

## ADR-0010 — Fixture policy

- **Date:** 2026-10-11 · **Status:** accepted
- **Decision:** Public fixtures are (1) alphaTex files authored for OpenTabz, (2) binary files
  generated from them by our pipeline, and (3) alphaTab's feature test files (MPL-2.0), copied
  unmodified with attribution. Files in alphaTab's test data that contain real songs are
  excluded, identified by their embedded metadata: `fade-to-black.gp4`, `canon.gp5`,
  `canon-audio-track.gp`, `chord-name-overflow.gp5`, `nightwish.gp5`, every `full-song.*`,
  every `serenade.*`, `faulty.gp`, `orphan-tempo-automation.gp`, and `beat-text-lyrics.gp5`
  (its beat texts are a published song's lyrics). alphaTab's `visual-tests/` folder is not used
  (its layout tests embed another song's lyrics). Every vendored file was scanned for titles,
  artists, lyrics, beat texts and section names. Real-world files supplied by the
  owner live in `fixtures/private/` (gitignored) and are exercised by the same tests when present.
- **Consequences:** CI never depends on private files; acceptance runs locally against them.

## ADR-0011 — "New" ships with the editor (M4)

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** The home page is the drop zone plus a **New** button. Before M4 a new document
  could not be edited, so the button would lead to a dead end — a stub by the covenant's rules.
- **Decision:** M0–M3 home: drop zone, Open, and original demo scores. **New** appears in M4 with
  templates and note entry. This is a reordering, not a scope reduction.

## ADR-0012 — Styling: Tailwind CSS 4 + CSS custom properties + Radix primitives

- **Date:** 2026-10-11 · **Status:** accepted
- **Decision:** Design tokens are CSS custom properties defined per theme (`light`, `dark`,
  `sepia`, `stage`) in `packages/ui`; Tailwind 4 utilities reference them. Interactive components
  are built on Radix primitives (`radix-ui`) for focus management and ARIA. UI fonts are
  self-hosted (no third-party font CDN).

## ADR-0013 — alphaTab is bundled into the engine worker chunk

- **Date:** 2026-10-11 · **Status:** accepted for M0; revisit in M1
- **Decision:** `@opentabz/core` imports alphaTab normally; Vite bundles it into the engine worker.
  When M1 adds an audio realm that also needs alphaTab code, measure duplicate download/compile
  cost and either share one static engine module across realms or keep separate bundles.

## ADR-0014 — Credit alphaTab in the product, not as a watermark in sheet music

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab's vertical layouts append a "rendered by alphaTab" text partial below
  every score. alphaTab 1.8.4 is licensed under the unmodified MPL-2.0, which requires keeping
  license notices in source files and offering source for modified files, but places no
  requirement on rendered output. (Older alphaTab releases used other terms; a 2017 tutorial
  describes a "do not remove the notice" rule that does not appear in the current license.)
  Printed sheet music from OpenTabz should look like Guitar Pro's: no watermark.
- **Decision:** ScoreView and exports omit the trailing annotation partial. alphaTab is credited
  visibly: the app footer ("Notation engine: alphaTab"), the About / open-source licenses panel
  (with links to alphaTab's source and to OpenTabz's patches, satisfying MPL-2.0 §3.2), the
  README and `THIRD_PARTY_NOTICES.md`; exported PDFs name OpenTabz and alphaTab in their metadata.
- **Consequences:** If alphaTab's license terms change in a future version, revisit before upgrading.

## ADR-0015 — Audio: synth worker → shared ring buffer → AudioWorklet

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** alphaTab's synthesizer renders 32 × 64 = 2,048 frames per request (≈ 43 ms at
  48 kHz). Doing that inside an AudioWorklet's 128-frame `process()` call would blow the
  real-time budget; alphaTab's own player routes samples from a worker through the main thread
  into the worklet, which puts the main thread on the audio path.
- **Decision:** A dedicated synth worker runs `AlphaSynth` (TinySoundFont port) at 48 kHz and writes
  interleaved stereo frames into a lock-free single-producer/single-consumer ring in a
  `SharedArrayBuffer` (cross-origin isolation is on via COOP/COEP). A tiny AudioWorklet reads the
  ring and pings the worker every 1,024 frames over a direct `MessagePort`; the worker reports
  progress to the synthesizer and tops the ring up to 250 ms. The engine worker generates MIDI and
  posts it straight to the synth worker over another `MessagePort`; the main thread only sends
  commands and receives positions. The SoundFont, MIDI and synthesizer are prepared when a
  document opens; the `AudioContext` (fixed at 48 kHz, resampled by the browser if needed) is
  created inside the first play gesture, so browsers neither warn nor block it.
- **Proof:** an offline test renders scores through the real host, ring and a simulated worklet and
  asserts fundamentals (A4, C5, E5 within ±2 %) at the expected times and silence in rests.
- **Consequences:** Main-thread jank cannot cause audio dropouts; playback continues in background
  tabs. Requires `crossOriginIsolated` (all current browsers with the headers in place).

## ADR-0016 — Default sound bank: alphaTab's SONiVOX bank now, a bank built from AOSP sources in M7

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** Playback needs a General MIDI SoundFont that loads fast (the default is fetched
  when a document opens). alphaTab ships `sonivox.sf2` (1.35 MB, 684 KB gzip) with an Apache-2.0
  licence file naming Sonic Network's EAS synthesizer from the Android Open Source Project. Its
  README, written by the person who converted it, also mentions phone firmware, editing tools and
  a Creative Sound Blaster bank, so the conversion's provenance cannot be fully verified.
- **Decision:** Ship alphaTab's bank as the default for now, under its declared Apache-2.0
  licence, and say so in `THIRD_PARTY_NOTICES.md`. In M7 (audio engine), replace it with a bank
  OpenTabz builds itself, reproducibly, from the AOSP SONiVOX EAS wavetable sources
  (`external/sonivox`, Apache-2.0), with the converter in this repository. Higher-quality banks are
  offered as optional packs the user downloads explicitly; each pack's licence is checked first
  (for example MuseScore General, MIT).
- **Consequences:** Until M7 the default sound inherits the uncertainty above. The replacement must
  keep the same General MIDI program map so scores sound the same.

## ADR-0017 — Performance budgets are enforced in Chromium, measured everywhere

- **Date:** 2026-10-11 · **Status:** accepted
- **Context:** The budgets in ARCHITECTURE.md §1 are hard gates. Timing differs between browser
  engines and machines; a gate that fails on noise teaches people to ignore it.
- **Decision:** The Playwright budget tests measure with the app's own performance marks
  (`ot:app-ready`, `ot:drop-to-paint`, `ot:layout`, `ot:play-start`) in every desktop project and
  fail only in Chromium, the reference engine. WebKit and Firefox results are attached to the
  test report as annotations, so regressions there are visible. The bundle budget
  (`scripts/check-budgets.ts`) is engine-independent and always enforced.
- **Consequences:** A WebKit- or Firefox-only regression does not fail CI; it shows up in the
  report. Revisit when CI runners become stable enough to gate every engine.
