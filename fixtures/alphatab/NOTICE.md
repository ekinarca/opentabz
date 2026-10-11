# alphaTab test files

The files in this directory are copied **unmodified** from the alphaTab repository
(<https://github.com/CoderLine/alphaTab>, tag `v1.8.4`, commit `022a45c8e42370f9e12e68949d11eada370da83d`, directory
`packages/alphatab/test-data/`).

- Copyright © Daniel Kuschny and alphaTab contributors.
- License: Mozilla Public License 2.0 (<https://mozilla.org/MPL/2.0/>). Source of each file:
  the same relative path under `packages/alphatab/test-data/`.

They are small feature test files (one notation feature each) used by OpenTabz's import,
rendering and playback tests.

## Selection

Every candidate was parsed and its title, artist, album, words, music, notices, track names,
section names, chord names, beat texts and lyrics were reviewed. Files containing real songs or
song lyrics were **not** copied (ADR-0010 in `docs/DECISIONS.md`):

`guitarpro4/fade-to-black.gp4`, `guitarpro5/canon.gp5`, `guitarpro5/chord-name-overflow.gp5`,
`guitarpro5/nightwish.gp5`, `guitarpro5/serenade.gp5`, `guitarpro5/beat-text-lyrics.gp5`,
`guitarpro6/serenade.gpx`, `guitarpro7/serenade.gp`, `guitarpro8/canon-audio-track.gp`,
`guitarpro8/faulty.gp`, `guitarpro8/orphan-tempo-automation.gp`, `audio/full-song.gp5`, and the
whole `conversion/` and `visual-tests/` directories. Binary audio, SoundFonts and reference
images from the test data were not copied either.

`musicxml3/compressed.mxl` (a compressed MusicXML file with placeholder title and composer) was
added later from the same tag.
