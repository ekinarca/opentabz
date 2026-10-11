# Guitar Pro 8 parity

> Guitar Pro is a registered trademark of Arobas Music. OpenTabz is not affiliated with, endorsed
> by or sponsored by Arobas Music. Product names are used only to describe compatibility and
> features. Other product names belong to their owners.

OpenTabz has to do everything Guitar Pro 8 does, then go further. This file is the checklist for
that promise. It lists every Guitar Pro 8 capability we could find in public sources (the GP8
user guide, Arobas's feature and release-note pages, reviews, app-store listings and alphaTab's
model reference) and maps each one to the rows of [FEATURE_MATRIX.md](FEATURE_MATRIX.md) that
deliver it.

- **Nothing on this list may be missing at v1.0.** Every Guitar Pro item maps to at least one
  matrix row, and those rows must ship in M0–M8. Two groups are listed only for completeness:
  Arobas's online store (mySongBook), which OpenTabz will not rebuild, and the Guitar Pro mobile
  companion app. OpenTabz itself runs fully on phones and tablets, so everything the mobile app
  does is already covered by the desktop parity rows.
- **Our own words.** Descriptions paraphrase the sources. No manual or marketing text is copied;
  short feature names are used only as labels.
- **Stable IDs.** Items keep their IDs (`GP-<AREA>-<NNN>`, `PR-<AREA>-<NNN>`, `GAP-<NNN>`) and are
  never renumbered. New findings go at the end of their area.
- **Keep it in sync.** A change that adds, splits, merges or renumbers matrix rows updates the
  Matrix column here in the same commit.

Beyond Guitar Pro itself, the file maps 144 practice features found in other tab, notation and
practice apps (Part B) and 25 places where Guitar Pro 8 falls short (the gap list). Those rows
are where OpenTabz aims to exceed Guitar Pro.

Research date 2026-10-11. Coverage runs up to Guitar Pro 8.1.5 (October 2025), including Guitar
Pro 7 and older features that GP8 still has.

## Summary

|  | Items | Mapped to matrix rows | Not replicated |
| --- | ---: | ---: | ---: |
| Guitar Pro 8 features (GP) | 701 | 677 | 24 (14 online store, 10 mobile-app reference) |
| Practice features from other apps (PR) | 144 | 141 | 3 (out of scope: online service or native plugin) |
| GP8 gaps where OpenTabz goes further (GAP) | 25 | 25 | 0 |

- The 677 mapped Guitar Pro items point at 634 distinct matrix rows; the practice features at 170; the gaps at 66.
- 414 matrix rows were added for this inventory: OPEN 9, REND 77, PLAY 67, PRAC 65, VIEW 13, EDIT 84, COMP 17, AUD 26, EXP 16, LIB 6, PLAT 11, UX 22, PERF 1.
- Guitar Pro items whose only matrix rows are still stretch (`S`): none. OPEN-024 (PowerTab import, GP-IMP-004) moved from S to M8.

### Per section

| Section | Prefix | Items | Mapped | Not replicated |
| --- | --- | ---: | ---: | ---: |
| Application shell, home page, files and system | GP-APP | 30 | 30 | 0 |
| Main window, navigation and selection | GP-UI | 28 | 28 | 0 |
| Score setup and song information | GP-PRJ | 10 | 10 | 0 |
| Tracks: instruments, notation, tuning, transposition, interpretation | GP-TRK | 36 | 36 | 0 |
| Note entry and editing | GP-ENT | 25 | 25 | 0 |
| Rhythm: durations, ties, tuplets, beaming, feel | GP-RHY | 25 | 25 | 0 |
| Bar-level notation: clefs, keys, meters, barlines, repeats, ottava, breaks | GP-BAR | 28 | 28 | 0 |
| Directions and jumps | GP-DIR | 20 | 20 | 0 |
| Note marks: accidentals, dynamics, articulations, fermatas | GP-NOT | 28 | 28 | 0 |
| Bends and whammy bar | GP-BND | 20 | 20 | 0 |
| Slides | GP-SLD | 6 | 6 | 0 |
| Harmonics | GP-HAR | 8 | 8 | 0 |
| Other playing techniques | GP-FX | 31 | 31 | 0 |
| Strokes, brushes, arpeggios, rasgueado | GP-STR | 10 | 10 | 0 |
| Ornaments and grace notes | GP-ORN | 8 | 8 | 0 |
| Fingering, barre, string indications | GP-FNG | 6 | 6 | 0 |
| Drums and percussion | GP-DRM | 16 | 16 | 0 |
| Text, sections, lyrics, tempo text | GP-TXT | 15 | 15 | 0 |
| Chord engine, chord diagrams and scale diagrams | GP-CHD | 26 | 26 | 0 |
| Scale tool | GP-SCL | 7 | 7 | 0 |
| Tools and assistants | GP-TOOL | 21 | 21 | 0 |
| Command palette | GP-CMD | 15 | 15 | 0 |
| Display modes, zoom, instrument views, design mode | GP-VIEW | 26 | 26 | 0 |
| Stylesheet: engraving options, one per row | GP-STY | 76 | 76 | 0 |
| Preferences | GP-PREF | 15 | 14 | 1 |
| Playback and practice | GP-PLAY | 18 | 18 | 0 |
| Sound engine, presets, effects and amps | GP-SND | 37 | 37 | 0 |
| Mixer, automations, mastering, note-level audio | GP-MIX | 20 | 20 | 0 |
| Audio track for backing tracks and transcription | GP-AUD | 19 | 19 | 0 |
| Line-in and MIDI I/O | GP-IO | 13 | 13 | 0 |
| Import | GP-IMP | 14 | 14 | 0 |
| Export and print | GP-EXP | 19 | 19 | 0 |
| Keyboard shortcuts | GP-KBD | 2 | 2 | 0 |
| mySongBook: online store [online] [won't replicate] | GP-MSB | 13 | 0 | 13 |
| Guitar Pro mobile companion app (reference only) | GP-MOB | 10 | 0 | 10 |

## Sources

### Official Guitar Pro 8 user guide (guitar-pro.com/docs/gp8)
- Table of contents and intro: https://www.guitar-pro.com/docs/gp8/basics/intro · https://www.guitar-pro.com/docs/gp8/basics/intro/whats-new · https://www.guitar-pro.com/docs/gp8/basics/intro/overview · https://www.guitar-pro.com/docs/gp8/basics/intro/quick-start
- First steps: https://www.guitar-pro.com/docs/gp8/basics/first-steps/welcome-page · https://www.guitar-pro.com/docs/gp8/basics/first-steps/main-screen · https://www.guitar-pro.com/docs/gp8/basics/first-steps/navigate · https://www.guitar-pro.com/docs/gp8/basics/first-steps/click · https://www.guitar-pro.com/docs/gp8/basics/first-steps/file-management
- Writing a score: https://www.guitar-pro.com/docs/gp8/score/musical-notation · https://www.guitar-pro.com/docs/gp8/score/project/new-file · https://www.guitar-pro.com/docs/gp8/score/project/new-track · https://www.guitar-pro.com/docs/gp8/score/project/score-setup · https://www.guitar-pro.com/docs/gp8/score/project/score-setup/keys · https://www.guitar-pro.com/docs/gp8/score/project/score-setup/information
- Track inspector: https://www.guitar-pro.com/docs/gp8/score/track-settings · https://www.guitar-pro.com/docs/gp8/score/track-settings/track-information · https://www.guitar-pro.com/docs/gp8/score/track-settings/track-notation · https://www.guitar-pro.com/docs/gp8/score/track-settings/track-tuning · https://www.guitar-pro.com/docs/gp8/score/track-settings/track-sound · https://www.guitar-pro.com/docs/gp8/score/track-settings/track-interpretation · https://www.guitar-pro.com/docs/gp8/score/track-settings/tonality-transposition
- Notes and palette: https://www.guitar-pro.com/docs/gp8/score/note/note-input · https://www.guitar-pro.com/docs/gp8/score/note/jianpu · https://www.guitar-pro.com/docs/gp8/score/note/tuplet · https://www.guitar-pro.com/docs/gp8/score/note/symbols · https://www.guitar-pro.com/docs/gp8/score/note/symbols/bars · https://www.guitar-pro.com/docs/gp8/score/note/symbols/note · https://www.guitar-pro.com/docs/gp8/score/note/symbols/effects · https://www.guitar-pro.com/docs/gp8/score/note/symbols/automations · https://www.guitar-pro.com/docs/gp8/score/note/symbols/notation
- Structure: https://www.guitar-pro.com/docs/gp8/score/voices · https://www.guitar-pro.com/docs/gp8/score/bars · https://www.guitar-pro.com/docs/gp8/score/sections · https://www.guitar-pro.com/docs/gp8/score/directions · https://www.guitar-pro.com/docs/gp8/score/drums · https://www.guitar-pro.com/docs/gp8/score/lyrics · https://www.guitar-pro.com/docs/gp8/score/assistant/note-score-assistants · https://www.guitar-pro.com/docs/gp8/score/assistant/copy-paste
- Playing effects: https://www.guitar-pro.com/docs/gp8/playeffects/touch-effects/legato · .../touch-effects/slides · .../touch-effects/bends · .../touch-effects/vibrato · .../touch-effects/tremolo-picking · .../dynamic-tone-effects/palm-mute · .../dynamic-tone-effects/let-ring · .../dynamic-tone-effects/dead-ghost-notes · .../dynamic-tone-effects/accents-staccato · .../dynamic-tone-effects/fades · .../ornements-expressive-effects/grace-notes · .../ornements-expressive-effects/trills-turns · .../ornements-expressive-effects/mordents · .../harmonics-percussive-effects/harmonics · .../harmonics-percussive-effects/slap-pop-golpe · .../harmonics-percussive-effects/pick-scrape · .../harmonics-percussive-effects/rasgueado-brush-arpeggio · .../external-effects/sustain-pedal · .../external-effects/wah. All of these are under https://www.guitar-pro.com/docs/gp8/playeffects/.
- Audio: https://www.guitar-pro.com/docs/gp8/audio/playback/play · https://www.guitar-pro.com/docs/gp8/audio/playback/tempo-metronome · https://www.guitar-pro.com/docs/gp8/audio/playback/speed · https://www.guitar-pro.com/docs/gp8/audio/note-settings · https://www.guitar-pro.com/docs/gp8/audio/mixtable · https://www.guitar-pro.com/docs/gp8/audio/soundsetup/RSE-vs-MIDI · https://www.guitar-pro.com/docs/gp8/audio/soundsetup/sound-settings · https://www.guitar-pro.com/docs/gp8/audio/soundsetup/custom-sounds · https://www.guitar-pro.com/docs/gp8/audio/soundsetup/drum-mix · https://www.guitar-pro.com/docs/gp8/audio/automations/volume-pan-tempo · https://www.guitar-pro.com/docs/gp8/audio/automations/sound-automation · https://www.guitar-pro.com/docs/gp8/audio/score-mastering · https://www.guitar-pro.com/docs/gp8/audio/midi · https://www.guitar-pro.com/docs/gp8/audio/line-in · https://www.guitar-pro.com/docs/gp8/audio/backing-track
- Import and export: https://www.guitar-pro.com/docs/gp8/import-export/import · .../import/import-ascii · .../import/import-midi · .../import/import-musicxml-powertab-tabledit · .../import/batch-converter · https://www.guitar-pro.com/docs/gp8/import-export/export · .../export/export-audio · .../export/export-ascii · .../export/export-midi · .../export/export-musicxml · .../export/export-pdf · .../export/export-png · .../export/export-svg · https://www.guitar-pro.com/docs/gp8/import-export/print
- Tools: https://www.guitar-pro.com/docs/gp8/tools/chords-diagrams · .../tools/scales-diagrams · .../tools/scales · .../tools/tools-transposition · .../tools/midi-capture · .../tools/tuner · .../tools/command-palette · .../tools/protection · .../tools/fretlight
- Display: https://www.guitar-pro.com/docs/gp8/display-options/panels · .../zoom · .../instrument-views · .../notations · .../design-mode · .../page-screen · .../track-visibility · .../stylesheet-options
- Stylesheet and preferences: https://www.guitar-pro.com/docs/gp8/preferences-stylesheet/stylesheet · .../stylesheet/page-format · .../stylesheet/systems-staves · .../stylesheet/header-footer · .../stylesheet/texts-styles · .../stylesheet/notation · .../preferences/general · .../preferences/interface · .../preferences/score-errors · .../preferences/my-info · .../preferences/audio-midi
- mySongBook: https://www.guitar-pro.com/docs/gp8/mysongbook/what-is-msb · .../open-from-msb · .../search-from-msb · .../purchase-from-msb
- Appendix: https://www.guitar-pro.com/docs/gp8/appendix/signature-sounds · https://www.guitar-pro.com/docs/gp8/appendix/effects · https://www.guitar-pro.com/docs/gp8/appendix/shortcuts

### Official guitar-pro.com feature pages, blog posts and release notes
- Feature overview: https://www.guitar-pro.com/c/14-guitar-pro-features
- New features page, including release notes for 8.0.2 through 8.1.5: https://www.guitar-pro.com/c/10-guitar-pro-new-features
- GP8 starter guide (27 headline features): https://www.guitar-pro.com/blog/p/35844-guitar-pro-8-new-features-explained-starter-guide
- 8.1 announcement: https://guitar-pro.com/blog/p/38236-new-free-updade-guitar-pro-8-1-is-available
- Home page: https://www.guitar-pro.com/
- Landing pages: https://www.guitar-pro.com/pages/p/53695-lp-guitar-learning-software · https://www.guitar-pro.com/pages/p/53629-lp-guitar-tab-player · https://www.guitar-pro.com/pages/p/49778-lp-drum-notation-software · https://www.guitar-pro.com/pages/p/53763-lp-piano-sheet-music-editor · https://www.guitar-pro.com/pages/p/53350-lp-music-transcription-software
- GP 7.6 tips: https://guitar-pro.com/blog/p/30062-astuces-guitar-pro-7
- GP 7.5.4 notes: https://blog.guitar-pro.com/2020/03/guitar-pro-7-5-4-is-now-available/ (seen through search results)
- NAMM 2025 preview of the new mobile app: https://www.guitar-pro.com/blog/p/48507-namm-show-2025-the-prototype-of-the-new-guitar-pro-mobile-app-unveiled · https://www.guitar-pro.com/blog/p/49918-namm-show-2025-el-prototipo-de-la-nueva-app-de-guitar-pro-revelado
- GP mobile (iOS) listing: https://apps.apple.com/us/app/-/id400666114

### Reviews and third-party references
- Wikipedia, version and format history: https://en.wikipedia.org/wiki/Guitar_Pro
- Gearnews GP8 review: https://www.gearnews.com/guitar-pro-8-do-you-need-it-and-is-it-worth-it
- Guitar Gear Finder GP8 review: https://guitargearfinder.com/reviews/guitar-pro-8-review/
- Guitar Gear Finder GP7 and 7.5 review: https://guitargearfinder.com/reviews/software/guitar-pro-7-review/
- KVR GP8 product page: https://kvraudio.com/product/guitar-pro-8-by-arobas-music
- Hal Leonard GP7 product page: https://www.halleonard.com/product/214948/guitar-pro-7
- GP7 launch coverage: https://www.guitarworld.com/gear/arobas-music-unveils-guitar-pro-7 (seen through search results)
- GP 7.5 NAMM coverage: https://musicradar.com/news/namm-2019-guitar-pros-new-75-feature-set-debuts (seen through search results)
- A MuseScore feature request that describes the parameters of GP's speed trainer: https://musescore.org/en/node/325482 (seen through search results)
- alphaTab model reference for GP-file enumerations: https://alphatab.net/docs/reference/types/model/tripletfeel · .../direction · .../rasgueado · .../bendtype · .../whammytype/ · .../harmonictype · .../accentuationtype · .../fermatatype · .../slideintype · .../slideouttype · .../noteornament · .../clef · .../gracetype · .../bendstyle · .../sustainpedalmarkertype · .../beatbeamingmode · .../barreshape · .../dynamicvalue · .../automationtype · .../scoresubelement · .../notesubelement · .../barlinestyle

### Competitor sources (Part B)
- **Songsterr:** https://www.songsterr.com/a/wa/help · https://www.songsterr.com/a/wa/plus · https://guitarcoachmag.com/reviews/expanding-the-world-of-tabs/ (seen through search results)
- **Soundslice:** https://www.soundslice.com/features/ · https://soundslice.com/blog/215/introducing-speed-training
- **Ultimate Guitar:** https://help.ultimate-guitar.com/en/articles/6741306-tabs · https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853 · https://www.happynewguitarday.com/is-ultimate-guitar-pro-worth-it/ (seen through search results)
- **MuseScore:** https://apps.apple.com/us/app/musescore-sheet-music-chords/id835731296 · https://musescore.org/en/handbook/2/play-mode and https://musescore.org/en/print/book/export/html/278585 (MuseScore 4 play panel, loop and count-in; seen through search results)
- **TuxGuitar:** https://www.tuxguitar.app/files/devel/desktop/help/detail_markers_player.html · https://www.tuxguitar.app/files/devel/desktop/help/detail_view.html · https://www.tuxguitar.app/files/devel/desktop/help/tools_keybinding.html · https://www.tuxguitar.app/files/devel/desktop/help/edit_chord.html · https://www.tuxguitar.app/files/devel/desktop/help/tools_general.html · https://flathub.org/apps/ar.com.tuxguitar.TuxGuitar
- **Rocksmith+ and Rocksmith 2014:**
  - https://news.ubisoft.com/en-us/article/5XfINjoRmVJgBKR8fGt4EM/rocksmith-accessibility-spotlight
  - https://www.ubisoft.com/de-de/game/rocksmith/plus/news-updates/1S7KCOCQc0RaQSMA9YqvfQ/rocksmith-has-new-songs-updates-and-bug-fixes (seen through search results)
  - Rocksmith 2014 coverage: https://www.gamerevolution.com/?p=62012 and https://outcyders.net/news/rocksmith-2014-edition-revealed (seen through search results)
- **Yousician:** https://yousician.com/blog/whats-new-in-yousician-update-4-14 · https://support.yousician.com/hc/en-us/articles/201558362-Practice-vs-Play-mode-Guitar- (seen through search results; direct fetch was blocked) · https://americansongwriter.com/yousician-review/ (seen through search results)
- **Moises:** https://moises.ai/features/ · https://help.moises.ai/hc/articles/10138829000988-How-do-I-use-Sections and https://help.moises.ai/hc/articles/8472666994076 (seen through search results)
- **Transcribe!:** https://www.seventhstring.com/xscribe/overview.html
- **Other apps (search-result level):**
  - Anytune: https://apps.apple.com/us/app/anytune-practice-perfected/id722444976
  - Justin Guitar app: https://apps.apple.com/US/app/id1176125504
  - Chordify: https://apps.apple.com/us/app/1073624757

## How to read the tables

- **Since:** the first release with the feature. `8.0` shipped in May 2022, `8.1` around March
  2023 and `8.1.5` in October 2025; `7.0` in April 2017 and `7.5` in January 2019. `≤7` (or
  `≤6`, `≤5`) means the feature predates GP8 but the exact version is unknown, `8.x` means some
  GP8 release, and `?` means unknown.
- **(unverified):** not confirmed by an official Guitar Pro source; either a single secondary
  source mentions it, or the detail comes only from the GP file model as alphaTab exposes it.
- **[notation-only]:** Guitar Pro draws the symbol but does not play it back.
- **[online]:** needs Arobas's servers. **[won't replicate]:** out of scope for OpenTabz.
- **Matrix:** the [FEATURE_MATRIX.md](FEATURE_MATRIX.md) rows that together deliver the item,
  most specific first. Notes in italics explain a judgment call. Items OpenTabz will not build
  start with `—` and give the reason.

## Part A: Guitar Pro 8 features

### 1. Application shell, home page, files and system (GP-APP)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-APP-001 | App/Home | Home page | Start screen with new and open actions, recent and local files, templates, examples and the mySongBook catalogue. A toolbar icon returns to it at any time. | ≤7 | UX-001, UX-002, UX-003, LIB-005 |
| GP-APP-002 | App/Home | New blank file | Creates an empty score with no tracks and opens the track-creation assistant straight away. Available from the File menu, the home page, the tab-bar "+" button, or Ctrl/Cmd+N. | ≤7 | COMP-001, UX-002, EDIT-066 |
| GP-APP-003 | App/Home | New from template | Starts a project from a preset that already has tracks, instruments, tunings and sounds, such as a rock trio, a jazz quintet or a solo acoustic setup. | ≤7 | COMP-002 |
| GP-APP-004 | App/Home | Bundled templates | 23 built-in templates, alphabetically from an acoustic-bass setup to a "trash band" setup. | 8.x | COMP-002 |
| GP-APP-005 | App/Home | Save as template and manage templates | Saves the current project as a personal template, which then appears in the template list and can be managed later. | ≤7 | COMP-083 |
| GP-APP-006 | App/Home | Default template preference | Sets the template that new files start from, or an empty file. | ≤7 | COMP-084 |
| GP-APP-007 | App/Home | Recent files | Lists the most recently opened scores. The whole list can be cleared, but single entries can't be removed. | ≤7 | LIB-005 |
| GP-APP-008 | App/Home | Pin recent files | A pin on hover keeps a file at the top of the recent list. Click it again to unpin. | 8.0 | LIB-004, LIB-005 |
| GP-APP-009 | App/Home | Local files folder | Points the home page at a folder of GP files so they are indexed and listed. GP7 called this a file browser. | 7.0 | LIB-010, OPEN-008, LIB-002 |
| GP-APP-010 | App/Home | Unified home search | Live search by full or partial file name across recent, local, mySongBook, template and example files, with a result count per category. | 8.x | LIB-011 |
| GP-APP-011 | App/Home | Example scores | 23 demo files in styles from rock to jazz that show off editing and playback. | 8.x | UX-003 |
| GP-APP-012 | App/Home | Hover preview | Hovering a file shows a thumbnail of the score and plays a short audio snippet of each track without opening it. | 8.x (unverified version) | LIB-012 |
| GP-APP-013 | App/Home | Quick links | One-click links to support, the user guide and social channels. | 8.x | UX-025 |
| GP-APP-014 | App/Home | Home notifications | A news area on the welcome page that can be permanently switched off in preferences. | 8.1.2 (opt-out) | UX-026, UX-027 |
| GP-APP-015 | App/Home | Hide home sections | A preference that hides the mySongBook block, the Examples block, or both. | 8.x | UX-027 |
| GP-APP-016 | App/Files | Open files | Open dialog, OS file association for .gp, .gp5 and .gpx, drag-and-drop onto the window, and File > Open Example. | ≤7 | OPEN-001, OPEN-002, OPEN-006, PLAT-003, UX-003 |
| GP-APP-017 | App/Files | Multi-document tab bar | Each open score gets a tab. Tabs show a dot when modified and a lock badge when password-protected. Hovering shows save and close buttons. Scroll arrows appear on overflow, and a context menu offers close all and show in folder. | 7.0 | OPEN-009, EDIT-123 |
| GP-APP-018 | App/Files | Save and Save As | Saves to the native `.gp` container (the GP7/8 format), or to a new name or location. | 7.0 (.gp) | EDIT-064, EXP-010, LIB-009 |
| GP-APP-019 | App/Files | Close and close all | Closes the active tab (Ctrl/Cmd+W) or every tab (Shift+Ctrl/Cmd+W). | ≤7 | OPEN-009, EDIT-123 |
| GP-APP-020 | App/Files | Show file in folder | File > Open File Folder shows the score in Explorer or Finder. | ≤7 | LIB-013 *(browsers cannot open the OS file manager, so the document is revealed in the library)* |
| GP-APP-021 | App/Files | Reopen last session | Optionally reopens the documents that were open when the app last quit. | ≤7 | UX-028 |
| GP-APP-022 | App/Files | Autosave and crash recovery | Background backup copies are restored after a crash. Since 8.1.3, autosaves are written to a local directory. | ≤8.1 (unverified origin) | EDIT-061, EDIT-124 |
| GP-APP-023 | App/Files | Undo and redo | Multi-level undo and redo of edits (Ctrl/Cmd+Z, and Ctrl+Y or Shift+Cmd+Z). | ≤7 | EDIT-060 |
| GP-APP-024 | App/Files | Symbolic-link support | The local-files browser follows symlinked folders and files. | 8.0.2 | LIB-010 |
| GP-APP-025 | App/System | UI languages | 13 languages: English, French, German, Korean, Spanish, Italian, Japanese, Polish, Portuguese, Russian, Swedish, and Traditional and Simplified Chinese. Swedish arrived in 8.1. Switching needs a restart. | 8.1 (Swedish) | UX-023, UX-024 |
| GP-APP-026 | App/System | Updates and beta channel | Update checks run daily, weekly, monthly or never. Licence holders can opt into free beta builds and go back to the stable version at any time. | ≤7 | PLAT-045, PLAT-046 |
| GP-APP-027 | App/System | Desktop platforms | Native Windows and macOS builds, with Apple Silicon support since 8.0. GP7 dropped Linux. OpenTabz targets the browser instead. | 8.0 (Apple Silicon) | PLAT-047, PLAT-001, UX-021 |
| GP-APP-028 | App/System | Licensing and trial | One licence covers up to 5 machines, with a 7-day full trial and online activation. [won't replicate] | 8.x | UX-001, PROJ-003, PROJ-006 *(exceeded: free and open source, with no licence key, activation, trial or account)* |
| GP-APP-029 | App/System | Low-spec performance | 8.0 was tuned to run better on modest machines. Stated minimums are a 64-bit dual-core CPU and 4 GB of RAM. | 8.0 | PERF-010, PERF-001, PERF-005 |
| GP-APP-030 | App/System | Lock-file alert | A confirmation message appears when a file is locked with protection. | 8.0.2 | EDIT-120, EDIT-121, EDIT-122 |

### 2. Main window, navigation and selection (GP-UI)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-UI-001 | UI | Toolbar | Top bar with home, panel toggles, zoom, display mode, undo/redo, print, transport, LCD, loop and speed, global tonality, audio-track toggle, instrument views, tuner, line-in and an optional Fretlight button. Items fold into menus when the window is narrow. | 7.0 | UX-029, UX-015, PLAT-012 |
| GP-UI-002 | UI | LCD readout | Central display showing the current bar and beat, time signature and live tempo (automation included). It has metronome and count-in toggles and a bar-completeness light: green when the bar is full, red when it is short or overfull, with a tooltip naming the voice at fault. | ≤7 | PLAY-071, PRAC-001, PRAC-011, EDIT-103 |
| GP-UI-003 | UI | Editing palette | Left panel with the voice selector, multivoice and design-mode toggles, lyrics and chord buttons, and icon groups for bar, note, effect, notation and automation symbols. Complex symbols open parameter pop-ups, and right-click or long-press shows variants. | 7.0 | EDIT-077, EDIT-014 |
| GP-UI-004 | UI | Song inspector | Right panel (F5) for score-level data: song information, notation settings and sound mastering. | 7.0 | EDIT-078, REND-218 |
| GP-UI-005 | UI | Track inspector | Right panel (F6) for the active track: information, notation, tuning, transposition, sound and interpretation. | 7.0 | EDIT-079 |
| GP-UI-006 | UI | Global view | Bottom panel (F8) listing tracks with their mixer controls, next to a map of the song where each square is one bar of one track. Click a square to jump there. Shows bar numbers and section names and supports drag-selection across tracks. | 7.0 | VIEW-015, PLAY-006, PLAY-050, PLAY-051, PLAY-052, PLAY-053 |
| GP-UI-007 | UI | Panel toggles | Show or hide the palette (F2), inspectors (F5/F6) and global view (F8). The audio track, pedalboard and instrument views are toggled from the View menu or toolbar. | 7.0 | UX-010, UX-011 |
| GP-UI-008 | UI | Full screen | Distraction-free window (F11 or Ctrl+Cmd+F; Esc exits). | ≤7 | VIEW-013 |
| GP-UI-009 | UI | Click-to-edit | Clicking a score element opens its editor. This works for the title and other info, tempo, tuning, capo, sections, swing (triplet feel), chords, text, time and key signatures, fermatas, markers, alternate endings and repeat counts. | 7.5 | EDIT-080 |
| GP-UI-010 | UI | Hover highlight | Editable score elements turn blue under the mouse. | 7.5 (unverified) | EDIT-080 |
| GP-UI-011 | UI | Cursor navigation | Arrow keys move by beat and by line. Home/End go to the start or end of the bar, and Ctrl+Home/End to the first or last bar. Tab and Shift+Tab move between staves and notations. | ≤7 | EDIT-004, EDIT-005 |
| GP-UI-012 | UI | Track switching | Change the active track from the toolbar track-name dropdown, with Ctrl/Cmd+Up/Down, or from the global view. | ≤7 | VIEW-016, VIEW-015 |
| GP-UI-013 | UI | Section navigation | The Sections menu lists every section to jump to. Ctrl+Alt (Option+Cmd) with Left/Right moves to the previous or next section. | ≤7 | PLAY-004, VIEW-012 |
| GP-UI-014 | UI | Go to bar | A dialog jumps to a bar number (Ctrl/Cmd+G). The command palette ":" prefix does the same. | ≤7 | PLAY-005, UX-038 |
| GP-UI-015 | UI | Free scrolling | Wheel, trackpad or scrollbars move the view without moving the cursor. Alt+wheel scrolls sideways. The global view can be made taller. | ≤7 | REND-013, REND-014, PLAT-011 |
| GP-UI-016 | UI | Follow playback and resume | The view follows the playback cursor. Scrolling by hand pauses following, and a "Resume auto-scroll" button brings it back. | ≤7 | PLAY-013, PLAY-072 |
| GP-UI-017 | UI | Reposition while playing | Clicking the score during playback moves the play position without stopping. | ≤7 | PLAY-002 |
| GP-UI-018 | UI | Mouse range selection | Drag across beats or bars to select them in the current track, or drag across global-view squares to select bars. | ≤7 | EDIT-081, VIEW-015 |
| GP-UI-019 | UI | Resizable selection | Drag the blue handles at either end of a selection to grow or shrink it. | 8.0 | EDIT-082 |
| GP-UI-020 | UI | Select a whole track | Ctrl/Cmd+A, or triple-click any beat in the score or the global view. | 8.0 (triple-click) | EDIT-083 |
| GP-UI-021 | UI | Keyboard selection | Shift with the arrows, Home or End extends by beat. Ctrl/Cmd+Shift with the same keys extends by bar. | ≤7 | EDIT-084 |
| GP-UI-022 | UI | Multi-track selection | Select bars on several tracks in the global view for multitrack copy and cut. | ≤7 | EDIT-085 |
| GP-UI-023 | UI | Select a section | Double-click a section in the global view to select all of its bars. | ≤7 | EDIT-086 |
| GP-UI-024 | UI | Context menus | Right-click menus on tracks, master-track bars, tabs, symbols and the audio waveform. | ≤7 | UX-030 |
| GP-UI-025 | UI | Reorder tracks | Move a track up or down from the Track menu, the global-view arrows or the context menu. | ≤7 | EDIT-030 |
| GP-UI-026 | UI | Shortcut hints | Tooltips and menus show each command's keyboard shortcut. | ≤7 | UX-031, VIEW-014 |
| GP-UI-027 | UI | Interface colours | 8.0 adjusted contrast and colours. The desktop app has no dark theme (see GAP-002). | 8.0 | UX-020, PLAT-022 |
| GP-UI-028 | UI | Voice-coloured cursor | The edit cursor takes the colour of the active voice, and inactive voices are drawn greyed out. | ≤7 | EDIT-087 |

### 3. Score setup and song information (GP-PRJ)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-PRJ-001 | Score setup | Song information fields | Title, subtitle, artist, album, lyricist, composer, copyright and transcriber. They are edited in the song inspector and appear in the header, in prints and in exports. | ≤7 | REND-040, EDIT-089 |
| GP-PRJ-002 | Score setup | Notice field | Optional free-text notice block. It is off by default and enabled from the header/footer stylesheet. | ≤7 | REND-041, VIEW-011, EDIT-089 |
| GP-PRJ-003 | Score setup | Instructions field | Optional block of performance instructions, off by default. | ≤7 | REND-041, EDIT-089 |
| GP-PRJ-004 | Score setup | Multi-line fields | Ctrl+Enter adds a line break inside an information field. | ≤7 | EDIT-089 |
| GP-PRJ-005 | Score setup | Click header to edit | Clicking a header item in the score jumps to its field in the inspector. | 7.5 | EDIT-080 |
| GP-PRJ-006 | Score setup | Default author details | A preference pre-fills artist, lyricist, composer, copyright, transcriber and instructions in every new score. These are also stored as file metadata. | ≤7 | PLAT-049 |
| GP-PRJ-007 | Score setup | Anacrusis (pickup bar) | Marks the first bar as an incomplete pickup so it isn't flagged as an error. Da Capo jumps then skip it correctly. | ≤7 | REND-158, EDIT-027, PLAY-100 |
| GP-PRJ-008 | Score setup | Master track | A song-wide layer that holds tempo, sections, repeats and directions, the key signature and master volume/pan automations, shared by all tracks. | ≤7 | EDIT-090 |
| GP-PRJ-009 | Score setup | Concert-pitch key | The key signature is stored once at concert pitch and each track displays it transposed as needed. | ≤7 | REND-032, REND-154 |
| GP-PRJ-010 | Score setup | Engraving rules | Scores keep barlines and tracks aligned, follow standard engraving practice (*Behind Bars* conventions are cited) and highlight rule breaks in red (see GP-PREF-007 to GP-PREF-011). | ≤7 | REND-001, COMP-071, COMP-085 |

### 4. Tracks: instruments, notation, tuning, transposition, interpretation (GP-TRK)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-TRK-001 | Track | Track-creation assistant | Wizard that adds a track: choose the instrument type and instrument; set name, colour and icon; pick notations and staff type; set the tuning and starting sound, each with a preview button; then Create. | 7.0 | EDIT-066 |
| GP-TRK-002 | Track | Instrument families | Four top-level types in the wizard: Stringed, Orchestra, Drums and MIDI. | 7.0 | EDIT-066, EDIT-067 |
| GP-TRK-003 | Track | Instrument library | 100+ emulated instruments covering guitars, basses, keyboards and organs, drums and percussion, orchestral strings, winds, brass, voice, ukulele, banjo, mandolin and world instruments. Marketing pages also mention "200+ instruments" and "200+ soundbanks". | ≤7 | EDIT-067, AUD-005, AUD-006 |
| GP-TRK-004 | Track | Quick ways to add a track | The global-view "+" button, double-clicking an instrument in the wizard (new in 8.0), the context-menu "Add a track", and a shortcut (Ctrl+Shift+Ins / Option+Cmd+N). | 8.0 (double-click) | EDIT-030, EDIT-066 |
| GP-TRK-005 | Track | Delete track | From the Track menu or the global-view context menu. | ≤7 | EDIT-030 |
| GP-TRK-006 | Track | Full and short name | A full name plus an abbreviation used at system starts and in the global view. Display rules are set in the stylesheet. | ≤7 | EDIT-035, REND-035 |
| GP-TRK-007 | Track | Track colour | A per-track colour shown in the global view and the toolbar to mark the active track. | 7.0 | EDIT-035, REND-036 |
| GP-TRK-008 | Track | Track icon | A selectable instrument icon for each track. | 7.0 | EDIT-068 |
| GP-TRK-009 | Track | Notation selection | Standard staff, tablature, slash (rhythm) and numbered (jianpu), in any combination shown at once. | 7.0 (jianpu 8.1) | REND-031, REND-001, REND-002, REND-003, REND-004, REND-005 |
| GP-TRK-010 | Track | Single or grand staff | One staff, or two staves joined by a brace, piano-style. | ≤7 | REND-186, EDIT-069, EDIT-070 |
| GP-TRK-011 | Track | Split staff | Going from one staff to two can split notes around C3, put everything on staff 1, or put everything on staff 2. | 7.x (unverified) | EDIT-069 |
| GP-TRK-012 | Track | Merge staves | Going from two staves to one can merge both, keep only staff 1, or keep only staff 2. | 7.x (unverified) | EDIT-070 |
| GP-TRK-013 | Track | 3 to 10 strings | Fretted tracks can have 3 to 10 strings. 7.5 raised the old limit of 8 to 10. | 7.5 | EDIT-032, VIEW-001 |
| GP-TRK-014 | Track | Tuning dialog | Per-track tuning editor, opened by clicking the tuning label in the score or from the inspector. Redesigned in 7.5. | 7.5 | EDIT-032, EDIT-080 |
| GP-TRK-015 | Track | Tuning presets | Named tunings grouped by instrument: guitar, bass, banjo, shamisen, cello, double bass, mandolin, ukulele, viola and violin. | ≤7 | EDIT-032 |
| GP-TRK-016 | Track | Per-string tuning | Raise or lower any single string by semitones. | 7.5 | EDIT-032 |
| GP-TRK-017 | Track | Tuning preview | Play the whole tuning or one string at a time. | 7.5 (unverified) | EDIT-071 |
| GP-TRK-018 | Track | User tuning library | Save the current tuning from the Options menu, then edit or delete it later. Capo and label are not saved with it. | 8.x (unverified version) | EDIT-072 |
| GP-TRK-019 | Track | Tuning label | A custom display name for a tuning, separate from its library name. | 8.x (unverified version) | EDIT-073 |
| GP-TRK-020 | Track | Banjo drone string | Handles the short fifth (drone) string of a 5-string banjo when fingering and shifting strings. | ≤7 | EDIT-074 |
| GP-TRK-021 | Track | Capo | Full capo at any fret, shown on the neck preview and in the score. | ≤7 | REND-033, EDIT-032 |
| GP-TRK-022 | Track | Partial capo | Capo on some strings only at one fret. It can be combined with a main capo and uses absolute fret numbers. | 7.x | REND-187, EDIT-075 |
| GP-TRK-023 | Track | Keep or adjust fingering | When the tuning or capo changes, either keep the tab frets (so pitches move) or recompute frets so pitches stay the same. | 7.5 | EDIT-032, EDIT-054 |
| GP-TRK-024 | Track | Transposing instruments | "Transposition tonality" sets the concert note heard when a written C is shown, plus an octave offset of ±1 or ±2. Used for B♭, E♭ and F instruments, guitar octave writing, and so on. | ≤7 | EDIT-036, REND-032 |
| GP-TRK-025 | Track | Concert-pitch toggle | Switches the display between sounding (concert) and written (transposed) pitch. | ≤7 | REND-032 |
| GP-TRK-026 | Track | Playing style | Per-track preset that changes RSE rendering: pick, fingers, "picking" or bass slap. | ≤7 | AUD-028 |
| GP-TRK-027 | Track | Palm-mute intensity | Slider that sets how heavily palm-muted notes are damped in playback. | ≤7 | PLAY-117 |
| GP-TRK-028 | Track | Accentuation | Automatically stresses the strong beats of each bar in playback. | ≤7 | PLAY-118 |
| GP-TRK-029 | Track | Automatic let ring | Track-wide sustain: notes ring past their written length until a rest or a new note on the same string. The score prints "let ring throughout". | ≤7 | PLAY-115, REND-188 |
| GP-TRK-030 | Track | Automatic brush | Every chord plays as a quick strum, with a small delay from string to string. | ≤7 | PLAY-116 |
| GP-TRK-031 | Track | Stringed-instrument mode | When on, notes belong to strings and the same pitch on two strings can sound together. When off, the track behaves like a piano. | ≤7 | EDIT-076 |
| GP-TRK-032 | Track | Track visibility | An eye icon in the global view shows or hides the track in multitrack display. | 7.0 | REND-030 |
| GP-TRK-033 | Track | Playable range | Each instrument has a range. Notes outside it are flagged as errors and greyed out in the keyboard view. | ≤7 | COMP-072, EDIT-067, VIEW-019 |
| GP-TRK-034 | Track | Tab for any instrument | Any pitched track (piano, voice, orchestral) can be shown as tablature. Drum tabs show MIDI note numbers. | 7.0 | REND-190, REND-191 |
| GP-TRK-035 | Track | Multiple sounds per track | A track can hold several sounds (for example clean and distorted) and switch between them over time. See GP-MIX-015 and GP-SND-007. | ≤7 | AUD-029, PLAY-126 |
| GP-TRK-036 | Track | Numbered notation (jianpu) | Shows notes as scale degrees 1 to 7, with 0 for a rest, relative to the key (printed as "1 = C", or "1 = A" in minor). Dashes lengthen a note, underlines shorten it, and dots above or below change the octave. Only # and b are used, never a natural. Tuplets, slurs and hammer-ons, accents, trills, grace notes, lyrics, fingering and fermatas are supported. Not available for percussion. | 8.1 | REND-005 |

### 5. Note entry and editing (GP-ENT)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-ENT-001 | Entry | Cursor-based entry | A click only places the cursor. Notes are added by typing or by clicking an instrument view. | 7.0 | EDIT-004, EDIT-097 |
| GP-ENT-002 | Entry | Typing fret numbers | In tab, number keys enter the fret. A short wait allows two-digit frets. | ≤7 | EDIT-004 |
| GP-ENT-003 | Entry | Staff entry with string choice | In standard notation, keys 1–9 choose the target string and 0 lets GP pick the best one. | ≤7 | EDIT-091 |
| GP-ENT-004 | Entry | Linked notations | A note entered in tab, staff or jianpu appears in every notation the track shows. | ≤7 | EDIT-092 |
| GP-ENT-005 | Entry | Rest key | R puts a rest at the cursor. | ≤7 | EDIT-010, EDIT-004 |
| GP-ENT-006 | Entry | Duration keys | The + and − keys (also = and _) step the duration shorter or longer. Which key does which can be swapped in preferences. | ≤7 | EDIT-010, PLAT-050 |
| GP-ENT-007 | Entry | Insert and delete beats | Insert a beat before the cursor (Ctrl+Ins) or delete the selected beats (Shift+Del). | ≤7 | EDIT-093 |
| GP-ENT-008 | Entry | Delete note or clear | Backspace removes the note under the cursor. Delete clears the selection. | ≤7 | EDIT-093 |
| GP-ENT-009 | Entry | Copy last beat | The C key repeats the previous beat at the cursor. | ≤7 | EDIT-094 |
| GP-ENT-010 | Entry | Move note to another string | Ctrl+Alt+Up/Down moves a note to the next string at the same pitch, recalculating the fret. | ≤7 | EDIT-052 |
| GP-ENT-011 | Entry | Semitone up or down | Palette commands raise or lower the selected notes by a semitone. | ≤7 | EDIT-050 |
| GP-ENT-012 | Entry | Enharmonic respelling | "Change accidental" switches spelling (for example G♭ to F♯) without changing the pitch. | ≤7 | EDIT-013 |
| GP-ENT-013 | Entry | Automatic next bar | When a bar is full the cursor moves into the next bar, creating it if the cursor is at the end of the score. | ≤7 | EDIT-095 |
| GP-ENT-014 | Entry | Audible stepping | Alt/Option+Left/Right steps through notes and sounds each one without starting playback. | ≤7 | PLAY-073 |
| GP-ENT-015 | Entry | Hear notes as you type | Each note sounds as it is entered. | ≤7 | EDIT-096 |
| GP-ENT-016 | Entry | Entry from instrument views | Click the fretboard, keyboard or drum view to add a note, and click an existing note to remove it. The < and > buttons step the cursor. | ≤7 | EDIT-097 |
| GP-ENT-017 | Entry | Slash entry | A note typed in slash notation becomes a slash with an editable duration. Notes converted to slashes keep their pitch data. | 8.0 | EDIT-098 |
| GP-ENT-018 | Edit | Single-track copy and cut | Copies beats regardless of bar lines, keeps every voice, and pastes across instruments. Between drum and pitched tracks only the rhythm survives, as rests. | ≤7 | EDIT-099 |
| GP-ENT-019 | Edit | Multitrack copy and cut | Copies or cuts whole bars across every track (Ctrl/Cmd+Shift+C or X). The selection grows to full bars. | ≤7 | EDIT-100 |
| GP-ENT-020 | Edit | Paste rules | Pasting inserts at the selection. Multi-bar clips add bars, short clips fill the current bar, and empty bars are filled before new ones are created. | ≤7 | EDIT-099, EDIT-020 |
| GP-ENT-021 | Edit | Special paste | A dialog sets how many times to paste and whether the current bar is included. It also picks what to paste: chord and scale diagrams, text, timers, track automations, master automations and sections. Since 8.0, track and master automations are separate choices. | ≤7 (split 8.0) | EDIT-101 |
| GP-ENT-022 | Edit | Insert and delete bars | Insert a bar before the cursor (Ins) or delete bars (Ctrl+Del). Always applied to every track to keep them aligned. | ≤7 | EDIT-020 |
| GP-ENT-023 | Edit | Choose and move voices | Ctrl/Cmd+1–4 edits voice 1 to 4. Alt/Option+1–4 moves the selected notes into that voice. | ≤7 | EDIT-011, EDIT-102 |
| GP-ENT-024 | Edit | Multivoice editing | Ctrl/Cmd+M unlocks all four voices for editing at once. Otherwise inactive voices are greyed out and locked. | ≤7 | EDIT-088, EDIT-087 |
| GP-ENT-025 | Edit | Four voices per staff | Up to four independent rhythmic voices per track, coloured yellow, green, pink and purple. | ≤7 | EDIT-011, REND-007 |

### 6. Rhythm: durations, ties, tuplets, beaming, feel (GP-RHY)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-RHY-001 | Rhythm | Note values | Whole, half, quarter, 8th, 16th, 32nd and 64th notes. There are no 128th notes (see GAP-005). | ≤7 | REND-189, EDIT-010 |
| GP-RHY-002 | Rhythm | Rests | A rest of any supported value, in any voice. | ≤7 | REND-151, EDIT-010 |
| GP-RHY-003 | Rhythm | Dotted notes | One augmentation dot, adding 50%. | ≤7 | REND-150, EDIT-010 |
| GP-RHY-004 | Rhythm | Double-dotted notes | Two dots, adding 75%. | ≤7 | REND-150, EDIT-010 |
| GP-RHY-005 | Rhythm | Tie a note | Ties a note to the previous note of the same pitch in the same voice (L). | ≤7 | REND-149, EDIT-010 |
| GP-RHY-006 | Rhythm | Tie a beat | Ties every note of the beat to the previous beat, across voices (Shift+L). | ≤7 | REND-149, EDIT-010 |
| GP-RHY-007 | Rhythm | Triplets | One-click triplet, applied before or after entry. Playback timing follows. | ≤7 | REND-147, EDIT-010 |
| GP-RHY-008 | Rhythm | Custom tuplets | Any division from 2 to 13, or any n:m ratio such as 5:3 or 7:2. | ≤7 | REND-147, EDIT-010 |
| GP-RHY-009 | Rhythm | Nested tuplets | Tuplets inside tuplets, for example quintuplets within a triplet, from a second palette row. Inner or outer can be entered first. | 8.0 | REND-148, EDIT-104 |
| GP-RHY-010 | Rhythm | Force tuplet groups | Forces identical tuplets to group together. | ≤7 | REND-197, EDIT-010 |
| GP-RHY-011 | Rhythm | Tuplet brackets | Numbered brackets. A stylesheet toggle shows or hides them. | ≤7 | REND-147, REND-248 |
| GP-RHY-012 | Rhythm | Automatic beaming | Beams follow the grouping rules of the time signature. | ≤7 | REND-175 |
| GP-RHY-013 | Rhythm | Force beam | Joins the selected notes under one beam. | ≤7 | REND-175, EDIT-012 |
| GP-RHY-014 | Rhythm | Break beam | Splits the beam at the selected note. | ≤7 | REND-175, EDIT-012 |
| GP-RHY-015 | Rhythm | Break secondary beams | Splits only the secondary (16th and shorter) beams. | ≤7 | REND-175, EDIT-012 |
| GP-RHY-016 | Rhythm | Beam-group editor | In the time-signature dialog, clicking between stems of a preview sets the default beaming for that meter. | ≤7 | EDIT-105 |
| GP-RHY-017 | Rhythm | Stem direction | Automatic stems, or flip the stems of selected notes. | ≤7 | REND-198, EDIT-106 |
| GP-RHY-018 | Rhythm | Triplet feel, 8th | Bar-level setting that swings written straight 8ths as triplets in playback. It applies to every track and is the usual blues and shuffle choice. | ≤7 | REND-157, PLAY-083, EDIT-027 |
| GP-RHY-019 | Rhythm | Triplet feel, 16th | The same swing at the 16th-note level. | ≤7 (unverified UI name) | REND-157, PLAY-084, EDIT-027 |
| GP-RHY-020 | Rhythm | Dotted feel, 8th | Plays straight 8ths as a dotted 8th followed by a 16th. | ≤7 (unverified UI name) | REND-157, PLAY-085, EDIT-027 |
| GP-RHY-021 | Rhythm | Dotted feel, 16th | The same at the 16th level. | ≤7 (unverified UI name) | REND-157, PLAY-086, EDIT-027 |
| GP-RHY-022 | Rhythm | Scottish feel, 8th | Reverse dotting ("Scotch snap") of 8ths: short note, then long. | ≤7 (unverified UI name) | REND-157, PLAY-087, EDIT-027 |
| GP-RHY-023 | Rhythm | Scottish feel, 16th | Reverse dotting at the 16th level. | ≤7 (unverified UI name) | REND-157, PLAY-088, EDIT-027 |
| GP-RHY-024 | Rhythm | Free-time bars | Bars played out of tempo, drawn with dotted barlines and the time signature in brackets. Shortcut Alt+Shift+L. | ≤7 | REND-159, EDIT-027 |
| GP-RHY-025 | Rhythm | Live bar-fill check | The LCD reports whether each bar matches its time signature. A tool lists every faulty bar (GP-TOOL-010). | ≤7 | EDIT-103, COMP-071 |

### 7. Bar-level notation: clefs, keys, meters, barlines, repeats, ottava, breaks (GP-BAR)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-BAR-001 | Bar | Treble clef (G2) | Default clef for guitar and most melodic tracks. | ≤7 | REND-174, EDIT-107 |
| GP-BAR-002 | Bar | Bass clef (F4) | For low instruments. | ≤7 | REND-174, EDIT-107 |
| GP-BAR-003 | Bar | Alto clef (C3) | C clef on the third line. | ≤7 | REND-174, EDIT-107 |
| GP-BAR-004 | Bar | Tenor clef (C4) | C clef on the fourth line. | ≤7 | REND-174, EDIT-107 |
| GP-BAR-005 | Bar | Neutral (percussion) clef | Clef used for drum staves. | ≤7 (UI name unverified; listed in GP file model) | REND-174, REND-173, EDIT-107 |
| GP-BAR-006 | Bar | Octave clefs | Any clef carrying an 8va, 8vb, 15ma or 15mb marker, such as the guitar's "treble 8vb". | ≤7 | REND-174, PLAY-089, EDIT-107 |
| GP-BAR-007 | Bar | Clef change | A new clef at any bar. An option keeps the pitches and changes only how they are drawn. | ≤7 | REND-174, EDIT-107 |
| GP-BAR-008 | Bar | Key signature | Major or minor key with sharps or flats. It affects only how standard notation is drawn. | ≤7 | REND-154, EDIT-021 |
| GP-BAR-009 | Bar | Key change | A new key at any bar. GP adds a double barline automatically. | ≤7 | REND-154, EDIT-021 |
| GP-BAR-010 | Bar | Time-signature presets | One-click 2/2, 2/4, 3/4, 4/4, 6/8 and 12/8. | ≤7 | REND-153, EDIT-021 |
| GP-BAR-011 | Bar | Custom time signature | 1 to 32 beats over a unit of 1, 2, 4, 8, 16 or 32. | ≤7 | REND-153, EDIT-021 |
| GP-BAR-012 | Bar | Meter change | A new time signature from any bar, applied to all tracks. | ≤7 | REND-153, EDIT-021 |
| GP-BAR-013 | Bar | Double barline | A manual section divider. | ≤7 | REND-167, EDIT-026 |
| GP-BAR-014 | Bar | Final barline | Thin-thick barline drawn at the end of the score. | ≤7 (unverified) | REND-167, EDIT-026 |
| GP-BAR-015 | Bar | Repeat start | Opening repeat sign. It can be left out at the very start of a piece. | ≤7 | REND-160, EDIT-023 |
| GP-BAR-016 | Bar | Repeat end with count | Closing repeat with a play count. The count is printed when it isn't 2. | ≤7 | REND-160, PLAY-020, EDIT-023 |
| GP-BAR-017 | Bar | Nested and shared repeats | Repeats inside repeats. Several end signs can return to the same start. | ≤7 | REND-160, PLAY-020, EDIT-023 |
| GP-BAR-018 | Bar | Alternate endings (voltas) | Brackets that mark which passes (1 to 8) play a bar. Following bars inherit the same pass. | ≤7 | REND-161, PLAY-021, EDIT-023 |
| GP-BAR-019 | Bar | One-bar repeat | Simile sign meaning "play the previous bar again" (shortcut %). | ≤7 | REND-177, PLAY-090, EDIT-108 |
| GP-BAR-020 | Bar | Two-bar repeat | Simile sign meaning "play the previous two bars again". | ≤7 | REND-177, PLAY-090, EDIT-108 |
| GP-BAR-021 | Bar | Multirest | Collapses runs of empty bars into one numbered multi-bar rest (Ctrl/Cmd+R). Only available in single-track view. | ≤7 | REND-176 |
| GP-BAR-022 | Bar | Ottava 8va | Dashed line: sounds an octave higher than written. | ≤7 | REND-146, PLAY-089, EDIT-014 |
| GP-BAR-023 | Bar | Ottava 8vb | Sounds an octave lower than written. | ≤7 | REND-146, PLAY-089, EDIT-014 |
| GP-BAR-024 | Bar | Ottava 15ma | Sounds two octaves higher than written. | ≤7 | REND-146, PLAY-089, EDIT-014 |
| GP-BAR-025 | Bar | Ottava 15mb | Sounds two octaves lower than written. | ≤7 | REND-146, PLAY-089, EDIT-014 |
| GP-BAR-026 | Bar | Force line break | Starts a new system at this bar (Ctrl/Cmd+Enter). | ≤7 | REND-199, EDIT-109 |
| GP-BAR-027 | Bar | Prevent line break | Keeps bars together on one system. | ≤7 | REND-199, EDIT-109 |
| GP-BAR-028 | Bar | System layout | Sets a default number of bars per system or redistributes bars. Works in page and scroll modes. | ≤7 | REND-016, EDIT-128 |

### 8. Directions and jumps (GP-DIR)

The GP8 guide says the palette has 5 targets and "11 types of jumps". The GP file model, as shown in alphaTab's `Direction` enum, stores 5 targets and 14 jumps. All 19 are listed below; check which jumps the GP8 palette actually shows.

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-DIR-001 | Direction | Segno (target) | Return point for D.S. jumps. It is skipped on the first pass. | ≤7 | REND-162, PLAY-022, EDIT-025 |
| GP-DIR-002 | Direction | Segno Segno (target) | A second, separate return point for D.S.S. jumps. | ≤7 | REND-162, PLAY-022, EDIT-025 |
| GP-DIR-003 | Direction | Coda (target) | Where "to Coda" jumps land. The coda is drawn detached from the main score. | ≤7 | REND-162, REND-200, PLAY-022, EDIT-025 |
| GP-DIR-004 | Direction | Double Coda (target) | A second coda target. | ≤7 | REND-162, REND-200, PLAY-022, EDIT-025 |
| GP-DIR-005 | Direction | Fine (target) | Real end of the piece. Playback stops here only after a jump has been taken. | ≤7 | REND-163, PLAY-114, EDIT-025 |
| GP-DIR-006 | Direction | Da Capo | Go back to the beginning. If there is a pickup bar, the jump lands on the following bar. | ≤7 | REND-164, PLAY-100, EDIT-025 |
| GP-DIR-007 | Direction | D.C. al Coda | Go back to the start, play to the "to Coda" mark, then go to the Coda. | ≤7 | REND-164, PLAY-101, EDIT-025 |
| GP-DIR-008 | Direction | D.C. al Double Coda | Go back to the start, then branch to the Double Coda. | ≤7 | REND-164, PLAY-102, EDIT-025 |
| GP-DIR-009 | Direction | D.C. al Fine | Go back to the start and stop at Fine. | ≤7 | REND-164, PLAY-103, EDIT-025 |
| GP-DIR-010 | Direction | Dal Segno | Go back to the Segno. Inside a repeat it fires on the last pass. | ≤7 | REND-165, PLAY-104, EDIT-025 |
| GP-DIR-011 | Direction | D.S. al Coda | Go back to the Segno, play to "to Coda", then go to the Coda. | ≤7 | REND-165, PLAY-105, EDIT-025 |
| GP-DIR-012 | Direction | D.S. al Double Coda | Go back to the Segno, then branch to the Double Coda. | ≤7 (unverified in palette) | REND-165, PLAY-106, EDIT-025 |
| GP-DIR-013 | Direction | D.S. al Fine | Go back to the Segno and stop at Fine. | ≤7 | REND-165, PLAY-107, EDIT-025 |
| GP-DIR-014 | Direction | Dal Segno Segno | Go back to the Segno Segno, once a Segno jump has happened or when there is none. | ≤7 | REND-165, PLAY-108, EDIT-025 |
| GP-DIR-015 | Direction | D.S.S. al Coda | Go back to the Segno Segno, then on to the Coda. | ≤7 (unverified in palette) | REND-165, PLAY-109, EDIT-025 |
| GP-DIR-016 | Direction | D.S.S. al Double Coda | Go back to the Segno Segno, then on to the Double Coda. | ≤7 (unverified in palette) | REND-165, PLAY-110, EDIT-025 |
| GP-DIR-017 | Direction | D.S.S. al Fine | Go back to the Segno Segno and stop at Fine. | ≤7 (unverified in palette) | REND-165, PLAY-111, EDIT-025 |
| GP-DIR-018 | Direction | Da Coda ("to Coda") | Jump to the Coda. Inside a repeat it fires on the first pass. An "al Coda" instruction arms it; otherwise the last occurrence is used. | ≤7 | REND-163, PLAY-112, EDIT-025 |
| GP-DIR-019 | Direction | Da Double Coda | Jump to the Double Coda, with the same arming rules. | ≤7 | REND-163, PLAY-113, EDIT-025 |
| GP-DIR-020 | Direction | Playback unfolding | Playback follows repeats, voltas and jumps in performance order, with fixed precedence rules (for example, Fine only after a jump). | ≤7 | PLAY-020, PLAY-021, PLAY-022 |

### 9. Note marks: accidentals, dynamics, articulations, fermatas (GP-NOT)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-NOT-001 | Notation | Sharp | Raises the pitch a semitone (Ctrl/Cmd+9). | ≤7 | REND-192, EDIT-110 |
| GP-NOT-002 | Notation | Flat | Lowers the pitch a semitone (Ctrl/Cmd+7). | ≤7 | REND-192, EDIT-110 |
| GP-NOT-003 | Notation | Natural | Cancels an earlier accidental (Ctrl/Cmd+8). | ≤7 | REND-192, EDIT-110 |
| GP-NOT-004 | Notation | Double sharp | Raises the pitch two semitones. | ≤7 | REND-193, EDIT-110 |
| GP-NOT-005 | Notation | Double flat | Lowers the pitch two semitones. | ≤7 | REND-193, EDIT-110 |
| GP-NOT-006 | Notation | Courtesy accidental | Bracketed reminder accidental (Note > Alteration > Cautionary). | 8.0 | REND-194, EDIT-110 |
| GP-NOT-007 | Notation | Automatic accidentals | Accidentals are worked out from the key and earlier notes in the bar, including across ties. | ≤7 | REND-195 |
| GP-NOT-008 | Notation | Dynamic ppp | Softest level; playback velocity about 20. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-009 | Notation | Dynamic pp | Playback velocity about 40. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-010 | Notation | Dynamic p | Playback velocity about 60. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-011 | Notation | Dynamic mp | Playback velocity about 80. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-012 | Notation | Dynamic mf | Playback velocity about 100. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-013 | Notation | Dynamic f | Playback velocity about 110. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-014 | Notation | Dynamic ff | Playback velocity about 120. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-015 | Notation | Dynamic fff | Loudest level; playback velocity 127. | ≤7 | REND-143, PLAY-024, EDIT-043 |
| GP-NOT-016 | Notation | Crescendo hairpin | Gradual increase over the selected beats. It only sounds if a target dynamic follows. | ≤7 | REND-144, PLAY-082, EDIT-043 |
| GP-NOT-017 | Notation | Decrescendo hairpin | Gradual decrease. It also needs a target dynamic to sound. | ≤7 | REND-144, PLAY-082, EDIT-043 |
| GP-NOT-018 | Notation | Accent | Louder attack (shortcut ;). | ≤7 | REND-131, PLAY-079, EDIT-014 |
| GP-NOT-019 | Notation | Heavy accent (marcato) | Stronger than an accent (shortcut :). | ≤7 | REND-131, PLAY-079, EDIT-014 |
| GP-NOT-020 | Notation | Staccato | Shortened, detached note with a dot (shortcut !). | ≤7 | REND-132, PLAY-042, EDIT-014 |
| GP-NOT-021 | Notation | Tenuto | Held-full-value line. The GP file model stores it, but the GP8 palette pages don't mention it. | ? (unverified) | REND-133, EDIT-014 |
| GP-NOT-022 | Notation | Ghost note | Bracketed, softer note, often used on snare (shortcut O). | ≤7 | REND-130, PLAY-080, EDIT-014 |
| GP-NOT-023 | Notation | Dead (muted) note | X notehead or "x" in tab, played as a short percussive thud (shortcut X). | ≤7 | REND-129, PLAY-037, EDIT-014 |
| GP-NOT-024 | Notation | Short fermata | Triangular fermata. It applies to all tracks and stretches playback. | ≤7 | REND-152, PLAY-081, EDIT-014 |
| GP-NOT-025 | Notation | Medium fermata | Standard round fermata. | ≤7 | REND-152, PLAY-081, EDIT-014 |
| GP-NOT-026 | Notation | Long fermata | Square fermata. | ≤7 | REND-152, PLAY-081, EDIT-014 |
| GP-NOT-027 | Notation | Fermata playback | Fermatas hold time in playback, and imported audio tracks follow them too. | ≤7 | PLAY-081, PRAC-091 |
| GP-NOT-028 | Notation | Slash noteheads in staff and drum notation | Turns selected notes into rhythm slashes inside a standard or drum staff while keeping the underlying notes. | 8.0 | REND-196, EDIT-098 |

### 10. Bends and whammy bar (GP-BND)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-BND-001 | Bend | Bend editor | Dialog with a graph of pitch against time across the note. Drag the points to shape the curve, or pick a preset. Opened with B, the palette or the Effects menu. | ≤6 | EDIT-111 |
| GP-BND-002 | Bend | Bend | Bends up from the fretted pitch to a target. | ≤6 | REND-100, PLAY-030, EDIT-111 |
| GP-BND-003 | Bend | Bend and release | Bends up, then comes back down within the same note. | ≤6 | REND-101, PLAY-030, EDIT-111 |
| GP-BND-004 | Bend | Release | Lets a bend started on an earlier note come back down. | ≤6 | REND-201, PLAY-030, EDIT-111 |
| GP-BND-005 | Bend | Hold | Keeps an earlier bend at its raised pitch. The notes must be tied first. | ≤7 | REND-106, PLAY-030, EDIT-111 |
| GP-BND-006 | Bend | Pre-bend | The string is bent before it is picked, so the note starts high. | ≤6 | REND-103, PLAY-030, EDIT-111 |
| GP-BND-007 | Bend | Pre-bend and bend | Starts pre-bent, then bends further up. | ≤6 | REND-105, PLAY-030, EDIT-111 |
| GP-BND-008 | Bend | Pre-bend and release | Starts pre-bent, then comes back to a lower pitch. | ≤6 | REND-104, PLAY-030, EDIT-111 |
| GP-BND-009 | Bend | Bend amounts | Any amount from a quarter tone to 3 whole tones, in quarter-tone steps. | ≤7 | REND-100, PLAY-030 |
| GP-BND-010 | Bend | Bend notation in tab | Curved arrows labelled with the amount (¼, ½, full, 1½ and so on), with release arrows and hold lines. | ≤7 | REND-100, REND-101, REND-106 |
| GP-BND-011 | Bend | Bend timing style | Stored per beat: follow the curve points, spread the bend over the beat, or bend quickly before the next note. | ? (unverified; GP file model) | PLAY-097 |
| GP-BND-012 | Whammy | Whammy-bar editor | Pitch-curve dialog for the tremolo arm (Alt/Option+V), drawn as whammy indications with interval values. | ≤6 | EDIT-112 |
| GP-BND-013 | Whammy | Dive | One move down (or up) to another pitch. | ≤6 | REND-107, PLAY-044, EDIT-112 |
| GP-BND-014 | Whammy | Dip | Dips to another pitch and comes back to the original. | ≤6 | REND-108, PLAY-044, EDIT-112 |
| GP-BND-015 | Whammy | Hold | Keeps the arm where an earlier whammy left it. | ≤7 | REND-109, PLAY-044, EDIT-112 |
| GP-BND-016 | Whammy | Pre-dive | The arm is already moved when the note is struck. | ≤7 | REND-109, PLAY-044, EDIT-112 |
| GP-BND-017 | Whammy | Pre-dive and dive | Starts pre-dived, then moves on to another pitch. | ≤7 | REND-109, PLAY-044, EDIT-112 |
| GP-BND-018 | Whammy | Quarter-tone whammy | Whammy values in quarter tones. | 8.0 | REND-202, PLAY-044, EDIT-112 |
| GP-BND-019 | Bend | One MIDI channel per string | "Force channels 11–16" puts each string on its own MIDI channel, so simultaneous bends play back correctly. | ≤7 | PLAY-098, EXP-024 |
| GP-BND-020 | Bend | Bends from the command palette | Typed bend entry such as "bend 1.5" or "Full", plus pre-bend, release and hold variants. | 8.0 | UX-035 |

### 11. Slides (GP-SLD)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-SLD-001 | Slide | Legato slide | Slide to the next note on the same string without picking it again; drawn with a slur (shortcut S). | ≤6 | REND-110, PLAY-032, EDIT-014 |
| GP-SLD-002 | Slide | Shift slide | Slide to the next note and pick the arrival note again. | ≤6 | REND-111, PLAY-032, EDIT-014 |
| GP-SLD-003 | Slide | Slide in from below | The note is approached by sliding up from a lower fret. | ≤6 | REND-112, PLAY-032, EDIT-014 |
| GP-SLD-004 | Slide | Slide in from above | The note is approached by sliding down from a higher fret. | ≤6 | REND-112, PLAY-032, EDIT-014 |
| GP-SLD-005 | Slide | Slide out downwards | After the note, slide down to no specific pitch. | ≤6 | REND-113, PLAY-032, EDIT-014 |
| GP-SLD-006 | Slide | Slide out upwards | After the note, slide up to no specific pitch. | ≤6 | REND-113, PLAY-032, EDIT-014 |

### 12. Harmonics (GP-HAR)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-HAR-001 | Harmonic | Natural harmonic | Touch the string over a node, for example at fret 5, 7 or 12. Drawn as a diamond notehead and the fret number in angle brackets in tab (for example &lt;12&gt;) (shortcut Y). | ≤6 | REND-119, PLAY-034, EDIT-014 |
| GP-HAR-002 | Harmonic | Artificial harmonic (A.H.) | Fret a note and touch a node with the picking hand, usually 12, 7 or 5 frets higher. | ≤6 | REND-120, PLAY-034, EDIT-014 |
| GP-HAR-003 | Harmonic | Tapped harmonic (T.H.) | Sharply tap a node above the fretted note. | ≤6 | REND-122, PLAY-034, EDIT-014 |
| GP-HAR-004 | Harmonic | Pinch harmonic (P.H.) | The thumb grazes the string as it is picked, typical of high-gain playing. | ≤6 | REND-121, PLAY-034, EDIT-014 |
| GP-HAR-005 | Harmonic | Semi-harmonic (S.H.) | The fundamental sounds with a partial harmonic mixed in. | ≤6 | REND-123, PLAY-034, EDIT-014 |
| GP-HAR-006 | Harmonic | Feedback harmonic | Listed in the harmonic-type picker. Its rendering isn't documented. | ≤7 (unverified detail) | REND-124, PLAY-034, EDIT-014 |
| GP-HAR-007 | Harmonic | Harmonic dialog | Pick the type, see the resulting pitch and the left-hand fret, and get the right-hand touch fret calculated automatically (Alt/Option+Y). | ≤7 | EDIT-113 |
| GP-HAR-008 | Harmonic | Harmonic labels | The type abbreviation (A.H., T.H., P.H. or S.H.) is printed above the tab. Related stylesheet options are GP-STY-050 and GP-STY-051. | ≤7 | REND-120, REND-121, REND-122, REND-123, REND-247 |

### 13. Other playing techniques (GP-FX)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-FX-001 | Technique | Hammer-on / pull-off | A slur joins two notes on one string. GP works out whether it is a hammer-on or a pull-off (H). Optional "H/P" letters and slur placement are set in the stylesheet. | ≤6 | REND-115, PLAY-033, EDIT-014, REND-251 |
| GP-FX-002 | Technique | Legato slur | General slur with no re-attack (Shift+H). | ≤6 | REND-183, PLAY-033, EDIT-014 |
| GP-FX-003 | Technique | Tapping | Picking-hand tap marked "T". Single notes or chords, rendered without a pick attack. | ≤6 | REND-117, PLAY-094, EDIT-014 |
| GP-FX-004 | Technique | Left-hand tapping | Fretting-hand tap marked with a circled T. Can cover several frets at once. | 7.x (unverified version) | REND-116, PLAY-094, EDIT-014 |
| GP-FX-005 | Technique | Slight left-hand vibrato | Narrow vibrato drawn as a wavy line (V). | ≤6 | REND-125, PLAY-031, EDIT-014 |
| GP-FX-006 | Technique | Wide left-hand vibrato | Wide vibrato drawn as a broader wave. | ≤6 | REND-125, PLAY-031, EDIT-014 |
| GP-FX-007 | Technique | Slight bar vibrato | Gentle whammy-bar wobble that moves the whole chord, drawn as a sawtooth (W). | ≤6 | REND-126, PLAY-031, EDIT-014 |
| GP-FX-008 | Technique | Wide bar vibrato | Deep whammy-bar wobble (Alt/Option+W). | ≤6 | REND-126, PLAY-031, EDIT-014 |
| GP-FX-009 | Technique | Tremolo picking, 8th | Fast repetition at 8th-note speed, drawn as stem slashes. | ≤6 | REND-135, PLAY-038, EDIT-014 |
| GP-FX-010 | Technique | Tremolo picking, 16th | Repetition at 16th-note speed. | ≤6 | REND-135, PLAY-038, EDIT-014 |
| GP-FX-011 | Technique | Tremolo picking, 32nd | Repetition at 32nd-note speed, the default for the " shortcut. | ≤6 | REND-135, PLAY-038, EDIT-014 |
| GP-FX-012 | Technique | Palm mute on a note | Mutes just this note, shown as "P.M." with a dashed extension line (P). | ≤6 | REND-127, PLAY-035, EDIT-014 |
| GP-FX-013 | Technique | Palm mute on a beat | Mutes every note in the beat (Shift+P). | ≤7 | REND-127, PLAY-035, EDIT-014 |
| GP-FX-014 | Technique | Palm-mute assistant | Applies palm mute to chosen strings across many bars (Tools > Palm Mute Options). | ≤7 | EDIT-125 |
| GP-FX-015 | Technique | Let ring | Notes ring past their written length, shown as "let ring" with a dashed line (i). | ≤6 | REND-128, PLAY-036, EDIT-014 |
| GP-FX-016 | Technique | Let-ring assistant | Applies let ring to chosen strings across many bars (Tools > Let Ring Options). | ≤7 | EDIT-126 |
| GP-FX-017 | Technique | Fade in | Swells up after the attack, as with a volume knob or "violin" effect (<). | ≤6 | REND-145, PLAY-043, EDIT-014 |
| GP-FX-018 | Technique | Fade out | Dies away after the attack (>). | ≤7 | REND-145, PLAY-043, EDIT-014 |
| GP-FX-019 | Technique | Volume swell | Fades in, then out. | ≤7 | REND-145, PLAY-043, EDIT-014 |
| GP-FX-020 | Technique | Trill | Rapid hammer-on/pull-off between the note and an auxiliary fret, at a set speed. Drawn as "tr" with a wavy line (N). | ≤6 | REND-136, PLAY-039, EDIT-014 |
| GP-FX-021 | Technique | Slap (bass) | Thumb slap, labelled and played with its own samples ($). | ≤6 | REND-118, PLAY-040, EDIT-014 |
| GP-FX-022 | Technique | Pop (bass) | Finger pop, labelled and rendered. | ≤6 | REND-118, PLAY-040, EDIT-014 |
| GP-FX-023 | Technique | Dead slap (bass) | Unpitched slap with the fretting hand. [notation-only] | 7.0 | REND-205, PLAY-134, EDIT-014 |
| GP-FX-024 | Technique | Finger golpe | Finger tap on the guitar body, drawn above the staff and played back. | 7.0 | REND-178, PLAY-095, EDIT-014 |
| GP-FX-025 | Technique | Thumb golpe | Thumb tap on the guitar body. | 7.0 | REND-178, PLAY-095, EDIT-014 |
| GP-FX-026 | Technique | Pick scrape up | Pick dragged along wound strings from bridge to neck, drawn as an upward wavy line. [notation-only] | 7.0 | REND-114, PLAY-134, EDIT-014 |
| GP-FX-027 | Technique | Pick scrape down | Pick dragged from neck to bridge, drawn as a downward wavy line. [notation-only] | 7.0 | REND-114, PLAY-134, EDIT-014 |
| GP-FX-028 | Technique | Wah open | "o" mark for an open (bright) wah pedal (Alt/Option+O). It is only a marking; real wah sound comes from a wah effect in the chain. | ≤7 | REND-179, PLAY-135, EDIT-014 |
| GP-FX-029 | Technique | Wah closed | "+" mark for a closed (dark) wah pedal (Alt/Option+C). | ≤7 | REND-179, PLAY-135, EDIT-014 |
| GP-FX-030 | Technique | Sustain pedal | Piano "Ped." with a release asterisk. It sustains in playback through the end of the selection and can be undone (8.0.2). | 8.0 | REND-180, PLAY-096, EDIT-014 |
| GP-FX-031 | Technique | Pedal states | The file stores pedal down, hold and up markers per beat. | 8.0 (unverified; GP file model) | REND-180, PLAY-096 |

### 14. Strokes, brushes, arpeggios, rasgueado (GP-STR)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-STR-001 | Stroke | Downstroke | Down-pick mark (Shift+D). | ≤6 | REND-138, EDIT-014 |
| GP-STR-002 | Stroke | Upstroke | Up-pick "v" mark (Shift+U). | ≤6 | REND-138, EDIT-014 |
| GP-STR-003 | Stroke | Brush down | Fast strum from the low to the high string (Ctrl/Cmd+D). | ≤6 | REND-139, PLAY-091, EDIT-014 |
| GP-STR-004 | Stroke | Brush up | Fast strum from the high to the low string (Ctrl/Cmd+U). | ≤6 | REND-139, PLAY-091, EDIT-014 |
| GP-STR-005 | Stroke | Brush settings | Dialog for strum speed (duration, under one beat), spread between strings, and start position. | ≤7 | EDIT-114, PLAY-091 |
| GP-STR-006 | Stroke | Arpeggio up | Chord notes rolled from low to high, drawn as a wavy arrow (Ctrl/Cmd+Shift+U). | ≤7 | REND-140, PLAY-091, EDIT-014 |
| GP-STR-007 | Stroke | Arpeggio down | Chord notes rolled from high to low (Ctrl/Cmd+Shift+D). | ≤7 | REND-140, PLAY-091, EDIT-014 |
| GP-STR-008 | Stroke | Arpeggio settings | Speed, spacing, duration and position of the roll. | ≤7 | EDIT-114, PLAY-091 |
| GP-STR-009 | Stroke | Rasgueado | Flamenco multi-finger strum ("rasg."), fully played back. There are 18 preset patterns: ii, mi, mii (triplet), mii (anapaest), pmp (triplet), pmp (anapaest), pei (triplet), pei (anapaest), pai (triplet), pai (anapaest), ami (triplet), ami (anapaest), ppp, amii, amip, eami, eamii, peami (Shift+R). | ≤7 | REND-137, PLAY-092, EDIT-014 |
| GP-STR-010 | Stroke | Stroke patterns from the palette | Flamenco multi-finger strum ("rasg."), fully played back. There are 18 preset patterns, named here as in the GP file model: ii, mi, mii (triplet), mii (anapaest), pmp (triplet), pmp (anapaest), pei (triplet), pei (anapaest), pai (triplet), pai (anapaest), ami (triplet), ami (anapaest), ppp, amii, amip, eami, eamii, peami (Shift+R). | 8.0 | UX-040, REND-137, PLAY-092 *(the inventory repeats GP-STR-009's text here; the name and 8.0 date suggest stroke and rasgueado patterns typed in the command palette, as in GP-CMD-011)* |

### 15. Ornaments and grace notes (GP-ORN)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-ORN-001 | Ornament | Grace note before the beat | Small slashed note played just ahead of the main note, which keeps its full length (G). | ≤6 | REND-134, PLAY-041, EDIT-014 |
| GP-ORN-002 | Ornament | Grace note on the beat | Small note played on the beat, which takes time from the main note (Alt+G / Ctrl+Alt+G). | ≤6 | REND-134, PLAY-041, EDIT-014 |
| GP-ORN-003 | Ornament | Grace notes in tab | Grace frets are drawn smaller in tablature. Grace notes can carry slides, bends or hammer-ons. | ≤7 | REND-134 |
| GP-ORN-004 | Ornament | Upper mordent | Quick alternation with the next note up the scale, following the key. | 7.x (unverified version) | REND-182, PLAY-093, EDIT-014 |
| GP-ORN-005 | Ornament | Lower mordent | Quick alternation with the next note down the scale. | 7.x (unverified version) | REND-182, PLAY-093, EDIT-014 |
| GP-ORN-006 | Ornament | Turn | Four-note figure: upper, main, lower, main. | 7.x (unverified version) | REND-182, PLAY-093, EDIT-014 |
| GP-ORN-007 | Ornament | Inverted turn | Four-note figure: lower, main, upper, main. | 7.x (unverified version) | REND-182, PLAY-093, EDIT-014 |
| GP-ORN-008 | Ornament | Audio fine-tune for grace notes | Note-level audio settings (offset, length, velocity) also work on grace notes. | 8.1 | PLAY-119 |

### 16. Fingering, barre, string indications (GP-FNG)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-FNG-001 | Fingering | Left-hand fingering | Fretting-finger marks (thumb, 0 to 4), styled as T1234 or P1234. | ≤7 | REND-141, EDIT-043, REND-252 |
| GP-FNG-002 | Fingering | Right-hand fingering | Picking-finger marks in four letter styles: p-i-m-a-c, p-i-m-a-x, p-i-m-a-e or t-i-m-a-o. | ≤7 | REND-142, EDIT-043, REND-252 |
| GP-FNG-003 | Fingering | Piano fingering | Fingers 1 to 5 on non-stringed piano tracks, with automatic collision handling. | 8.0 | REND-203, EDIT-043 |
| GP-FNG-004 | Fingering | String number | Circled string number on the standard staff. | ≤7 | REND-204, EDIT-043 |
| GP-FNG-005 | Fingering | Extended barre | Barre or half-barre marking over the staff for a given fret, with an extension line (Shift+I). | 7.x (unverified version) | REND-181, EDIT-014 |
| GP-FNG-006 | Fingering | Fingering patterns from the palette | Typed sequences (0–4, T, - to skip a note, space to skip a beat; p i m a c for the right hand) apply fingerings across a selection. | 8.0 | UX-040 |

### 17. Drums and percussion (GP-DRM)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-DRM-001 | Drums | Drum tracks and kits | Percussion tracks with selectable kit styles such as rock, metal, jazz, reggae and an Africa kit. Kits inspired by famous drummers and hit songs are included. | ≤7 | EDIT-034, AUD-030 |
| GP-DRM-002 | Drums | Standard drum notation | Five-line percussion staff with the neutral clef and a notehead and line for each kit piece, in the usual (Agostini-style) layout. | ≤6 | REND-173 |
| GP-DRM-003 | Drums | Drum tablature | Text-line drum display that labels elements with MIDI numbers. Mapping can be edited directly in the tab. | ≤5 | REND-191, EDIT-034 |
| GP-DRM-004 | Drums | Kit-piece mapping | Covers the General MIDI percussion range (27–87) and more: bass drums, snares, side stick or rim, claps, toms, closed, pedal and open hi-hat, crash, ride, china, splash, ride bell, tambourine, cowbell and vibraslap. | ≤6 | REND-173, EDIT-034 |
| GP-DRM-005 | Drums | Hand percussion | Bongos, congas, timbales, agogô, cabasa, maracas, whistles, güiro (two articulations), claves, wood blocks, cuíca, triangle, shaker, jingle and tree bells, castanets and surdos. | ≤7 | REND-173, EDIT-034, AUD-005 |
| GP-DRM-006 | Drums | Utility sounds | High Q, slap, scratch push/pull, sticks, square click, and metronome click and bell. | ≤7 | EDIT-034, AUD-005 |
| GP-DRM-007 | Drums | Articulations by keypad | On one staff line, numeric-keypad keys cycle articulations such as closed, half-open and open hi-hat. | ≤7 | EDIT-115 |
| GP-DRM-008 | Drums | Drumkit view (staff mode) | On-screen kit (Ctrl/Cmd+F6) that shows the pieces available on the current staff line. Click to insert; notes are coloured by voice. | ≤8.0 (unverified origin) | VIEW-006, EDIT-097 |
| GP-DRM-009 | Drums | Drumkit view (MIDI mode) | Lists every sound the kit can play beyond General MIDI. A setting can limit it to GM. | 8.x | VIEW-020 |
| GP-DRM-010 | Drums | Drum view display options | Show names never, on hover, or always with MIDI numbers. Larger label text is available, and both modes can be shown together. | 8.x | VIEW-021 |
| GP-DRM-011 | Drums | Stick or brush | Track inspector setting for the stroke type, which changes RSE articulations. | ≤7 | AUD-031 |
| GP-DRM-012 | Drums | Drum mix | Per-piece volume, pan, mute and solo, plus kit mono/stereo, in a pop-up (RSE only). Solo and mute states are remembered since 8.1. | 8.0 | PLAY-129 |
| GP-DRM-013 | Drums | Slashes in drum notation | Rhythm slashes inside the drum staff. | 8.0 | REND-196, EDIT-098 |
| GP-DRM-014 | Drums | Ghost and accent on drums | Ghost (bracketed) and accented notes, used for snare grooves. | ≤7 | REND-130, REND-131, PLAY-079, PLAY-080 |
| GP-DRM-015 | Drums | Signature drum presets | Drum sound presets modelled on well-known recordings. | ≤7 (unverified detail) | AUD-030, AUD-033 |
| GP-DRM-016 | Drums | Drum-kit preview | Audio previews of drum kits in the track wizard, improved in 8.1. | 8.1 | AUD-030, EDIT-066 |

### 18. Text, sections, lyrics, tempo text (GP-TXT)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-TXT-001 | Text | Free text | Text attached to a beat (T). | ≤6 | REND-168, EDIT-043 |
| GP-TXT-002 | Text | Sections | Master-track rehearsal marks with a letter (A, B…) and a name, typed or chosen from presets such as Intro, Verse, Chorus, Bridge and Solo. A name in [square brackets] is drawn in a frame. | ≤6 | REND-166, EDIT-024 |
| GP-TXT-003 | Text | Section editing paths | Add or edit sections from the Section menu, the palette icon, the global-view context menu, or by clicking the mark in the score. | ≤7 | EDIT-024, EDIT-080, UX-030 |
| GP-TXT-004 | Text | Timer | Elapsed-time stamp (min:sec) worked out automatically. Repeats show the first-pass time (@). | 7.x (unverified version) | REND-185, EDIT-043 |
| GP-TXT-005 | Text | Tempo marking | Tempo text with metronome mark and an optional label such as "120 bpm" or a style word. Decimal values can be shown or hidden. | ≤6 | REND-155, EDIT-022, REND-240 |
| GP-TXT-006 | Text | Gradual tempo text | Ramped tempo changes are drawn with text such as rall. or accel. and the right beat unit. | 8.x (unverified) | REND-156, EDIT-022 |
| GP-TXT-007 | Text | Sound-change label | Text in the score that names the sound when a sound automation fires. The label can be customised, for example "Dist.". | ≤7 | REND-206 |
| GP-TXT-008 | Lyrics | Lyrics editor | Opened from the Track menu or the palette. Lyrics attach to the selected track, vocal or instrumental. | ≤6 | EDIT-042 |
| GP-TXT-009 | Lyrics | Five lyric lines | Up to five stacked lines per track, each with its own starting bar. | ≤6 | REND-172, EDIT-042 |
| GP-TXT-010 | Lyrics | Syllable syntax | Each syllable goes to the next beat. A hyphen splits a word, + joins words on one beat, and extra hyphens or spaces skip beats. Line breaks count as spaces. | ≤6 | EDIT-042 |
| GP-TXT-011 | Lyrics | Hidden lyric comments | Text in [brackets], such as [CHORUS], stays in the editor but isn't printed. | ≤7 | REND-207, EDIT-042 |
| GP-TXT-012 | Lyrics | Lyric visibility | Keep lyrics for reference without printing them. They appear only on the first staff of a track. | ≤7 | REND-239, REND-172 |
| GP-TXT-013 | Text | Expression text from the palette | The ">" prefix in the command palette inserts a chord, dynamic, key, clef, octave sign or direction from typed text. | 8.0 | UX-037 |
| GP-TXT-014 | Text | Chord names | Chord symbols above the staff, linked to the chord engine (see section 19). | ≤6 | REND-169, EDIT-040 |
| GP-TXT-015 | Text | Header and footer text | Title block and page furniture driven by tokens (see GP-STY-031). | ≤6 | REND-042, REND-236 |

### 19. Chord engine, chord diagrams and scale diagrams (GP-CHD)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-CHD-001 | Chord | Chord dialog | Opened with A, Note > Chord, the palette, or by clicking a chord in the score. Builds a chord, names it and draws its diagram. | ≤7 | EDIT-040 |
| GP-CHD-002 | Chord | Root and chord type | Pick the root and the quality: major, minor, 7th, sus and so on. | ≤7 | EDIT-134 |
| GP-CHD-003 | Chord | Extensions | Adds 7th, 9th, 11th and 13th tones. | ≤7 | EDIT-135 |
| GP-CHD-004 | Chord | Alterations | Raise or lower the 5th, 9th, 11th or 13th by a semitone. | ≤7 | EDIT-136 |
| GP-CHD-005 | Chord | Bass note (slash chord) | A bass other than the root rebuilds the chord over that bass. | ≤7 | EDIT-137 |
| GP-CHD-006 | Chord | Inversions | Inversion choices (#1, #2). | ≤7 | EDIT-138 |
| GP-CHD-007 | Chord | Omitted tones | Drop the root, 3rd, 5th or any tone to thin the voicing or fit fewer strings. | ≤7 | EDIT-139 |
| GP-CHD-008 | Chord | Diagram editor | Click frets to add or remove dots and drag a slider to set the base fret. Open strings show "o" and muted strings "x". | ≤7 | EDIT-040 |
| GP-CHD-009 | Chord | Chord name detection | GP suggests a name once two notes are in the diagram. If the dialog opens on an existing beat, its notes are loaded. | ≤7 | EDIT-041, COMP-011 |
| GP-CHD-010 | Chord | Keep a custom name | An apostrophe before a typed name stops GP from renaming it. | ≤7 | EDIT-140 |
| GP-CHD-011 | Chord | Automatic barre | Barre shapes are suggested automatically. | ≤7 | EDIT-141 |
| GP-CHD-012 | Chord | Finger numbers | Numbers inside the dots and under the diagram. Right-click a dot to change its finger. Finger names are translated (8.0.2). | ≤7 | REND-170, EDIT-040 |
| GP-CHD-013 | Chord | Highlight root | Colours the root dot in the editor only, not in the printed score. | ≤7 | EDIT-040 |
| GP-CHD-014 | Chord | Alternative voicings | List of other fingerings for the chord, sorted by difficulty. Click one to use it. | ≤7 | COMP-013, EDIT-040 |
| GP-CHD-015 | Chord | Chord preview | Play the chord from the dialog. | ≤7 | EDIT-142 |
| GP-CHD-016 | Chord | Tuning-aware diagrams | Diagrams follow the track's tuning and number of strings, including unusual tunings. | ≤7 | EDIT-040, REND-170 |
| GP-CHD-017 | Chord | Track chord library | Every chord used in a track goes into its library (palette Chords button), where you can also create new ones. Name-only chords show greyed out. | ≤7 | EDIT-040, VIEW-007 |
| GP-CHD-018 | Chord | Display toggles | Show the chord name, the diagram and the fingering independently in the score. | ≤7 | REND-208, REND-169, REND-170 |
| GP-CHD-019 | Chord | Notes from a diagram | When "display diagram" is on and the beat is empty, the diagram's notes are written into the beat. | ≤7 | EDIT-143 |
| GP-CHD-020 | Chord | Chord grid at the top | Every chord used can be listed as a diagram grid in the score header, as well as or instead of diagrams above the beats. Placement, size and spacing are in GP-STY-013 and GP-STY-014. | ≤7 | REND-171, REND-227 |
| GP-CHD-021 | Chord | Transposing chords | The transpose tool also moves chords built with the engine, including names and fingerings. Typed names are left alone. | 8.0 | EDIT-144, EDIT-050 |
| GP-CHD-022 | Scale diagram | Scale diagram | Fretboard diagram attached to a beat above the staff (Shift+S, Note > Scale Diagram, or the palette). Can be resized but not dragged freely. | 8.0 | VIEW-008, REND-209, EDIT-145 |
| GP-CHD-023 | Scale diagram | Diagram geometry | 3 to 10 strings, 4 to 24 frets, a start fret, horizontal or vertical layout, and optional fret markers. | 8.0 | EDIT-146, REND-209 |
| GP-CHD-024 | Scale diagram | Custom dots | Each dot has its own shape, colour, text (up to 3 characters, such as a note name, degree or finger) and text colour, for example to mark the tonic. | 8.0 | EDIT-147, REND-209 |
| GP-CHD-025 | Scale diagram | Diagram from a selection | Notes selected in the score fill the diagram automatically. | 8.0 | EDIT-148 |
| GP-CHD-026 | Scale diagram | Edit, reset, delete | Double-click a dot to clear it, Reset to empty the diagram, Delete to remove it. | 8.0 | EDIT-145 |

### 20. Scale tool (GP-SCL)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-SCL-001 | Scales | Scale library | Over 1,000 scales and modes, searchable by keyword or filter tags such as major or pentatonic (Tools > Scale). | ≤7 | COMP-090, COMP-020 |
| GP-SCL-002 | Scales | Key choice | Shows the chosen scale in any key. | ≤7 | COMP-020 |
| GP-SCL-003 | Scales | Scale structure | Lists the intervals and semitone steps of the scale. | ≤7 | COMP-091 |
| GP-SCL-004 | Scales | Scale playback | Play the scale. | ≤7 | COMP-091 |
| GP-SCL-005 | Scales | Scale on instrument views | Overlays the scale on the fretboard or keyboard view, adjusted to the tuning. The root is marked with a square, and the overlay stays visible while you enter notes. | ≤7 | COMP-020, VIEW-004, VIEW-005 |
| GP-SCL-006 | Scales | Find scales in a selection | Looks at the selected bars and lists likely keys and scales, ranked by how many notes match. | ≤7 | COMP-092, COMP-021 |
| GP-SCL-007 | Scales | Note entry from the scale view | Click fretboard notes to enter them. Right-click enters the note and moves the cursor on. The tool never writes a whole scale into the score. | ≤7 | EDIT-097 |

### 21. Tools and assistants (GP-TOOL)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-TOOL-001 | Transpose | Transpose by semitones | Shifts the selected notes by any number of semitones, ignoring key. Can also move chord diagrams. | ≤7 | EDIT-050, EDIT-144 |
| GP-TOOL-002 | Transpose | Transpose by interval | Pick an interval (unison to 7th), its quality (minor, major, perfect, diminished, augmented), the direction, and whether it goes past an octave. Can also update the key signature. | ≤7 | EDIT-116 |
| GP-TOOL-003 | Transpose | Diatonic transposition | Moves notes by scale degrees within the current key, so the music stays in key. | 8.0 | EDIT-117 |
| GP-TOOL-004 | Transpose | Transpose scope | Applies to the selection or all bars, and to the current track or all tracks. | ≤7 | EDIT-118 |
| GP-TOOL-005 | Transpose | Relative tonality | Toolbar control that transposes or detunes playback without changing the written score. Also applies to the audio track and to audio export (7.5.4). | ≤7 | PLAY-055, PLAY-076, PRAC-092, EXP-031 |
| GP-TOOL-006 | Assistant | Bar arranger | Moves barlines so every bar matches its time signature, splitting and tying notes as needed. Useful after imports. | ≤7 | EDIT-127, COMP-073 |
| GP-TOOL-007 | Assistant | Automatic fingering | Moves notes to other strings and frets in the selection, or across several bars, for easier positions without changing pitch. | ≤7 | EDIT-053 |
| GP-TOOL-008 | Assistant | Move, copy or swap voices | Moves, duplicates or swaps the contents of voices in multi-voice passages (Ctrl/Cmd+Shift+M, shortcut restored in 8.1). | ≤7 | EDIT-102 |
| GP-TOOL-009 | Assistant | Let-ring and palm-mute assistants | Per-string let ring or palm mute over a range (see GP-FX-014 and GP-FX-016). | ≤7 | EDIT-125, EDIT-126 |
| GP-TOOL-010 | Assistant | Check bar duration | Lists every bar whose content doesn't match its time signature, with the track, bar and voice (F4). | ≤7 | COMP-071 |
| GP-TOOL-011 | Tuner | Polyphonic tuner | Strum once and every string's deviation is shown in cents, turning green when in tune. It follows the active track's tuning. Click a string to switch to single-string mode. | 7.0 | PRAC-112, PRAC-101, PRAC-102 |
| GP-TOOL-012 | Tuner | Single-string tuner | Precise tuning of one string at a time. | 7.0 | PRAC-100, PRAC-101 |
| GP-TOOL-013 | MIDI capture | Step-time MIDI entry | Notes from a MIDI keyboard, MIDI guitar or controller go onto the active beat, one beat at a time, using the palette's current duration (Sound > MIDI Capture). | ≤7 | EDIT-006 |
| GP-TOOL-014 | MIDI capture | Capture settings | A chord-grouping window in ms, MIDI-guitar channel-to-string mapping (lowest or highest first), and automatic fret choice. | ≤7 | EDIT-119 |
| GP-TOOL-015 | Protection | Finalize | Marks a file as finished and blocks edits until it is unlocked. | 7.x | EDIT-120 |
| GP-TOOL-016 | Protection | Lock editing | Password needed to change the file; anyone can still open it. | ≤7 | EDIT-121, OPEN-035 |
| GP-TOOL-017 | Protection | Lock opening | Password needed to open the file at all. Unrecoverable if the password is lost. Arobas describes it as basic protection. | ≤7 | EDIT-122, OPEN-035 |
| GP-TOOL-018 | Fretlight | Fretlight guitar support | LED-fretboard guitars over USB or Bluetooth (Fretlight Wireless since 7.5.x). The toolbar button is hidden by default. | ≤6 (wireless 7.5) | PLAT-053 |
| GP-TOOL-019 | Fretlight | Fretlight modes | Light the tab notes at the cursor, the current chord, or the scale picked in the scale tool. Supports left-handed layout and a limited fret range. | ≤7 | PLAT-054 |
| GP-TOOL-020 | Fretlight | USB footswitch | Assign GP commands to the buttons of a Fretlight USB footswitch for hands-free control. | ≤7 | PRAC-071, PRAC-116 |
| GP-TOOL-021 | Converter | Batch converter | Converts whole folders of GP1–GP6 files (.gtp, .gp3, .gp4, .gp5, .gpx) to .gp. Includes subfolders, chooses file types and destination, leaves originals untouched, and prints a report. | 7.5 | EXP-017, OPEN-033 |

### 22. Command palette (GP-CMD)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-CMD-001 | Palette | Command palette | Keyboard-driven command bar above the score (Ctrl/Cmd+E or Tools > Show Command Palette). Up/Down browses past commands. | 8.0 | UX-014 |
| GP-CMD-002 | Palette | List all commands | Typing "?" lists every command alphabetically. Greyed entries need a selection first. | 8.0 | UX-032 |
| GP-CMD-003 | Palette | Smart search | Matches prefixes and abbreviations (for example "ff" for fortissimo, "xml" for export) and also localised terms. | 8.0 | UX-033 |
| GP-CMD-004 | Palette | Quick commands | About 32 one-shot toggles that run at once, such as palm-mute, let-ring, legato, print and volume-swell. Running one again offers to remove the effect. | 8.0 | UX-034 |
| GP-CMD-005 | Palette | Commands with arguments | Commands that take a value: number of bars to add, repeat count, bend amount, tempo, volume, pan, clef, dynamic, fermata, ornament, voice and so on. | 8.0 | UX-035 |
| GP-CMD-006 | Palette | Tab completion | Tab cycles through a command's options (for example clef type or octave shift) and Enter confirms. | 8.0 | UX-036 |
| GP-CMD-007 | Palette | Action list (@) | Runs any menu action by name, for example "fretboard" opens the fretboard view (Alt+Cmd+E). | 8.0 | UX-014 |
| GP-CMD-008 | Palette | Expression text (>) | Typed chords, dynamics, keys, clefs, octave signs or directions, such as "> Gmaj". | 8.0 | UX-037 |
| GP-CMD-009 | Palette | Jump prefixes | "$" goes to a section and ":" goes to a bar number. | 8.0 | UX-038, PLAY-004, PLAY-005 |
| GP-CMD-010 | Palette | Inline tuplet and meter | Typing "n:m" makes a custom tuplet; typing "4/4" sets a time signature. | 8.0 | UX-039 |
| GP-CMD-011 | Palette | Pattern commands | Pattern strings fill a selection with pick strokes, brush or arpeggio directions, golpes, left- or right-hand fingering, picking style, slap/pop sequences or wah open/closed marks. | 8.0 | UX-040 |
| GP-CMD-012 | Palette | Unset elements | Command that removes chosen elements or effects from the selection. | 8.0 | UX-041 |
| GP-CMD-013 | Palette | Selection commands | select-bars and select-section, plus insert-bars, repeat bars and line-break control from the palette. | 8.0 | UX-042 |
| GP-CMD-014 | Palette | View and playback commands | Zoom, view switching, focus or unfocus, relative speed, relative tonality, playing style, showing or hiding tempo automation, and finding or showing a scale. | 8.0 | UX-043 |
| GP-CMD-015 | Palette | Flow mode | A "flow" toggle that keeps the palette open for repeated commands. Exact behaviour isn't documented. | 8.0 (unverified detail) | UX-044 |

### 23. Display modes, zoom, instrument views, design mode (GP-VIEW)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-VIEW-001 | Layout | Page, vertical | Printed-page layout with pages stacked vertically. | ≤7 | REND-010, REND-011 |
| GP-VIEW-002 | Layout | Page, horizontal | Pages side by side, scrolling sideways. | 7.x | REND-212 |
| GP-VIEW-003 | Layout | Page, grid | As many pages per row as the window fits, scrolling vertically. Suits large screens. | 7.x (unverified version) | REND-213 |
| GP-VIEW-004 | Layout | Page, scroll | Endless scrolling with no page breaks. | 7.x (unverified version) | REND-214 |
| GP-VIEW-005 | Layout | Screen, vertical | Systems reflow to fill the window width, for editing. | ≤7 | REND-014, REND-018 |
| GP-VIEW-006 | Layout | Screen, horizontal | One continuous horizontal band, convenient for multitrack work. | ≤7 | REND-013 |
| GP-VIEW-007 | Layout | Multitrack view | Shows all tracks (or the chosen ones) together as a full score (F3), or one track at a time. | ≤7 | REND-030 |
| GP-VIEW-008 | Layout | Choose tracks to show | Eye toggles in the global view pick which tracks appear in multitrack. | 7.0 | REND-030 |
| GP-VIEW-009 | Zoom | Zoom levels | 10% to 800% from presets or a slider. Ctrl/Cmd with +/- and the wheel or trackpad also zoom. | ≤7 | REND-015, REND-215 |
| GP-VIEW-010 | Zoom | Fit to width | Zoom preference that fits the page width to the window. | 8.1 | REND-216 |
| GP-VIEW-011 | Zoom | Fit to page | Zoom preference that fits a whole page in the window. | 8.1 | REND-217 |
| GP-VIEW-012 | Instrument view | Fretboard view | On-screen neck that follows the track's string count and capo. Hover shows the note name and octave, and clicking enters notes. | ≤7 | VIEW-001, VIEW-017, EDIT-097 |
| GP-VIEW-013 | Instrument view | Left-handed fretboard | Mirrored neck, set from the gear menu. | ≤7 | VIEW-002, PLAT-035 |
| GP-VIEW-014 | Instrument view | What the views show | Show the current beat, the beat plus the whole bar, or the beat plus the next beat (fingering preview). | ≤7 | VIEW-003, VIEW-018 |
| GP-VIEW-015 | Instrument view | Hide note names | Turn off note labels on the fretboard, for example to practise memorising the neck. | 7.6 or earlier | VIEW-017 |
| GP-VIEW-016 | Instrument view | Keyboard view | Piano keyboard limited to the instrument's range (other keys greyed). Clicking enters notes, and scales can be overlaid. | 4.0 | VIEW-005, VIEW-019, EDIT-097, COMP-020 |
| GP-VIEW-017 | Instrument view | Drum view | See GP-DRM-008 to 010. | ≤8.0 | VIEW-006 |
| GP-VIEW-018 | Instrument view | Two views at once | Fretboard and keyboard can be open together. Ctrl/Cmd+F6 opens the right view for the track type. | ≤7 | UX-010, VIEW-001, VIEW-005 |
| GP-VIEW-019 | Instrument view | Views follow playback | Instrument views light the played notes as the song plays, as a visual practice aid. | ≤7 | VIEW-001, VIEW-003 |
| GP-VIEW-020 | Design mode | Design mode | Layout editing (Ctrl+Alt+D or the palette button). Works in single-track and multitrack scores. Improved in 8.0. | ≤7 (improved 8.0) | EDIT-129 |
| GP-VIEW-021 | Design mode | Bar width | Drag the triangles on the ruler to widen or narrow bars. Changed bars get red markers. | ≤7 | EDIT-130 |
| GP-VIEW-022 | Design mode | Beat position | Drag individual beats left or right. | 8.0 | EDIT-131 |
| GP-VIEW-023 | Design mode | Alignment guide | A yellow guide line appears while dragging, to line bars up across systems. | 8.0 | EDIT-132 |
| GP-VIEW-024 | Design mode | Bars per system | The + and − controls change how many bars sit on a system. | ≤7 | EDIT-128 |
| GP-VIEW-025 | Design mode | Reset spacing | An x beside a system, or View > Spacing Tools, restores default widths and positions. | 8.0 | EDIT-133 |
| GP-VIEW-026 | Display | Error colouring | Bars and notes that break the rules are drawn in red (except the bar being edited). Configurable per rule. | ≤7 | COMP-085, COMP-086 |

### 24. Stylesheet: engraving options, one per row (GP-STY)

Opened with File > Stylesheet or F7. It has five tabs: Page & Format, Systems & Staves, Header & Footer, Texts & Styles, Notation. Unless noted, settings are on/off toggles.

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-STY-001 | Style/Page | Page size | Twelve preset paper formats or a custom size. | ≤7 | REND-221, REND-010, REND-011, REND-012 |
| GP-STY-002 | Style/Page | Orientation | Portrait or landscape. | ≤7 | REND-222 |
| GP-STY-003 | Style/Page | Margins | Top, bottom, left and right page margins. | ≤7 | REND-012 |
| GP-STY-004 | Style/Page | Overall scale | Global size of the score (staff size and proportions). | ≤7 | REND-223 |
| GP-STY-005 | Style/Page | Rhythmic spacing | Horizontal spacing factor for durations, set in 0.1 steps. | ≤7 | REND-224 |
| GP-STY-006 | Style/Page | Keep fonts when scaling | Choose whether scaling also resizes text and chord diagrams. | ≤7 | REND-223 |
| GP-STY-007 | Style/Tuning | Show tuning | Show or hide the tuning legend. | ≤7 | REND-225, REND-034 |
| GP-STY-008 | Style/Tuning | Tuning position | At the top of the score, or before each track's tab. | ≤7 | REND-225, REND-034 |
| GP-STY-009 | Style/Tuning | Tuning detail | Name only, name and string pitches, or only non-standard tunings and strings. | ≤7 | REND-225, REND-034 |
| GP-STY-010 | Style/Tuning | Tuning layout | Two columns or one horizontal line (top-of-score legend). | ≤7 | REND-225, REND-034 |
| GP-STY-011 | Style/Tuning | Tuning frame | Draws a box around the tuning legend. | ≤7 | REND-225, REND-034 |
| GP-STY-012 | Style/Chords | Chord-symbol style | Classic, Jazz or Rock spelling. | ≤7 | REND-226 |
| GP-STY-013 | Style/Chords | Diagram placement | Top of the score, inside the score, or both. | ≤7 | REND-227, REND-170, REND-171 |
| GP-STY-014 | Style/Chords | Diagram size and spacing | Separate size and spacing for the top grid and for in-score diagrams, in 0.1 steps. Spacing controls were added in 8.0. | ≤7 (spacing 8.0) | REND-227 |
| GP-STY-015 | Style/Systems | Staff line thickness | Line weight of staff lines. | ≤7 | REND-228 |
| GP-STY-016 | Style/Systems | System spacing | Distance between systems. | ≤7 | REND-228 |
| GP-STY-017 | Style/Systems | Indent first system | Indents the opening system. | ≤7 | REND-228 |
| GP-STY-018 | Style/Systems | Staff lines in slash notation | Draws or hides staff lines behind rhythm slashes. | ≤7 | REND-229 |
| GP-STY-019 | Style/Systems | Barlines in slash notation | Draws or hides barlines in slash staves. | ≤7 | REND-229 |
| GP-STY-020 | Style/Systems | Barlines through the system | Barlines run across every staff of a system. | ≤7 | REND-230 |
| GP-STY-021 | Style/Systems | Clef on every system | Repeats the clef at each system start. | ≤7 | REND-231 |
| GP-STY-022 | Style/Systems | Time signature on every system | Repeats the time signature at each system start. | ≤7 | REND-231 |
| GP-STY-023 | Style/Systems | Time signature at sections | Repeats the time signature at each new section. | ≤7 | REND-231 |
| GP-STY-024 | Style/Systems | Capo and tunings affect notation | When on, standard notation shows sounding pitch with one shared key. When off, guitar parts are written as if in standard tuning with their own key (see GP-TRK-024). | ≤7 | REND-232, REND-032, REND-033 |
| GP-STY-025 | Style/Systems | Brackets | No brackets, bracket tab with its staff, or group similar instruments. | ≤7 | REND-233 |
| GP-STY-026 | Style/Systems | System separator | "//" mark between systems. | ≤7 | REND-234 |
| GP-STY-027 | Style/Systems | Track-name placement | On the first system, on the first system of each page, or on every system. | ≤7 | REND-235, REND-035 |
| GP-STY-028 | Style/Systems | Track-name mode | Show names in single-track view, multitrack view, or both. | ≤7 | REND-235, REND-035 |
| GP-STY-029 | Style/Systems | Track-name format | Full name or short name. | ≤7 | REND-235, REND-035 |
| GP-STY-030 | Style/Systems | Track-name orientation | Vertical or horizontal labels. | ≤7 | REND-235, REND-035 |
| GP-STY-031 | Style/Header | Header and footer tokens | Placeholders for title, subtitle, artist, album, lyricist, composer, transcriber, copyright, page number and page count. 8.0.2 added the missing %MUSIC% tag to the classic sheet. | ≤7 | REND-236, REND-042 |
| GP-STY-032 | Style/Header | Per-element formatting | Each header or footer item can be turned on or off and has its own prefix label (for example "Music by" changed to "Arranged by"), font, size, style and alignment. | ≤7 | REND-237 |
| GP-STY-033 | Style/Header | Later-page variant | A separate header and footer for pages after the first. | ≤7 | REND-237, REND-042 |
| GP-STY-034 | Style/Header | Notice and instructions blocks | Turn on the optional notice and instructions text areas. | ≤7 | REND-041 |
| GP-STY-035 | Style/Text | Fonts per text element | Font, size and style (regular, bold, italic) for each text element, such as fret numbers, from system fonts. | ≤7 | REND-238 |
| GP-STY-036 | Style/Text | Lyrics placement | Above the staves, below them, or hidden. | ≤7 | REND-239 |
| GP-STY-037 | Style/Text | Bar-number display | Every bar, the first bar of each system, or none. | ≤7 | REND-184 |
| GP-STY-038 | Style/Text | Tempo decimals | Show or hide decimal places in tempo marks. | 8.0 | REND-240 |
| GP-STY-039 | Style/Symbols | Symbol style | Classic (engraved) or Jazz (handwritten) look for musical symbols. | ≤7 | REND-241 |
| GP-STY-040 | Style/Symbols | Music symbol font | Pick the font for musical symbols and playing indications. | 8.0 | REND-241 |
| GP-STY-041 | Style/Symbols | Rename technique labels | Change the printed words for let ring, palm mute, slide, hammer-on, pull-off, slap, pop, pick scrape, rasgueado and the whammy-bar mark. | 8.0 | REND-242 |
| GP-STY-042 | Style/Symbols | Lines over rests | Technique extension lines (P.M., let ring and so on) continue across rests. | ≤7 | REND-243 |
| GP-STY-043 | Style/Rhythm | Hide tab rhythm when staff shown | Leaves rhythm stems off the tab when standard notation is visible. | ≤7 | REND-244 |
| GP-STY-044 | Style/Rhythm | Stems inside the tab | Draws rhythm stems inside the tab staff. | ≤7 | REND-244 |
| GP-STY-045 | Style/Rhythm | Beams over tab rests | Beams continue over rests in tab. | ≤7 | REND-245 |
| GP-STY-046 | Style/Rhythm | Circled long notes in tab | Draws circles around half and whole notes in tab. | ≤7 | REND-245 |
| GP-STY-047 | Style/Rhythm | Flat beams on the staff | Forces horizontal beams in standard notation. | ≤7 | REND-246 |
| GP-STY-048 | Style/Rhythm | Flat beams on drums | Forces horizontal beams in drum notation. | ≤7 | REND-246 |
| GP-STY-049 | Style/Rhythm | Tab rhythm position per voice | Voices 1 to 4 each put their tab rhythm above, below, or nowhere. | ≤7 | REND-244 |
| GP-STY-050 | Style/Symbols | Touched string for artificial harmonics | Shows the touch position for artificial harmonics in tab. | ≤7 | REND-247 |
| GP-STY-051 | Style/Symbols | Dot for octave harmonics | Uses "." to mark artificial octave harmonics in tab. | ≤7 | REND-247 |
| GP-STY-052 | Style/Symbols | C and cut-C | Prints C for 4/4 and cut C for 2/2. | ≤7 | REND-248, REND-153 |
| GP-STY-053 | Style/Symbols | Bend real pitch | Standard notation shows the pitch after bending. | ≤7 | REND-248 |
| GP-STY-054 | Style/Symbols | Arpeggio arrow | Arrowhead on arpeggio lines. | ≤7 | REND-249 |
| GP-STY-055 | Style/Symbols | Trill second note | Prints the auxiliary trill note. | ≤7 | REND-249 |
| GP-STY-056 | Style/Symbols | Always show tied tab notes | Repeats tied fret numbers in tab instead of hiding them. | ≤7 | REND-250 |
| GP-STY-057 | Style/Symbols | Coda spacing | Gap in mm before a detached coda. | ≤7 | REND-200 |
| GP-STY-058 | Style/Symbols | H/P letters | Prints "H" or "P" over hammer-on and pull-off slurs. | ≤7 | REND-251 |
| GP-STY-059 | Style/Symbols | HoPo collision avoidance | Moves HoPo slurs in tab clear of notes. | ≤7 | REND-251 |
| GP-STY-060 | Style/Symbols | HoPo slur on outer notes | In tab, slurs only the outer notes of a chord. | ≤7 | REND-251 |
| GP-STY-061 | Style/Symbols | One slur per HoPo group | Draws a single slur over a run of hammer-ons and pull-offs. | ≤7 | REND-251 |
| GP-STY-062 | Style/Symbols | Slide label | Adds "sl." to slides. | ≤7 | REND-249 |
| GP-STY-063 | Style/Symbols | Coloured voice frets | Tab fret numbers for voices 2 to 4 in green, pink and purple. | ≤7 | REND-250 |
| GP-STY-064 | Style/Symbols | Hide extra rests | Drops unneeded rests in standard notation. | ≤7 | REND-248 |
| GP-STY-065 | Style/Symbols | Dash quarter rests | "-" for quarter rests in tab. | ≤7 | REND-250 |
| GP-STY-066 | Style/Symbols | Hide dynamics | Hides dynamic markings. | ≤7 | REND-248 |
| GP-STY-067 | Style/Symbols | Fret and string in slash notation | Shows the fret and string for single notes on slash staves. | ≤7 | REND-229 |
| GP-STY-068 | Style/Symbols | Tuplet brackets | Show or hide tuplet brackets. | ≤7 | REND-248, REND-147 |
| GP-STY-069 | Style/Symbols | Scale-diagram grid spacing | Numeric spacing of scale-diagram grids. | 8.0 | REND-209 |
| GP-STY-070 | Style/Fingering | Left-hand finger labels | T1234 or P1234. | ≤7 | REND-252 |
| GP-STY-071 | Style/Fingering | Right-hand finger labels | pimac, pimax, pimae or timao. | ≤7 | REND-252 |
| GP-STY-072 | Style/Fingering | Staff fingering position | Above, before or below the note. | ≤7 | REND-252 |
| GP-STY-073 | Style/Fingering | Tab fingering position | Above or below. | ≤7 | REND-252 |
| GP-STY-074 | Style/Fingering | Fingering size | Size of fingering numbers. | ≤7 | REND-252 |
| GP-STY-075 | Style/Presets | Save as default stylesheet | Save a customised stylesheet and make it the default for new files (Options > Save Style). | 7.6 or earlier | REND-220, REND-218 |
| GP-STY-076 | Style/Presets | Bundled style presets | Several ready-made looks (for example classic, pop and jazz styles). | ≤7 (unverified list) | REND-220, REND-218, REND-310 |

### 25. Preferences (GP-PREF)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-PREF-001 | Pref/General | Force options | Override a file's own stylesheet, layout, zoom, notation or audio engine when opening or creating it. For example, always open at 150% or always play with MIDI. | ≤7 | PLAT-048, REND-219 |
| GP-PREF-002 | Pref/General | Embed audio by default | Whether imported audio tracks are stored inside the .gp file. Can be changed per file. | 8.0 | PRAC-130 |
| GP-PREF-003 | Pref/Interface | Playback cursor style | None, smooth, jump per note, or jump on metronome beats. | ≤7 | PLAY-074, PLAY-010 |
| GP-PREF-004 | Pref/Interface | Highlight current bar | Pale highlight on the bar being played. | ≤7 | PLAY-011 |
| GP-PREF-005 | Pref/Interface | Diagrams in copy-paste | Include chord and scale diagrams in a normal paste. | 8.0 | PLAT-050, EDIT-101 |
| GP-PREF-006 | Pref/Interface | Fretlight button | Show the hidden Fretlight toolbar button. | ≤7 | PLAT-053 |
| GP-PREF-007 | Pref/Errors | Note out of range | Flag notes outside the instrument's range. | ≤7 | COMP-072, COMP-086 |
| GP-PREF-008 | Pref/Errors | Invalid tuplets | Flag tuplets that break rhythm rules. | ≤7 | COMP-087 |
| GP-PREF-009 | Pref/Errors | Invalid HoPo | Flag hammer-ons or pull-offs that can't be played, such as across strings. | ≤7 | COMP-088 |
| GP-PREF-010 | Pref/Errors | Invalid bar length | Flag bars that are too short or too long. | ≤7 | COMP-071 |
| GP-PREF-011 | Pref/Errors | Unreachable bar | Flag bars that playback can never reach. | ≤7 | COMP-089 |
| GP-PREF-012 | Pref/Audio | Audio device | Device selection (ASIO on Windows, CoreAudio on macOS), output port with a test sound, input selection with a level meter, and buffer size. Better support for high sample rates since 8.0.2. | ≤7 | PLAT-051, PLAT-034 |
| GP-PREF-013 | Pref/MIDI | MIDI output ports | Up to 4 output ports at once, each mapped to a device and testable. Port 1 is the default for new tracks. | ≤7 | PLAY-131, PLAY-070 |
| GP-PREF-014 | Pref/MIDI | MIDI and RSE latency | A delay in ms to line MIDI devices up with RSE audio (the metronome uses MIDI). | ≤7 | PLAY-132 |
| GP-PREF-015 | Pref/mySongBook | Hide Free Tab of the Day | Turns off the daily free-score suggestion. [online] | 8.x | — (won't replicate: online store) A preference for the store's daily free score; without the store there is nothing to hide. |

### 26. Playback and practice (GP-PLAY)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-PLAY-001 | Playback | Play and pause | Space toggles playback from the cursor. Shift+Space (Ctrl+Space on Windows) plays from the start. Also in the Sound menu and toolbar. | ≤6 | PLAY-001, PLAY-008 |
| GP-PLAY-002 | Playback | Transport | First bar, previous bar, next bar and last bar buttons, plus rewind and fast-forward (Ctrl/Cmd+Left/Right). | ≤6 | PLAY-001, PLAY-003, PLAY-005 |
| GP-PLAY-003 | Playback | Loop | Loops the whole song or the current selection (F9, toolbar or Sound menu). | ≤6 | PRAC-030 |
| GP-PLAY-004 | Practice | Relative speed | Slows down or speeds up every track by a percentage. Seven presets run from 25% to 100%, and custom values from 10% to 300% (Ctrl/Cmd+F9). The icon stays blue while active; click again to go back to normal. | ≤6 | PRAC-020, PRAC-021, PRAC-104 |
| GP-PLAY-005 | Practice | Fixed tempo | Plays everything at one chosen BPM and ignores tempo changes. Five preset tempos (one is the current tempo), each customisable from 10 to 300 BPM. Not available while an audio track is active. | 8.0 | PRAC-103 |
| GP-PLAY-006 | Practice | Speed trainer | "Progressive speed" goes up a step on each loop pass. Settings are start % (10–300), end % (10–300), number of repetitions and step size. Works with the loop. | ≤6 | PRAC-022, PRAC-105 |
| GP-PLAY-007 | Practice | Speed keys during playback | Change speed on the fly by 5% or 5 BPM with + and − (8.0). "=" and "_" were added in 8.1.1. | 8.0 / 8.1.1 | PRAC-021, PLAY-008 |
| GP-PLAY-008 | Practice | Metronome | Click track on or off from the LCD or Sound menu. It follows time-signature changes, uses the MIDI output, and switches to MIDI automatically when every track is MIDI (8.1). | ≤6 | PRAC-001 |
| GP-PLAY-009 | Practice | Metronome volume | Level control. Setting it to 0 leaves a silent, visual-only metronome. | ≤7 | PRAC-106 |
| GP-PLAY-010 | Practice | Count-in | Count-in before playback, toggled from the LCD or Sound menu. | ≤6 | PRAC-011 |
| GP-PLAY-011 | Practice | Count-in length | How long the count-in lasts. | ≤7 | PRAC-011 |
| GP-PLAY-012 | Practice | Count-in between loops | Repeats the count-in before every loop pass. | ≤7 | PRAC-107 |
| GP-PLAY-013 | Practice | Visual metronome | The LCD flashes on every beat. | 8.0 | PRAC-008 |
| GP-PLAY-014 | Practice | Visual count-in | The count-in also flashes on screen. Since 8.1.5 the flash clears when playback stops. | 8.0 | PRAC-011 |
| GP-PLAY-015 | Playback | Expressive playback | Playback follows dynamics, accents, ghost notes, bends, slides, vibrato, swing, fermatas, free time, grace notes, strums and rasgueado patterns, palm mute and let ring. Pick scrape and dead slap are silent. | ≤6 | PLAY-024, PLAY-030, PLAY-031, PLAY-032, PLAY-035, PLAY-036, PLAY-041, PLAY-079, PLAY-080, PLAY-081, PLAY-083, PLAY-091, PLAY-092 |
| GP-PLAY-016 | Playback | Elapsed-time readout | Elapsed song time, as shown by the Timer element (GP-TXT-004), is calculated from the score tempo. Since 8.1 it isn't changed by relative speed or fixed tempo. (unverified: whether there is also a clock on the LCD) | 8.x | PLAY-075, REND-185 |
| GP-PLAY-017 | Practice | Backing-track practice | Mute or turn down your own part (mute, solo, focus) and play along live through the line-in using the track's tone. | 7.0 | PLAY-056, PLAY-077, PRAC-080 |
| GP-PLAY-018 | Playback | Mixed engines | RSE and MIDI tracks play in sync. A latency offset compensates for external MIDI devices. | 7.0 | AUD-010, PLAY-132 |

### 27. Sound engine, presets, effects and amps (GP-SND)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-SND-001 | Sound | RSE engine | The Realistic Sound Engine plays recorded instrument samples with modelled amps and effects. | 5.0 | AUD-006, AUD-008, AUD-009, AUD-039 |
| GP-SND-002 | Sound | MIDI engine | Lightweight General MIDI playback through the built-in synth or external devices. | ≤5 | AUD-005, PLAY-070 |
| GP-SND-003 | Sound | Engine per track | Each track uses RSE or MIDI, and they can be mixed. Sound > Switch All Tracks to MIDI/RSE changes every track at once. | 7.0 | AUD-010 |
| GP-SND-004 | Sound | Sound library browser | Presets organised by category and subcategory: acoustic and electric guitars, basses, keyboards, drums and more. | 7.0 | AUD-032 |
| GP-SND-005 | Sound | Preset count | About 1,000 presets, each pairing an instrument soundbank with an effect chain. | 7.0 | AUD-032 |
| GP-SND-006 | Sound | Signature sounds | Presets inspired by famous recordings, counted by hand from the appendix list (so approximate): about 265 in total, of which 97 clean electric, 89 overdrive, 72 distortion, 4 jazz, 2 electric 12-string and 1 electric sitar. | ≤7.5 | AUD-033 |
| GP-SND-007 | Sound | Multiple sounds per track | Add or duplicate sounds in the track inspector's sound list so a track can switch tone mid-song (see GP-MIX-015). | 7.0 | AUD-029 |
| GP-SND-008 | Sound | Sound-slot options | Rename, reorder, delete, copy, paste or save a sound as a template. | 7.0 | AUD-034 |
| GP-SND-009 | Sound | Lock sound | A speaker-icon lock forces one sound and overrides other sounds and automations. | 8.x | AUD-035 |
| GP-SND-010 | Sound | Preview on hover | Hovering a preset during playback auditions it live before you pick it. | 8.0 | AUD-036 |
| GP-SND-011 | Sound | Soundbank selection | Pick the raw, unprocessed instrument sample set behind a sound. | ≤7 | AUD-037 |
| GP-SND-012 | Sound | Soundbank settings | Mono or stereo, and microphone position choices. Soundbanks can be copied and pasted. | 7.x | AUD-038 |
| GP-SND-013 | Sound | Soundbank quality pass | 8.0 corrected soundbanks and rebalanced sample levels and dynamics. | 8.0 | AUD-005, AUD-006 |
| GP-SND-014 | Sound | Effect chain | Up to 6 effects per sound. Each slot has its settings, a model library, a bypass switch, presets, and copy, paste, move and delete. | ≤7 | AUD-039 |
| GP-SND-015 | Sound | Pedalboard | Visual stompbox board for the current sound. Drag pedals in from a categorised, zoomable browser, reorder or resize them, copy, paste, duplicate or delete, and switch between track and mastering. Changes are heard live. RSE only. | 8.0 | AUD-040 |
| GP-SND-016 | Sound | User presets | Save a sound with a family and instrument type. It joins the library, the preset folder can be opened from the app, and presets can be moved by copying files. The library refreshes automatically. | ≤7 | AUD-041 |
| GP-SND-017 | Sound | MIDI to RSE conversion | Convert MIDI tracks to RSE (Sound menu) so the pedalboard and effects can be used. | ≤7 | AUD-010 |
| GP-SND-018 | Amp models | Combo guitar amps | Top30 (AC30-style), American Clean, American Tweed and Eddie. | ≤7 | AUD-042 |
| GP-SND-019 | Amp models | Stack guitar amps | Vintage and Stack (British-stack style), Recti, Modern and Overloud. | ≤7 | AUD-043 |
| GP-SND-020 | Amp models | Light amp and rotary speaker | UK Light (small amp) and Rotary (rotating speaker). | ≤7 | AUD-044 |
| GP-SND-021 | Amp models | Bass amps | Classic (Ampeg-style stack), Aural and Light. | ≤7 | AUD-045 |
| GP-SND-022 | Pedals | Overdrives (5) | Blues, Preamp, Screamer, Jordan and B-Overdrive. | ≤7 | AUD-022 |
| GP-SND-023 | Pedals | Distortions (5) | Rat, Grunge, DistoPlus, Classic and Metal. | ≤7 | AUD-022 |
| GP-SND-024 | Pedals | Fuzzes (4) | Machine, Fast, Pi (Muff-style) and Bender. | ≤7 | AUD-046 |
| GP-SND-025 | Pedals | Choruses (3) | Ensemble, String and B-Chorus. | ≤7 | AUD-023 |
| GP-SND-026 | Pedals | Flangers (2) | Mistress and Jet. | ≤7 | AUD-047 |
| GP-SND-027 | Pedals | Phasers (2) | 90 and Stone. | ≤7 | AUD-048 |
| GP-SND-028 | Pedals | Vibe and tremolo (3) | Vibe (vibrato), Opto and Bias (tremolos). | ≤7 | AUD-049 |
| GP-SND-029 | Pedals | Compressors (2) | Sorr and Orange. | ≤7 | AUD-021 |
| GP-SND-030 | Pedals | Pitch (2) | Octaver and Pitch Wham (whammy-style pitch shifter). | ≤7 | AUD-050 |
| GP-SND-031 | Pedals | EQ and volume (4) | GEq and BEq (guitar and bass graphic EQs), Acoustic EQ and a Volume pedal. | ≤7 | AUD-020, AUD-051 |
| GP-SND-032 | Pedals | Wahs (7) | AutoWah, GWah, BWah, Jimi, Baby, Horse and Vintage. | ≤7 | AUD-052 |
| GP-SND-033 | Mastering FX | Dynamics (2) | Analog and Classic compressor/limiters. | ≤7 | AUD-021, PLAY-063, AUD-053 |
| GP-SND-034 | Mastering FX | Graphic EQs (2) | 10-band and 15-band. | ≤7 | AUD-020, AUD-053 |
| GP-SND-035 | Mastering FX | Reverbs (6) | Concert Hall, Small Theater, Studio Room, Ambience Room, Percussive Plate and Spring. | ≤7 | AUD-025, AUD-053 |
| GP-SND-036 | Mastering FX | Time-based effects (4) | T-Delay (tape delay), D-Delay (digital delay), D-Chorus and D-Flanger. | ≤7 | AUD-024, AUD-023, AUD-047 |
| GP-SND-037 | Sound | Keyboard soundbanks | Acoustic and electric pianos, organs (including a tonewheel type), synthesizers and harpsichord. | ≤7 | AUD-005, AUD-006 |

### 28. Mixer, automations, mastering, note-level audio (GP-MIX)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-MIX-001 | Mixer | Track volume | Volume fader for each track in the global view. | ≤6 | PLAY-050 |
| GP-MIX-002 | Mixer | Track pan | Stereo pan knob for each track. | ≤6 | PLAY-051, AUD-004 |
| GP-MIX-003 | Mixer | Track EQ | Low, mid and high equaliser per track, with presets for each instrument type. | ≤7 | PLAY-062, AUD-020 |
| GP-MIX-004 | Mixer | Mute | Silences a track. Muted tracks are left out of MIDI export. | ≤6 | PLAY-052, EXP-024 |
| GP-MIX-005 | Mixer | Solo | Plays only the soloed tracks. | ≤6 | PLAY-053 |
| GP-MIX-006 | Mixer | Focus/unfocus | A knob in the master area. Turning it right boosts the active track over the rest, turning it left pushes it back. It follows whichever track you select. | 8.0 | PLAY-077 |
| GP-MIX-007 | Mixer | Master volume and pan | Song-level output volume and balance on the master track. | ≤7 | PLAY-057, PLAY-078 |
| GP-MIX-008 | Mixer | Automation toggles | An "A" button beside the volume and pan controls turns that track's automation on or off. Active automation is outlined in green. | ≤7 | PLAY-127 |
| GP-MIX-009 | Automation | Automation editor | Graph editor opened with F10, the palette, the LCD or a click on a tempo mark. Click to add points, which snap to beats or bars. Drag them in time or value, delete them, or clear everything. Points can carry text labels. | ≤7 | PLAY-061, PLAY-120 |
| GP-MIX-010 | Automation | Step or ramp | Each point either holds its value until the next one or ramps smoothly towards it. | ≤7 | PLAY-121, PLAY-023 |
| GP-MIX-011 | Automation | Tempo automation | Tempo changes for every track, with decimal BPM and values below 30 BPM since 8.0. Tempo marks can be edited by clicking them in the score. | ≤6 (decimals 8.0) | PLAY-023, PLAY-099, EDIT-022 |
| GP-MIX-012 | Automation | Track volume automation | Volume changes over time for one track. | ≤6 | PLAY-025, PLAY-122 |
| GP-MIX-013 | Automation | Track pan automation | Pan changes over time for one track. | ≤6 | PLAY-025, PLAY-123 |
| GP-MIX-014 | Automation | Master volume and pan automation | Fades or pans the whole mix, for example a fade-out at the end. | ≤7 | PLAY-124, PLAY-125 |
| GP-MIX-015 | Automation | Sound-change automation | Switches a track to another of its sounds at the cursor, from the Sound Automations window or Edit > Sounds, for example clean to distorted at the chorus. | 7.0 | PLAY-126, AUD-029, REND-206 |
| GP-MIX-016 | Automation | Show or hide tempo automation | Shows or hides tempo-automation marks in the score (command palette). | 8.0 | REND-210, UX-043 |
| GP-MIX-017 | Automation | Tempo beat unit | Tempo can be written against other beat units, such as a dotted quarter. | ≤7.5 (unverified UI) | REND-211, EDIT-022 |
| GP-MIX-018 | Mastering | Mastering chain | Song-level chain with fixed slots in this order: compressor/limiter, reverb, EQ. Each slot can be bypassed, has selectable models, and supports copy and paste. A mastering pedalboard holds up to 3 effects. | 7.0 | AUD-053, PLAY-063 |
| GP-MIX-019 | Note audio | Note audio settings | Per-note or per-selection playback tweaks (Shift+F): length 25–1200%, timing offset earlier or later, relative velocity up to ±15 dB, and reset. Resolution is 480 ticks per quarter note. | 8.0 | PLAY-119 |
| GP-MIX-020 | Mixer | MIDI level meter | A meter showing MIDI activity. | 8.0 (unverified) | PLAY-128 |

### 29. Audio track for backing tracks and transcription (GP-AUD)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-AUD-001 | Audio track | Import an audio file | One audio file per project (MP3/MPEG, M4A, WAV, FLAC, AIFF or OGG), added by browsing, drag-and-drop or Track > Add Audio File. | 8.0 | PRAC-090, PRAC-117 |
| GP-AUD-002 | Audio track | Audio track panel | Panel between the score and the global view (View > Show Audio Track or toolbar). It has a bypass switch and buttons to replace or remove the file. | 8.0 | PRAC-118 |
| GP-AUD-003 | Audio track | Waveform with bar grid | The waveform carries the score's bar grid: solid red downbeats, dotted yellow beats and bar numbers, following time-signature changes. | 8.0 | PRAC-119 |
| GP-AUD-004 | Audio track | Ruler and bar blocks | Time ruler and bar blocks under the waveform. Dragging on the ruler selects several bars. | 8.0 | PRAC-120 |
| GP-AUD-005 | Audio track | Playable zone | Start and end brackets mark the part of the audio tied to the score. A "+" outside the zone adds bars. | 8.0 | PRAC-121 |
| GP-AUD-006 | Audio track | Start offset | Ctrl/Cmd-drag the waveform or move the start bracket to line the audio up with bar 1. Reset Padding undoes this. | 8.0 | PRAC-122 |
| GP-AUD-007 | Audio track | Sync points | Double-click a beat to pin it to a moment in the audio. Drag the point to match the waveform, and the local tempo is recalculated. Double-click again to remove it. Points on downbeats deactivate instead. | 8.0 | PRAC-091, PRAC-123 |
| GP-AUD-008 | Audio track | Clear sync points | Removes every sync point, from the Perform Tasks menu or a right-click. | 8.0 | PRAC-123 |
| GP-AUD-009 | Audio track | Sync and tempo conversion | Build sync points from the score's tempo automation, or turn sync points into score tempo automation. | 8.0 | PRAC-124 |
| GP-AUD-010 | Audio track | Audio drives the tempo | While the audio track is active, its sync-point tempos replace the score's tempo map. | 8.0 | PRAC-091 |
| GP-AUD-011 | Audio track | Time-stretch | The audio follows relative speed without changing pitch, for slow practice and transcription. | 8.0 | PRAC-092 |
| GP-AUD-012 | Audio track | Pitch shift and fine tune | Shift by semitones (for example to match an E♭-tuned record) or fine-tune in cents. These changes can be undone since 8.1.3. | 8.0 | PRAC-092, PRAC-125 |
| GP-AUD-013 | Audio track | Frequency filters | Six preset filters that boost or cut frequency bands to bring out bass, mid or high instruments. | 8.0 | PRAC-126 |
| GP-AUD-014 | Audio track | Audio mixer strip | Volume, pan, EQ, mute and solo for the audio. Focus/unfocus and master volume and pan also apply. | 8.0 | PRAC-127, PLAY-077, PLAY-057 |
| GP-AUD-015 | Audio track | Waveform zoom | Zoom in with the trackpad or mouse wheel, or from the menu. | 8.0 | PRAC-128 |
| GP-AUD-016 | Audio track | Linked selection and playback | Selecting bars in the score selects them in the audio (not the other way round). Click and hold a bar to play from there; add Shift to loop it. | 8.0 | PRAC-129 |
| GP-AUD-017 | Audio track | What the audio follows | The audio follows relative speed, relative tonality, loop, count-in, fermatas, triplet feel, pickup bars and meter changes. It plays straight through (ignoring repeats and jumps) and ignores effects, volume/pan automation and fixed tempo. | 8.0 | PRAC-091, PRAC-092 |
| GP-AUD-018 | Audio track | Embed in the .gp file | The audio is stored inside the score by default, so the track opens with the file. It can be stored separately instead. | 8.0 | PRAC-130, OPEN-015, EDIT-064 |
| GP-AUD-019 | Audio track | Extract audio | Saves the embedded audio as an MP3. | 8.0 | PRAC-131 |

### 30. Line-in and MIDI I/O (GP-IO)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-IO-001 | Line-in | Play through the track's tone | A guitar plugged into an audio interface is heard through the active track's sound, amp and effects in real time. | 7.0 | PRAC-080 |
| GP-IO-002 | Line-in | Input selection | Choose the input device and channel from the line-in window's gear menu. | 7.0 | PRAC-080, PLAT-051 |
| GP-IO-003 | Line-in | Input gain | Adjusts the incoming level. | 7.0 | PRAC-132 |
| GP-IO-004 | Line-in | Effect chain bypass | Turns the effect chain off for line-in, for example when using external effects or while tuning. | 7.0 | PRAC-133 |
| GP-IO-005 | Line-in | Noise gate | Silences hum and noise when you aren't playing. | 7.0 | PRAC-134 |
| GP-IO-006 | Line-in | Line-in volume | Level of the monitored signal in the mix. | 7.0 | PRAC-132 |
| GP-IO-007 | Line-in | Limiter | Caps loud peaks to prevent feedback. | 7.0 | PRAC-135 |
| GP-IO-008 | Line-in | Tone follows the score | Your tone changes automatically when the score's sound automations change at the cursor. | 7.0 | PRAC-136 |
| GP-IO-009 | Line-in | Lock line-in sound | A padlock keeps your current tone when you change tracks or files, until the app quits. It stays locked even if line-in is switched off. | 8.0 | PRAC-137 |
| GP-IO-010 | Line-in | Play a MIDI keyboard through GP sounds | Play a connected MIDI keyboard live through the built-in soundbanks, for example to improvise over a loop. | 8.x (unverified) | PLAY-133 |
| GP-IO-011 | MIDI | MIDI routing per track | Choose output port (1 to 4) and channel for each track. Tracks get two channels by default (effects on the second) or one. Tracks sharing a port and channel share settings. Percussion uses channel 10. | ≤6 | PLAY-130 |
| GP-IO-012 | MIDI | Bank and program | Bank MSB and LSB (0–127) and program (0–127) per MIDI track to reach any General MIDI or device sound. The LSB/MSB handling was fixed in 8.1.4. | ≤6 | PLAY-054 |
| GP-IO-013 | MIDI | External synths | Send playback to hardware or software synths. Sound quality then depends on the device. | ≤6 | PLAY-070 |

### 31. Import (GP-IMP)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-IMP-001 | Import | Legacy GP files | Opens Guitar Pro 1–5 files (.gtp, .gp3, .gp4, .gp5). Saving writes the current .gp format; older GP versions can't open newer files. | ≤7 | OPEN-010, OPEN-011, OPEN-012, OPEN-033 |
| GP-IMP-002 | Import | Guitar Pro 6 files | Opens .gpx files. | 7.0 | OPEN-013 |
| GP-IMP-003 | Import | Guitar Pro 7 and 8 files | Native .gp container. GP7 and GP8 files are cross-compatible. | 7.0 | OPEN-014, OPEN-015 |
| GP-IMP-004 | Import | PowerTab | Imports .ptb files as editable scores. A crash on files with a coda was fixed in 8.1. | ≤6 | OPEN-024 |
| GP-IMP-005 | Import | TablEdit | Imports .tef files. Large files import better since 8.1.3. | ≤7 | OPEN-034 |
| GP-IMP-006 | Import | MusicXML | Imports uncompressed and compressed MusicXML with notes, rhythms, dynamics and articulations. Fingerings, multiple voices and free text improved in 8.1. | ≤6 | OPEN-017, OPEN-018 |
| GP-IMP-007 | Import | MIDI import target | Imports format 0 and 1 MIDI files into a new score, or into the open score after the last active track. | 7.5 | OPEN-023, OPEN-036 |
| GP-IMP-008 | Import | MIDI track mapping | Choose which MIDI tracks to import and merge several into one GP track. Piano-style parts are detected and joined into a grand staff (split them by hand if needed). The instrument comes from Program Change, or piano if there is none. | 7.5 | OPEN-037 |
| GP-IMP-009 | Import | MIDI per-track options | For each track choose MIDI or RSE sound, tuning, one or two staves, tab and/or standard notation, colour and icon. | 7.5 | OPEN-038 |
| GP-IMP-010 | Import | MIDI quantisation and cleanup | Quantisation grid and shortest note, stretching notes to fill gaps, turning tied pairs into dotted notes, splitting overlaps into voices, detecting triplets, and keeping a track's two channels separate. | 7.5 | OPEN-039 |
| GP-IMP-011 | Import | MIDI score options | Import or ignore time signatures (otherwise 4/4), key signatures (otherwise C) and tempo (otherwise 120 BPM), and choose the playback engine for all tracks. | 7.5 | OPEN-040 |
| GP-IMP-012 | Import | MIDI import preview | A live preview of the result that updates as settings change, before you commit. | 7.5 | OPEN-041 |
| GP-IMP-013 | Import | Extra MIDI data | Decimal tempos (8.0.2) and per-note audio settings (8.1) survive a MIDI round trip. | 8.0.2 / 8.1 | OPEN-023, EXP-025 |
| GP-IMP-014 | Import | ASCII tab import | Converts plain-text tab into the active track. Run it several times to build a multi-track score. Text outside the tab is ignored. Needs dash-and-pipe tab with no blank lines inside a system. Rhythm is approximate, so Check Bar Duration is suggested afterwards. | ≤6 | OPEN-021, COMP-031 |

### 32. Export and print (GP-EXP)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-EXP-001 | Export | Native .gp | Saves in the GP7/8 file container. | 7.0 | EXP-010, EDIT-064 |
| GP-EXP-002 | Export | Guitar Pro 6 (.gpx) | Downgrade export for GP6 users. | 7.0 | EXP-021 |
| GP-EXP-003 | Export | Guitar Pro 5 (.gp5) | Downgrade export for GP5 users and other tools. Fingerings and grace-note transitions were fixed in 8.1.4. | 7.0 | EXP-022 |
| GP-EXP-004 | Export | MIDI | Format 1 .mid with all unmuted tracks. Two-channel tracks may confuse other software, so a single-channel option exists. Exports decimal tempo (8.0.2) and per-note audio settings (8.1). | ≤6 | EXP-004, EXP-024, EXP-025 |
| GP-EXP-005 | Export | MusicXML | Whole-score export with notes, rhythms, dynamics and articulations. Chord-symbol export improved in 8.1.4 and direction export was fixed in 8.1. | ≤6 | EXP-015 |
| GP-EXP-006 | Export | ASCII tab | Plain-text tab of the active track only. Techniques use letter codes such as h, b, s, ~, t, M, P, S, +, W, w, =, v, ^, V, n, g, <, L, x, > and ".". | ≤6 | EXP-013, COMP-031 |
| GP-EXP-007 | Export | PDF | File name, folder and resolution. Export one page, a page range, all pages or only the selection, and optionally open the folder afterwards. | ≤7 (improved 8.0) | EXP-001, EXP-026, EXP-028 |
| GP-EXP-008 | Export | PNG | The same options as PDF, plus a transparent background. | ≤7 (improved 8.0) | EXP-002, EXP-026, EXP-027 |
| GP-EXP-009 | Export | SVG | Vector export with the same page and selection options and a transparent background, for editing in vector tools or use on the web. | 8.1 | EXP-003, EXP-026, EXP-027 |
| GP-EXP-010 | Export | File-name tokens | Name templates for image and PDF export: title %T, track name %t, track number %n, track count %N, date %d and time %h. A live preview of the name and a help tooltip are shown. | 8.0 | EXP-028 |
| GP-EXP-011 | Export | Audio formats | WAV, MP3, OGG, FLAC and AIFF. MP3, OGG, FLAC and AIFF arrived in 7.0. | 7.0 | EXP-005, EXP-006, EXP-007, EXP-008, EXP-023 |
| GP-EXP-012 | Export | Audio of the selection | Renders only the selected bars. | ≤7 | EXP-029 |
| GP-EXP-013 | Export | One audio file per track | Renders each track to its own file for mixing elsewhere. The audio track is included since 8.1.1. | ≤7 | EXP-009 |
| GP-EXP-014 | Export | Click in audio export | Optionally includes the metronome and count-in in the rendered audio. | ≤7 | EXP-030 |
| GP-EXP-015 | Export | MP3 settings | Quality, bitrate mode (constant, variable or average) and loudness normalisation. | ≤7 | EXP-032, EXP-033 |
| GP-EXP-016 | Export | Speed and key in exports | Rendered audio uses the current relative tonality (7.5.4) and relative speed (8.0). | 7.5.4 / 8.0 | EXP-031 |
| GP-EXP-017 | Export | Automatic extension | Audio export adds the right file extension automatically. | 8.1.2 | EXP-028 |
| GP-EXP-018 | Print | Print | Prints through the system dialog (page choice, orientation, quality) with a preview. Layout comes from the stylesheet. Print button on the toolbar or Ctrl/Cmd+P. | ≤6 | EXP-016 |
| GP-EXP-019 | Export | PowerTab and TablEdit export | Listed on the features page, but missing from the export documentation and menus. Probably a marketing error. | ? (unverified) | OPEN-024, OPEN-034 *(import only; no evidence GP8 actually exports these formats, so no export rows were added; lead to confirm)* |

### 33. Keyboard shortcuts (GP-KBD)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-KBD-001 | Shortcuts | Default shortcut map | About 150 default shortcuts for file, edit, entry, techniques, navigation, selection, playback, view and tools, shown in menus and tooltips. Appendix A lists them; OpenTabz should offer a "GP keymap" preset. | ≤7 | EDIT-005, PLAT-052, PLAT-036, PLAY-008 |
| GP-KBD-002 | Shortcuts | One-key technique shortcuts | Most techniques have a single key: B bend, H hammer-on, S slide, P palm mute, X dead note, O ghost note, Y harmonic, N trill, V vibrato, i let ring, G grace note, R rest, L tie, T text, A chord, F fermata, D directions, and others. | ≤7 | EDIT-005, EDIT-014 |

### 34. mySongBook: online store [online] [won't replicate] (GP-MSB)

OpenTabz will not rebuild this store. It is listed so the inventory is complete and because some of its browsing and practice affordances (filters, favourites, scores with synced audio) are worth matching for an OpenTabz library.

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-MSB-001 | mySongBook | In-app catalogue | Browse and open Arobas's licensed tab library inside GP after signing in. [online] | 7.5 | — (won't replicate: online store) Arobas's licensed catalogue sits behind their sign-in; OpenTabz opens your own files (LIB-001). |
| GP-MSB-002 | mySongBook | Catalogue content | Thousands of professional transcriptions with every instrument (guitar, bass, drums, keys, vocals and lyrics) and expert sound settings. New titles are added every week. | 7.5 | — (won't replicate: online store) Store content rather than software; not ours to distribute. |
| GP-MSB-003 | mySongBook | Search with previews | Search by title or artist, with an audio preview of each track. | 8.x | — (won't replicate: online store) Store search; OpenTabz searches your own library (LIB-003). |
| GP-MSB-004 | mySongBook | Filters | Genre (about 17), instrument and level (about 14, including beginner-only), and arrangement type (about 17, from solo guitar to compacted full score). | 8.0 | — (won't replicate: online store) Store filters; library filters are LIB-014. |
| GP-MSB-005 | mySongBook | Categories | All tabs, free tabs, tabs with audio, favourites and purchases. | 8.x | — (won't replicate: online store) Store categories; favourites and recents are LIB-004 and LIB-005. |
| GP-MSB-006 | mySongBook | Sorting | Newest first (8.1), by artist or by title. | 8.1 | — (won't replicate: online store) Store sorting; library sorting belongs to LIB-003. |
| GP-MSB-007 | mySongBook | Favourites | Star a score to save it in favourites. | 8.x | — (won't replicate: online store) Store favourites; local favourites are LIB-004. |
| GP-MSB-008 | mySongBook | Free Tab of the Day | One free score every 24 hours at the top of the home page. It can be hidden (GP-PREF-015). | 7.5 (unverified) | — (won't replicate: online store) A daily free title served by Arobas's servers. |
| GP-MSB-009 | mySongBook | Free selection | 70+ permanently free titles (the "Free scores" category added in 8.1). | 8.1 | — (won't replicate: online store) Free store titles; OpenTabz ships its own demo scores (UX-003). |
| GP-MSB-010 | mySongBook | Subscription and credits | Full access needs a subscription. The old per-score credits can still be spent, and anything bought stays available after the subscription ends. | 7.5 | — (won't replicate: online store) Subscription and credits; OpenTabz is free. |
| GP-MSB-011 | mySongBook | Scores with audio | Some titles include a synced audio track to play along with. | 8.0 | — (won't replicate: online store) Store scores with audio; any OpenTabz document can carry an audio track (PRAC-090). |
| GP-MSB-012 | mySongBook | Arrangement variety | Full scores, guitar and vocals, solo guitar, simplified beginner versions and audio-track versions. | 8.x | — (won't replicate: online store) Store arrangement variants; simplification is a tool (EDIT-057). |
| GP-MSB-013 | mySongBook | Cross-device access | The same account works in the iOS and Android apps. Online authentication is required. | ≤7 | — (won't replicate: online store) A store account across devices; OpenTabz moves libraries by backup (LIB-015). |

### 35. Guitar Pro mobile companion app (reference only) (GP-MOB)

| ID | Category | Feature | Description (own words) | Since | Matrix |
| --- | --- | --- | --- | --- | --- |
| GP-MOB-001 | Mobile | File reader | Opens GP3 to GP8 files and PowerTab, including 9- and 10-string tabs and password-protected files. | 2011+ (app) | — (mobile app reference) OpenTabz opens the same formats on phones (OPEN-010 to OPEN-015, PLAT-010). |
| GP-MOB-002 | Mobile | Display | Tab with rhythm, slash and standard notation. Dark and light themes, three zoom levels, and vertical layout on phones. | app 1.9.x | — (mobile app reference) Same rendering, themes and zoom on phones (UX-021, UX-020). |
| GP-MOB-003 | Mobile | Multitrack player | Mixer with per-track volume, solo, mute and soundbank choice. | app | — (mobile app reference) Same mixer on phones (PLAY-050 to PLAY-053). |
| GP-MOB-004 | Mobile | Practice controls | Metronome, visual countdown, tempo change during playback, half-step transpose, looping any selection, and jumping between sections. | app | — (mobile app reference) Same practice controls on phones (PRAC-001, PRAC-030, PLAY-004). |
| GP-MOB-005 | Mobile | Instrument views | Guitar or bass fretboard (left- or right-handed) and a keyboard. | app | — (mobile app reference) Same instrument views on phones (VIEW-001, VIEW-002, VIEW-005). |
| GP-MOB-006 | Mobile | Fretlight Wireless | Drives LED-fretboard guitars from the phone. | app | — (mobile app reference) Covered on any device with Web Bluetooth by PLAT-053. |
| GP-MOB-007 | Mobile | File transfer and export | Import over Wi-Fi or a browser, through iTunes, the Files app or email. Share by email and export to PDF. | app | — (mobile app reference) File handlers and the share target (OPEN-006, OPEN-007) replace Wi-Fi and iTunes transfer. |
| GP-MOB-008 | Mobile | mySongBook in the app | Subscription or credits, favourites, an offline song list, and PDF export of purchased scores. [online] | app 1.10 | — (mobile app reference) The online store again (see GP-MSB). |
| GP-MOB-009 | Mobile | NotePad editor | Simple single-track tab editor for guitar, bass, banjo, ukulele and mandolin (4 to 8 strings, 19 sounds, custom tuning and tempo). Exports to .gpx or .gp for the desktop app. Can't edit drums or create standard notation. | app | — (mobile app reference) The full OpenTabz editor runs on phones (UX-021). |
| GP-MOB-010 | Mobile | Next-generation app (preview) | Prototype shown at NAMM 2025 and not yet shipped in the sources found. Planned: GP8-identical rendering, audio-track playback, speed trainer, dark mode, dynamic zoom, multitrack GP8 layouts, scales on fretboard and keyboard views, fixed-cursor scrolling, selecting on the score, relative tonality, and PDF/PNG export. | unreleased (unverified) | — (mobile app reference) An unreleased preview; its planned features are already desktop parity rows. |

## GP8 gaps where OpenTabz goes further

These are capabilities that GP8 does not document, or explicitly lacks, according to the sources above. They are candidates for OpenTabz to go beyond GP. They are not counted as GP features.

The Matrix column lists the rows where OpenTabz exceeds Guitar Pro.

| ID | Gap in GP8 | Evidence | Who already has it, or the opportunity | Matrix |
| --- | --- | --- | --- | --- |
| GAP-001 | Keyboard shortcuts can't be customised | The GP8 shortcuts appendix says they aren't customisable. | TuxGuitar's shortcut editor and Transcribe! both allow it. Offer remapping plus a GP-compatible preset. | PLAT-036, PLAT-052 |
| GAP-002 | No dark theme on desktop | Interface preferences have no theme option. | The GP mobile app and UG have dark modes. Offer light, dark and high-contrast themes. | UX-020, PLAT-022 |
| GAP-003 | Only one audio track per project | GP8 audio-track docs and the Guitar Gear Finder review. | Soundslice syncs several recordings and multitrack stems to one piece. | PRAC-138 |
| GAP-004 | No audio-to-notation transcription | GP landing-page FAQs say so. | Songsterr offers AI transcription from YouTube or uploaded audio. | COMP-060, COMP-061 |
| GAP-005 | Nothing shorter than a 64th note | The duration palette stops at 64ths. | Support 128th notes and beyond. | REND-189, EDIT-010 |
| GAP-006 | Limited dynamics and articulations | Only ppp to fff plus hairpins, with no sfz, fp, sf, rf, niente or staccatissimo. Tenuto is in the file model but not documented in the UI. | Add a full dynamics and articulation set. alphaTab's model already lists pppp–ffffff, sf, sfz, fp, rfz, n and others. | REND-312, REND-132, REND-133 |
| GAP-007 | No real-time MIDI recording | MIDI capture is documented as step-time only (one landing page claims real-time). | Add real-time record with quantise, like a DAW. | EDIT-007 |
| GAP-008 | No AI stem separation | The audio track only has six EQ-style filters. | Moises: isolate or mute vocals, drums, bass and other parts. | PRAC-147 |
| GAP-009 | No automatic beat, chord or key detection | Sync points are placed by hand. | Moises (BPM, sections, key, chords), Chordify (chords) and Transcribe! (note and chord guessing). | PRAC-143, COMP-095, COMP-096, COMP-097 |
| GAP-010 | Some marks don't sound | Pick scrape and dead slap are silent. Wah open/closed marks don't drive a wah. | Render them, and tie wah marks to an auto-wah sweep. | PLAY-134, PLAY-135 |
| GAP-011 | Few metronome options | No click sound choice, subdivisions or accent pattern are documented. | UG app's metronome has tap tempo. Offer custom clicks, subdivisions, accents and polymeter. | PRAC-002, PRAC-003, PRAC-004, PRAC-005, PRAC-006, PRAC-007, PLAY-007 |
| GAP-012 | Tuner has no reference pitch or chromatic mode documented | Tuner page. | Add an A4 calibration setting, chromatic and strobe modes, and alternate temperaments. | PRAC-113, PRAC-114, PRAC-115 |
| GAP-013 | Lyrics limits | Five lines at most, first staff only, no per-verse styling and no karaoke highlighting. | Soundslice has a lyrics-only view with loop by words; UG has synced lyrics. | REND-313, VIEW-022, PRAC-159 |
| GAP-014 | No playing feedback | No pitch detection, scoring, or "wait for me" mode. | Rocksmith+ and Yousician (see PR-FBK-* and PR-TRN-010). | PRAC-040, PRAC-041, PRAC-042, PRAC-043, PRAC-155 |
| GAP-015 | No collaboration or cloud | No sharing links, comments, version history or real-time co-editing. | Soundslice share links, Songsterr revisions, UG community. | EDIT-062, REND-309, OPEN-005, PLAT-055 *(no hosted cloud or co-editing, per PROJ-006; sharing is by file and URL)* |
| GAP-016 | Platforms | No Linux since GP7, and no web or Chromebook version. | OpenTabz in the browser covers every OS. | PLAT-047, PLAT-001, UX-021 |
| GAP-017 | No plugin or scripting API | Nothing documented. | TuxGuitar plugins and Transcribe! scripting. | PLAT-040, PLAT-041, PLAT-042, PLAT-043, PLAT-044 |
| GAP-018 | Narrow export formats | No LilyPond, ABC or MEI export. PowerTab/TablEdit export is doubtful. | TuxGuitar exports LilyPond. Add open formats. | EXP-034, EXP-035, EXP-036, EXP-003, EXP-012 |
| GAP-019 | No reading of sheet-music images | No OMR for PDFs or photos. | Soundslice's sheet-music scanner. | COMP-098 |
| GAP-020 | No left-handed chord diagrams in the score | Only the fretboard view mirrors. | Rocksmith+ and UG offer left-handed displays. | REND-314 |
| GAP-021 | Scale-diagram limits | Diagrams can't be dragged freely and the scale isn't named automatically. | Name it automatically and allow free placement. | COMP-093 |
| GAP-022 | Multirest only in single-track view | Bars documentation. | Part extraction with multirests. | REND-311 |
| GAP-023 | Weak file protection | GP calls it basic and easy to bypass. | Not worth copying; use account-based permissions instead. | EDIT-122 |
| GAP-024 | Audio track plays straight through | It ignores repeats and jumps and isn't affected by fixed tempo. | Map the audio to unfolded repeats. | PRAC-139 |
| GAP-025 | No practice history | No logs, streaks or mastery tracking. | Soundslice notebook practice history, Songsterr "mark as learned", and progress tracking in Yousician and the Justin Guitar app. | PRAC-060, PRAC-061, PRAC-062, PRAC-063, LIB-007 |

## Part B: Practice features in other apps

This section aims to cover every practice tool found in any tab, notation or practice app reviewed. The apps reviewed were Songsterr, Soundslice, Ultimate Guitar (Tab Pro / UG Pro), MuseScore (desktop app and the musescore.com mobile app), TuxGuitar, Rocksmith+ (and Rocksmith 2014), Yousician, Moises and Transcribe!. Anytune, the Justin Guitar app and Chordify were added for completeness. Everything comes from public feature pages, help centres, app-store listings and reviews. How each feature works is paraphrased.

The **GP8 status** column says whether Guitar Pro 8 already covers the feature:
- **Yes**: fully covered (with the matching GP ID).
- **Partial**: some of it is covered.
- **No**: a gap. These are the main targets for OpenTabz to beat GP.
- **n/a**: doesn't apply to GP.

| ID | Category | Practice feature | Description (own words) | Apps that have it | GP8 status | Matrix |
| --- | --- | --- | --- | --- | --- | --- |
| PR-TMP-001 | Tempo | Slow down without changing pitch | Time-stretches playback, whether synthetic or a real recording, while keeping the key. | Songsterr Plus, Soundslice, UG Pro, Moises, Transcribe! (down to 1/20×), Anytune (down to 0.05×), Chordify Premium, Yousician, MuseScore app, MuseScore 4 desktop (play-panel tempo) | Yes (GP-PLAY-004, GP-AUD-011) | PRAC-020, PRAC-092 |
| PR-TMP-002 | Tempo | Speed up past 100% | Plays faster than the original to over-learn a passage. | Transcribe! (2×), TuxGuitar (any %), Yousician (125%) | Yes (up to 300%, GP-PLAY-004) | PRAC-020 |
| PR-TMP-003 | Tempo | Type an exact speed | Enter a precise speed or BPM value instead of using presets. | Soundslice, Transcribe! | Yes | PRAC-021 |
| PR-TMP-004 | Tempo | One-tap half speed | A dedicated button for 50% speed. | Songsterr Plus, Transcribe! | Partial (50% preset) | PRAC-104 |
| PR-TMP-005 | Tempo | Fixed-BPM override | Ignores the song's tempo changes and plays at one steady BPM. | Guitar Pro 8 | Yes (GP-PLAY-005) | PRAC-103 |
| PR-TMP-006 | Tempo | Speed hotkeys | Change speed from the keyboard during playback. | Songsterr (S), Soundslice, GP | Yes (GP-PLAY-007) | PRAC-021, PLAY-008 |
| PR-TMP-007 | Tempo | Fixed 5% tempo buttons | Big ± buttons that move tempo in 5% steps between 25% and 125%. | Yousician | Partial | PRAC-021, PLAT-012 |
| PR-TMP-008 | Tempo | Change speed and key without stopping | Speed and pitch take effect immediately while playing. | Transcribe!, GP (speed) | Partial | PRAC-020, PLAY-055, PRAC-092 |
| PR-TMP-009 | Tempo | Metronome follows a live recording's tempo drift | The click follows tempo changes in a synced human performance. | Soundslice | Partial (through sync points turned into tempo automation, GP-AUD-009) | PRAC-144, PRAC-124 |
| PR-TRN-001 | Training | Speed trainer | Raises the tempo automatically on each loop pass between a start and an end value. | GP, Soundslice, TuxGuitar ("Training mode"), Anytune ("Step-It-Up") | Yes (GP-PLAY-006) | PRAC-022 |
| PR-TRN-002 | Training | Repeats per speed step | Choose how many passes run at each speed before it goes up. | Soundslice, Anytune, GP | Yes (unverified semantics in GP) | PRAC-105 |
| PR-TRN-003 | Training | Step trainer for pitch | The same stepping applied to transposition instead of tempo. | Anytune | No | PRAC-150 |
| PR-TRN-004 | Training | What happens after training | Choose what happens when the target speed is reached. | Anytune | No (unverified) | PRAC-151 |
| PR-TRN-005 | Training | Trainer on real recordings and video | Speed training on MP3, video and YouTube audio, not only synth playback. | Soundslice | Partial (GP's audio track follows relative speed) | PRAC-022, PRAC-092, PRAC-148 |
| PR-TRN-006 | Training | Adaptive tempo | The app slows down or speeds up according to how accurately you play. | Yousician ("Auto" tempo) | No | PRAC-152 |
| PR-TRN-007 | Training | Adaptive difficulty | Notes are added or removed live according to your accuracy. | Rocksmith+ | No | PRAC-153 |
| PR-TRN-008 | Training | Levelling speed | How fast adaptive difficulty adds notes when you play well. | Rocksmith+ | No | PRAC-153 |
| PR-TRN-009 | Training | Difficulty filters | Choose which note types, techniques and chords are shown. Riff Repeater also has a difficulty slider per section. | Rocksmith+, Rocksmith 2014 | No | PRAC-154 |
| PR-TRN-010 | Training | Wait mode | Playback stops until you play the right note, then moves on. | Rocksmith+ ("Note by Note"), Yousician ("Wait to Play"), UG Pro ("at your own pace", unverified) | No | PRAC-155 |
| PR-TRN-011 | Training | Note-by-note practice | Step through the music one note at a time. | MuseScore app (Practice Mode) | Partial (audible stepping, GP-ENT-014) | PLAY-073, PRAC-155 |
| PR-TRN-012 | Training | Error tolerance | How strict the app is before counting a note as missed. | Rocksmith 2014 (Riff Repeater) | No | PRAC-156 |
| PR-TRN-013 | Training | Easier arrangements | One-tap simplified versions or difficulty variants of a song. | UG Pro ("Simplify"), Yousician (challenge versions), mySongBook (beginner versions) | Partial (content only) | EDIT-057 |
| PR-TRN-014 | Training | Chord-change drills | Timed drills that count how many changes between two chords you make in a minute. | Justin Guitar app | No | PRAC-157 |
| PR-LOOP-001 | Loop | Drag to loop | Drag across notation to set a loop that snaps to notes, rests or barlines. | Soundslice, GP, Songsterr, UG Pro, MuseScore 4 desktop (loop in/out points) | Yes (GP-PLAY-003) | PRAC-030, EDIT-081 |
| PR-LOOP-002 | Loop | Loop handles | Drag the ends of the loop to resize it. | Soundslice, GP (8.0 selection handles) | Yes (GP-UI-019) | EDIT-082, PRAC-031 |
| PR-LOOP-003 | Loop | Keyboard loop control | Toggle the loop (L), move its end with Shift+arrows, and jump to its start. | Songsterr | Partial (F9 toggle) | PRAC-108 |
| PR-LOOP-004 | Loop | A-B loop on the waveform | Set A and B points on a recording's waveform. | Transcribe!, Anytune, Soundslice (waveform view) | Partial (Shift-loop in the audio track, GP-AUD-016) | PRAC-141 |
| PR-LOOP-005 | Loop | Saved, named loops | Keep any number of named loops ("clips", "loopmarks") and recall them later. | Soundslice (clips), Transcribe!, Anytune (audiomarks) | No | PRAC-032 |
| PR-LOOP-006 | Loop | Detected song sections | Verse, chorus and so on are found automatically and can be looped with one tap. | Moises (Sections) | No | COMP-097, PLAY-004 |
| PR-LOOP-007 | Loop | Jump to a section | Navigate the song by labelled section. | Moises, GP, GP mobile | Yes (GP-UI-013) | PLAY-004 |
| PR-LOOP-008 | Loop | Count-in on every loop pass | A count-in before each repeat of the loop. | GP, Yousician ("loop lead-in") | Yes (GP-PLAY-012) | PRAC-107 |
| PR-LOOP-009 | Loop | Loop or play once | Toggle whether a selection repeats or plays once. | Soundslice | Partial | PRAC-034 |
| PR-LOOP-010 | Loop | Focus mode | Hide every bar outside the chosen range, both on screen and in the audio. | Soundslice | No | PRAC-158 |
| PR-LOOP-011 | Loop | Loop by lyrics | Drag across lyric words to set the loop. | Soundslice (lyrics-only view) | No | PRAC-159 |
| PR-LOOP-012 | Loop | Loop by bar numbers | Set the loop range in a dialog by bar number. | TuxGuitar | Partial (by selection) | PRAC-109 |
| PR-SYNC-001 | Sync | Tab synced to the original recording | Notation plays in step with the commercial or original recording. | Songsterr (YouTube or original audio; no 10-bar pauses with Plus), Soundslice (MP3, video, YouTube), UG Official/Pro tabs (backing track), GP (audio track, mySongBook audio) | Yes (GP-AUD-*) | PRAC-090, PRAC-091 |
| PR-SYNC-002 | Sync | Synced video | Video sits next to the notation and can be resized, hidden or moved to the side or above. | Soundslice | No | PRAC-148 |
| PR-SYNC-003 | Sync | Mirrored video | Flip the video for left-handed players. | Soundslice | No | PRAC-149 |
| PR-SYNC-004 | Sync | Several recordings per piece | Sync one score to several performances and switch between them. | Soundslice | No (GAP-003) | PRAC-138 |
| PR-SYNC-005 | Sync | Tap-to-sync | Create sync points by tapping on downbeats while the recording plays. | Soundslice (syncpoint editor) | Partial (sync points are dragged by hand) | PRAC-142 |
| PR-SYNC-006 | Sync | Synth over the recording | Play notation audio on top of the real recording to bring out a part. | Soundslice (synth overlay) | Yes (score plus audio track) | PRAC-093, PRAC-127 |
| PR-SYNC-007 | Sync | Backing track without your part | Accompaniment with your instrument removed. | UG Official/Pro (backing track), Songsterr Plus, Yousician (mute the song or "play for me") | Yes (mute or focus on synthetic tracks) | PLAY-056 |
| PR-SYNC-008 | Sync | Playthrough video | A player's playthrough video synced to the tab. | Songsterr Plus | No | PRAC-148 |
| PR-SYNC-009 | Sync | Click in either view to seek | Clicking the notation moves the audio, and clicking the waveform moves the notation. | Soundslice, Transcribe! (markers and waveform), GP landing page claims it | Partial (GP docs say score-to-audio only) | PRAC-140, PRAC-129 |
| PR-SYNC-010 | Sync | Offline audio cache | Synced audio is cached for each speed, mix and instrument setting. | Songsterr mobile | n/a | PLAT-002 |
| PR-AI-001 | AI/analysis | Stem separation | AI splits a mix into vocals, drums, bass and other parts to mute or solo. | Moises | No (GAP-008) | PRAC-147 |
| PR-AI-002 | AI/analysis | Chord detection from audio | Shows the chords of a recording, live or as a timeline. | Moises, Chordify, Transcribe! (chord guess) | No | COMP-095 |
| PR-AI-003 | AI/analysis | Key detection | Shows the key of the recording. | Moises | Partial (find scales in notation, GP-SCL-006) | COMP-096, COMP-021 |
| PR-AI-004 | AI/analysis | Beat detection and synced click | Finds the BPM and beat grid and lays a click over them. | Moises (Smart Metronome, BPM detection) | No | PRAC-143 |
| PR-AI-005 | AI/analysis | Section detection | Splits a recording into intro, verse, chorus and so on. | Moises | No | COMP-097 |
| PR-AI-006 | AI/analysis | Audio to tab | Draft tabs from YouTube or uploaded audio. | Songsterr (AI transcription; Plus allows 50 full tabs a month) | No (GAP-004) | COMP-060, COMP-061 |
| PR-AI-007 | AI/analysis | Spectrum and note guessing | Spectrum over a keyboard graphic, guessed notes, and a piano-roll of guesses over time. | Transcribe! | No | PRAC-167 |
| PR-AI-008 | AI/analysis | AI practice coach | An assistant that suggests what to practise next or answers questions about the open tab. | UG (Practice Mode, iOS) | No | PRAC-045, PRAC-063 *(offline, rule-based suggestions; no cloud assistant, per PROJ-006)* |
| PR-AI-009 | AI/analysis | Sheet-music scanning (OMR) | Turns a PDF or photo into interactive notation. | Soundslice | No (GAP-019) | COMP-098 |
| PR-AI-010 | AI/analysis | Capo and easier-shape suggestions | Suggests a capo position and simpler chord shapes that keep the key. | Moises (Capo mode), Chordify (capo), UG (Simplify) | No | COMP-094 |
| PR-AI-011 | AI/analysis | Chords and lyrics from audio | Shows aligned chords and lyrics for a recording. | Moises | No | COMP-095 |
| PR-AI-012 | AI/analysis | Generated accompaniment | AI makes matching parts or a band that follows your playing. | Moises (Stem Generation), Rocksmith 2014 (Session Mode) | No | COMP-099, COMP-005 |
| PR-AUD-001 | Audio | Pitch shift and transpose | Move playback up or down in semitones (whether synth or a recording), for example to match an alternate tuning. | Songsterr (synth pitch shift), Moises, Transcribe!, Anytune (±24 semitones), Soundslice (transposes notation and tab) | Yes (GP-TOOL-005, GP-AUD-012) | PLAY-055, PRAC-092 |
| PR-AUD-002 | Audio | Fine tuning in cents | Small pitch tweaks to match an out-of-tune recording. | Transcribe!, GP | Yes (GP-AUD-012) | PRAC-125, PLAY-076 |
| PR-AUD-003 | Audio | EQ or filters to bring out a part | Boost or cut frequency bands to hear bass, mid or treble instruments better. | Transcribe! (EQ), GP (6 filters) | Yes (GP-AUD-013) | PRAC-126 |
| PR-AUD-004 | Audio | Karaoke and channel tricks | Mix or phase-invert the stereo channels to reduce centre vocals. | Transcribe! | No | PRAC-145 |
| PR-AUD-005 | Audio | Export processed audio | Save slowed or pitch-shifted audio, or download practice audio. | Transcribe!, Songsterr Plus (MP3/WAV/MIDI/GP download), GP | Yes (GP-EXP-016) | EXP-031, EXP-009 |
| PR-AUD-006 | Audio | Octave shift for clarity | Raise low parts by up to three octaves so bass is easier to hear. | Transcribe! | Partial | PRAC-146 |
| PR-MIX-001 | Mix | Mute and solo parts | Silence or isolate instrument tracks. | Songsterr, Soundslice, UG, MuseScore app (PRO), TuxGuitar, GP, MuseScore 4 desktop (mixer) | Yes (GP-MIX-004/005) | PLAY-052, PLAY-053 |
| PR-MIX-002 | Mix | Volume per part | Independent level for each part or stem. | Soundslice (stems), MuseScore app (PRO), Rocksmith+ (volume mixer), GP | Yes (GP-MIX-001) | PLAY-050 |
| PR-MIX-003 | Mix | Master volume | Overall output level in the mixer. | Songsterr (recent mixer update, unverified), GP | Yes (GP-MIX-007) | PLAY-057 |
| PR-MIX-004 | Mix | Boost your part | Raise your instrument relative to the band, or the opposite. | GP (Focus/Unfocus), Songsterr ("Focus mode", behaviour unverified) | Yes (GP-MIX-006) | PLAY-077 |
| PR-MIX-005 | Mix | Guide notes only | Plays just the notes you need to hit (MIDI guide) while turning the song down, or has the app play your part for you. | Rocksmith+ (MIDI playback), Yousician ("Play For Me") | Partial (soloing a track) | PLAY-056, PLAY-077 |
| PR-MIX-006 | Mix | Automatic track switching | Switches to another part when yours is resting. | Songsterr (Track Autoswitch) | No | PLAY-137 |
| PR-MIX-007 | Mix | Tone presets for your input | Clean, pop, country or rock presets, or saved tones, applied to your live instrument. | Yousician (mixer presets), Rocksmith+ (tones, 3-slot pedal board), GP (line-in) | Yes (GP-IO-001) | PRAC-080, AUD-041 |
| PR-MIX-008 | Mix | Show or hide parts | Show only the staves you care about. | Soundslice, MuseScore app (PRO), GP | Yes (GP-TRK-032) | REND-030 |
| PR-VIS-001 | Visual | Animated fretboard | Fretboard lights up the notes as they play. | Soundslice, GP, UG Pro, TuxGuitar, GP mobile | Yes (GP-VIEW-019) | VIEW-001, VIEW-003 |
| PR-VIS-002 | Visual | Animated keyboard with hand split | Keys light up during playback, with left-hand, right-hand or both-hands views. | Soundslice, MuseScore app (PRO), TuxGuitar (piano window) | Partial (no hand split) | VIEW-005, VIEW-023 |
| PR-VIS-003 | Visual | Other instrument views | Violin fingerboard, trombone slide positions and trumpet valve fingerings, animated. | Soundslice | No | VIEW-024 |
| PR-VIS-004 | Visual | 3D note highway | Game-style scrolling highway of upcoming notes. | Rocksmith+ | No | VIEW-025 |
| PR-VIS-005 | Visual | Scrolling tab view | A tab view that scrolls past the cursor, relying on numbers more than colour. | Rocksmith+ ("RS Tab") | Partial (horizontal screen layout) | REND-013, PLAY-016 |
| PR-VIS-006 | Visual | Left-handed display | Mirrors views for left-handed players. | GP (fretboard), Rocksmith+, UG (left-handed chords), TuxGuitar, GP mobile | Yes (GP-VIEW-013) | VIEW-002, PLAT-035, REND-314 |
| PR-VIS-007 | Visual | Inverted string order | Shows the low string on top, like the player sees it. | Rocksmith+ | No | REND-315 |
| PR-VIS-008 | Visual | String colours and colour-blind presets | Custom string colours, colour-blind palettes, balanced colours and colour boost. | Rocksmith+ | No | REND-300, REND-316 |
| PR-VIS-009 | Visual | Guide toggles | Turn finger guides, fret numbers, chord names, the next-chord countdown and the phrase banner on or off. | Rocksmith+ | Partial | REND-031, REND-208, VIEW-027, PRAC-051 |
| PR-VIS-010 | Visual | Bouncing-ball timing | A ball bounces onto each note to show timing. | Yousician | No | VIEW-026 |
| PR-VIS-011 | Visual | Note names on notes | Letter names drawn above each note. | Soundslice | Partial (hover only, GP-VIEW-012) | REND-306, VIEW-009 |
| PR-VIS-012 | Visual | Beat counts on notes | The beat number ("1 & 2 &") drawn above notes. | Soundslice | No | REND-317 |
| PR-VIS-013 | Visual | Percussion legend | A key to which drum is on which line or notehead. | Soundslice | Partial (drum view names) | REND-318 |
| PR-VIS-014 | Visual | Next-chord preview | Shows the next chord's diagram or strum pattern ahead of time. | Justin Guitar app, Chordify (animated diagrams), Rocksmith+ (countdown) | No | VIEW-027 |
| PR-VIS-015 | Visual | Playback highlight styling | Choose the colour and style of the played-beat or bar highlight. | TuxGuitar, Soundslice (player style) | Partial (on/off only, GP-PREF-004) | PLAY-136 |
| PR-VIS-016 | Visual | Scrolling modes | Continuous, page-turn, or fixed-cursor scrolling. | TuxGuitar, Soundslice, next GP mobile app (unverified) | Partial (cursor styles) | PLAY-013, PLAY-014, PLAY-016 |
| PR-VIS-017 | Visual | Waveform navigation | Navigate and loop on the waveform. | Soundslice, Transcribe!, GP | Yes (GP-AUD-003) | PRAC-119, PRAC-140 |
| PR-VIS-018 | Visual | Memorisation aid | Hide note names or fret numbers to practise from memory. | GP (fretboard), Rocksmith+ | Yes (GP-VIEW-015) | VIEW-017, PRAC-050, PRAC-051 |
| PR-DSP-001 | Display | Chord-chart view | Shows only the chords, without the notes. | Soundslice, UG (chords view) | No | REND-006, COMP-003 |
| PR-DSP-002 | Display | Lyrics-only view | Lyrics on their own. Click to seek. | Soundslice | No | VIEW-022 |
| PR-DSP-003 | Display | Chords and lyrics view | Chords placed over lyric lines for singers and strummers. | Moises, UG | No | REND-006 |
| PR-DSP-004 | Display | Toggle notation layers | Show or hide staff, tab, fingering, lyrics or chord names, or switch to drum notation. | Soundslice, Songsterr (sheet view, drum-notation toggle), GP | Yes (GP-TRK-009) | REND-031, REND-208, REND-239 |
| PR-DSP-005 | Display | Unfolded repeats | Write out repeats in the displayed notation. | Soundslice | No | REND-319 |
| PR-DSP-006 | Display | Hide empty staves | Drop staves that rest for a whole system. | Soundslice | No (unverified) | REND-320 |
| PR-DSP-007 | Display | One horizontal line | Show the whole song as a single horizontal line. | Soundslice, TuxGuitar (linear layout), GP | Yes (GP-VIEW-006) | REND-013 |
| PR-DSP-008 | Display | Autoscroll for chord sheets | Text chord sheets scroll at a set pace. | UG Pro | n/a | PRAC-073, REND-006 |
| PR-DSP-009 | Display | Reading comfort | Font size, dark mode and fullscreen. | UG, Songsterr Plus, Soundslice, GP mobile | Partial (no dark mode, GAP-002) | UX-020, VIEW-013, REND-015 |
| PR-DSP-010 | Display | Transpose and re-finger tab | Change key and recompute tab fingerings. | Soundslice, MuseScore app (PRO), UG (chords) | Yes (GP-TOOL-001/007) | EDIT-050, EDIT-053 |
| PR-DSP-011 | Display | Pick a chord voicing | Choose a different voicing or a simplified chord. | UG Pro | Partial (GP-CHD-014) | COMP-013 |
| PR-DSP-012 | Display | Large text | Text scaled to 200% or more. | MuseScore app | Partial (zoom) | REND-215, PRAC-072 |
| PR-DSP-013 | Display | Revision history | View and compare earlier versions of a tab. | Songsterr | No | EDIT-062 |
| PR-FBK-001 | Feedback | Mic note detection | The app listens through the microphone and checks what you play. | Rocksmith+ (including via the Connect phone app), Yousician | No | PRAC-040, PRAC-041 |
| PR-FBK-002 | Feedback | Cable input detection | Detection from a direct instrument cable or interface. | Rocksmith+ (Real Tone Cable or similar devices) | No (GP line-in has no assessment) | PRAC-040 |
| PR-FBK-003 | Feedback | Pitch and timing feedback per note | Shows straight away whether each note was right and on time. | Yousician, Rocksmith+ | No | PRAC-042, PRAC-043 |
| PR-FBK-004 | Feedback | Points and streak multiplier | Points for correct notes in a row, with a growing multiplier. | Yousician | No | PRAC-160 |
| PR-FBK-005 | Feedback | Stars per song | A star rating for each song played in performance mode. | Yousician | No | PRAC-160 |
| PR-FBK-006 | Feedback | Chord trainer with feedback | Browse a song's chords, hear them and get live feedback on yours. | Rocksmith+ (Chord Explorer) | No | PRAC-161 |
| PR-FBK-007 | Feedback | Practice and performance modes | A relaxed looped practice mode next to a scored performance mode. | Yousician (Practice and Play), Rocksmith+ (Riff Repeater and full play) | No | PRAC-162 |
| PR-FBK-008 | Feedback | Mark as learned | Tick off a song or skill yourself. | Songsterr ("mark as learned"), Justin Guitar app (self-assessment) | No | PRAC-163 |
| PR-GAM-001 | Progress | Leaderboards | Compare scores on a song with other users. | Yousician | No | — (out of scope: needs an online service) Leaderboards need a shared server; OpenTabz makes no network requests of its own (PROJ-006). |
| PR-GAM-002 | Progress | Learning path | Lessons and missions in order, matched to your level. | Yousician (Missions), Rocksmith+ (lessons), UG Courses, MuseScore LEARN, Justin Guitar app | No | PRAC-165, COMP-080 |
| PR-GAM-003 | Progress | Weekly challenges | New challenge pieces each week, at several difficulty levels. | Yousician | No | PRAC-165 |
| PR-GAM-004 | Progress | Skill mini-games | Arcade-style games that drill the fretboard, chords and techniques. | Rocksmith 2014 (Guitarcade) | No | PRAC-166 |
| PR-GAM-005 | Progress | Practice history | Logs and progress tracking per song and skill. | Justin Guitar app, Yousician, Soundslice (notebook practice history) | No (GAP-025) | PRAC-060, PRAC-061 |
| PR-GAM-006 | Progress | Recommendations | Suggestions for what to practise or play next. | Rocksmith+, UG (Practice Mode) | No | PRAC-063, PRAC-045 |
| PR-JAM-001 | Accompaniment | Adaptive virtual band | AI band members follow your tempo and intensity, with per-instrument mix. | Rocksmith 2014 (Session Mode) | No | COMP-099 |
| PR-JAM-002 | Accompaniment | Virtual band with optional vocals | Play along with a full band at adjustable tempo, with or without vocals. | Justin Guitar app | Partial (multitrack playback) | PLAY-050, PLAY-056 |
| PR-JAM-003 | Accompaniment | Build your own backing tracks | Write drum and piano parts as practice backing. | GP | Yes | COMP-005, COMP-040, EDIT-002 |
| PR-TOOL-001 | Tool | Tuner | Built-in instrument tuner. | Songsterr Plus, UG, Yousician, GP (polyphonic) | Yes (GP-TOOL-011) | PRAC-100 |
| PR-TOOL-002 | Tool | Tap tempo | Set the metronome by tapping. | UG app | No | PLAY-007, PRAC-001 |
| PR-TOOL-003 | Tool | Click speed and count-in volume | Click at 0.5×, 1× or 2× the beat, with separate count-in and click volumes. | Moises | Partial (GP-PLAY-009) | PRAC-110, PRAC-106, PRAC-002 |
| PR-TOOL-004 | Tool | Count-in length | Choose how many count-in beats to hear. | TuxGuitar (configurable beats), GP (length), UG (fixed 1–4), Songsterr (on/off), MuseScore 4 desktop (count-in toggle) | Yes (GP-PLAY-011) | PRAC-011 |
| PR-TOOL-005 | Tool | Chord dictionary | A library of chord shapes with name recognition. | UG, GP, TuxGuitar (chord recognition) | Yes (GP-CHD-*) | EDIT-040, EDIT-041 |
| PR-TOOL-006 | Tool | Scale library on the fretboard | Scales drawn on fretboard or keyboard views. | GP, next GP mobile app (unverified) | Yes (GP-SCL-005) | COMP-020, VIEW-004 |
| PR-TOOL-007 | Tool | Record yourself | Record audio or video over the practice track to review or share. | Moises (video recording), UG (upload a performance video), Transcribe! (recording) | No | PRAC-164 |
| PR-TOOL-008 | Tool | Amp and effects for your input | Play through modelled amps and effects. | Rocksmith+ (tones), UG via the separate Tonebridge app, GP line-in | Yes (GP-IO-001) | PRAC-080 |
| PR-TOOL-009 | Tool | Notes on the music | Private notes, reminders or time-stamped annotations. | Soundslice (notebook), Transcribe! (text annotations) | Partial (text and hidden lyric comments) | REND-308, REND-309 |
| PR-TOOL-010 | Tool | Count-in that fits the start point | The count-in covers a full bar of the current meter, and adds beats when playback starts mid-bar or on a pickup. | MuseScore 4 desktop | Partial (fixed-length count-in, GP-PLAY-010/011) | PRAC-111 |
| PR-LIB-001 | Library | Favourites, playlists, setlists | Organise songs for practice sessions or gigs. | Songsterr, UG, Moises (Setlists), MuseScore app | Partial (pinned files; mySongBook favourites) | LIB-004, LIB-006, PRAC-070 |
| PR-LIB-002 | Library | Offline use | Practise without a connection. | Songsterr mobile, UG, MuseScore app (PRO songbook), Transcribe! | Yes (local files) | PLAT-002 |
| PR-LIB-003 | Library | Named, coloured markers | Markers with names and colours at sections, bars or beats. | TuxGuitar (coloured markers), Transcribe! | Partial (sections without colour) | EDIT-149 |
| PR-LIB-004 | Library | Library filters | Filter songs by genre, rating, level and tuning. | UG, mySongBook | Partial (mySongBook only, online) | LIB-014, LIB-003 |
| PR-TCH-001 | Teaching | Share links and embeds | Send a practice-ready piece as a link or embed it on a site. | Soundslice, Songsterr | No | OPEN-005, PLAT-055 |
| PR-TCH-002 | Teaching | Teacher and classroom tools | Teaching-oriented features and classroom use. | Soundslice, Songsterr ("For teachers"), Yousician (classroom game, unverified) | Partial (spoken teacher notes in the audio track) | REND-309, PLAT-055 |
| PR-TCH-003 | Teaching | Community | Comments and ratings on shared tabs. | UG | No | — (out of scope: needs an online service) Comments and ratings need a hosted community service (PROJ-006). |
| PR-TCH-004 | Teaching | Print and PDF for practice | Printable practice material. | Songsterr Plus, UG Pro, MuseScore app (PRO), GP | Yes (GP-EXP-007/018) | EXP-001, EXP-016 |
| PR-HW-001 | Control | Foot pedal | Hands-free play and stop, or other actions. | Transcribe!, GP (Fretlight USB footswitch) | Partial (GP-TOOL-020) | PRAC-071, PRAC-116 |
| PR-HW-002 | Control | Remappable shortcuts | Assign your own keys to commands. | Transcribe!, TuxGuitar | No (GAP-001) | PLAT-036 |
| PR-HW-003 | Control | Scripting | Run command files, for example to batch-render slowed versions. | Transcribe! | No | PLAT-040 |
| PR-HW-004 | Control | LED-fretboard guitars | Light the notes to play on a smart guitar's fretboard. | GP, GP mobile (Fretlight) | Yes (GP-TOOL-018) | PLAT-053 |
| PR-HW-005 | Control | DAW plugin | Use the practice tool inside a DAW. | Moises | No | — (out of scope: native plugin) A DAW plugin is a native binary; OpenTabz hands work to DAWs through MIDI, MusicXML and stems (EXP-004, EXP-015, EXP-009). |
| PR-HW-006 | Control | Cloud sync across devices | Library, favourites and playlists available on every device. | Songsterr, UG, Soundslice | No | LIB-010, LIB-015 *(through a folder the user's own cloud drive syncs; no OpenTabz server)* |
| PR-HW-007 | Control | Hear notes while moving the cursor | Each beat sounds as you move through the score. | TuxGuitar, GP | Yes (GP-ENT-014) | PLAY-073 |

## Appendix A: GP8 default keyboard map, for an OpenTabz "Guitar Pro keymap" preset

Taken from the public GP8 shortcuts appendix. GP8 itself doesn't allow remapping (GAP-001). The source list has a few inconsistent entries, such as the Move Voice numbering and some symbol glyphs. Entries marked "(as listed)" were copied as published and should be checked in the app.

| Group | Action | Windows / Linux | macOS |
|---|---|---|---|
| File | New / Open / Close / Close all | Ctrl+N / Ctrl+O / Ctrl+W / Ctrl+Shift+W | ⌘N / ⌘O / ⌘W / ⇧⌘W |
| File | Save / Save As / Print / Preferences | Ctrl+S / Ctrl+Shift+S / Ctrl+P / Ctrl+, | ⌘S / ⇧⌘S / ⌘P / ⌘, |
| Edit | Undo / Redo | Ctrl+Z / Ctrl+Y | ⌘Z / ⇧⌘Z |
| Edit | Cut / Copy / Paste / Special paste | Ctrl+X / Ctrl+C / Ctrl+V / Ctrl+Shift+V | ⌘X / ⌘C / ⌘V / ⇧⌘V |
| Edit | Multitrack copy / Multitrack cut | Ctrl+Shift+C / Ctrl+Shift+X | ⇧⌘C / ⇧⌘X |
| Edit | Copy last beat / Select all | C / Ctrl+A | C / ⌘A |
| Edit | Delete / Delete note / Delete beats / Delete bar | Ctrl+Shift+Del / Backspace / Shift+Del / Ctrl+Del | ⌦ / ⌫ / ⌘− / ⌃− |
| Edit | Add track / Delete track | Ctrl+Shift+Ins / Del (as listed) | ⌥⌘N / ⌥⌘R |
| Edit | Insert bar / Insert beat | Ins / Ctrl+Ins | ⌘+ / ⌃+ |
| Edit | Go to / Edit automations / Edit section | Ctrl+G / F10 / Shift+Ins | ⌘G / F10 / ⌥⌘+ |
| Edit | Edit voice 1–4 / Multivoice / Move to voice 1–4 | Ctrl+1…4 / Ctrl+M / Alt+1…4 | ⌘1…4 / ⌘M / ⌥1…4 |
| Edit | Move/Copy/Swap voices assistant | Ctrl+Shift+M | ⇧⌘M |
| Edit | Move note to adjacent string | Ctrl+Alt+Up/Down | ⌥⌘↑/↓ |
| Edit | Force line break / Prevent line break / Multirest | Ctrl+Enter / Shift+& / Ctrl+R | ⌘↵ / & / ⌘R |
| Entry | Enter note / Chord / Rest / Text / Timer | Enter / A / R / T / @ | Return / A / R / T / @ |
| Entry | Tie note / Tie beat | L / Shift+L | L / ⇧L |
| Entry | Dot / Double dot | . / Ctrl+. | . / ⌘. |
| Entry | Triplet · Triplet feel · Free time | slash key (/) · Ctrl+/ · Alt+Shift+L | slash key (/) · ⌘/ · ⌥⇧L |
| Entry | Shorter / Longer duration (default) | + (=) / − (_) | + / − |
| Entry | Grace before beat / on beat | G / Ctrl+Alt+G | G / ⌥G |
| Entry | Sharp / Flat / Natural | Ctrl+9 / Ctrl+7 / Ctrl+8 | ⌘9 / ⌘7 / ⌘8 |
| Entry | Double sharp / Double flat / Change accidental | Ctrl+Alt+9 / Ctrl+Alt+7 / Ctrl+Alt+8 | ⌥⌘9 / ⌥⌘7 / ⌥⌘8 |
| Entry | Key signature / Time signature | Ctrl+K / Ctrl+T | ⌘K / ⌘T |
| Entry | Repeat open / Repeat close | [ / ] | [ / ] |
| Entry | One-bar repeat / Two-bar repeat | % / Ctrl+% | % / ⌘% |
| Entry | Directions / Fermata / Show expression text | D / F / (not listed) | D / F / ⇧⌘E |
| Articulation | Accent / Heavy accent / Staccato | ; / : / ! | ; / : / ! |
| Technique | Bend / Tremolo bar | B / Ctrl+Alt+V | B / ⌥V |
| Technique | Hammer-on/pull-off / Legato / Legato slide | H / Shift+H / S | H / ⇧H / S |
| Technique | Natural harmonic / Artificial harmonic | Y / Ctrl+Alt+Y | Y / ⌥Y |
| Technique | Dead note / Ghost note | X / O | X / O |
| Technique | Let ring / Palm mute (note) / Palm mute (beat) | I / P / Shift+P | i / P / ⇧P |
| Technique | Downstroke / Upstroke | Shift+D / Shift+U | ⇧D / ⇧U |
| Technique | Brush down / Brush up | Ctrl+D / Ctrl+U | ⌘D / ⌘U |
| Technique | Arpeggio down / Arpeggio up | Ctrl+Shift+D / Ctrl+Shift+U | ⇧⌘D / ⇧⌘U |
| Technique | Rasgueado / Trill / Barre | Shift+R / N / Shift+I | ⇧R / N / ⇧I |
| Technique | Left-hand vibrato (slight) / Bar vibrato slight / Bar vibrato wide | V / W / Ctrl+Alt+W | V / W / ⌥W |
| Technique | Fade in / Fade out / Volume swell | < / > / Alt+< | < / > / ⌥< |
| Technique | Wah open / Wah closed | Ctrl+Alt+O / Ctrl+Alt+C | ⌥O / ⌥C |
| Technique | Slap / Tapping / Left-hand tapping / Tremolo picking (32nd) | $ / ) / ( / " | $ / ) / ( / " |
| Navigate | Previous / Next beat; previous / next line | Left / Right; Up / Down | ← / →; ↑ / ↓ |
| Navigate | Bar start / bar end; first bar / last bar | Home / End; Ctrl+Home / Ctrl+End | ↖ / ↘; ⌘↖ / ⌘↘ |
| Navigate | Next / previous staff | Tab / Shift+Tab | ⇥ / ⇧⇥ |
| Navigate | Next / previous document tab | Ctrl+Tab / Ctrl+Shift+Tab | ⌃⇥ / ⌃⇧⇥ |
| Navigate | Next / previous track | Ctrl+Down / Ctrl+Up | ⌘↓ / ⌘↑ |
| Navigate | Next / previous section | Ctrl+Alt+Right / Left | ⌥⌘→ / ← |
| Navigate | Step forward / back (with sound); fast-forward / rewind | Alt+Right / Left; Ctrl+Right / Left | ⌥→ / ←; ⌘→ / ← |
| Select | Extend by beat / to first or last beat | Shift+Left/Right; Shift+Home/End | ⇧←/→; ⇧↖/↘ |
| Select | Extend by bar / to first or last bar | Ctrl+Shift+Left/Right; Ctrl+Shift+Home/End | ⇧⌘←/→; ⇧⌘↖/↘ |
| Playback | Play/pause / Play from start | Space / Ctrl+Space | Space / ⇧Space |
| Playback | Loop / Relative speed / Audio note settings | F9 / Ctrl+F9 / Shift+F | F9 / ⌘F9 / ⇧F |
| Playback | Speed −/+ during playback | − / + (8.0); _ / = (8.1.1) | same |
| View | Full screen / exit | F11 / Esc | ⌃⌘F / Esc |
| View | Zoom in / out | Ctrl++ / Ctrl+− | ⌘> / ⌘< (as listed) |
| View | Palette / Song inspector / Track inspector / Global view | F2 / F5 / F6 / F8 | F2 / F5 / F6 / F8 |
| View | Multitrack / Stylesheet / Instrument view / Design mode | F3 / F7 / Ctrl+F6 / Ctrl+Alt+D | F3 / F7 / ⌘F6 / ⌃⌥D |
| Tools | Command palette / Action list / Scale diagram / Check bar duration | Ctrl+E / (not listed) / Shift+S / F4 | ⌘E / ⌥⌘E / ⇧S / F4 |
