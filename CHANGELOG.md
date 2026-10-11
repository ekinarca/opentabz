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
- **A fuller mixer.** Per track pan, instrument (any General MIDI program), transposition in
  semitones and fine tuning in cents, a focus that plays the other tracks quieter, the master
  balance and a reset to the file's mixer. The mixer is remembered for each file (recognised by
  its contents) and comes back when the same file is opened again.
- **Fixed-tempo practice and rests in loops.** One tempo for the whole song, ignoring its tempo
  changes (typed or from presets), switched on and off without stopping; bars of rest between
  loop passes, shown on screen.
- **Speed trainer and counted loops.** While a loop repeats, the speed trainer moves from a
  start to a target speed in steps after a set number of passes at each speed, exactly at the
  start of a pass; a loop can also repeat a set number of times and stop. Loops can be set by
  typing bar numbers. Speed changes while playing no longer stutter.
- **Playback that follows the notation further.** Fermatas hold the music (short, medium, long
  or the length the file gives); crescendo and diminuendo hairpins swell towards the next
  dynamic; Guitar Pro's tempo ramps accelerate and slow down gradually; the sustain pedal holds
  notes until it comes up; tremolo picking keeps its speed on notes of any length; fade-outs and
  swells no longer silence the rest of the track; mordents and turns take their neighbouring
  notes from the key; tapped notes sound without a pick attack. Jumps follow Guitar Pro's rules:
  a Da Capo lands after a pickup bar, a jump inside a repeat waits for the last pass, a Dal Segno
  Segno comes after the Dal Segno, and after a jump only the last alternate ending plays. Slapped
  and popped bass notes play the slap bass sounds (other instruments strike them harder), a golpe
  knocks on the guitar's top, and two strings bent from the same pitch bend independently.
- **Notes on their sample.** Every note and controller takes effect on its own sample instead of
  at the start of the synthesizer's 64-sample block: steady rhythms stay steady to the sample.
- **Song map.** A strip above the playback bar with every bar of the song, its sections named
  and shaded, the bar being played and the selection: click or drag to go anywhere; as a slider
  the arrow keys step bars and Page Up/Down sections.
- **Drum kits.** A drum track can play any kit of the sound bank (Standard, Room, Jazz, Brush in
  the bundled one), remembered for the file. Menus show the keys of their actions, like tooltips.
- **A playing style per track.** In the mixer, each track can let its notes ring, strum its
  chords, damp palm mutes lightly or heavily, and stress the strong beats, as Guitar Pro's track
  interpretation does; changes apply while playing and are remembered for the file.
- **Settings.** The audio delay (shortest, balanced or steadiest, for devices where the sound
  breaks up), with the output's delay and any audio it had to skip shown live; the left-handed
  fretboard; single-key shortcuts.
- **Fretboard.** The active track's neck under the score: any number of strings (3 to 10) and
  tunings, a capo, the notes being played lit in the cursor colour, with the next notes to play
  as rings or the rest of the bar in a lighter colour; dead notes, harmonics and ghost notes
  drawn as such; note names with their octave always, on hover or never (to practise from
  memory), spelled in the key; left-handed. It follows playback, stepping and seeking; on phones
  the neck scrolls to the notes. ⌘/Ctrl+F6 opens it; ⌘/Ctrl+↑ and ↓ switch the active track
  (the score follows while one track is shown). Settings are remembered.
- **Following the music.** Scrolling that moves along continuously (with the playing line set
  anywhere from 5 % to 60 % down the view), turns page by page, or stays where it is left; a
  cursor that glides, steps from note to note or beat to beat, or hides; five cursor colours;
  the bar highlight and the notes being played coloured, each switchable. Scrolling by hand
  while playing pauses the following until "Back to the music" or play is pressed again, and
  playback that starts with the music out of view brings it back. Settings are remembered.
- **Standalone metronome.** Tempo from 10 to 400 BPM by typing, buttons, slider or tap tempo
  (button or T), any meter up to 16 beats, with the beat display and the same sounds and
  patterns; the open song waits and comes back when it closes.
- **Practice.** A mixer with mute, solo and level per track and a practice mode; selecting a
  range by dragging across the music, Shift+click or a long press on phones, with handles to
  adjust it, or a whole section from the Go to list; looping the selection; Shift+arrow keys and Esc for selections
  ([docs/SHORTCUTS.md](docs/SHORTCUTS.md)).
- **Phones.** Phone-first layouts: scroll layout by default, a compact playback bar with a menu
  for less frequent controls, touch-sized selection handles.
- **Landing page and identity.** A new logo (the open string), a landing page with a live
  tablature stage that answers the pointer, Open Graph and app icons.
- **Quality gates.** Playwright end-to-end tests on Chromium, WebKit and Firefox, desktop and
  phones, with performance budgets (warm start, drop to first render, view changes, play
  start); a bundle budget check; deterministic generated fixtures.
- **Engraving proofs.** Every guitar technique Guitar Pro draws is checked, on Guitar Pro files
  and alphaTex, to be drawn on its beat and nowhere else: bends of every kind, whammy dives and
  dips, slides, hammer-ons and pull-offs, tapping, slap and pop, every harmonic, vibrato, palm
  mute and let ring, dead and ghost notes, accents, grace notes, tremolo picking, trills,
  rasgueado, strokes and arpeggios, fingering, dynamics, hairpins and fades; and so is the
  notation of rhythm, meter and form: octave lines, tuplets of any ratio, ties, dots, rests,
  fermatas, time and key signatures, tempo marks, triplet feel, free time, repeats, endings,
  segno and coda with every D.C. and D.S., sections and texts; and chord names and diagrams,
  lyrics on several lines, drum noteheads, clefs, multi-bar rests, simile marks, golpe, wah,
  sustain pedal, barré, ornaments, slurs, bar numbers and beat timers.

### Changed

- alphaTab 1.8.4 is patched: text measurement in workers (0001), runtime exports of reader
  errors (0002), faster XML parsing for large Guitar Pro 7+ files (0003), a fix that makes
  Capella files open at all (0004), 10 % playback speed (0005), count-ins and loop passes that
  switch while audio is generated, without gaps or drift (0006), drum kits on any channel and
  silence instead of `NaN` for unloaded samples (0007), centred channels (0008), replacing
  the song while it plays (0009), speed changes without a seek (0010), rests between loop
  passes (0011), exact text measurement (0012), section names on a row of their own (0013),
  mixer overrides with detune (0014), playback techniques that were drawn but not heard
  (0015), jumps that follow Guitar Pro's rules (0016), channels of their own for slap, pop,
  golpe and unison bends (0017), a playing style per track (0018), sample-accurate events
  (0019), Guitar Pro 7+ documents read as they close (0020), "let ring" written as Guitar Pro
  writes it (0021), octave lines below the staff (0022) and rests of lower voices placed below
  the first voice (0023). See [docs/upstream/](docs/upstream/).
- Large Guitar Pro 7 and 8 files open faster and in far less memory: a 20-track, 500-bar score
  paints in about 0.7 s instead of 1.25 s, and no longer holds about 900 MB of XML while it
  opens. Every fixture's imported score is fingerprinted, so changes to importing are caught.

### Fixed

- Let-ring ranges read "let ring", as in Guitar Pro, instead of "LetRing".
- 8vb and 15mb passages show their sign and line below the staff (they were not drawn at all).
- In bars with two voices, a rest of the second voice moves below the first voice instead of
  above the staff, and no longer sits on a rest of the first voice of another length.
- Beat timers are worked out when a score opens, as the player reaches each beat: alphaTex
  timers no longer all read 0:00, and Guitar Pro timers no longer change once playback is
  prepared (Guitar Pro's own stored times agree, to its rounding).

- A mixer remembered for a file no longer makes playback unavailable when it is restored while
  the sound engine is still starting.
- A big score's first systems no longer wait behind the preparation of its playback: the engine
  prepares playback once the score has painted.

- The playback cursor no longer steps back and starts over during long notes when other tracks
  are hidden (each of their notes restarted its glide).
- Tempo marks, section names and effect texts no longer run into each other.
- When the sound engine cannot start or load, playback says why and offers to try again instead
  of showing "Loading sounds…" forever.
- A font subset inlined as a `data:` URL was blocked by the Content Security Policy.
- Opening the mixer no longer covers its first row with a tooltip.
