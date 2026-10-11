# Changelog

All notable changes to OpenTabz are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/) from its first release.

## [Unreleased]

### Added

- **Opening files.** Guitar Pro 3, 4, 5, 6 (`.gpx`) and 7/8 (`.gp`, including files with audio
  tracks), MusicXML (`.xml`, `.musicxml`, compressed `.mxl`, partwise and timewise), Capella
  (`.capx`) and alphaTex. Drag and drop anywhere, the file picker (⌘/Ctrl+O), pasting files or
  score text, opening a link or a `?url=` deep link, several files at once as tabs. Formats are
  detected by content; Guitar Pro 3–5 text is read in the right code page.
- **Clear errors.** Truncated, damaged, empty, oversized and unsupported files (MIDI, PowerTab,
  TuxGuitar, MuseScore, PDF, images, audio, archives…) are named precisely, with technical
  details to copy. A stuck engine is restarted by a watchdog.
- **Reading.** Notation and tablature, either alone or as the file asks; page layout on A4 or US
  Letter with running headers and page numbers, vertical scroll and horizontal layouts; the
  file's own systems layout; any selection of tracks; zoom from 25 % to 400 %; light, dark,
  sepia and high-contrast stage themes without re-rendering; song information.
- **Playback.** SoundFont synthesis in a worker streamed to an AudioWorklet through shared
  memory; a cursor that glides between beats and turns pages; click to seek; speed from 10 % to
  300 % without changing the pitch, by preset, slider, keys or tap tempo; volume.
- **Metronome and count-in.** Six centred click sounds of even loudness, one to four clicks per
  beat, swing, half time, accents on the first beat, none or a pattern set beat by beat,
  polyrhythms and randomly silent bars; its own volume (zero leaves the beat display). A
  count-in of one or two bars with its own volume, shown large on screen, fitted to where
  playback starts (mid-bar starts count the beats before them), optionally before every loop
  pass. Changing the pattern while playing never interrupts it. Settings are remembered.
- **Standalone metronome.** Tempo from 10 to 400 BPM by typing, buttons, slider or tap tempo
  (button or T), any meter up to 16 beats, with the beat display and the same sounds and
  patterns; the open song waits and comes back when it closes.
- **Practice.** A mixer with mute, solo and level per track and a practice mode; selecting a
  range by dragging across the music, Shift+click or a long press on phones, with handles to
  adjust it; looping the selection; Shift+arrow keys and Esc for selections
  ([docs/SHORTCUTS.md](docs/SHORTCUTS.md)).
- **Phones.** Phone-first layouts: scroll layout by default, a compact playback bar with a menu
  for less frequent controls, touch-sized selection handles.
- **Landing page and identity.** A new logo (the open string), a landing page with a live
  tablature stage that answers the pointer, Open Graph and app icons.
- **Quality gates.** Playwright end-to-end tests on Chromium, WebKit and Firefox, desktop and
  phones, with performance budgets (warm start, drop to first render, view changes, play
  start); a bundle budget check; deterministic generated fixtures.

### Changed

- alphaTab 1.8.4 is patched: text measurement in workers (0001), runtime exports of reader
  errors (0002), faster XML parsing for large Guitar Pro 7+ files (0003), a fix that makes
  Capella files open at all (0004), 10 % playback speed (0005), count-ins and loop passes that
  switch while audio is generated, without gaps or drift (0006), drum kits on any channel and
  silence instead of `NaN` for unloaded samples (0007), centred channels (0008) and replacing
  the song while it plays (0009). See [docs/upstream/](docs/upstream/).

### Fixed

- A font subset inlined as a `data:` URL was blocked by the Content Security Policy.
- Opening the mixer no longer covers its first row with a tooltip.
