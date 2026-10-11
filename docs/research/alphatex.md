# alphaTex Reference for alphaTab 1.8.4

Reference for writing OpenTabz test fixtures in alphaTex, the text notation format of
[alphaTab](https://github.com/CoderLine/alphaTab) (`@coderline/alphatab@1.8.4`, MPL-2.0).

**Sources.** The authority is the alphaTab source at tag `v1.8.4`:

- the lexer, parser and importer in `packages/alphatab/src/importer/alphaTex/*` and `AlphaTexImporter.ts`,
- the language definitions in `packages/alphatex/src/**` (these also generate the LSP hover docs and the website docs),
- the importer, parser and exporter tests.

The pages at https://alphatab.net/docs/alphatex/ (which say 1.8.4) were read as a cross-check. Where the website and the code
disagree, this document follows the code and says so.

**Verification.** Every alphaTex snippet below is a test case in
`scratchpad/alphatex-verify/cases-*.mjs`. That folder installs `@coderline/alphatab@1.8.4` from npm and runs each snippet
through `alphaTab.importer.AlphaTexImporter` in Node. For each case it checks:

- which diagnostics are reported (canonical examples must produce none),
- the resulting data model (for example `note.isPalmMute === true` or `note.bendType === BendType.Release`).

Each example is followed by a line in italics that says what was asserted. Results of the last run:

- alphaTab package: `@coderline/alphatab@1.8.4` (npm), run under Node v24.21.0 on 2026-10-11
- **325 cases, 325 passed, 0 failed** (291 canonical, 10 legacy-with-diagnostics, 24 expected-failure cases)
- Every `alphatex` code block in this document is one of those cases and is re-imported again after the document is generated (see section 16).
- AlphaTexExporter round trip (export every passing case, re-import): 298/301 clean.
- API checks: 4/4 passed.

To re-run:

```
cd scratchpad/alphatex-verify
node verify.mjs && node verify-official-examples.mjs && node verify-website-examples.mjs && node build-doc.mjs
```

The last command regenerates this file.

Conventions used below:

- `fret.string`: the string number counts from the **first tuning entry** (string 1 is the highest string on a guitar).
- "Model" names the alphaTab data-model property that the construct sets (`Score`, `MasterBar`, `Bar`, `Beat`, `Note`, ...).
- Code blocks tagged `alphatex-invalid` show input that **fails** to import. They are verified too.

---

## Contents

1. [Quick start and golden rules](#1-quick-start-and-golden-rules)
2. [Lexical syntax and grammar](#2-lexical-syntax-and-grammar)
3. [File structure: score metadata](#3-file-structure-score-metadata)
4. [Tracks, staves and voices](#4-tracks-staves-and-voices)
5. [Staff metadata](#5-staff-metadata)
6. [Bar metadata (incl. sync points)](#6-bar-metadata)
7. [Beats](#7-beats)
8. [Beat properties (beat effects)](#8-beat-properties)
9. [Notes](#9-notes)
10. [Note properties (note effects)](#10-note-properties)
11. [Version history 1.6, 1.7, 1.8 and legacy syntax](#11-version-history-and-legacy-syntax)
12. [Diagnostics](#12-diagnostics)
13. [Traps and gotchas (verified)](#13-traps-and-gotchas)
14. [What alphaTex cannot express (vs. Guitar Pro)](#14-what-alphatex-cannot-express)
15. [Appendix: tables](#15-appendix-tables)
16. [Appendix: verification details](#16-appendix-verification-details)

---

## 1. Quick start and golden rules

A complete guitar fixture (5 bars, every bar exactly full, zero diagnostics):

```alphatex
\title "OpenTabz Guitar Fixture"
\artist "OpenTabz"
\tempo (96 "Moderato")
\track ("Electric Guitar" "E.Gt.") {instrument overdrivenGuitar color "#3366CC"}
\staff {score tabs}
\tuning (E4 B3 G3 D3 A2 E2) {label "Standard"}
\ts (4 4) \ks G \section "Intro"
:8 0.6{pm} 0.6{pm} 3.6{pm} 0.6{pm} 5.5{h} 7.5 5.5{sl} 7.5 |
(0.1 0.2 0.3 2.4 2.5 0.6).2{bd} (3.1 3.2 0.3 0.4 2.5 3.6).2{bu} |
\ro 7.3{b (0 4)}.4 -.3{b (4 0)}.4 5.3{v}.2 |
\ae (1) 12.1{nh}.4 12.2{nh}.4 12.3{nh}.2 |
\ae (2) \rc 2 3.3.8{tu 3} 5.3.8{tu 3} 7.3.8{tu 3} 0.6.4{d} r.8 r.4
```

_Verified (case `example.guitar`):_ a complete guitar fixture without any diagnostic. Checks: bars = 5; playbackInfo.program (overdrivenGuitar) = 29; section = "Intro"; release on tied note = BendType.Release; repeat = 2; ending 2 = 2; bar 1 is full (ticks) = 3840; bar 2 is full (ticks) = 3840; bar 3 is full (ticks) = 3840; bar 4 is full (ticks) = 3840; bar 5 is full (ticks) = 3840.

Drums, piano (two staves, two voices) and a vocal line with lyrics:

```alphatex
\title "Drum Groove"
\tempo 110
\track ("Drums" "Dr.") {instrument percussion}
\articulation defaults
\ts (4 4)
:8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatOpen |
:16 SnareHit * 4 HighTomHit * 4 MidTomHit * 4 LowTomHit * 4 |
(KickHit CrashHighHit).1
```

_Verified (case `example.drums`):_ a drum fixture: percussion track + default articulation names. Checks: percussion staff = true; playbackInfo.primaryChannel (9 = MIDI channel 10) = 9; 16 sixteenths = 16.

```alphatex
\title "Piano Fixture"
\track ("Piano" "Pno.") {instrument acousticGrandPiano}
\staff {score}
\ks D \ts (3 4)
\voice
F#5.4{dy mp} E5 D5 | A5.2{d fermata medium}
\voice
D4.2{d} | (D4 F#4).2{d}
\staff {score}
\clef F4
D3.4 A3 F#3 | D2.2{d}
```

_Verified (case `example.piano`):_ a two-staff, two-voice piano fixture. Checks: staves = 2; voices on staff 1 = 2; staff 2 clef = Clef.F4; fermata = FermataType.Medium; F#5 realValue = 78.

```alphatex
\title "Vocal Line"
\track ("Voice" "Vo.") {instrument voiceOohs}
\staff {score}
\lyrics "Twin-kle twin-kle lit-tle star"
\ts (4 4)
C4 C4 G4 G4 | A4 A4 G4.2
```

_Verified (case `example.vocal`):_ lyrics distributed over a melody. Checks: bar 2 syllables = ["lit-", "tle", "star"].

### Syntax at a glance

| Write                                                   | Meaning                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `3.3`                                                   | fret 3 on string 3 (string 1 = first `\tuning` value = highest string)            |
| `3.3.8`                                                 | the same, as an eighth note (`.8` also sets the duration for the following beats) |
| `(0.1 2.2 2.3).4`                                       | chord (several notes on one beat)                                                 |
| `r` / `r.2`                                             | rest                                                                              |
| `:16`                                                   | the following beats are 16ths                                                     |
| `C4` `F#3` `Bb5`                                        | pitched notes (C4 = MIDI 60)                                                      |
| `KickHit` / `"Kick (hit)"` / `(36)`                     | percussion articulation by name or id                                             |
| `x.6` / `-.3`                                           | dead note on string 6 / tie on string 3                                           |
| `7.3{b (0 4) v}`                                        | note properties in `{ }` right after the note                                     |
| `7.3{v}.4{tu 3 sd}`                                     | note properties, then `.duration`, then beat properties                           |
| `3.3.8 * 4`                                             | repeat the beat 4 times                                                           |
| `\|`                                                    | end of bar                                                                        |
| `\ts (3 4)` `\tempo 90` ...                             | metadata tags, written before the beats of a bar                                  |
| `\track ("Name" "Short") {...}` `\staff {...}` `\voice` | start a track / staff / voice                                                     |
| `// ...` `/* ... */`                                    | comments                                                                          |

```alphatex
:8 3.3{pm h}.8{tu 3 sd} 5.3 7.3{v}.4{tu 3 sd} | 7.3{b (0 4) v}.2 (0.1 2.2 2.3).4 r.4
```

_Verified (case `example.glance`):_ the inline snippets of the tables above, combined. Checks: note 1 pm + h = true; beat 1 tuplet = 3; beat 1 pick stroke = PickStroke.Down; beat 3 duration = Duration.Quarter; bar 2 bend = true; bar 2 vibrato = VibratoType.Slight.

### Golden rules for fixtures

Each rule comes from behavior verified in sections 13 and 14:

1. **Parenthesize every multi-value argument list**: `\ts (3 4)`, `\track ("Name" "Short")`, `\tuning (E4 B3 G3 D3 A2 E2)`,
   `\chord ("C" 0 1 0 2 3 x)`, `{tu (3 2)}`, `{b (0 4)}`, `{tr (5 16)}`. Without parentheses you get warnings
   (AT301/AT303). Worse, list-valued tags such as `\tuning` and `\chord` **greedily consume the following notes**, which
   are then silently lost.
2. **Note effects go before the duration, beat effects after it**: `3.3{pm h}.8{tu 3 sd}`. After `.8` only beat
   properties are accepted.
3. **Declare the instrument explicitly**: `\track ("Bass" "B") {instrument electricBassFinger}`. Use exactly the GM names
   from [15.2](#152-general-midi-instrument-names). An unknown name silently becomes program 0 (piano).
4. **Declare the tuning explicitly for stringed tracks**. Non-guitar programs have odd default tunings (see
   [15.3](#153-default-tunings-by-midi-program)), and `fret.string` on a program without strings fails.
5. **Drums**: `\track (...) {instrument percussion}` followed by `\articulation defaults`. After that, write names
   (`KickHit`) or ids (`(36)`). Never write `36.4`, because that means fret 36 on string 4.
6. **Do not use the old `.` separators**, and treat every warning as a test failure. Diagnostics are on the importer
   (`lexerDiagnostics`, `parserDiagnostics`, `semanticDiagnostics`).
7. **alphaTab does not check bar lengths**: an overfull or underfull bar imports silently. Validate durations in your own
   test harness if it matters.
8. One staff holds **one kind of note**: fretted (`3.3`), pitched (`C4`) or percussion (`KickHit` / `(36)`).

### Minimal loader (Node, no browser globals needed)

```js
import * as alphaTab from '@coderline/alphatab';

const importer = new alphaTab.importer.AlphaTexImporter();
importer.initFromString(tex, new alphaTab.Settings());
let score;
try {
  score = importer.readScore(); // throws on any Error-severity diagnostic
} catch (e) {
  // parser/lexer errors: UnsupportedFormatError whose .cause is AlphaTexErrorWithDiagnostics
  // semantic errors:     AlphaTexErrorWithDiagnostics thrown directly
}
const all = [
  ...importer.lexerDiagnostics.items,
  ...importer.parserDiagnostics.items,
  ...importer.semanticDiagnostics.items,
];
// severity: 0 = Hint, 1 = Warning, 2 = Error; code: number (e.g. 301 = AT301)
```

`alphaTab.importer.ScoreLoader.loadAlphaTex(tex, settings?)` is a one-line alternative. It does not give access to
non-error diagnostics, and it logs parse errors through `alphaTab.Logger`.

---

## 2. Lexical syntax and grammar

### 2.1 Tokens

| Element     | Rule                                                                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whitespace  | space, tab, CR, LF, VT; not significant except as a separator                                                                                                                                                                                                                                                               |
| Comments    | `// to end of line` and `/* block */`, allowed anywhere                                                                                                                                                                                                                                                                     |
| Strings     | `"..."` or `'...'`; may span lines; escapes `\\` `\"` `\'` `\n` `\r` `\t` (`\N` `\R` `\T` too) and `\uXXXX` (UTF-16 code unit; surrogate pairs combine). Any other escape is a lexer error (AT005)                                                                                                                          |
| Numbers     | integers, optional leading `-` (`-12`). Decimals (`0.5`, `-12.5`) are read only where a float is expected (`\tempo`, `\scale`, `\width`, `\spd`/`\sph`/`\spu`, `\sync` position, `fermata` length) or **inside `( )`**. Elsewhere, e.g. `{tempo 112.5}` or `{ah 2.4}`, the `.` breaks the parse, so write `{tempo (112.5)}` |
| Identifiers | any run of characters except whitespace and `/ " ' . : ( ) { } \| * \`. `-` and `#` are allowed inside (`C#4`, `triplet-8th`, `f#minor`). A token that starts with digits and continues with letters is an identifier (`15ma`, `8va`)                                                                                       |
| Tags        | `\name` (or `\\name`, convenient when copying from escaped JS strings). Tag names and property names are **case-insensitive**                                                                                                                                                                                               |
| Punctuation | `.` (fret.string.duration separator), `:` (duration change), `*` (beat multiplier), `\|` (bar end), `( )` (argument list / note group), `{ }` (property list)                                                                                                                                                               |

Strings and identifiers are interchangeable wherever a text value is expected (`\title Hello` = `\title "Hello"`).
Use quotes for anything with spaces or special characters.

```alphatex
// single-line comment
\title "Comments" /* block comment */
C4 /* between beats */ D4 // trailing comment
```

_Verified (case `syn.comments`):_ comments are ignored; title = "Comments", 2 beats. Checks: score.title = "Comments"; beat count = 2.

```alphatex
\title 'Single \'quoted\''
\subtitle "Tab\tNewline\nUnicode \u00E9 Backslash \\"
C4
```

_Verified (case `syn.strings`):_ single and double quotes; escapes `\'` `\"` `\t` `\n` `\uXXXX` `\\`. Checks: score.title = "Single 'quoted'"; score.subTitle = "Tab\tNewline\nUnicode é Backslash \\".

```alphatex
\title Hello
\artist "Two Words"
C4
```

_Verified (case `syn.ident-as-string`):_ an identifier may replace a single-word string (title = "Hello"). Checks: score.title = "Hello"; score.artist = "Two Words".

```alphatex
\TITLE "Case" \TS (3 4)
3.3{PM} 3.3{TXT "Hi"} 3.3
```

_Verified (case `syn.case-insensitive`):_ tags and property names are case-insensitive. Checks: score.title = "Case"; ts numerator = 3; note.isPalmMute = true; beat.text = "Hi".

```alphatex
\\title "Escaped tag"
C4
```

_Verified (case `syn.double-backslash`):_ `\\tag` (double backslash, e.g. copied from escaped JS strings) is accepted. Checks: score.title = "Escaped tag".

```alphatex
\tempo 112.5
\scale 0.75
C4
```

_Verified (case `syn.floats`):_ decimal numbers where a float is expected (tempo 112.5, scale 0.75). Checks: score.tempo = 112.5; masterBar.displayScale = 0.75.

```alphatex
3.3.2{tb (0 -4 0)} r
```

_Verified (case `syn.negative-numbers`):_ negative numbers in argument lists (whammy dip to -4 quarter tones). Checks: whammyBarPoints values = [0, -4, 0].

### 2.2 Arguments and properties

The language behaves like function calls:

- `\tag value`, or `\tag (value value ...)` for several values,
- `{prop value}`, or `{prop (value value ...)}`.

A single value may omit the parentheses. Several values **should** be parenthesized:

- without parentheses they still parse, but you get warning AT301 (metadata) or AT303 (properties),
- list-valued parameters are then read greedily (section 13).

```alphatex
\ts (3 4)
\title ("Parenthesized" "%TITLE%" center)
3.3{tu (3 2)} 3.3{tu 3} 3.3{tu 3}
```

_Verified (case `syn.arg-parens`):_ multiple arguments in `( )`; a single argument may omit them. Checks: ts numerator = 3; tupletNumerator = 3; tupletDenominator = 2.

### 2.3 Document structure

An alphaTex document is a flat **list of bars**. Each bar has:

- optional **metadata tags** (`\ts`, `\ks`, ... and also `\title`, `\track`, `\staff` ...),
- **beats**,
- an optional closing `|`.

Score-level tags (`\title` ...) are recognized at any position in the file. Writing them first is the convention.
Structural tags (`\track`, `\staff`, `\voice`) start new elements. Bar tags apply to the bar they precede and to the bars
after it where that makes sense (time signature, key, clef, triplet feel, ottava). Since 1.7 no `.` separators are
needed between header, content and sync points.

```alphatex
C4 D4 E4 F4 |
G4 A4 B4 C5 |
```

_Verified (case `syn.bars`):_ `|` ends a bar; a trailing `|` does not create an extra bar. Checks: masterBars.length = 2; bar 2 beat 4 = C5 (MIDI 72) = 72.

```alphatex
C4.1 | | C4.1
```

_Verified (case `syn.empty-bar`):_ `| |` produces an empty bar in between. Checks: masterBars.length = 3; bar 2 is empty = true.

```alphatex
C4.1 | | |
```

_Verified (case `syn.trailing-empty-bars`):_ empty bars at the END of the song are trimmed (write `r.1` to keep a bar). Checks: masterBars.length = 1.

```alphatex
C4.1 | r.1 | r.1
```

_Verified (case `syn.trailing-rest-bars`):_ bars that contain rests are kept. Checks: masterBars.length = 3.

```alphatex
\title "No dots needed"
C4 D4
\sync (0 0 0)
```

_Verified (case `syn.no-separator-dots`):_ score metadata, content and sync points need no `.` separators since 1.7. Checks: score.title = "No dots needed"; masterBar[0].syncPoints.length = 1.

### 2.4 Grammar (EBNF derived from `AlphaTexParser.ts` @ v1.8.4)

```ebnf
document     = { bar } ;
bar          = { metaData | "." } { beat } [ "|" ] ;          (* "." = legacy separator, hint AT400 *)
metaData     = tag [ arguments ] [ properties ]
             | "\chord" properties arguments ;                (* only \chord may put props first *)
tag          = ( "\" | "\\" ) identifier ;
arguments    = "(" { value | "(" { value } ")" } ")"         (* nested list only where a list is expected *)
             | value { value } ;                              (* unparenthesized: as many values as the
                                                                 tag's signature accepts -> AT301 if > 1 *)
value        = number | string | identifier ;
properties   = "{" { identifier [ arguments ] } "}" ;
beat         = durationChange
             | [ durationChange ] content [ "." duration ] [ "*" count ] [ properties ] [ "*" count ] ;
                                         (* "* count" before properties = pre-1.7 position, warning AT304 *)
durationChange = ":" duration [ properties ] ;               (* only {tu ...} allowed here *)
content      = "r" | note | "(" { note } ")" ;              (* "()" = beat without notes *)
note         = noteValue [ "." stringNumber ] [ properties ] ;
noteValue    = number          (* fret (if ".string" follows) or percussion articulation id *)
             | identifier      (* pitch like C#4, percussion name like KickHit, "x" dead, "-" tie *)
             | string ;        (* percussion name like "Snare (hit)" *)
duration     = "-4" | "-2" | "1" | "2" | "4" | "8" | "16" | "32" | "64" | "128" | "256" ;
```

The `.stringNumber` part is only parsed after a number, `x` or `-`. That is why `C4.8` means "C4, eighth note", while
`38.4` means "fret 38 on string 4".

Unknown metadata tags are a **fatal** parser error (AT204, parsing stops). Unknown properties are errors (AT205) that
the parser recovers from.

---

## 3. File structure: score metadata

All score tags can be placed anywhere, but by convention they go at the top. Text tags take
`value [template [textAlign]]`. The _template_ controls the rendered header/footer text and may use the placeholders
`%TITLE% %SUBTITLE% %ARTIST% %ALBUM% %WORDS% %WORDSMUSIC% %MUSIC% %TABBER% %COPYRIGHT%`. An empty template `""`
hides the element. _textAlign_ is `left | center | right`.

| Tag                                 | Arguments                                              | Model                                                  | Default display                                                                                            |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `\title`                            | `value [template [align]]`                             | `score.title` + `score.style.headerAndFooter[Title]`   | `%TITLE%`, center                                                                                          |
| `\subtitle`                         | same                                                   | `score.subTitle`                                       | `%SUBTITLE%`, center                                                                                       |
| `\artist`                           | same                                                   | `score.artist`                                         | `%ARTIST%`, center                                                                                         |
| `\album`                            | same                                                   | `score.album`                                          | `%ALBUM%`, center                                                                                          |
| `\words`                            | same                                                   | `score.words` (lyricist)                               | `Words by %WORDS%`, left                                                                                   |
| `\music`                            | same                                                   | `score.music` (composer)                               | `Music by %MUSIC%`, right                                                                                  |
| `\wordsAndMusic`                    | `template [align]` (no value)                          | style `WordsAndMusic`                                  | `Words & Music by %MUSIC%`, right                                                                          |
| `\copyright`                        | `value [template [align]]`                             | `score.copyright`                                      | `%COPYRIGHT%`, center                                                                                      |
| `\copyright2`                       | `template [align]` (no value)                          | style `CopyrightSecondLine`                            | "All Rights Reserved - International Copyright Secured", center                                            |
| `\tab`                              | `value [template [align]]`                             | `score.tab` (transcriber)                              | `Tabbed by %TABBER%`, right, **hidden unless a template is given**                                         |
| `\instructions`                     | `value`                                                | `score.instructions`                                   | not rendered                                                                                               |
| `\notices`                          | `value`                                                | `score.notices`                                        | not rendered                                                                                               |
| `\tempo`                            | see [6.6](#66-tempo)                                   | first bar's tempo -> `score.tempo`, `score.tempoLabel` | 120 BPM                                                                                                    |
| `\systemsLayout`                    | `(n n ...)`                                            | `score.systemsLayout`                                  | used for multi-track rendering with `display.systemsLayoutMode = UseModelLayout` (or the Parchment layout) |
| `\defaultSystemsLayout`             | `n`                                                    | `score.defaultSystemsLayout`                           | 3                                                                                                          |
| `\hideDynamics` / `\showDynamics`   | -                                                      | `stylesheet.hideDynamics`                              | shown                                                                                                      |
| `\useSystemSignSeparator`           | -                                                      | `stylesheet.useSystemSignSeparator`                    | off                                                                                                        |
| `\multiBarRest`                     | -                                                      | `stylesheet.multiTrackMultiBarRest`                    | off (multi-track rendering)                                                                                |
| `\bracketExtendMode`                | `noBrackets \| groupStaves \| groupSimilarInstruments` | `stylesheet.bracketExtendMode`                         | groupStaves                                                                                                |
| `\singleTrackTrackNamePolicy`       | `hidden \| firstSystem \| allSystems`                  | `stylesheet.singleTrackTrackNamePolicy`                | firstSystem                                                                                                |
| `\multiTrackTrackNamePolicy`        | same                                                   | `stylesheet.multiTrackTrackNamePolicy`                 | firstSystem                                                                                                |
| `\firstSystemTrackNameMode`         | `fullName \| shortName`                                | `stylesheet.firstSystemTrackNameMode`                  | shortName                                                                                                  |
| `\otherSystemsTrackNameMode`        | `fullName \| shortName`                                | `stylesheet.otherSystemsTrackNameMode`                 | shortName                                                                                                  |
| `\firstSystemTrackNameOrientation`  | `horizontal \| vertical`                               | `stylesheet.firstSystemTrackNameOrientation`           | vertical                                                                                                   |
| `\otherSystemsTrackNameOrientation` | `horizontal \| vertical`                               | `stylesheet.otherSystemsTrackNameOrientation`          | vertical                                                                                                   |
| `\extendBarLines`                   | -                                                      | `stylesheet.extendBarLines`                            | off                                                                                                        |
| `\chordDiagramsInScore`             | `[true \| false]`                                      | `stylesheet.globalDisplayChordDiagramsInScore`         | off                                                                                                        |
| `\hideEmptyStaves`                  | -                                                      | `stylesheet.hideEmptyStaves`                           | off                                                                                                        |
| `\hideEmptyStavesInFirstSystem`     | -                                                      | `stylesheet.hideEmptyStavesInFirstSystem`              | off                                                                                                        |
| `\showSingleStaffBrackets`          | -                                                      | `stylesheet.showSingleStaffBrackets`                   | off                                                                                                        |
| `\defaultBarNumberDisplay`          | `allBars \| firstOfSystem \| hide`                     | `stylesheet.barNumberDisplay`                          | allBars                                                                                                    |

Note the spelling: it is `\otherSystems...` with an **s**, while the source file is named
`othersystemtracknamemode.ts`. Enumeration values are case-insensitive and may be written as strings.

### 3.1 Song information

```alphatex
\title "Song Title"
C4
```

_Verified (case `score.title`):_ score.title. Checks: score.title = "Song Title".

```alphatex
\title ("Song Title" "Title: %TITLE%" left)
C4
```

_Verified (case `score.title-template`):_ value + header template + alignment (left|center|right). Checks: score.title = "Song Title"; Title template = "Title: %TITLE%"; Title textAlign = ScoreSubElement.Title; Title isVisible = true.

```alphatex
\title ("Hidden Title" "")
C4
```

_Verified (case `score.title-hidden`):_ an empty template hides the element (style.isVisible = false). Checks: score.title = "Hidden Title"; Title isVisible = false.

```alphatex
\subtitle "Live in Berlin"
C4
```

_Verified (case `score.subtitle`):_ score.subTitle. Checks: score.subTitle = "Live in Berlin".

```alphatex
\artist "The Band"
C4
```

_Verified (case `score.artist`):_ score.artist. Checks: score.artist = "The Band".

```alphatex
\album "First Album"
C4
```

_Verified (case `score.album`):_ score.album. Checks: score.album = "First Album".

```alphatex
\words "Lyricist Name"
C4
```

_Verified (case `score.words`):_ score.words (lyrics author). Checks: score.words = "Lyricist Name".

```alphatex
\music "Composer Name"
C4
```

_Verified (case `score.music`):_ score.music (composer). Checks: score.music = "Composer Name".

```alphatex
\words "Jane Doe"
\music "Jane Doe"
\wordsAndMusic ("Words & Music by %MUSIC%" right)
C4
```

_Verified (case `score.wordsandmusic`):_ template-only tag (no value) for the combined words+music line. Checks: WordsAndMusic template = "Words & Music by %MUSIC%"; WordsAndMusic textAlign = TextAlign.Right.

```alphatex
\copyright "2026 OpenTabz"
C4
```

_Verified (case `score.copyright`):_ score.copyright. Checks: score.copyright = "2026 OpenTabz".

```alphatex
\copyright2 ("All Rights Reserved" center)
C4
```

_Verified (case `score.copyright2`):_ template-only tag for the second copyright line. Checks: CopyrightSecondLine template = "All Rights Reserved"; CopyrightSecondLine textAlign = TextAlign.Center.

```alphatex
\tab ("Transcriber Name" "Tabbed by %TABBER%")
C4
```

_Verified (case `score.tab`):_ score.tab (transcriber); hidden by default, a template makes it visible. Checks: score.tab = "Transcriber Name"; Transcriber isVisible = true.

```alphatex
\instructions "Play with swing feel"
C4
```

_Verified (case `score.instructions`):_ score.instructions (stored, not rendered). Checks: score.instructions = "Play with swing feel".

```alphatex
\notices "Fixture for OpenTabz tests"
C4
```

_Verified (case `score.notices`):_ score.notices (stored, not rendered). Checks: score.notices = "Fixture for OpenTabz tests".

```alphatex
\tempo (90 "Andante")
C4
```

_Verified (case `score.tempo`):_ initial tempo + label (bar metadata on bar 1 -> score.tempo/tempoLabel). Checks: score.tempo = 90; score.tempoLabel = "Andante".

### 3.2 Layout and stylesheet options

```alphatex
\systemsLayout (2 3)
\track "A"
C4.1 | C4.1 | C4.1 | C4.1 | C4.1
\track "B"
C4.1 | C4.1 | C4.1 | C4.1 | C4.1
```

_Verified (case `score.systemslayout`):_ bars per system for multi-track rendering (needs display.systemsLayoutMode = UseModelLayout). Checks: score.systemsLayout = [2, 3].

```alphatex
\defaultSystemsLayout 4
C4
```

_Verified (case `score.defaultsystemslayout`):_ score.defaultSystemsLayout. Checks: score.defaultSystemsLayout = 4.

```alphatex
\hideDynamics
C4{dy ff}
```

_Verified (case `score.hidedynamics`):_ stylesheet.hideDynamics = true. Checks: hideDynamics = true.

```alphatex
\hideDynamics
\showDynamics
C4{dy ff}
```

_Verified (case `score.showdynamics`):_ stylesheet.hideDynamics = false (the default). Checks: hideDynamics = false.

```alphatex
\useSystemSignSeparator
\track "A" C4
\track "B" C4
```

_Verified (case `score.usesystemsignseparator`):_ stylesheet.useSystemSignSeparator. Checks: useSystemSignSeparator = true.

```alphatex
\multiBarRest
\track "A" C4.1 | r.1 | r.1 | C4.1
\track "B" C4.1 | r.1 | r.1 | C4.1
```

_Verified (case `score.multibarrest`):_ stylesheet.multiTrackMultiBarRest (multi-track rendering). Checks: multiTrackMultiBarRest = true.

```alphatex
\bracketExtendMode groupSimilarInstruments
C4
```

_Verified (case `score.bracketextendmode`):_ noBrackets | groupStaves (default) | groupSimilarInstruments. Checks: bracketExtendMode = BracketExtendMode.GroupSimilarInstruments.

```alphatex
\singleTrackTrackNamePolicy allSystems
C4
```

_Verified (case `score.singletracktracknamepolicy`):_ hidden | firstSystem (default) | allSystems. Checks: singleTrackTrackNamePolicy = TrackNamePolicy.AllSystems.

```alphatex
\multiTrackTrackNamePolicy hidden
C4
```

_Verified (case `score.multitracktracknamepolicy`):_ hidden | firstSystem (default) | allSystems. Checks: multiTrackTrackNamePolicy = TrackNamePolicy.Hidden.

```alphatex
\firstSystemTrackNameMode fullName
C4
```

_Verified (case `score.firstsystemtracknamemode`):_ fullName | shortName (default). Checks: firstSystemTrackNameMode = TrackNameMode.FullName.

```alphatex
\otherSystemsTrackNameMode fullName
C4
```

_Verified (case `score.othersystemstracknamemode`):_ fullName | shortName (default). Checks: otherSystemsTrackNameMode = TrackNameMode.FullName.

```alphatex
\firstSystemTrackNameOrientation horizontal
C4
```

_Verified (case `score.firstsystemtracknameorientation`):_ horizontal | vertical (default). Checks: firstSystemTrackNameOrientation = TrackNameOrientation.Horizontal.

```alphatex
\otherSystemsTrackNameOrientation horizontal
C4
```

_Verified (case `score.othersystemstracknameorientation`):_ horizontal | vertical (default). Checks: otherSystemsTrackNameOrientation = TrackNameOrientation.Horizontal.

```alphatex
\extendBarLines
\track "A" C4
\track "B" C4
```

_Verified (case `score.extendbarlines`):_ stylesheet.extendBarLines. Checks: extendBarLines = true.

```alphatex
\chordDiagramsInScore
\chord ("E" 0 0 1 2 2 0)
(0.1 0.2 1.3 2.4 2.5 0.6){ch "E"}
```

_Verified (case `score.chorddiagramsinscore`):_ stylesheet.globalDisplayChordDiagramsInScore = true (optional arg true|false). Checks: globalDisplayChordDiagramsInScore = true.

```alphatex
\chordDiagramsInScore false
C4
```

_Verified (case `score.chorddiagramsinscore-false`):_ explicit false. Checks: globalDisplayChordDiagramsInScore = false.

```alphatex
\hideEmptyStaves
\track "A" C4.1 | C4.1
\track "B" r.1 | C4.1
```

_Verified (case `score.hideemptystaves`):_ stylesheet.hideEmptyStaves. Checks: hideEmptyStaves = true.

```alphatex
\hideEmptyStaves
\hideEmptyStavesInFirstSystem
C4
```

_Verified (case `score.hideemptystavesinfirstsystem`):_ stylesheet.hideEmptyStavesInFirstSystem. Checks: hideEmptyStavesInFirstSystem = true.

```alphatex
\showSingleStaffBrackets
C4
```

_Verified (case `score.showsinglestaffbrackets`):_ stylesheet.showSingleStaffBrackets. Checks: showSingleStaffBrackets = true.

```alphatex
\defaultBarNumberDisplay firstOfSystem
C4
```

_Verified (case `score.defaultbarnumberdisplay`):_ allBars (default) | firstOfSystem | hide. Checks: stylesheet.barNumberDisplay = BarNumberDisplay.FirstOfSystem.

---

## 4. Tracks, staves and voices

The hierarchy is `Score -> Track -> Staff -> Bar -> Voice -> Beat -> Note`. A first track, staff and voice exist
implicitly. Use `\track`, `\staff` and `\voice` only to start **additional** ones, or to attach names and properties to
the first one. Each new `\track` or `\staff` restarts at bar 1. Missing bars are padded with empty bars, so staves do not
need equal bar counts.

**Defaults of an implicit or new track:** program 25 (Acoustic Guitar Steel), standard 6-string tuning `E4 B3 G3 D3 A2 E2`,
standard notation and tablature, display transposition -12 (guitar music is written an octave higher than it sounds),
volume 15, balance 8, MIDI channels 0/1 (track 2 gets 2/3, and so on).

```alphatex
3.3 5.3 7.3 8.3
```

_Verified (case `struct.implicit`):_ no `\track`/`\staff`/`\voice` needed: 1 track, 1 staff, 1 voice; default = steel guitar (program 25), standard tuning. Checks: tracks = 1; staves = 1; program = 25; tuning = [64, 59, 55, 50, 45, 40].

### 4.1 `\track`

Syntax: `\track [("name" ["shortName"])] [{properties}]`. The short name defaults to the first 10 characters of the name.

| Track property         | Arguments                                                                          | Model                                           | Notes                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `color`                | `"#RGB" \| "#RGBA" \| "#RRGGBB" \| "#RRGGBBAA" \| "rgb(r,g,b)" \| "rgba(r,g,b,a)"` | `track.color`                                   | UI color only (does not color notation). CSS names like `"red"` silently give `null`                                                   |
| `instrument`           | `0-127` \| GM name (string or identifier) \| `percussion`                          | `track.playbackInfo.program`                    | names: case-insensitive, spaces ignored, see [15.2](#152-general-midi-instrument-names). `percussion` = channel 10 + percussion staves |
| `bank`                 | `n`                                                                                | `track.playbackInfo.bank`                       | MIDI bank (soundfont must have it)                                                                                                     |
| `volume`               | `0-16`                                                                             | `track.playbackInfo.volume`                     | default 15                                                                                                                             |
| `balance`              | `0-16`                                                                             | `track.playbackInfo.balance`                    | 8 = center                                                                                                                             |
| `mute`                 | -                                                                                  | `playbackInfo.isMute`                           |                                                                                                                                        |
| `solo`                 | -                                                                                  | `playbackInfo.isSolo`                           |                                                                                                                                        |
| `multiBarRest`         | -                                                                                  | `stylesheet.perTrackMultiBarRest` has the track | when this track renders alone                                                                                                          |
| `systemsLayout`        | `(n n ...)`                                                                        | `track.systemsLayout`                           | bars per system, single-track rendering                                                                                                |
| `defaultSystemsLayout` | `n`                                                                                | `track.defaultSystemsLayout`                    | default 3                                                                                                                              |

```alphatex
\track ("Lead Guitar" "Gtr.")
3.3 5.3
```

_Verified (case `struct.track`):_ track name + short name. Checks: track.name = "Lead Guitar"; track.shortName = "Gtr.".

```alphatex
\track "Only A Long Name"
3.3
```

_Verified (case `struct.track-shortname-default`):_ short name defaults to the first 10 characters of the name. Checks: track.shortName = "Only A Lon".

```alphatex
\track "Guitar"
3.3 5.3 7.3 8.3
\track "Bass" {instrument electricBassFinger}
3.4 5.4 7.4 8.4
```

_Verified (case `struct.multi-track`):_ a new `\track` starts a new track (bars restart at bar 1). Checks: tracks = 2; masterBars = 1; bass program = 33; bass default tuning G2 D2 A1 E1 = [43, 38, 33, 28].

```alphatex
\track "Rhythm" {
    color "#FF8800"
    volume 12
    balance 4
    mute
    solo
}
3.3
```

_Verified (case `struct.track-props`):_ track properties color / volume (0-16) / balance (0-16, 8=center) / mute / solo. Checks: track.color = "#FF8800"; volume = 12; balance = 4; isMute = true; isSolo = true.

```alphatex
\track "Organ" {instrument 19}
C4
```

_Verified (case `struct.track-instrument-number`):_ instrument as GM program number 0-127. Checks: program = 19.

```alphatex
\track "Nylon" {instrument "Acoustic Guitar Nylon"}
3.3
```

_Verified (case `struct.track-instrument-name`):_ instrument as GM name (case-insensitive, spaces ignored). Checks: program = 24.

```alphatex
\track "Dist" {instrument distortionGuitar}
3.3
```

_Verified (case `struct.track-instrument-ident`):_ instrument as identifier. Checks: program = 30.

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
KickHit SnareHit
```

_Verified (case `struct.track-instrument-percussion`):_ percussion track (MIDI channel 10 = index 9). Checks: primaryChannel = 9; staff.isPercussion = true.

```alphatex
\track "Piano" {instrument electricPiano1 bank 2}
C4
```

_Verified (case `struct.track-bank`):_ MIDI bank (soundfont must provide it). Checks: program = 4; bank = 2.

```alphatex
\track "A" {multiBarRest}
C4.1 | r.1 | r.1 | C4.1
```

_Verified (case `struct.track-multibarrest`):_ multibar rests for this track when rendered alone. Checks: stylesheet.perTrackMultiBarRest has track 0 = true.

```alphatex
\track "A" {systemsLayout (2 3) defaultSystemsLayout 4}
C4.1 | C4.1 | C4.1 | C4.1 | C4.1
```

_Verified (case `struct.track-systemslayout`):_ per-track system layout (bars per line) used when this track renders alone. Checks: track.systemsLayout = [2, 3]; track.defaultSystemsLayout = 4.

### 4.2 `\staff`

Syntax: `\staff [{score [lineCount] | tabs | slash | numbered}]`. Without properties (or with `{}`) the staff shows
**standard notation + tablature**. Once any property is given, only the listed notations are shown. Tablature only
renders for staves that have strings, so a pitched or percussion staff never shows tabs (see trap
`trap.tabs-on-pitched`).

```alphatex
\staff
3.3
```

_Verified (case `struct.staff-default`):_ no properties = standard notation + tablature. Checks: showStandardNotation = true; showTablature = true.

```alphatex
\staff {score}
3.3
```

_Verified (case `struct.staff-score`):_ standard notation only. Checks: showStandardNotation = true; showTablature = false.

```alphatex
\staff {tabs}
3.3
```

_Verified (case `struct.staff-tabs`):_ tablature only. Checks: showStandardNotation = false; showTablature = true.

```alphatex
\staff {tabs slash}
3.3
```

_Verified (case `struct.staff-slash`):_ slash notation (+ tabs). Checks: showSlash = true; showTablature = true; showStandardNotation = false.

```alphatex
\staff {score numbered}
C4 D4 E4 F4
```

_Verified (case `struct.staff-numbered`):_ numbered notation (Jianpu). Checks: showNumbered = true; showStandardNotation = true.

```alphatex
\staff {score 3}
C4
```

_Verified (case `struct.staff-score-lines`):_ `score N` sets the number of standard-notation staff lines. Checks: standardNotationLineCount = 3.

```alphatex
\track "Piano" {instrument acousticGrandPiano}
\staff {score}
C5 D5 E5 F5
\staff {score}
\clef F4
C3 D3 E3 F3
```

_Verified (case `struct.grand-staff`):_ two staves in one track (right hand / left hand). Checks: staves = 2; staff 2 clef = Clef.F4; staff 2 first note C3 (MIDI 48) = 48.

### 4.3 `\voice` and `\voiceMode`

- **Staff-wise (default):** write all bars of voice 1, then `\voice` and all bars of voice 2 starting again at bar 1,
  and so on.
- **Bar-wise:** `\voiceMode barWise` (a bar tag, effective from where it appears). Inside each bar write
  `\voice ...beats... \voice ...beats...` and close the bar with `|`.

The first `\voice` may be omitted. The importer has no voice limit (5+ voices parse). Guitar Pro supports 4, so stay at
4 or fewer for portability. A tuplet started with `:N {tu ...}` is reset when a new voice starts.

```alphatex
\voice
C5.2 D5.2 | E5.1
\voice
C4.1 | C4.1
```

_Verified (case `struct.voices-2`):_ staff-wise voices (default): all bars of voice 1, then all bars of voice 2. Checks: bar 1 voices = 2; bar 2 voices = 2; voice 2 bar 1 = C4 = 60; voice 1 bar 2 = E5 = 76.

```alphatex
\voice C5.1 | C5.1
\voice A4.1 | A4.1
\voice E4.1 | E4.1
\voice C4.1 | C4.1
```

_Verified (case `struct.voices-4`):_ four voices (alphaTex itself has no voice limit; 4 matches Guitar Pro). Checks: bar 1 voices = 4; bar 2 voices = 4; voice 4 bar 2 = C4 = 60.

```alphatex
C5.1 | D5.1
\voice
C4.1 | D4.1
```

_Verified (case `struct.voices-implicit-first`):_ the first `\voice` may be omitted. Checks: voices = 2; voice 2 bar 2 = D4 = 62.

```alphatex
\voiceMode staffWise
\voice C5.1 | D5.1
\voice C4.1 | D4.1
```

_Verified (case `struct.voicemode-staffwise`):_ `\voiceMode staffWise` is the default. Checks: bar 2 voice 2 = D4 = 62.

```alphatex
\voiceMode barWise
\voice C5.1 \voice C4.1 |
\voice D5.1 \voice D4.1
```

_Verified (case `struct.voicemode-barwise`):_ `\voiceMode barWise`: voices are written per bar. Checks: bar 1 voices = 2; bar 1 voice 2 = C4 = 60; bar 2 voice 2 = D4 = 62.

```alphatex
\track ("Guitar" "Gt")
    \staff {score tabs}
        \voice 3.3.2 5.3.2 | 7.3.1
        \voice 0.6.1 | 0.6.1
    \staff {score}
        \tuning (E4 B3 G3 D3 A2 E2)
        3.3.1 | 3.3.1
\track "Vocals" {instrument voiceOohs}
    \staff {score}
        C4.1 | D4.1
```

_Verified (case `struct.track-staff-voice-full`):_ complete hierarchy: track -> staves -> voices. Checks: tracks = 2; track 1 staves = 2; track 1 staff 1 voices = 2; vocals program = 53.

---

## 5. Staff metadata

These tags configure the **current staff**. Write them after `\track`/`\staff` and before the first beat of that staff.

| Tag                 | Arguments                                                                                                                                                                                             | Model                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `\tuning`           | `(pitch pitch ...)` from string 1 down, or `(piano)` / `(none)` / `(voice)` for non-stringed; props `{label "text" hide}`                                                                             | `staff.stringTuning.tunings` (MIDI), `.name`; `stylesheet.perTrackDisplayTuning` |
| `\capo`             | `fret`                                                                                                                                                                                                | `staff.capo`                                                                     |
| `\transpose`        | `semitones`                                                                                                                                                                                           | `staff.transpositionPitch = -semitones` (audio + display)                        |
| `\displayTranspose` | `semitones`                                                                                                                                                                                           | `staff.displayTranspositionPitch = -semitones` (display only)                    |
| `\chord`            | `("name" v1 v2 ... vn)` one value per string, `x` = muted; props `{firstFret n barre (frets...) showDiagram showFingering showName}` (bool: `true/false`, `"true"/"false"`, `1/0` or no value = true) | `staff.chords`, used via beat property `ch`                                      |
| `\lyrics`           | `"text"` or `(startBar "text")`; repeat for more lines                                                                                                                                                | `beat.lyrics[line]` of staff 1 / voice 1                                         |
| `\articulation`     | `defaults` or `("name" id)`                                                                                                                                                                           | names usable as percussion notes                                                 |
| `\instrument`       | as the track property (deprecated tag form)                                                                                                                                                           | `track.playbackInfo.program`                                                     |
| `\accidentals`      | `auto \| explicit` (a bar tag; switches the mode for **all following notes of the file**, later tracks included)                                                                                      | spelling mode for pitched notes                                                  |

### 5.1 `\tuning`

Pitches use the [pitched note syntax](#92-pitched-notes) (`E4`, `F#3`, `Bb1` ...). The number of values is the number of
strings, and string 1 is the first value. **Always use parentheses** (see trap `trap.tuning-swallow`).

```alphatex
\tuning (E4 B3 G3 D3 A2 D2)
0.6 2.6 0.1
```

_Verified (case `staff.tuning`):_ tuning listed from string 1 (highest) to the lowest string; here Drop D. Checks: staff.tuning (MIDI) = [64, 59, 55, 50, 45, 38]; string 6 open = D2 (38) = 38.

```alphatex
\tuning (E4 B3 G3 D3 A2 E2 B1)
0.7
```

_Verified (case `staff.tuning-7`):_ 7-string guitar (string count = number of tuning values). Checks: tuning length = 7; string 7 open = B1 = 35.

```alphatex
\track "Bass" {instrument electricBassFinger}
\tuning (G2 D2 A1 E1)
0.4 3.4
```

_Verified (case `staff.tuning-bass`):_ 4-string bass. Checks: tuning = [43, 38, 33, 28]; open E1 = 28.

```alphatex
\tuning (D4 A3 F#3 D3 A2 D2) {label "Open D" hide}
0.1
```

_Verified (case `staff.tuning-props`):_ tuning properties: label (shown name) and hide (do not print the tuning). Checks: stringTuning.name = "Open D"; perTrackDisplayTuning[0] = false; F#3 = 54 = 54.

```alphatex
\track "Piano" {instrument acousticGrandPiano}
\tuning (piano)
C4 E4 G4
```

_Verified (case `staff.tuning-pitched`):_ `piano` / `none` / `voice` mark a non-stringed (pitched) staff. Use parentheses! Checks: staff.tuning.length = 0; C4 = 60.

```alphatex
\track "Synth" {instrument lead1Square}
\tuning (none)
C4 E4
\track "Choir" {instrument choirAahs}
\tuning (voice)
C4 E4
```

_Verified (case `staff.tuning-none-voice`):_ `none` and `voice` behave like `piano`: a pitched staff without strings. Checks: track 1 strings = 0; track 2 strings = 0; track 2 E4 = 64.

### 5.2 `\capo`, `\transpose`, `\displayTranspose`

```alphatex
\capo 3
0.1
```

_Verified (case `staff.capo`):_ staff.capo (fret). Checks: staff.capo = 3.

```alphatex
\transpose -2
C4
```

_Verified (case `staff.transpose`):_ transposes audio and display by N semitones (model stores the negated value). Checks: staff.transpositionPitch = 2.

```alphatex
\track "Guitar" {instrument acousticGuitarSteel}
\displayTranspose 0
3.3
```

_Verified (case `staff.displaytranspose`):_ display-only transposition; guitars/basses default to -12 (octave-down written), 0 disables it. Checks: staff.displayTranspositionPitch = 0.

```alphatex
\track "Guitar" {instrument acousticGuitarSteel}
3.3
```

_Verified (case `staff.displaytranspose-default`):_ guitar programs (24-39, 43) get displayTranspositionPitch -12 automatically. Checks: staff.displayTranspositionPitch = -12.

### 5.3 `\chord` (chord diagrams)

Define chords after the tuning. The `ch` beat property links a beat to the chord by name: it shows the name above the
beat and lists the diagram. Diagrams render inline with `\chordDiagramsInScore`. The notes of the beat still have to be
written.

```alphatex
\chord ("C" 0 1 0 2 3 x)
(0.1 1.2 0.3 2.4 3.5){ch "C"}
```

_Verified (case `staff.chord`):_ chord diagram: one value per string from string 1; `x` = not played. Checks: chord.name = "C"; chord.strings = [0, 1, 0, 2, 3, -1]; showDiagram = true.

```alphatex
\chord ("F" 1 1 2 3 3 1) {firstFret 1 barre 1 showDiagram true showFingering false showName true}
\chord ("Bb" x 3 3 3 1 x) {firstFret 1 barre (1 3)}
(1.1 1.2 2.3 3.4 3.5 1.6){ch "F"} (3.2 3.3 3.4 1.5){ch "Bb"}
```

_Verified (case `staff.chord-props`):_ chord properties firstFret / barre (frets) / showDiagram / showFingering / showName. Checks: F.firstFret = 1; F.barreFrets = [1]; F.showFingering = false; Bb.barreFrets = [1, 3]; Bb.strings = [-1, 3, 3, 3, 1, -1].

```alphatex
(0.1 2.2 2.3 2.4 0.5){ch "A"}
```

_Verified (case `staff.chord-name-only`):_ `ch` without a `\chord` definition = chord name only (no diagram). Checks: chord.name = "A"; showDiagram = false.

### 5.4 `\lyrics`

How the text is split (Guitar Pro rules):

- spaces separate syllables,
- `-` ends a syllable (the dash stays on the first part),
- `+` joins words onto one beat,
- trailing `_` are trimmed,
- `[...]` is a comment (put the next syllable directly after `]`).

The syllables go onto the beats of **staff 1, voice 1** of the track, skipping rests. `startBar` is 0-based. For exact
per-beat text use the beat property [`lyrics`](#83-text-chords-lyrics-grace-notes).

```alphatex
\lyrics "Hel-lo my dear+friend"
C4 C4 r C4 C4
```

_Verified (case `staff.lyrics`):_ lyrics spread over the beats of voice 1 (rests skipped); `-` splits syllables, `+` keeps words on one beat. Checks: beat 1 = "Hel-"; beat 2 = "lo"; beat 3 (rest) lyrics = null; beat 4 = "my"; beat 5 (+ joins) = "dear friend".

```alphatex
\lyrics (1 "Starts in bar two")
C4.1 | C4 C4 C4 C4
```

_Verified (case `staff.lyrics-startbar`):_ `(startBar "text")` - startBar is 0-based. Checks: bar 1 lyrics = null; bar 2 beat 1 = "Starts".

```alphatex
\lyrics "First verse"
\lyrics "Second verse"
C4 C4
```

_Verified (case `staff.lyrics-verses`):_ repeat `\lyrics` for multiple lines (verses). Checks: beat 1 lyric lines = ["First", "Second"].

```alphatex
\lyrics "[Verse 1]Do Re"
C4 D4
```

_Verified (case `staff.lyrics-comment`):_ `[...]` is a comment inside lyrics (put the first syllable directly after `]`). Checks: beat 1 = "Do".

### 5.5 `\articulation` (drum/percussion names)

`\articulation defaults` registers all built-in names ([15.1](#151-percussion-articulations)).
`\articulation ("Name" id)` maps your own name to a built-in articulation id. alphaTex cannot define new articulations
(note head, staff line, sound).

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
(KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed
```

_Verified (case `staff.articulation-defaults`):_ registers the built-in drum articulation names. Checks: KickHit -> MIDI 35 = 35; SnareHit -> MIDI 38 = 38.

```alphatex
\track "Drums" {instrument percussion}
\articulation ("Kick" 36)
\articulation ("Snare" 38)
Kick Snare Kick Snare
```

_Verified (case `staff.articulation-custom`):_ custom name -> built-in articulation id. Checks: Kick -> 36 = 36; Snare -> 38 = 38.

### 5.6 `\instrument` (deprecated tag form) and `\accidentals`

```alphatex
\instrument 30
3.3
```

_Verified (case `staff.instrument-tag`):_ legacy staff-level tag, prefer `\track {instrument ...}`. Checks: program = 30.

```alphatex
\accidentals explicit
C#4 Db4 F##4
```

_Verified (case `staff.accidentals-explicit`):_ `explicit` (default): accidentals as written. Checks: C#4 = NoteAccidentalMode.ForceSharp; Db4 = NoteAccidentalMode.ForceFlat; F##4 = NoteAccidentalMode.ForceDoubleSharp.

```alphatex
\accidentals auto
C#4 Db4 F##4
```

_Verified (case `staff.accidentals-auto`):_ `auto`: accidentals derived from pitch; written spelling ignored. Checks: C#4 accidentalMode = NoteAccidentalMode.Default; F##4 accidentalMode = NoteAccidentalMode.Default.

```alphatex
\track "A"
\accidentals auto
C#4
\track "B"
C#4
```

_Verified (case `staff.accidentals-scope`):_ `\accidentals` is importer state: it stays active for all following notes, later tracks included. Checks: track B note = NoteAccidentalMode.Default.

---

## 6. Bar metadata

Bar tags are written before the beats of the bar they belong to. Two scopes exist:

- **MasterBar** tags (`\ts`, `\tempo`, `\ro`, `\rc`, `\ae`, `\section`, `\jump`, `\ft`, `\tf`, `\ac`, `\beaming`,
  `\width`, `\scale`, `\sync`) are shared by all tracks. Write them once, in the first track and staff. Writing them in
  another track changes the same master bar.
- **Bar** tags (`\clef`, `\ottava`, `\ks`, `\simile`, `\barlineLeft/Right`, `\spd/\sph/\spu`, `\barNumberDisplay`) belong
  to the current staff only.

`\ts`, `\tf`, `\ks`, `\clef` and `\ottava` carry over to following bars until changed.

| Tag                              | Arguments                                                                          | Model                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `\ts`                            | `(numerator denominator)` (1-32 / 1,2,4,...,128) or `common`                       | `masterBar.timeSignatureNumerator/Denominator/Common`     |
| `\ks`                            | key name, see 6.2                                                                  | `bar.keySignature`, `bar.keySignatureType`                |
| `\clef`                          | `G2 F4 C3 C4 Neutral`, aliases `treble bass alto tenor n`, numbers `43 65 48 60 0` | `bar.clef`                                                |
| `\ottava`                        | `15ma 8va regular 8vb 15mb`                                                        | `bar.clefOttava`                                          |
| `\tempo`                         | `bpm` \| `(bpm "label")` \| `(bpm "label" ratioPosition [hide])`                   | `masterBar.tempoAutomations[]`                            |
| `\section`                       | `"text"` \| `("marker" "text")`                                                    | `masterBar.section`                                       |
| `\ro`                            | -                                                                                  | `masterBar.isRepeatStart`                                 |
| `\rc`                            | `count` (total number of plays)                                                    | `masterBar.repeatCount`                                   |
| `\ae`                            | `n` \| `(n n ...)`, 1-31                                                           | `masterBar.alternateEndings` (bit mask, bit 0 = ending 1) |
| `\jump`                          | one of 19 directions (6.8)                                                         | `masterBar.directions`                                    |
| `\ft`                            | -                                                                                  | `masterBar.isFreeTime`                                    |
| `\tf`                            | triplet feel (6.9)                                                                 | `masterBar.tripletFeel`                                   |
| `\ac`                            | -                                                                                  | `masterBar.isAnacrusis`                                   |
| `\simile`                        | `simple \| firstOfDouble \| secondOfDouble` (`none` deprecated)                    | `bar.simileMark`                                          |
| `\barlineLeft` / `\barlineRight` | 12 styles (6.12)                                                                   | `bar.barLineLeft` / `bar.barLineRight`                    |
| `\db`                            | - (deprecated)                                                                     | `masterBar.isDoubleBar` + `bar.barLineRight = LightLight` |
| `\spd` / `\sph` / `\spu`         | ratio position `0..1`                                                              | `bar.sustainPedals[]` (Down / Hold / Up)                  |
| `\width`                         | absolute width                                                                     | `masterBar.displayWidth`, `bar.displayWidth`              |
| `\scale`                         | relative factor                                                                    | `masterBar.displayScale`, `bar.displayScale`              |
| `\beaming`                       | `(sliceDuration groupSize groupSize ...)` sliceDuration 8/16/32 (see trap for 4)   | `masterBar.beamingRules.groups`                           |
| `\barNumberDisplay`              | `allBars \| firstOfSystem \| hide`                                                 | `bar.barNumberDisplay`                                    |
| `\accidentals`                   | `auto \| explicit`                                                                 | importer state, see 5.6                                   |
| `\voiceMode`                     | `staffWise \| barWise`                                                             | importer state, see 4.3                                   |
| `\sync`                          | `(barIndex occurrence millisecondOffset [ratioPosition])`                          | `masterBar.syncPoints[]`                                  |

### 6.1 Time signature `\ts`

```alphatex
\ts (3 4)
C4 C4 C4 | C4 C4 C4
```

_Verified (case `bar.ts`):_ time signature (applies to following bars until changed). Checks: numerator = 3; denominator = 4; bar 2 inherits = 3.

```alphatex
\ts common
C4 C4 C4 C4
```

_Verified (case `bar.ts-common`):_ common time symbol (4/4). Checks: timeSignatureCommon = true; numerator = 4.

```alphatex
\ts (4 4) C4.1 | \ts (7 8) C4.8 * 7 | \ts (12 8) C4.8 * 12
```

_Verified (case `bar.ts-change`):_ numerator 1-32, denominator 1|2|4|8|16|32|64|128. Checks: bar 2 numerator = 7; bar 2 denominator = 8; bar 3 numerator = 12.

### 6.2 Key signature `\ks`

Values: `Cb Gb Db Ab Eb Bb F C G D A E B F# C#` (major), `<tonic>major` (same as plain) and `<tonic>minor` for
`AbMinor ... A#Minor`. The model stores the number of accidentals (`-7..7`) plus Major/Minor. Matching is
case-insensitive.

```alphatex
\ks Eb C4 | \ks Aminor C4 | \ks F#minor C4 | \ks Cb C4
```

_Verified (case `bar.ks`):_ key signature: Cb..C# major names or <key>minor / <key>major. Checks: bar 1 key = KeySignature.Eb; bar 1 type = KeySignatureType.Major; bar 2 key (A minor = 0 accidentals) = KeySignature.C; bar 2 type = KeySignatureType.Minor; bar 3 key (F# minor = 3 sharps) = KeySignature.A; bar 4 key = KeySignature.Cb.

```alphatex
\ks Cb C4 | \ks Gb C4 | \ks Db C4 | \ks Ab C4 | \ks Eb C4 | \ks Bb C4 | \ks F C4 | \ks C C4 |
\ks G C4 | \ks D C4 | \ks A C4 | \ks E C4 | \ks B C4 | \ks F# C4 | \ks C# C4 |
\ks AbMinor C4 | \ks EbMinor C4 | \ks BbMinor C4 | \ks FMinor C4 | \ks CMinor C4 | \ks GMinor C4 | \ks DMinor C4 | \ks AMinor C4 |
\ks EMinor C4 | \ks BMinor C4 | \ks F#Minor C4 | \ks C#Minor C4 | \ks G#Minor C4 | \ks D#Minor C4 | \ks A#Minor C4 |
\ks CMajor C4 | \ks F#Major C4
```

_Verified (case `bar.ks-all`):_ all 15 major keys (Cb..C#), all 15 minor keys (<tonic>minor) and the explicit <tonic>major form. Checks: major keys = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]; minor keys = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]; majors are Major = true; minors are Minor = true; F#Major = 6.

### 6.3 Clef `\clef`

```alphatex
\clef G2 C4 | \clef F4 C3 | \clef C3 C4 | \clef C4 C4 | \clef Neutral C4
```

_Verified (case `bar.clef`):_ clefs G2 (treble), F4 (bass), C3 (alto), C4 (tenor), Neutral (percussion). Checks: bar 1 = Clef.G2; bar 2 = Clef.F4; bar 3 = Clef.C3; bar 4 = Clef.C4; bar 5 = Clef.Neutral.

```alphatex
\clef treble C4 | \clef bass C4 | \clef alto C4 | \clef tenor C4 | \clef n C4
```

_Verified (case `bar.clef-aliases`):_ aliases treble / bass / alto / tenor / n. Checks: treble = Clef.G2; bass = Clef.F4; alto = Clef.C3; tenor = Clef.C4; n = Clef.Neutral.

```alphatex
\clef 43 C4 | \clef 65 C4 | \clef 48 C4 | \clef 60 C4 | \clef 0 C4
```

_Verified (case `bar.clef-numeric`):_ numeric clef codes 43=G2 65=F4 48=C3 60=C4 0=Neutral. Checks: 65 = Clef.F4; 60 = Clef.C4.

```alphatex
\ts (3 4) \ks D \clef F4 C3 C3 C3 | C3 C3 C3
```

_Verified (case `bar.meta-persistence`):_ time signature, key and clef carry over to the following bars. Checks: ts = 3; ks = KeySignature.D; clef = Clef.F4.

### 6.4 Clef ottava `\ottava`

```alphatex
\ottava 8va C5 | \ottava regular C5 | \ottava 15mb C3
```

_Verified (case `bar.ottava`):_ clef ottava: 15ma | 8va | regular | 8vb | 15mb. Checks: bar 1 = Ottavia._8va; bar 2 = Ottavia.Regular; bar 3 = Ottavia._15mb.

### 6.5 Sections / rehearsal marks `\section`

```alphatex
\section "Intro" 3.3.1 | 3.3.1 | \section ("B" "Chorus") 5.3.1
```

_Verified (case `bar.section`):_ rehearsal section: text only, or (marker text). Checks: bar 1 text = "Intro"; bar 1 marker = ""; bar 2 section = null; bar 3 marker = "B"; bar 3 text = "Chorus".

### 6.6 Tempo

`\tempo` (bar tag) adds a tempo automation to the master bar. The first one on bar 1 is the song tempo
(`score.tempo`, default 120). `(bpm "label" ratioPosition hide)` places the change at a fraction of the bar and can hide
the marking. For tempo changes on a specific beat use the beat property [`tempo`](#84-tempo-volume-balance-instrument-and-bank-automations).
Tempo values may be decimals. **There is no tempo-ramp (accelerando/ritardando curve) syntax**: every automation is a
step (`isLinear = false`).

```alphatex
\tempo 120 C4 C4 C4 C4 | \tempo 80 C4 C4 C4 C4
```

_Verified (case `bar.tempo`):_ tempo change at the start of a bar (BPM, quarter = beat). Checks: bar 2 tempo = 80; ratioPosition = 0.

```alphatex
\tempo (72 "Slowly")
C4
```

_Verified (case `bar.tempo-label`):_ tempo with text label. Checks: text = "Slowly".

```alphatex
\tempo 120
C4 C4 C4 C4 |
\tempo (100 "rit." 0.5 hide)
C4 C4 C4 C4
```

_Verified (case `bar.tempo-position-hide`):_ `(bpm label ratioPosition hide)` - change in the middle of the bar, not printed. Checks: value = 100; text = "rit."; ratioPosition = 0.5; isVisible = false.

```alphatex
\tempo (120 "" 0)
\tempo (90 "" 0.5)
C4 C4 C4 C4
```

_Verified (case `bar.tempo-multi`):_ several tempo changes in one bar (distinct ratio positions). Checks: tempoAutomations.length = 2; second tempo = 90.

### 6.7 Repeats and alternate endings `\ro` `\rc` `\ae`

```alphatex
\ro 3.3.1 | 5.3.1 | \rc 2 7.3.1 | \ro \rc 4 8.3.1
```

_Verified (case `bar.repeat`):_ `\ro` opens, `\rc` N closes a repeat (N = total plays). Checks: bar 1 isRepeatStart = true; bar 3 repeatCount = 2; bar 3 isRepeatEnd = true; bar 4 start = true; bar 4 repeatCount = 4.

```alphatex
\ro 3.3.1 | \ae (1 2) 5.3.1 | \ae 3 \rc 3 7.3.1 | 8.3.1
```

_Verified (case `bar.alternate-endings`):_ `\ae`: which pass(es) play this bar (1-based; single value or list). Checks: bar 2 endings 1+2 = 3; bar 3 ending 3 = 4; bar 3 repeatCount = 3.

### 6.8 Directions `\jump` (Segno, Coda, Fine, D.C., D.S. ...)

| Value                | Meaning               |     | Value                       | Meaning                 |
| -------------------- | --------------------- | --- | --------------------------- | ----------------------- |
| `fine`               | Fine (target)         |     | `dalSegno`                  | D.S.                    |
| `segno`              | Segno (target)        |     | `dalSegnoAlCoda`            | D.S. al Coda            |
| `segnoSegno`         | double Segno (target) |     | `dalSegnoAlDoubleCoda`      | D.S. al Double Coda     |
| `coda`               | Coda (target)         |     | `dalSegnoAlFine`            | D.S. al Fine            |
| `doubleCoda`         | Double Coda (target)  |     | `dalSegnoSegno`             | D.S.S.                  |
| `daCapo`             | D.C.                  |     | `dalSegnoSegnoAlCoda`       | D.S.S. al Coda          |
| `daCapoAlCoda`       | D.C. al Coda          |     | `dalSegnoSegnoAlDoubleCoda` | D.S.S. al Double Coda   |
| `daCapoAlDoubleCoda` | D.C. al Double Coda   |     | `dalSegnoSegnoAlFine`       | D.S.S. al Fine          |
| `daCapoAlFine`       | D.C. al Fine          |     | `daCoda`                    | "To Coda" (jump)        |
|                      |                       |     | `daDoubleCoda`              | "To Double Coda" (jump) |

The player follows these directions. Several `\jump` tags may be put on one bar.

```alphatex
\jump segno 3.3.1 | 5.3.1 | \jump daCoda 7.3.1 | \jump dalSegnoAlCoda 8.3.1 | \jump coda 10.3.1
```

_Verified (case `bar.jump`):_ directions: targets (segno, coda, fine...) and jump instructions (dalSegnoAlCoda, daCoda...). Checks: bar 1 segno = true; bar 3 "To Coda" = true; bar 4 D.S. al Coda = true; bar 5 coda = true.

```alphatex
\jump coda \jump dalSegnoAlCoda C4
```

_Verified (case `bar.jump-multi`):_ several directions on one bar. Checks: directions.size = 2.

```alphatex
\jump fine C4 |
\jump segno C4 |
\jump segnoSegno C4 |
\jump coda C4 |
\jump doubleCoda C4 |
\jump daCapo C4 |
\jump daCapoAlCoda C4 |
\jump daCapoAlDoubleCoda C4 |
\jump daCapoAlFine C4 |
\jump dalSegno C4 |
\jump dalSegnoAlCoda C4 |
\jump dalSegnoAlDoubleCoda C4 |
\jump dalSegnoAlFine C4 |
\jump dalSegnoSegno C4 |
\jump dalSegnoSegnoAlCoda C4 |
\jump dalSegnoSegnoAlDoubleCoda C4 |
\jump dalSegnoSegnoAlFine C4 |
\jump daCoda C4 |
\jump daDoubleCoda C4
```

_Verified (case `bar.jump-all`):_ all 19 directions (targets: fine segno segnoSegno coda doubleCoda; the rest are jumps). Checks: bar 1 has TargetFine = true; bar 2 has TargetSegno = true; bar 3 has TargetSegnoSegno = true; bar 4 has TargetCoda = true; bar 5 has TargetDoubleCoda = true; bar 6 has JumpDaCapo = true; bar 7 has JumpDaCapoAlCoda = true; bar 8 has JumpDaCapoAlDoubleCoda = true; bar 9 has JumpDaCapoAlFine = true; bar 10 has JumpDalSegno = true; bar 11 has JumpDalSegnoAlCoda = true; bar 12 has JumpDalSegnoAlDoubleCoda = true; bar 13 has JumpDalSegnoAlFine = true; bar 14 has JumpDalSegnoSegno = true; bar 15 has JumpDalSegnoSegnoAlCoda = true; bar 16 has JumpDalSegnoSegnoAlDoubleCoda = true; bar 17 has JumpDalSegnoSegnoAlFine = true; bar 18 has JumpDaCoda = true; bar 19 has JumpDaDoubleCoda = true.

### 6.9 Triplet feel `\tf`, free time `\ft`, anacrusis `\ac`

`\tf` values: `none triplet16th triplet8th dotted16th dotted8th scottish16th scottish8th`. Aliases:
`no notripletfeel t16 t8 d16 d8 s16 s8`, the dashed forms `triplet-16th ...`, and the numbers `0-6`.

```alphatex
\tf triplet8th 3.3.8 * 8 | \tf none 3.3.8 * 8
```

_Verified (case `bar.tf`):_ triplet feel (swing) for following bars. Checks: bar 1 = TripletFeel.Triplet8th; bar 2 = TripletFeel.NoTripletFeel.

```alphatex
\tf none C4 | \tf triplet16th C4 | \tf triplet8th C4 | \tf dotted16th C4 | \tf dotted8th C4 | \tf scottish16th C4 | \tf scottish8th C4
```

_Verified (case `bar.tf-all`):_ none | triplet16th | triplet8th | dotted16th | dotted8th | scottish16th | scottish8th. Checks: bar 1 = TripletFeel.NoTripletFeel; bar 2 = TripletFeel.Triplet16th; bar 3 = TripletFeel.Triplet8th; bar 4 = TripletFeel.Dotted16th; bar 5 = TripletFeel.Dotted8th; bar 6 = TripletFeel.Scottish16th; bar 7 = TripletFeel.Scottish8th.

```alphatex
\tf no C4 | \tf t16 C4 | \tf t8 C4 | \tf d16 C4 | \tf d8 C4 | \tf s16 C4 | \tf s8 C4 | \tf triplet-8th C4 | \tf 2 C4
```

_Verified (case `bar.tf-aliases`):_ aliases: no t16 t8 d16 d8 s16 s8, dashed forms (triplet-8th ...) and numbers 0-6. Checks: t8 = TripletFeel.Triplet8th; triplet-8th = TripletFeel.Triplet8th; 2 = TripletFeel.Triplet8th.

```alphatex
\ft C4 C4 C4 C4 C4 C4
```

_Verified (case `bar.ft`):_ free-time bar (no strict timing). Checks: masterBar.isFreeTime = true.

```alphatex
\ac r.8 3.3.8 | 5.3.1
```

_Verified (case `bar.ac`):_ anacrusis / pick-up bar: length = actual content. Checks: isAnacrusis = true; bar 1 duration (ticks; quarter=960) = 960.

### 6.10 Simile marks `\simile`

```alphatex
3.3*4 | \simile simple | 5.3*4 | 7.3*4 | \simile firstOfDouble | \simile secondOfDouble
```

_Verified (case `bar.simile`):_ simile marks: simple | firstOfDouble | secondOfDouble (bars stay empty). Checks: bar 2 = SimileMark.Simple; bar 5 = SimileMark.FirstOfDouble; bar 6 = SimileMark.SecondOfDouble.

### 6.11 Sustain pedal (bar positions) `\spd` `\sph` `\spu`

Pedal markers can also be attached to beats (beat properties `spd sph spu spe`, section 8.6).

```alphatex
\spd 0 \spu 0.5 \spd 0.5 \sph 0.75 \spu 1
C4 C4 C4 C4
```

_Verified (case `bar.sustain-pedal`):_ sustain pedal markers at relative bar positions 0..1 (down / hold / up). Checks: sustainPedals.length = 5; first = down = SustainPedalMarkerType.Down; fourth = hold = SustainPedalMarkerType.Hold; last at 1 = 1.

### 6.12 Bar lines `\barlineLeft` `\barlineRight` (and deprecated `\db`)

Styles (MusicXML-like): `automatic dashed dotted heavy heavyHeavy heavyLight lightHeavy lightLight none regular short tick`.

```alphatex
\barlineLeft heavy \barlineRight lightLight C4.1 | \barlineRight dashed C4.1 | \barlineRight lightHeavy C4.1
```

_Verified (case `bar.barlines`):_ bar line styles left/right of a bar. Checks: bar 1 left = BarLineStyle.Heavy; bar 1 right = BarLineStyle.LightLight; bar 2 right = BarLineStyle.Dashed; bar 3 right = BarLineStyle.LightHeavy.

```alphatex
\barlineRight automatic C4 | \barlineRight dashed C4 | \barlineRight dotted C4 | \barlineRight heavy C4 |
\barlineRight heavyHeavy C4 | \barlineRight heavyLight C4 | \barlineRight lightHeavy C4 | \barlineRight lightLight C4 |
\barlineRight none C4 | \barlineRight regular C4 | \barlineRight short C4 | \barlineRight tick C4
```

_Verified (case `bar.barlines-all`):_ all 12 styles: automatic dashed dotted heavy heavyHeavy heavyLight lightHeavy lightLight none regular short tick. Checks: bar 1 = BarLineStyle.Automatic; bar 2 = BarLineStyle.Dashed; bar 3 = BarLineStyle.Dotted; bar 4 = BarLineStyle.Heavy; bar 5 = BarLineStyle.HeavyHeavy; bar 6 = BarLineStyle.HeavyLight; bar 7 = BarLineStyle.LightHeavy; bar 8 = BarLineStyle.LightLight; bar 9 = BarLineStyle.None; bar 10 = BarLineStyle.Regular; bar 11 = BarLineStyle.Short; bar 12 = BarLineStyle.Tick.

```alphatex
C4.1 | \db C4.1
```

_Verified (case `bar.db`):_ legacy double bar (deprecated, use `\barlineRight` lightLight). Checks: isDoubleBar = true; barLineRight = BarLineStyle.LightLight.

### 6.13 Width, scale, beaming, bar numbers

`\width` applies to the horizontal layout and `\scale` to the page and parchment layouts. Both only take effect when
the renderer runs with `display.systemsLayoutMode = UseModelLayout` (parchment layout always uses the model layout).

```alphatex
\width 300 C4.1 | \width 150 C4.1
```

_Verified (case `bar.width`):_ absolute bar width (horizontal layout with systemsLayoutMode UseModelLayout). Checks: displayWidth = 300; bar.displayWidth = 300.

```alphatex
\scale 0.5 C4.1 | \scale 2 C4.1
```

_Verified (case `bar.scale`):_ relative bar width within a system (page layout, UseModelLayout). Checks: displayScale = 0.5; displayScale = 2.

```alphatex
\ts (4 4)
\beaming (8 3 3 2)
C4.8 * 8
```

_Verified (case `bar.beaming`):_ custom beaming: (slice-duration groupSizes...); here 8ths beamed 3+3+2. Checks: beamingRules[8th] = [3, 3, 2].

```alphatex
C4.1 | \barNumberDisplay hide C4.1 | \barNumberDisplay allBars C4.1
```

_Verified (case `bar.barnumberdisplay`):_ per-bar bar number visibility: allBars | firstOfSystem | hide. Checks: bar 1 unset = undefined; bar 2 = BarNumberDisplay.Hide; bar 3 = BarNumberDisplay.AllBars.

### 6.14 Sync points `\sync`

Sync points link the score to external audio or video (`alphaTab` media sync, since 1.6).

- `barIndex` is 0-based.
- `occurrence` is the 0-based play count of that bar under repeats.
- `millisecondOffset` is the position in the media.
- `ratioPosition` (`0..1`) is the position inside the bar.

They are usually written at the end of the file. Bar indices outside the score are ignored.

```alphatex
\tempo 120
C4 C4 C4 C4 | C4 C4 C4 C4 | C4 C4 C4 C4
\sync (0 0 0)
\sync (1 0 2150)
\sync (2 0 4400 0.5)
```

_Verified (case `bar.sync`):_ `\sync (barIndex occurrence millisecondOffset [ratioPosition])` for audio/video sync; barIndex 0-based. Checks: bar 2 offset = 2150; bar 3 ratioPosition = 0.5; occurrence = 0.

---

## 7. Beats

A beat has the following parts, in this order:

```
[:duration [{tu ...}]]  content  [.duration]  [{beat properties}]  [* count]
```

- `content` is a rest `r`, a single note, or a group of notes `( ... )`.
- Each note may carry its own `{note properties}` directly after it.
- Voices: see [4.3](#43-voice-and-voicemode).

### 7.1 Content: note, chord, rest, empty beat

```alphatex
3.3
```

_Verified (case `beat.single`):_ one note: fret 3 on string 3. Checks: notes.length = 1; fret = 3.

```alphatex
(0.1 1.2 0.3 2.4 3.5)
```

_Verified (case `beat.chord`):_ several notes on one beat in ( ). Checks: notes.length = 5.

```alphatex
r r.2 r.8 r.8
```

_Verified (case `beat.rest`):_ `r` = rest (takes durations/effects like any beat). Checks: beat 1 isRest = true; beat 2 half rest = Duration.Half.

```alphatex
C4.2 r.4{txt "breath" fermata long} C4.4
```

_Verified (case `beat.rest-effects`):_ rests take beat properties too. Checks: rest text = "breath"; rest fermata = FermataType.Long.

```alphatex
() C4 C4 C4
```

_Verified (case `beat.empty`):_ `()` = beat without notes (behaves as a rest; used for dead slaps). Checks: notes.length = 0; isRest = true.

### 7.2 Durations

| Value | Duration                  | Value | Duration |
| ----- | ------------------------- | ----- | -------- |
| `-4`  | quadruple whole (longa)   | `16`  | 16th     |
| `-2`  | double whole (breve)      | `32`  | 32nd     |
| `1`   | whole                     | `64`  | 64th     |
| `2`   | half                      | `128` | 128th    |
| `4`   | quarter (initial default) | `256` | 256th    |
| `8`   | eighth                    |       |          |

There are two ways to give a duration, and both **persist** for all following beats, also across bar lines:

- `:N` before a beat (duration change),
- `.N` after the beat content.

The duration is importer state. It is **not** reset by `\track`, `\staff` or `\voice`, so start every
track/staff/voice with an explicit `:N`. The initial value is a quarter note.

```alphatex
C4.1 | C4.2 C4.4 C4.8 C4.16 C4.32 C4.64 C4.128 C4.256 | C4.-2 | C4.-4
```

_Verified (case `beat.durations`):_ durations 1 2 4 8 16 32 64 128 256, -2 = double whole (breve), -4 = quadruple whole. Checks: whole = Duration.Whole; bar 2 durations = [2, 4, 8, 16, 32, 64, 128, 256]; double whole = Duration.DoubleWhole; quadruple whole = Duration.QuadrupleWhole.

```alphatex
:8 3.3 5.3 7.3 5.3 :16 3.3 5.3 7.3 5.3 3.3 5.3 7.3 5.3
```

_Verified (case `beat.duration-change`):_ `:N` sets the duration for all following beats. Checks: beat 4 eighth = Duration.Eighth; beat 5 sixteenth = Duration.Sixteenth; beat 12 sixteenth = Duration.Sixteenth.

```alphatex
3.3.8 5.3 7.3.4 8.3 | 3.3
```

_Verified (case `beat.duration-remembered`):_ `.N` after the beat also sets the duration for following beats (even across bars). Checks: bar 1 durations = [8, 8, 4, 4]; bar 2 continues with quarter = Duration.Quarter.

```alphatex
3.3 5.3
```

_Verified (case `beat.default-duration`):_ the initial duration is a quarter note. Checks: duration = Duration.Quarter.

```alphatex
\track "A"
:8 3.3 3.3
\track "B"
3.3 3.3
```

_Verified (case `beat.duration-persists-tracks`):_ the current duration is importer state: it is NOT reset by `\track` / `\staff` / `\voice` (track B gets eighths). Checks: track B beat 1 = Duration.Eighth.

### 7.3 Dotted notes

Dots are beat properties: `d` (dotted) and `dd` (double-dotted). They are not remembered, and they cannot be set via
`:N {...}`.

```alphatex
3.3.4{d} 5.3.8 7.3.2{dd} 8.3.8
```

_Verified (case `beat.dotted`):_ `d` = dotted, `dd` = double-dotted (beat property). Checks: beat 1 dots = 1; beat 2 dots = 0; beat 3 dots = 2; dotted quarter = 1440 ticks = 1440.

```alphatex
3.3.8{d} * 2 3.3.4
```

_Verified (case `beat.dotted-multiplier`):_ dots are copied by the beat multiplier. Checks: beat 2 dots = 1.

### 7.4 Tuplets

| Form                                   | Ratio                           |
| -------------------------------------- | ------------------------------- |
| `{tu 3}`                               | 3:2                             |
| `{tu 5}` `{tu 6}` `{tu 7}`             | 5:4, 6:4, 7:4                   |
| `{tu 9}` `{tu 10}` `{tu 11}` `{tu 12}` | 9:8, 10:8, 11:8, 12:8           |
| `{tu (n d)}`                           | any n:d, e.g. `(5 2)`, `(13 8)` |

There are two ways to apply a tuplet:

- **per beat**: `{tu 3}` in the beat (or note) property list,
- **for a run of beats**: `:8 {tu 3}`. It applies to every following beat until the next `:N` (a `.N` does not end it)
  or until a new voice, staff or track.

alphaTab groups consecutive beats with the same ratio into brackets. **Nested tuplets are not supported**: a beat has
exactly one ratio (see `trap.nested-tuplet`).

```alphatex
3.3.8{tu 3} 5.3.8{tu 3} 7.3.8{tu 3} 8.3.4 8.3.2
```

_Verified (case `beat.tuplet`):_ `tu 3` on each beat = 8th-note triplet (3:2). Checks: numerator = 3; denominator = 2; beat 4 hasTuplet = false.

```alphatex
3.3.8{tu 3} * 3 5.3.4 5.3.2
```

_Verified (case `beat.tuplet-multiplier`):_ tuplet + multiplier. Checks: beat 3 numerator = 3; beat 4 hasTuplet = false.

```alphatex
:8 {tu 3} 3.3 5.3 7.3 3.3 5.3 7.3 :4 8.3 8.3
```

_Verified (case `beat.tuplet-group`):_ `:N {tu ...}` applies the tuplet to all following beats until the next `:N`. Checks: beat 6 numerator = 3; beat 7 (after :4) hasTuplet = false.

```alphatex
C4.16{tu 5} C4.16{tu 6} C4.16{tu 7} C4.32{tu 9} C4.32{tu 10} C4.32{tu 11} C4.32{tu 12}
```

_Verified (case `beat.tuplet-simple-values`):_ single-number shortcuts: 3=3:2 5=5:4 6=6:4 7=7:4 9=9:8 10=10:8 11=11:8 12=12:8. Checks: ratios = ["5:4", "6:4", "7:4", "9:8", "10:8", "11:8", "12:8"].

```alphatex
C4.16{tu (5 2)} * 5 C4.8{tu (13 8)} * 13
```

_Verified (case `beat.tuplet-custom`):_ `tu (numerator denominator)` = any ratio. Checks: 5:2 denominator = 2; 13:8 numerator = 13; 13:8 denominator = 8.

```alphatex
:16 {tu (6 4)} 3.3 5.3 7.3 3.3 5.3 7.3
```

_Verified (case `beat.tuplet-duration-change-ratio`):_ duration-change form also takes (n d). Checks: numerator = 6; denominator = 4.

### 7.5 Beat multiplier `* N`

`* N` repeats the complete beat (notes, duration, all effects) N times. Canonical position: after the beat properties.

```alphatex
(0.1 2.2 2.3 2.4 0.5).8 * 8
```

_Verified (case `beat.multiplier`):_ `* N` repeats the beat N times. Checks: beat count = 8.

```alphatex
3.3{pm}.16 * 4 5.3{v}.8 * 2 0.6.4
```

_Verified (case `beat.multiplier-effects`):_ effects are copied to every repetition (`* N` goes after the effects). Checks: beat count = 7; beat 4 palm mute = true; beat 6 vibrato = VibratoType.Slight.

### 7.6 Where effects go

- **Note properties** go in `{...}` directly after the note value (`fret.string{...}`, `C4{...}`, `KickHit{...}`), and
  inside chords per note.
- **Beat properties** go in `{...}` after the beat content and the optional `.duration`.
- For a single note, beat properties may also be written in the note's block. The importer falls back to the beat
  property when the name is not a note property. The reverse (note properties after `.duration`) is an **error** (AT205,
  see `trap.note-effect-after-duration`).
- Both blocks may be combined: `3.3{b (0 4)} {txt "Bend"}`, `3.3{pm}.8{sd}`.

```alphatex
3.3{b (0 4)} {txt "Bend"}
```

_Verified (case `beat.effects-separate`):_ note effects `{...}` right after the note, beat effects in a second `{...}`. Checks: note.hasBend = true; beat.text = "Bend".

```alphatex
3.3{b (0 4) txt "Bend"}
```

_Verified (case `beat.effects-combined`):_ single note: beat properties may also be written in the note block. Checks: note.hasBend = true; beat.text = "Bend".

```alphatex
3.3{pm}.8{sd} (5.2{pm} 7.3).8{su}
```

_Verified (case `beat.effects-duration-order`):_ order: note{noteFx} . duration {beatFx} * multiplier. Checks: note pm = true; beat sd = PickStroke.Down; chord duration = Duration.Eighth; chord note 1 pm = true; chord note 2 isPalmMute = false.

---

## 8. Beat properties

| Property                      | Arguments                                                                                                 | Model (`beat.*` unless noted)                                  | Notes                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `f` / `fo` / `vs`             | -                                                                                                         | `fade` = FadeIn / FadeOut / VolumeSwell                        |                                                                                        |
| `v` / `vw`                    | -                                                                                                         | `vibrato` = Slight / Wide                                      | beat (whammy-style) vibrato; notes have their own `v`/`vw`                             |
| `s` / `p` / `tt`              | -                                                                                                         | `slap` / `pop` / `tap`                                         | bass slap, pop, (right-hand) tapping                                                   |
| `su` / `sd`                   | -                                                                                                         | `pickStroke` = Up / Down                                       |                                                                                        |
| `bu` / `bd`                   | `[ticks]`                                                                                                 | `brushType` = BrushUp / BrushDown, `brushDuration`             | default duration = 1/4 of the beat / number of notes                                   |
| `au` / `ad`                   | `[ticks]`                                                                                                 | `brushType` = ArpeggioUp / ArpeggioDown                        | default = beat duration / number of notes                                              |
| `d` / `dd`                    | -                                                                                                         | `dots` = 1 / 2                                                 | `d` means **dotted**; there is no `d`/`u` stroke property (use `sd`/`su` or `bd`/`bu`) |
| `tu`                          | `n` \| `(n d)`                                                                                            | `tupletNumerator`, `tupletDenominator`                         | section 7.4                                                                            |
| `txt`                         | `"text"`                                                                                                  | `text`                                                         |                                                                                        |
| `lyrics`                      | `"text"` \| `(line "text")`                                                                               | `lyrics[line]`                                                 | line 0 = first verse                                                                   |
| `ch`                          | `"name"`                                                                                                  | `chordId` (`beat.chord`)                                       | links a `\chord`; without definition = name only                                       |
| `gr`                          | `[beforeBeat \| onBeat \| bendGrace]`, short `bb ob b`                                                    | `graceType`                                                    | default beforeBeat                                                                     |
| `dy`                          | `ppp pp p mp mf f ff fff pppp ppppp pppppp ffff fffff ffffff sf sfp sfpp fp rf rfz sfz sffz fz n pf sfzp` | `dynamics`                                                     | remembered for the following beats of the staff; default `f`                           |
| `cre` / `dec`                 | -                                                                                                         | `crescendo` = Crescendo / Decrescendo                          | mark every beat under the hairpin                                                      |
| `fermata`                     | `short \| medium \| long` or `(type length)`                                                              | `fermata.type`, `fermata.length`                               | stored per master bar at the beat offset, so it applies to all tracks                  |
| `tempo`                       | `bpm` \| `(bpm hide)` \| `(bpm "label")` \| `(bpm "label" hide)`                                          | automation Tempo (also in `masterBar.tempoAutomations`)        | position in the bar is computed; decimal BPM only inside `( )`                         |
| `volume`                      | `0-16`                                                                                                    | automation Volume                                              |                                                                                        |
| `balance`                     | `0-16`                                                                                                    | automation Balance                                             | clamped to 0..16                                                                       |
| `instrument`                  | `0-127` \| GM name                                                                                        | automation Instrument                                          | program change                                                                         |
| `bank`                        | `n`                                                                                                       | automation Bank                                                |                                                                                        |
| `tp`                          | `marks` \| `(marks default\|buzzRoll)`                                                                    | `tremoloPicking.marks`, `.style`                               | marks 1-5 = 8th..128th; legacy 8/16/32                                                 |
| `barre`                       | `fret` \| `(fret full\|half)`                                                                             | `barreFret`, `barreShape`                                      |                                                                                        |
| `rasg`                        | 18 patterns (8.5)                                                                                         | `rasgueado`                                                    |                                                                                        |
| `ot`                          | `15ma 8va regular 8vb 15mb`                                                                               | `ottava`                                                       |                                                                                        |
| `beam`                        | `invert up down auto split merge splitSecondary`                                                          | `invertBeamDirection`, `preferredBeamDirection`, `beamingMode` | may repeat                                                                             |
| `slashed`                     | -                                                                                                         | `slashed`                                                      | slash notation for this beat                                                           |
| `ds`                          | -                                                                                                         | `deadSlapped`                                                  | use with `()`                                                                          |
| `glpf` / `glpt`               | -                                                                                                         | `golpe` = Finger / Thumb                                       |                                                                                        |
| `waho` / `wahc`               | -                                                                                                         | `wahPedal` = Open / Closed                                     |                                                                                        |
| `legatoOrigin`                | -                                                                                                         | `isLegatoOrigin` (next beat `isLegatoDestination`)             |                                                                                        |
| `timer`                       | -                                                                                                         | `showTimer`                                                    |                                                                                        |
| `spd` / `sph` / `spu` / `spe` | -                                                                                                         | `bar.sustainPedals[]`                                          | `spe` = pedal up at the end of the beat                                                |
| `tb`                          | `(values...)` with optional leading `type` and/or `style`                                                 | `whammyBarPoints`, `whammyBarType`, `whammyStyle`              | values in quarter tones, evenly spread                                                 |
| `tbe`                         | `(offset value ...)` with optional `type`/`style`                                                         | same                                                           | exact offsets 0..60                                                                    |

### 8.1 Fades, vibrato, slap/pop/tap, pick strokes

```alphatex
(0.1 2.2 2.3).2{f} r.2
```

_Verified (case `bfx.f`):_ `f` fade in -> beat.fade = FadeIn. Checks: beat.fade = FadeType.FadeIn.

```alphatex
(0.1 2.2 2.3).2{fo} r.2
```

_Verified (case `bfx.fo`):_ `fo` fade out -> FadeOut. Checks: beat.fade = FadeType.FadeOut.

```alphatex
(0.1 2.2 2.3).2{vs} r.2
```

_Verified (case `bfx.vs`):_ `vs` volume swell -> VolumeSwell. Checks: beat.fade = FadeType.VolumeSwell.

```alphatex
3.3.2{v} 3.3.2{vw}
```

_Verified (case `bfx.v`):_ `v` slight / `vw` wide vibrato on the beat (beat.vibrato; whammy-style vibrato). Checks: beat 1 vibrato = VibratoType.Slight; beat 2 vibrato = VibratoType.Wide.

```alphatex
\track "Bass" {instrument slapBass1}
3.4.8{s} 5.2.8{p} 12.1.8{tt} 3.4.8
```

_Verified (case `bfx.slap-pop-tap`):_ `s` slap, `p` pop, `tt` tapping. Checks: slap = true; pop = true; tap = true.

```alphatex
3.3.8{sd} 3.3.8{su} 3.3.8{sd} 3.3.8{su}
```

_Verified (case `bfx.pickstroke`):_ `sd` pick stroke down, `su` pick stroke up. Checks: beat 1 = PickStroke.Down; beat 2 = PickStroke.Up.

### 8.2 Brush (strum) and arpeggio

Durations are MIDI ticks (quarter note = 960).

```alphatex
(0.1 1.2 0.3 2.4 3.5 x.6).4{bd} (0.1 1.2 0.3 2.4 3.5).4{bu} (0.1 1.2 0.3).4{bd 120} (0.1 1.2 0.3).4{bu 60}
```

_Verified (case `bfx.brush`):_ `bd`/`bu` brush (strum) down/up; optional duration in MIDI ticks (quarter = 960). Checks: beat 1 type = BrushType.BrushDown; beat 2 type = BrushType.BrushUp; beat 3 duration = 120; beat 4 duration = 60; auto duration = quarter*0.25/notes (960*0.25/6) = 40.

```alphatex
(0.1 1.2 0.3 2.4 3.5).2{ad} (0.1 1.2 0.3 2.4 3.5).2{au 240}
```

_Verified (case `bfx.arpeggio`):_ `ad`/`au` arpeggio down/up; optional duration in ticks. Checks: beat 1 = BrushType.ArpeggioDown; beat 2 = BrushType.ArpeggioUp; beat 2 duration = 240.

### 8.3 Text, chords, lyrics, grace notes

```alphatex
3.3{txt "let ring"} 5.3{txt Fill}
```

_Verified (case `bfx.txt`):_ `txt` free text above the beat (string or identifier). Checks: beat 1 = "let ring"; beat 2 = "Fill".

```alphatex
C4{lyrics "Hel"} D4{lyrics "lo"} E4{lyrics (1 "2nd")} F4
```

_Verified (case `bfx.lyrics`):_ `lyrics "text"` (line 0) or `lyrics (line "text")` - exact text per beat. Checks: beat 1 = ["Hel"]; beat 3 line 1 = ["", "2nd"].

```alphatex
\chord ("Am" 0 1 2 2 0 x)
(0.1 1.2 2.3 2.4 0.5){ch "Am"} r
```

_Verified (case `bfx.ch`):_ `ch` attaches a (defined) chord to the beat. Checks: chord.name = "Am".

Grace beats are separate beats marked `gr`. They take their time from the previous beat (before-beat) or the next beat
(on-beat), so they do not count toward the bar length.

```alphatex
3.3.16{gr} 5.3.4 3.3.16{gr ob} 5.3.4 3.3.16{gr bb} 5.3.4 3.3.16{gr b} 5.3.4
```

_Verified (case `bfx.gr`):_ `gr` grace beat: default/`bb` before-beat, `ob` on-beat, `b` bend-grace. Checks: gr = GraceType.BeforeBeat; gr ob = GraceType.OnBeat; gr bb = GraceType.BeforeBeat; gr b = GraceType.BendGrace.

```alphatex
3.3.16{gr onBeat} 5.3.4 3.3.16{gr beforeBeat} 5.3.4 3.3.16{gr bendGrace} 5.3.4
```

_Verified (case `bfx.gr-long`):_ long names onBeat / beforeBeat / bendGrace. Checks: onBeat = GraceType.OnBeat; bendGrace = GraceType.BendGrace.

```alphatex
(5.1 5.2).16{gr} (7.1 7.2).4
```

_Verified (case `bfx.gr-chord`):_ grace chord. Checks: grace notes = 2; graceType = GraceType.BeforeBeat.

```alphatex
\ts (4 4)
3.3.16{gr} 5.3.4 5.3 5.3 5.3
```

_Verified (case `beat.grace-timing`):_ a before-beat grace beat steals its time from the previous beat and does not count toward the bar length. Checks: grace = GraceType.BeforeBeat; main beat starts at 0 = 0; bar duration = 3840.

### 8.4 Tempo, volume, balance, instrument and bank automations

```alphatex
\tempo 120
C4 C4 C4{tempo 60} C4
```

_Verified (case `bfx.tempo`):_ `tempo` on a beat = tempo change at that position (bar ratio computed). Checks: tempoAutomations.length = 2; value = 60; ratioPosition = 0.5.

```alphatex
\tempo 120
C4 C4{tempo (100 "rit.")} C4{tempo (80 hide)} C4{tempo (140 "a tempo" hide)}
```

_Verified (case `bfx.tempo-label-hide`):_ `tempo (bpm label)`, `tempo (bpm hide)`, `tempo (bpm label hide)`. Checks: beat 2 text = "rit."; beat 3 isVisible = false; beat 4 text = "a tempo"; beat 4 isVisible = false.

```alphatex
\tempo 120
C4 C4{tempo (112.5)} C4 C4
```

_Verified (case `bfx.tempo-decimal`):_ decimal BPM on a beat must be parenthesized: `{tempo (112.5)}`. Checks: tempo value = 112.5.

```alphatex
C4 C4{volume 8} C4 C4{volume 15}
```

_Verified (case `bfx.volume`):_ `volume` automation (0-16), applies from this beat on. Checks: type = AutomationType.Volume; value = 8.

```alphatex
C4{balance 0} C4{balance 16} C4{balance 8}
```

_Verified (case `bfx.balance`):_ `balance` automation (0 left .. 8 center .. 16 right). Checks: type = AutomationType.Balance; value = 16.

```alphatex
\track {instrument acousticGrandPiano}
C4 C4 C4{instrument brightAcousticPiano} C4{instrument 19}
```

_Verified (case `bfx.instrument`):_ `instrument` program change (GM name or 0-127). Checks: type = AutomationType.Instrument; value = 1; beat 4 value = 19.

```alphatex
\track {instrument electricPiano1}
C4 C4{instrument 4 bank 2}
```

_Verified (case `bfx.bank`):_ `bank` bank-select change. Checks: bank value = 2.

### 8.5 Tremolo picking, barre, rasgueado, ottava, golpe, wah, dead slap, slashed, legato, timer

Rasgueado patterns: `ii` `mi` `miiTriplet` `miiAnapaest` `pmpTriplet` `pmpAnapaest` `peiTriplet` `peiAnapaest`
`paiTriplet` `paiAnapaest` `amiTriplet` `amiAnapaest` `ppp` `amii` `amip` `eami` `eamii` `peami`.

```alphatex
3.3.4{tp 1} 3.3.4{tp 2} 3.3.4{tp 3} 3.3.4{tp (3 buzzRoll)}
```

_Verified (case `bfx.tp`):_ `tp marks [style]`: tremolo picking with 1-5 marks (1=8th 2=16th 3=32nd 4=64th 5=128th), style default|buzzRoll. Checks: beat 1 marks = 1; beat 3 marks = 3; beat 4 style = TremoloPickingStyle.BuzzRoll; isTremolo = true.

```alphatex
3.3.2{tp 4} 3.3.2{tp 5}
```

_Verified (case `bfx.tp-5`):_ 4 and 5 marks. Checks: marks = 5.

```alphatex
3.3.4{tp (2 default)}
```

_Verified (case `bfx.tp-default-style`):_ explicit default style. Checks: style = TremoloPickingStyle.Default.

```alphatex
(5.1 5.2 6.3 7.4 7.5 5.6){barre 5} (5.1 5.2 6.3){barre (5 half)}
```

_Verified (case `bfx.barre`):_ `barre fret [full|half]` barre indication. Checks: barreFret = 5; barreShape = BarreShape.Full; beat 2 shape = BarreShape.Half.

```alphatex
(0.1 1.2 0.3 2.4 3.5).4{rasg ii} (0.1 1.2 0.3 2.4 3.5).4{rasg amii}
```

_Verified (case `bfx.rasg`):_ `rasg pattern` rasgueado. Checks: beat 1 = Rasgueado.Ii; beat 2 = Rasgueado.Amii; hasRasgueado = true.

```alphatex
3.3{rasg ii} 3.3{rasg mi} 3.3{rasg miiTriplet} 3.3{rasg miiAnapaest} 3.3{rasg pmpTriplet} 3.3{rasg pmpAnapaest} |
3.3{rasg peiTriplet} 3.3{rasg peiAnapaest} 3.3{rasg paiTriplet} 3.3{rasg paiAnapaest} 3.3{rasg amiTriplet} 3.3{rasg amiAnapaest} |
3.3{rasg ppp} 3.3{rasg amii} 3.3{rasg amip} 3.3{rasg eami} 3.3{rasg eamii} 3.3{rasg peami}
```

_Verified (case `bfx.rasg-all`):_ all 18 rasgueado patterns. Checks: rasgueado values 1..18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].

```alphatex
C5.4{ot 8va} C5{ot 15ma} C3{ot 8vb} C3{ot 15mb} | C4{ot regular}
```

_Verified (case `bfx.ot`):_ `ot` ottava on beats: 15ma | 8va | regular | 8vb | 15mb. Checks: ottavas = [Ottavia._8va, Ottavia._15ma, Ottavia._8vb, Ottavia._15mb]; regular = Ottavia.Regular.

```alphatex
0.1.4{glpf} 0.1.4{glpt}
```

_Verified (case `bfx.golpe`):_ `glpf` golpe finger, `glpt` golpe thumb. Checks: beat 1 = GolpeType.Finger; beat 2 = GolpeType.Thumb.

```alphatex
3.3{waho} 3.3{wahc} 3.3
```

_Verified (case `bfx.wah`):_ `waho` wah open, `wahc` wah closed. Checks: beat 1 = WahPedal.Open; beat 2 = WahPedal.Closed.

```alphatex
\track "Bass" {instrument electricBassFinger}
3.4.8 ().8{ds} 3.4.8 ().8{ds}
```

_Verified (case `bfx.ds`):_ `ds` dead slap (use an empty beat `()`). Checks: deadSlapped = true; isRest = false.

```alphatex
(0.1 2.2 2.3).4{slashed} (0.1 2.2 2.3).4
```

_Verified (case `bfx.slashed`):_ `slashed`: show this beat with slash notation. Checks: beat.slashed = true.

```alphatex
3.3.4{legatoOrigin} 5.3.4
```

_Verified (case `bfx.legatoorigin`):_ `legatoOrigin` legato slur from this beat to the next. Checks: origin = true; destination = true.

```alphatex
\tempo 120
3.3.4{timer} 3.3 3.3 3.3 | 3.3.4{timer}
```

_Verified (case `bfx.timer`):_ `timer` shows the playback time stamp at this beat. Checks: showTimer = true.

### 8.6 Dynamics, hairpins, fermatas, sustain pedal

```alphatex
C4{dy pp} C4 C4{dy mf} C4 | C4{dy fff} C4{dy sfz} C4{dy fp} C4
```

_Verified (case `bfx.dy`):_ `dy` dynamics; the value is remembered for following beats of the staff. Checks: beat 1 = DynamicValue.PP; beat 2 inherits = DynamicValue.PP; beat 3 = DynamicValue.MF; bar 2 beat 2 = DynamicValue.SFZ.

```alphatex
C4{dy pppppp} C4{dy ppppp} C4{dy pppp} C4{dy ppp} C4{dy pp} C4{dy p} C4{dy mp} C4{dy mf} C4{dy f} C4{dy ff} C4{dy fff} C4{dy ffff} C4{dy fffff} |
C4{dy ffffff} C4{dy sf} C4{dy sfp} C4{dy sfpp} C4{dy fp} C4{dy rf} C4{dy rfz} C4{dy sfz} C4{dy sffz} C4{dy fz} C4{dy n} C4{dy pf} C4{dy sfzp}
```

_Verified (case `bfx.dy-all`):_ all 26 dynamic values. Checks: bar 1 = [DynamicValue.PPPPPP, DynamicValue.PPPPP, DynamicValue.PPPP, DynamicValue.PPP, DynamicValue.PP, DynamicValue.P, DynamicValue.MP, DynamicValue.MF, DynamicValue.F, DynamicValue.FF, DynamicValue.FFF, DynamicValue.FFFF, DynamicValue.FFFFF]; bar 2 = [DynamicValue.FFFFFF, DynamicValue.SF, DynamicValue.SFP, DynamicValue.SFPP, DynamicValue.FP, DynamicValue.RF, DynamicValue.RFZ, DynamicValue.SFZ, DynamicValue.SFFZ, DynamicValue.FZ, DynamicValue.N, DynamicValue.PF, DynamicValue.SFZP].

```alphatex
C4
```

_Verified (case `bfx.dy-default`):_ default dynamic is f (forte). Checks: dynamics = DynamicValue.F.

```alphatex
C4{cre} D4{cre} E4{dec} F4{dec}
```

_Verified (case `bfx.cre-dec`):_ `cre` crescendo / `dec` decrescendo hairpin (consecutive beats form one hairpin). Checks: beat 1 = CrescendoType.Crescendo; beat 4 = CrescendoType.Decrescendo.

```alphatex
C4 C4 C4 C4{fermata medium} | C4 C4 C4{fermata (short 0.5)} C4{fermata (long 3)}
```

_Verified (case `bfx.fermata`):_ `fermata type [length]` type short|medium|long, optional length factor. Checks: type = FermataType.Medium; length = 0.5; long = FermataType.Long.

```alphatex
\track "A"
C4 C4 C4{fermata medium} C4
\track "B"
C3 C3 C3 C3
```

_Verified (case `bfx.fermata-masterbar`):_ a beat fermata is stored on the master bar at the beat offset and therefore shows on every track at that position. Checks: masterBar.fermata has offset 1920 = true; track B beat 3 fermata = FermataType.Medium.

```alphatex
\track {instrument acousticGrandPiano}
C4{spd} E4{sph} G4{spu} C5{spe}
```

_Verified (case `bfx.sustain`):_ `spd` pedal down, `sph` hold, `spu` up (at beat start), `spe` up at the END of the beat. Checks: pedal types = [SustainPedalMarkerType.Down, SustainPedalMarkerType.Hold, SustainPedalMarkerType.Up, SustainPedalMarkerType.Up]; ratio positions = [0, 0.25, 0.5, 1].

### 8.7 Beams and stems

```alphatex
:8 3.3{beam invert} 3.3 | 3.3{beam up} 3.3 | 3.3{beam down} 3.3 | 3.3{beam split} 3.3 3.3 3.3 |
3.3 3.3{beam merge} 3.3 3.3 | 3.3.16{beam splitSecondary} 3.3 3.3 3.3 | 3.3{beam auto} 3.3
```

_Verified (case `bfx.beam`):_ `beam` invert | up | down (stem direction), split | merge | splitSecondary | auto (beaming). Checks: invert = true; up = BeamDirection.Up; down = BeamDirection.Down; split = BeatBeamingMode.ForceSplitToNext; merge = BeatBeamingMode.ForceMergeWithNext; splitSecondary = BeatBeamingMode.ForceSplitOnSecondaryToNext; auto = BeatBeamingMode.Auto.

```alphatex
:8 3.3{beam up beam merge} 3.3 3.3 3.3
```

_Verified (case `bfx.beam-multiple`):_ `beam` may be repeated in one block. Checks: up = BeamDirection.Up; merge = BeatBeamingMode.ForceMergeWithNext.

### 8.8 Whammy / tremolo bar `tb` and `tbe`

Values are in **quarter tones** relative to the note (negative = down; decimals allowed inside `( )`).

- `tb` spreads the points evenly over the beat (offsets `0..60`).
- `tbe` takes explicit `offset value` pairs.
- An optional **type** comes first: `custom dive dip hold predive prediveDive`.
- An optional **style** follows: `default gradual fast`.
- With no type (or `custom`), alphaTab infers the type from 2, 3 or 4 points.

```alphatex
3.3.2{tb (0 -4 0)} 3.3.2
```

_Verified (case `bfx.tb`):_ `tb (values...)`: whammy points in quarter tones, spread evenly over the beat (offsets 0..60). Checks: values = [0, -4, 0]; offsets = [0, 30, 60]; auto-detected type = WhammyType.Dip.

```alphatex
3.3.2{tb (0 -8)} 3.3.2
```

_Verified (case `bfx.tb-dive`):_ two points falling = dive (auto-detected). Checks: whammyBarType = WhammyType.Dive.

```alphatex
3.3.4{tb (dive 0 -8)} 3.3.4{tb (dip 0 -4 0)} 3.3.4{tb (predive -4 -4)} 3.3.4{tb (prediveDive -4 -8)} |
3.3.4{tb (hold 0 0)} 3.3.4{tb (custom 0 -2 4 -6 0)} 3.3.2
```

_Verified (case `bfx.tb-types`):_ explicit type: custom | dive | dip | hold | predive | prediveDive. Checks: bar 1 types = [WhammyType.Dive, WhammyType.Dip, WhammyType.Predive, WhammyType.PrediveDive]; hold = WhammyType.Hold; custom (5 points stay custom) = WhammyType.Custom.

```alphatex
3.3.2{tb (dive gradual 0 -8)} 3.3.2{tb (fast 0 -8)}
```

_Verified (case `bfx.tb-style`):_ style: default | gradual | fast (optionally after the type). Checks: gradual = BendStyle.Gradual; fast = BendStyle.Fast.

```alphatex
3.3.1{tbe (0 0 10 -4 50 -4 60 0)}
```

_Verified (case `bfx.tbe`):_ `tbe (offset value ...)`: exact points; offset 0-60 across the beat. Checks: offsets = [0, 10, 50, 60]; values = [0, -4, -4, 0].

```alphatex
3.3.1{tbe (dive fast 0 0 60 -12)}
```

_Verified (case `bfx.tbe-typed`):_ `tbe (type style offset value ...)`. Checks: type = WhammyType.Dive; style = BendStyle.Fast.

---

## 9. Notes

A staff holds exactly one **note kind**. The kind is set by `\tuning (piano)`, by `\instrument percussion`, or otherwise
by the first note. Mixing kinds is an error (AT218):

| Kind               | Written as                                                         | Detected from                      |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------- |
| Fretted (stringed) | `fret.string` (also `x.string`, `-.string`)                        | a number followed by `.string`     |
| Pitched            | `C4`, `F#3`, `Bb5` ...                                             | an identifier that parses as pitch |
| Percussion         | articulation **id** (`36`) or **name** (`KickHit`, `"Kick (hit)"`) | a bare number or a non-pitch name  |

### 9.1 Fretted notes

`fret.string[.duration]`. String 1 is the **first** value of `\tuning` (the highest string on a guitar). The model
numbers strings the other way round (`note.string` 1 = lowest), so convert with `tuning.length - note.string + 1` when
comparing with alphaTex. Fretted notes need strings: the default guitar track has 6, and any non-stringed program needs
an explicit `\tuning (...)`.

```alphatex
0.6 3.5 2.4 0.3 1.2 0.1
```

_Verified (case `note.fret-string`):_ `fret.string`; string 1 = first value of the tuning (high e on guitar), string 6 = low E. Checks: 0.6 = E2 = 40; 3.5 = C3 = 48; 0.1 = E4 = 64; alphaTex string number = 1; model string number is reversed (6 = highest) = 6.

```alphatex
3.3.8 5.3.8 7.3.4 (3.3 5.2).2
```

_Verified (case `note.fret-string-duration`):_ `fret.string.duration` for single notes, `(...)`.duration for chords. Checks: durations = [8, 8, 4, 2].

```alphatex
24.1 0.6
```

_Verified (case `note.high-frets`):_ frets are plain numbers (no upper limit enforced). Checks: fret = 24.

```alphatex
3 . 3 . 8 (3 . 3 5 . 2) . 4
```

_Verified (case `note.spacing`):_ whitespace around the dots is allowed. Checks: fret = 3; duration = Duration.Eighth; chord = 2.

### 9.2 Pitched notes

Format: `<letter><accidental><octave>`.

- Letters: `C D E F G A B`, case-insensitive.
- Accidentals: none, `#`, `##` or `x`, `b`, `bb`, `n` (forced natural), `-` (forced no accidental).
- Octave: an integer `0-9`. `C4` = MIDI 60 (middle C).

`Cb4` becomes B3 (59) and `B#3` becomes C4 (60). The written accidental is kept as spelling
(`note.accidentalMode`) unless `\accidentals auto` is active. With `auto`, alphaTab spells from the pitch and the key
signature.

```alphatex
\track "Piano" {instrument acousticGrandPiano}
C4 D4 E4 F4 G4 A4 B4 C5
```

_Verified (case `note.pitched`):_ note name + octave (C4 = middle C = MIDI 60); staff becomes a pitched staff. Checks: MIDI values = [60, 62, 64, 65, 67, 69, 71, 72]; staff.tuning.length = 0.

```alphatex
C#4 Db4 Cx4 C##4 Ebb4 Bn3 Fb4 E#4
```

_Verified (case `note.pitched-accidentals`):_ accidentals: # b x/## bb n (natural); spelling kept as written (`\accidentals` explicit). Checks: MIDI values = [61, 61, 62, 62, 62, 59, 64, 65]; C#4 = NoteAccidentalMode.ForceSharp; Db4 = NoteAccidentalMode.ForceFlat; Cx4 = NoteAccidentalMode.ForceDoubleSharp; C##4 = NoteAccidentalMode.ForceDoubleSharp; Ebb4 = NoteAccidentalMode.ForceDoubleFlat; Bn3 = NoteAccidentalMode.ForceNatural.

```alphatex
Cb4 B#3 Cbb4
```

_Verified (case `note.pitched-octave-rollover`):_ Cb4 = B3 (59), B#3 = C4 (60), Cbb4 = Bb3 (58). Checks: MIDI values = [59, 60, 58].

```alphatex
c4 d#4 eb4 c-4
```

_Verified (case `note.pitched-lowercase`):_ lower case works; `-` after the letter = force no accidental. Checks: d#4 = 63; c-4 = NoteAccidentalMode.ForceNone.

```alphatex
C0 A0 C8 G9
```

_Verified (case `note.pitched-range`):_ octaves 0..9 (C0 = MIDI 12). Checks: MIDI values = [12, 21, 108, 127].

```alphatex
(C4 E4 G4).2 (D4 F4 A4).2
```

_Verified (case `note.pitched-chord-duration`):_ pitched chord with duration. Checks: notes = 3; duration = Duration.Half.

### 9.3 Percussion notes

- **By id**: a bare number is an articulation id (mostly the GM drum note number; GP-specific ids go up to 127). Because
  `36.4` would mean fret 36 on string 4, write durations as `(36).4` or use `:4` before the beat.
- **By name**: the full name as a string (`"Kick (hit)"`) or the identifier form (the same name with all non-alphanumerics
  removed, `KickHit`), case-insensitive.
- **Registration**: names must be registered with `\articulation defaults` or `\articulation ("Name" id)`.
  - If the staff kind is still unknown (no `\instrument percussion` yet), the first name auto-registers the defaults and
    makes the staff a percussion staff.
  - After `{instrument percussion}`, unregistered names fail (AT209).

Full list: [15.1](#151-percussion-articulations).

```alphatex
\track "Drums" {instrument percussion}
(36).4 (42) (38 42) (42)
```

_Verified (case `note.perc-number`):_ percussion by articulation id (wrap in ( ) or use :N when a duration follows!). Checks: beat 1 id = 36; beat 3 note 1 = 38; staff.isPercussion = true.

```alphatex
\track "Drums" {instrument percussion}
:8 42 42 42 42 :4 38 38
```

_Verified (case `note.perc-number-durationchange`):_ numbers without a following dot are fine. Checks: beat 5 duration = Duration.Quarter.

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
"Kick (hit)" "Snare (hit)" "Hi-Hat (closed)" "Crash high (hit)"
```

_Verified (case `note.perc-name-string`):_ full articulation names as strings. Checks: ids = [35, 38, 42, 49].

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
:8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatOpen).4 (SnareHit CrashHighHit).4
```

_Verified (case `note.perc-name-ident`):_ identifier form = name without spaces/punctuation (case-insensitive). Checks: HiHatClosed = 42; CrashHighHit = 49.

```alphatex
KickHit SnareHit KickHit SnareHit
```

_Verified (case `note.perc-auto`):_ without any declaration the first articulation name auto-detects a percussion staff. Checks: staff.isPercussion = true; playbackInfo.primaryChannel (9 = MIDI channel 10) = 9.

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
SnareHit{g} SnareHit{ac} (KickHit CrashHighHit{ac}).4 r
```

_Verified (case `note.perc-effects`):_ note effects work on percussion notes (ghost, accent ...). Checks: ghost = true; accent = AccentuationType.Normal.

### 9.4 Dead notes and ties

- `x.string` or `{x}` marks a dead note.
- `-.string` or `{t}` / `{-}` marks a tie destination; the fret is copied from the origin.

Pitched ties:

- a bare `-` ties to the note at the **same index** of the previous beat,
- `C4{t}` ties to the previous beat's note with the same pitch.

Give a bare pitched tie its duration via `:N` or `(-).N`, because `-.2` means "tie on string 2".

```alphatex
x.6 x.5 3.4{x} 3.3
```

_Verified (case `note.dead`):_ `x.string` or `{x}` = dead (muted) note. Checks: x.6 = true; {x} = true; {x} keeps the fret = 3.

```alphatex
3.3.2 -.3.2 | (1.1 3.2 2.3).2 (-.1 -.2 -.3).2
```

_Verified (case `note.tie`):_ `-.string` = tie from the previous note on that string. Checks: isTieDestination = true; fret copied from origin = 3; origin linked = the expected Note; chord tie = true.

```alphatex
3.3.2 3.3{t}.2 5.3.2 5.3{-}.2
```

_Verified (case `note.tie-effect`):_ `{t}` (or `{-}`) on a note with value = tie. Checks: {t} = true; {-} = true.

```alphatex
3.3.1 | -.3.2 r.2
```

_Verified (case `note.tie-across-bar`):_ ties work across bar lines. Checks: bar 2 tie = true; origin in bar 1 = the expected Note.

```alphatex
:2 C4 - | (C4 E4) (- E4{t}) | C4 C4{t}
```

_Verified (case `note.tie-pitched`):_ pitched ties: bare `-` (matched by index in the chord) or `{t}` on the repeated pitch; use :N for durations. Checks: bar 1 tie = true; bar 1 tie pitch = 60; bar 2 note 1 = true; bar 2 note 2 = true; bar 3 = true.

```alphatex
C4.2 (-).2
```

_Verified (case `note.tie-pitched-paren`):_ a bare pitched tie with a duration needs parentheses: `(-).2`. Checks: tie = true; duration = Duration.Half.

---

## 10. Note properties

| Property                             | Arguments                                                                                                     | Model (`note.*`)                                                             | Notes                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `nh`                                 | -                                                                                                             | `harmonicType` = Natural, `harmonicValue` from the fret                      | fret 12 -> 12, 7 -> 7, 5 -> 5, 3 -> 3.2, 2 -> 2.4 ...                                     |
| `ah` `th` `ph` `sh` `fh`             | `[value]`                                                                                                     | `harmonicType` = Artificial / Tap / Pinch / Semi / Feedback, `harmonicValue` | value defaults to 0; decimal values need `( )`                                            |
| `v` / `vw`                           | -                                                                                                             | `vibrato` = Slight / Wide                                                    |                                                                                           |
| `sl` / `ss`                          | -                                                                                                             | `slideOutType` = Legato / Shift, `slideTarget`                               | target = next note on the same string, otherwise silently removed                         |
| `sib` / `sia`                        | -                                                                                                             | `slideInType` = IntoFromBelow / IntoFromAbove                                |                                                                                           |
| `sou` / `sod`                        | -                                                                                                             | `slideOutType` = OutUp / OutDown                                             |                                                                                           |
| `psu` / `psd`                        | -                                                                                                             | `slideOutType` = PickSlideUp / PickSlideDown                                 |                                                                                           |
| `h`                                  | -                                                                                                             | `isHammerPullOrigin`, `hammerPullDestination`                                | next note on the same string (or a left-hand-tapped note); hammer vs. pull from the frets |
| `lht`                                | -                                                                                                             | `isLeftHandTapped`                                                           |                                                                                           |
| `g`                                  | -                                                                                                             | `isGhost`                                                                    |                                                                                           |
| `ac` / `hac` / `ten`                 | -                                                                                                             | `accentuated` = Normal / Heavy / Tenuto                                      | (`tn` does not exist)                                                                     |
| `st`                                 | -                                                                                                             | `isStaccato`                                                                 |                                                                                           |
| `pm`                                 | -                                                                                                             | `isPalmMute`                                                                 |                                                                                           |
| `lr`                                 | -                                                                                                             | `isLetRing`                                                                  |                                                                                           |
| `x`                                  | -                                                                                                             | `isDead`                                                                     |                                                                                           |
| `t` (alias `-`)                      | -                                                                                                             | `isTieDestination`                                                           |                                                                                           |
| `tr`                                 | `fret` \| `(fret 16\|32\|64)`                                                                                 | `trillValue` (= fret + string pitch), `trillFret`, `trillSpeed`              | default speed 16; on pitched staves the value is a MIDI note                              |
| `turn` `iturn` `umordent` `lmordent` | -                                                                                                             | `ornament`                                                                   |                                                                                           |
| `string`                             | -                                                                                                             | `showStringNumber`                                                           |                                                                                           |
| `hide`                               | -                                                                                                             | `isVisible` = false                                                          | still played                                                                              |
| `lf` / `rf`                          | `1-5`                                                                                                         | `leftHandFinger` / `rightHandFinger` = Thumb, Index, Middle, Annular, Little | right hand renders p i m a c                                                              |
| `acc`                                | `default forceNone forceNatural forceSharp forceDoubleSharp forceFlat forceDoubleFlat` or `d - n # ## x b bb` | `accidentalMode`                                                             |                                                                                           |
| `slur`                               | `id` (identifier or string)                                                                                   | `slurOrigin` / `slurDestination`                                             | the same id on the start and end note                                                     |
| `b`                                  | `(values...)` with optional leading `type`, `style`                                                           | `bendPoints`, `bendType`, `bendStyle`                                        | quarter tones, evenly spread                                                              |
| `be`                                 | `(offset value ...)` with optional `type`, `style`                                                            | same                                                                         | exact offsets 0..60                                                                       |

Beat properties may also be written in a note's block. They then apply to that note's beat.

### 10.1 Harmonics

**Harmonic value -> sounding pitch.** The value is converted into a semitone offset (`Note.harmonicPitch`):

| harmonicValue | +semitones |     | harmonicValue | +semitones |
| ------------- | ---------- | --- | ------------- | ---------- |
| 2.4           | 36         |     | <= 10         | 34         |
| 2.7           | 34         |     | <= 11         | 0          |
| < 3           | 0          |     | <= 12         | 12         |
| <= 3.5        | 31         |     | < 14          | 0          |
| <= 4          | 28         |     | <= 15         | 34         |
| <= 5          | 24         |     | <= 16         | 28         |
| <= 6          | 34         |     | <= 17         | 36         |
| <= 7          | 19         |     | <= 18         | 0          |
| <= 8.5        | 36         |     | <= 19         | 19         |
| <= 9          | 28         |     | <= 21         | 0          |
|               |            |     | <= 22         | 36         |
|               |            |     | <= 24         | 24         |

- **Natural harmonics** sound at the open-string pitch plus the offset.
- **All other harmonic types** sound at the fretted pitch plus the offset.

The website's table for this differs in places (for example `<= 5`). The code above is what 1.8.4 does.

```alphatex
12.3{nh} 5.3{ah} 5.3{th} 5.3{ph} 5.3{sh} 5.3{fh}
```

_Verified (case `nfx.harmonics`):_ `nh` natural, `ah` artificial, `th` tapped, `ph` pinch, `sh` semi, `fh` feedback. Checks: types = [HarmonicType.Natural, HarmonicType.Artificial, HarmonicType.Tap, HarmonicType.Pinch, HarmonicType.Semi, HarmonicType.Feedback]; nh value = fret-based (12) = 12; ah without value = 0 = 0.

```alphatex
5.3{ah 12} 5.3{th 17} 2.3{ph 7} 5.3{sh 12} 5.3{fh 24} 7.3{nh} 5.3{nh}
```

_Verified (case `nfx.harmonics-values`):_ `ah/th/ph/sh/fh value`: harmonic value (fret offset where the harmonic is touched). Checks: harmonicValue = [12, 17, 7, 12, 24, 7, 5].

```alphatex
0.3{ah (2.4)} 0.3{ah (3.2)}
```

_Verified (case `nfx.harmonic-decimal`):_ decimal harmonic values need parentheses (e.g. 2.4, 3.2 for the 2nd/3rd fret harmonics). Checks: value = 2.4.

```alphatex
12.3{nh} 7.3{nh} 5.3{nh} 5.3{ah 12} 5.3{ph 7}
```

_Verified (case `nfx.harmonic-pitch`):_ sounding pitch: natural = open string + offset(value); artificial/pinch/tap/semi/feedback = fretted pitch + offset(value). Checks: realValue (G3 string = 55) = [67, 74, 79, 72, 79].

### 10.2 Vibrato, slides, hammer-on / pull-off, tapping

```alphatex
3.3{v}.2 3.3{vw}.2
```

_Verified (case `nfx.vibrato`):_ `v` slight / `vw` wide vibrato on the note. Checks: v = VibratoType.Slight; vw = VibratoType.Wide.

```alphatex
5.3{sl} 7.3 5.3{ss} 7.3
```

_Verified (case `nfx.slide-legato`):_ `sl` legato slide / `ss` shift slide to the next note on the same string. Checks: sl = SlideOutType.Legato; slide target = the expected Note; ss = SlideOutType.Shift.

```alphatex
5.3{sib} 5.3{sia} 5.3 5.3
```

_Verified (case `nfx.slide-in`):_ `sib` slide in from below, `sia` slide in from above. Checks: sib = SlideInType.IntoFromBelow; sia = SlideInType.IntoFromAbove.

```alphatex
5.3{sou} 5.3{sod} 5.3{psu} 5.3{psd}
```

_Verified (case `nfx.slide-out`):_ `sou`/`sod` slide out up/down, `psu`/`psd` pick slide up/down. Checks: slideOutType = [SlideOutType.OutUp, SlideOutType.OutDown, SlideOutType.PickSlideUp, SlideOutType.PickSlideDown].

```alphatex
5.3{sib sl} 7.3{sod}
```

_Verified (case `nfx.slide-combined`):_ slide in + slide out on one note. Checks: in = SlideInType.IntoFromBelow; out = SlideOutType.Legato.

```alphatex
5.3{h} 7.3 7.3{h} 5.3
```

_Verified (case `nfx.hammer`):_ `h` hammer-on / pull-off to the next note on the same string (direction from the frets). Checks: origin = true; destination = the expected Note; pull-off origin = true.

```alphatex
:16 12.1{h} 15.1{lht} 12.1{h} 15.1{lht}
```

_Verified (case `nfx.lht`):_ `lht` left-hand tapped note. Checks: isLeftHandTapped = true.

### 10.3 Ghost, accents, staccato, palm mute, let ring

```alphatex
3.3{g} 3.3
```

_Verified (case `nfx.ghost`):_ `g` ghost note (parenthesized). Checks: isGhost = true.

```alphatex
3.3{ac} 3.3{hac} 3.3{ten} 3.3
```

_Verified (case `nfx.accents`):_ `ac` accent, `hac` heavy accent (marcato), `ten` tenuto. Checks: accentuated = [AccentuationType.Normal, AccentuationType.Heavy, AccentuationType.Tenuto, AccentuationType.None].

```alphatex
3.3{st} 3.3
```

_Verified (case `nfx.staccato`):_ `st` staccato. Checks: isStaccato = true.

```alphatex
3.6{pm}.8 3.6{pm}.8 3.6{pm}.8 3.6.8
```

_Verified (case `nfx.palmmute`):_ `pm` palm mute (consecutive notes form one P.M. line). Checks: isPalmMute = true.

```alphatex
0.4{lr} 2.3{lr} 2.2{lr} 0.1{lr}
```

_Verified (case `nfx.letring`):_ `lr` let ring. Checks: isLetRing = true.

### 10.4 Trill and ornaments

```alphatex
5.3{tr 7}.2 5.3{tr (7 32)}.4 5.3{tr (7 64)}.4
```

_Verified (case `nfx.trill`):_ `tr fret [16|32|64]` trill with the given fret and speed (default 16th). Checks: trillFret = 7; default speed = Duration.Sixteenth; 32 = Duration.ThirtySecond; 64 = Duration.SixtyFourth; isTrill = true.

```alphatex
C5{tr 74}.2
```

_Verified (case `nfx.trill-pitched`):_ on pitched staves the trill value is the MIDI note to alternate with. Checks: trillValue = 74.

```alphatex
C5{turn}.4 C5{iturn}.4 C5{umordent}.4 C5{lmordent}.4
```

_Verified (case `nfx.ornaments`):_ `turn`, `iturn` (inverted turn), `umordent` (upper), `lmordent` (lower). Checks: ornament = [NoteOrnament.Turn, NoteOrnament.InvertedTurn, NoteOrnament.UpperMordent, NoteOrnament.LowerMordent].

### 10.5 String number, hidden notes, fingering, accidentals, slurs

```alphatex
5.3{string} 5.4{string}
```

_Verified (case `nfx.string`):_ `string` show the string number above the note. Checks: showStringNumber = true.

```alphatex
(3.3 5.2{hide}).2 3.3.2
```

_Verified (case `nfx.hide`):_ `hide` note is not displayed (still played). Checks: isVisible = false.

```alphatex
:8 1.2{lf 1} 2.3{lf 2} 3.4{lf 3} 4.5{lf 4} 0.1{rf 1} 0.1{rf 2} 0.1{rf 3} 0.1{rf 4}
```

_Verified (case `nfx.fingering`):_ `lf n` left-hand / `rf n` right-hand fingering, n = 1..5 (1 = thumb/p ... 5 = little/c). Checks: lf 1 = Fingers.Thumb; lf 4 = Fingers.AnnularFinger; rf 2 = Fingers.IndexFinger; rf 4 = Fingers.AnnularFinger.

```alphatex
1.1{lf 5} 1.1{rf 5}
```

_Verified (case `nfx.fingering-5`):_ finger 5 = little finger. Checks: lf 5 = Fingers.LittleFinger; rf 5 = Fingers.LittleFinger.

```alphatex
3.3{acc forceSharp} 3.3{acc forceFlat} 3.3{acc forceNatural} 3.3{acc forceNone} 3.3{acc forceDoubleSharp} 3.3{acc forceDoubleFlat} 3.3{acc default}
```

_Verified (case `nfx.acc`):_ `acc` force how the accidental of a fretted/pitched note is spelled. Checks: accidentalMode = [NoteAccidentalMode.ForceSharp, NoteAccidentalMode.ForceFlat, NoteAccidentalMode.ForceNatural, NoteAccidentalMode.ForceNone, NoteAccidentalMode.ForceDoubleSharp, NoteAccidentalMode.ForceDoubleFlat, NoteAccidentalMode.Default].

```alphatex
3.3{acc #} 3.3{acc b} 3.3{acc n} 3.3{acc -} 3.3{acc x} 3.3{acc ##} 3.3{acc bb} 3.3{acc d}
```

_Verified (case `nfx.acc-short`):_ short forms # b n - x ## bb d. Checks: accidentalMode = [NoteAccidentalMode.ForceSharp, NoteAccidentalMode.ForceFlat, NoteAccidentalMode.ForceNatural, NoteAccidentalMode.ForceNone, NoteAccidentalMode.ForceDoubleSharp, NoteAccidentalMode.ForceDoubleSharp, NoteAccidentalMode.ForceDoubleFlat, NoteAccidentalMode.Default].

```alphatex
(3.3{slur s1} 5.4).4 7.3.8 8.3.8 10.3{slur s1}.2
```

_Verified (case `nfx.slur`):_ `slur id` on the start note and again on the end note. Checks: origin = true; destination = the expected Note; isSlurDestination = true.

```alphatex
C4{slur "phrase 1"} D4 E4 F4{slur "phrase 1"}
```

_Verified (case `nfx.slur-string-id`):_ slur ids can be strings. Checks: isSlurDestination = true.

```alphatex
(5.2{h} 5.3{v} 7.4{pm}).4 (7.2 5.3 7.4).4
```

_Verified (case `nfx.chord-note-effects`):_ each note of a chord carries its own effects. Checks: note 1 h = true; note 2 v = VibratoType.Slight; note 3 pm = true.

```alphatex
7.3{h g st ac lf 2}.8 9.3.8
```

_Verified (case `nfx.multiple`):_ any number of properties in one block. Checks: h g st = true; ac = AccentuationType.Normal; lf 2 = Fingers.IndexFinger.

### 10.6 Bends `b` and `be`

Values are **quarter tones**: 1 = 1/4 tone, 2 = half step, 4 = full step, 8 = two steps. Decimals are allowed inside
`( )`.

- `b` spreads the points over the note duration (offsets 0..60).
- `be` takes explicit `offset value` pairs.

Optional prefixes inside the list:

- **type**: `custom bend release bendRelease hold prebend prebendBend prebendRelease`,
- **style**: `default gradual fast`. `gradual` prints "grad." and bends over the note; `fast` uses
  `settings.player.songBookBendDuration`.

Without a type (or with `custom`), alphaTab infers the type from 2, 3 or 4 points. Five or more points stay `custom`.
**Release** and **hold** are inferred only on a **tied** note that continues a bend (`-.3{b (4 0)}`). On an untied note,
`(4 0)` becomes a pre-bend release.

```alphatex
7.3{b (0 4)}.2 7.3.2
```

_Verified (case `nfx.bend`):_ `b (values...)`: bend values in quarter tones (4 = full, 2 = half, 1 = quarter), spread over the note. Checks: offsets = [0, 60]; values = [0, 4]; auto-detected type = BendType.Bend.

```alphatex
7.3{b (0 4 0)}.2 7.3.2
```

_Verified (case `nfx.bend-release`):_ bend and release in one note. Checks: bendType = BendType.BendRelease.

```alphatex
7.3{b (4 4)}.2 7.3{b (4 0)}.2 | 7.3{b (2 4)}.1
```

_Verified (case `nfx.bend-prebend`):_ pre-bend (4 4), pre-bend + release (4 0), pre-bend + bend (2 4). Checks: prebend = BendType.Prebend; prebendRelease = BendType.PrebendRelease; prebendBend = BendType.PrebendBend.

```alphatex
7.3{b (0 4)}.4 -.3{b (4 4)}.4 -.3{b (4 0)}.2
```

_Verified (case `nfx.bend-hold-release`):_ tied continuation: hold (4 4) and release (4 0) on tied notes. Checks: hold = BendType.Hold; release = BendType.Release.

```alphatex
7.3{b (bend 0 4)} 7.3{b (release 4 0)} 7.3{b (bendRelease 0 4 4 0)} 7.3{b (hold 4 4)} |
7.3{b (prebend 4 4)} 7.3{b (prebendBend 2 4)} 7.3{b (prebendRelease 4 0)} 7.3{b (custom 0 4 0 4 0)}
```

_Verified (case `nfx.bend-types`):_ explicit types: bend release bendRelease hold prebend prebendBend prebendRelease custom. Checks: bendType = [BendType.Bend, BendType.Release, BendType.BendRelease, BendType.Hold, BendType.Prebend, BendType.PrebendBend, BendType.PrebendRelease, BendType.Custom].

```alphatex
7.3{b (bend gradual 0 4)}.2 7.3{b (fast 0 4)}.2
```

_Verified (case `nfx.bend-style`):_ style: default | gradual ("grad." text, bend over the whole note) | fast (fixed duration). Checks: gradual = BendStyle.Gradual; fast = BendStyle.Fast.

```alphatex
7.3{b (bend default 0 4)}.2 7.3.2
```

_Verified (case `nfx.bend-style-default`):_ explicit default style. Checks: bendStyle = BendStyle.Default.

```alphatex
7.3{b (0 1)} 7.3{b (0 2)} 7.3{b (0 6)} 7.3{b (0 8)}
```

_Verified (case `nfx.bend-quarter`):_ quarter (1), half (2), 1.5 (6) and 2 (8) steps. Checks: values = [1, 2, 6, 8].

```alphatex
7.3{be (0 0 15 4 45 4 60 0)}.1
```

_Verified (case `nfx.be`):_ `be (offset value ...)` exact bend points, offset 0..60. Checks: offsets (4 points kept) = [0, 15, 45, 60]; type = BendType.BendRelease.

```alphatex
7.3{be (bend fast 0 0 30 4)}.2 7.3.2
```

_Verified (case `nfx.be-typed`):_ `be (type style offset value ...)`. Checks: type = BendType.Bend; style = BendStyle.Fast; offsets = [0, 30].

```alphatex
7.3{be (0 0 15.6 4)}.4
```

_Verified (case `nfx.be-decimal`):_ decimal offsets/values inside ( ). Checks: offset = 15.6.

---

## 11. Version history and legacy syntax

### 11.1 What changed (alphaTex-relevant), from the release notes and commits

| Version                     | alphaTex changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.5.0** (2025-05)         | multi-bar rests (`\multiBarRest`); header/footer **templates and alignment** for `\title` ... `\copyright` (the template-only tags `\wordsAndMusic` / `\copyright2` belong to this feature); `\barlineLeft` / `\barlineRight` styles; full MusicXML dynamics set for `dy`; key signatures per staff                                                                                                                                                                                                |
| **1.6.0** (2025-06)         | `\sync` sync points for external audio/video (PR #2131)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **1.7.0 / 1.7.1** (2025-12) | **new AST-based lexer/parser/importer** (PR #2339), with diagnostics carrying codes AT001-AT400 and a language server (PR #2379). **The `.` section separators became optional** and **arguments follow a function-call style**: one value bare, several values in `( )` (unparenthesized still works, with warnings). Also: `AlphaTexExporter` (PR #2262), beat-level `lyrics` (PR #2281), clef names and aliases (PR #2282), MIDI `bank` (PR #2286), hiding tempo markings via `hide` (PR #2340) |
| **1.8.0** (2026-01)         | `\voiceMode barWise` (PR #2429); `\extendBarLines`; `\chordDiagramsInScore`; `\hideEmptyStaves` and `\hideEmptyStavesInFirstSystem` (`\showSingleStaffBrackets` is also in 1.8.4); `tp` takes **marks 1-5 + `buzzRoll`** (PR #2476); `\defaultBarNumberDisplay` / `\barNumberDisplay` (PR #2482); `\beaming` (PR #2489); multi-system slurs; "swapped" properties-before-values restricted to `\chord` (PR #2409)                                                                                  |
| 1.8.1 - 1.8.4               | no alphaTex syntax changes in the release notes; rendering and player fixes only                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 11.2 Legacy forms still accepted by 1.8.4

The new parser is deliberately backwards compatible. Old syntax imports, usually with a hint or warning diagnostic.
Do **not** use these forms in new fixtures, but your loader may meet them in files from the wild:

| Legacy form                                                         | Diagnostic    | Canonical 1.8.4 form                                  |
| ------------------------------------------------------------------- | ------------- | ----------------------------------------------------- |
| `.` between header / content / sync points                          | AT400 hint    | omit                                                  |
| `\ts 3 4`, `\track "A" "B"`, `\title "T" "tpl" left`, `\sync 0 0 0` | AT301 warning | `\ts (3 4)` ...                                       |
| `{tu 3 2}`, `{b 0 4}`, `{tr 5 16}`, `{tb dive gradual (0 -8)}`      | AT303 warning | `{tu (3 2)}`, `{b (0 4)}`, `{tb (dive gradual 0 -8)}` |
| `3.3.8 * 3 {tu 3}` (multiplier before effects)                      | AT304 warning | `3.3.8{tu 3} * 3`                                     |
| `\tuning E4 B3 G3 D3 A2 E2 hide`                                    | AT301 + AT305 | `\tuning (...) {hide}`                                |
| `\tuning (E4 ... "Name")`                                           | AT305         | `\tuning (...) {label "Name"}`                        |
| `\chord {props} "Name" 0 1 ...`                                     | AT301 + AT302 | `\chord ("Name" 0 1 ...) {props}`                     |
| `tp 8 / 16 / 32` (speed)                                            | none          | `tp 1 / 2 / 3` (marks)                                |
| `\instrument X` as a staff tag                                      | none          | `\track {instrument X}`                               |
| `\db`                                                               | none          | `\barlineRight lightLight`                            |
| `\simile none`                                                      | none          | omit `\simile`                                        |
| `{-}` note property                                                 | none          | `{t}`                                                 |
| clef numbers `0 43 48 60 65`, triplet feel numbers `0-6`            | none          | names                                                 |

```alphatex
\title "Old style"
.
3.3 5.3 7.3 8.3
.
\sync (0 0 0)
```

_Verified (case `legacy.dots`, accepted with AT400 hint):_ pre-1.7 `.` separators between header, content and sync points: still parsed, hint AT400. Checks: title = "Old style"; beats = 4.

```alphatex
3.3 5.3 .
```

_Verified (case `legacy.trailing-dot`):_ a trailing `.` after the last beat (old "end of content" separator) is accepted silently. Checks: beats = 2.

```alphatex
\title "Song" "Title: %TITLE%" left
\track "Guitar" "Gt"
\ts 3 4
3.3 5.3 7.3
```

_Verified (case `legacy.meta-args-unparenthesized`, accepted with AT301 warning):_ several metadata arguments without ( ): works, warning AT301. Checks: shortName = "Gt"; ts = 3.

```alphatex
3.3{tu 3 2} 3.3{b 0 4 0} 3.3{tr 5 16}
```

_Verified (case `legacy.prop-args-unparenthesized`, accepted with AT303 warning):_ several property arguments without ( ): works, warning AT303. Checks: tuplet = 2; bend type = BendType.BendRelease; trill = 5.

```alphatex
3.3.2{tb dive gradual (0 -8)} 3.3.2
```

_Verified (case `legacy.tb-flat`, accepted with AT303 warning):_ old `tb type style (points)` spelling (type/style outside the list): warning AT303. Checks: type = WhammyType.Dive; style = BendStyle.Gradual.

```alphatex
3.3.8 * 3 {tu 3} 5.3.4 5.3.2
```

_Verified (case `legacy.multiplier-before-effects`, accepted with AT304 warning):_ pre-1.7 position of `* N` (before the beat effects): works, warning AT304. Checks: beat 3 tuplet = 3.

```alphatex
\tuning E4 B3 G3 D3 A2 E2 hide
3.3
```

_Verified (case `legacy.tuning-hide-arg`, accepted with AT301 warning, AT305 warning):_ old `hide` as tuning value: works, warnings AT301 + AT305 (use `{hide}`). Checks: perTrackDisplayTuning = false.

```alphatex
\tuning (E4 B3 G3 D3 A2 D2 "Drop D")
0.6
```

_Verified (case `legacy.tuning-name-arg`, accepted with AT305 warning):_ old tuning name as last value: works, warning AT305 (use `{label "..."}`). Checks: name = "Drop D".

```alphatex
\chord {showDiagram false} "Am" 0 1 2 2 0 x
\ts (4 4)
(0.1 1.2 2.3 2.4 0.5){ch "Am"}
```

_Verified (case `legacy.chord-props-first`, accepted with AT301 warning, AT302 warning):_ chord properties before unparenthesized values (only allowed for `\chord`): AT301 + AT302. Checks: showDiagram = false; strings = [0, 1, 2, 2, 0, -1].

```alphatex
\chord {firstFret 5} ("A5" 5 7 7 x x x)
(5.1 7.2 7.3){ch "A5"}
```

_Verified (case `legacy.chord-props-first-parens`):_ props before a parenthesized value list: accepted silently. Checks: firstFret = 5.

```alphatex
3.3.4{tp 8} 3.3.4{tp 16} 3.3.4{tp 32}
```

_Verified (case `legacy.tp-speed`):_ pre-1.8 tremolo speed values 8/16/32 map to 1/2/3 marks. Checks: marks = [1, 2, 3].

```alphatex
\instrument distortionGuitar
\tuning (E4 B3 G3 D3 A2 E2)
3.3
```

_Verified (case `legacy.instrument-tag`):_ staff-level `\instrument` tag (deprecated: use `\track {instrument ...}`); no diagnostic. Checks: program = 30.

```alphatex
\simile none C4
```

_Verified (case `legacy.simile-none`):_ `\simile none` (deprecated value; simply omit `\simile`). Checks: simileMark = SimileMark.None.

```alphatex
3.3.2 3.3{-}.2
```

_Verified (case `legacy.tie-dash-prop`):_ hidden alias: `{-}` = `{t}`. Checks: isTieDestination = true.

```alphatex
C4 C4 C4 C4
\sync 0 0 0
\sync 0 0 1500 0.5
```

_Verified (case `legacy.sync-unparenthesized`, accepted with AT301 warning):_ `\sync` values without ( ): warning AT301. Checks: syncPoints = 2.

---

## 12. Diagnostics

Diagnostics are on `importer.lexerDiagnostics`, `importer.parserDiagnostics` and `importer.semanticDiagnostics`.
Each has `{ code, severity (0 Hint, 1 Warning, 2 Error), message, start/end {line, col, offset} }`.

- **Any Error-severity diagnostic aborts the import.**
- Lexer and parser errors throw `UnsupportedFormatError`, with `.cause` an `AlphaTexErrorWithDiagnostics`.
- Semantic errors throw `AlphaTexErrorWithDiagnostics` directly. If no valid content was found at all, the import throws
  `UnsupportedFormatError("No alphaTex data found")` instead.
- Warnings and hints never throw.

| Code        | Severity                     | Meaning                                                                                              |
| ----------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| AT001-AT006 | Error                        | lexer: bad comment start, `\` without name, bad `\u` escape, unsupported escape, unterminated string |
| AT200       | Error                        | missing number after `*`                                                                             |
| AT201       | Error                        | missing number after `:`                                                                             |
| AT202       | Error                        | unexpected token                                                                                     |
| AT203       | Error                        | unexpected end of file                                                                               |
| AT204       | Error (fatal for the parser) | unknown metadata tag                                                                                 |
| AT205       | Error                        | unknown property in `{}`                                                                             |
| AT206       | Error                        | `( ... )` or `{ ... }` not closed                                                                    |
| AT207       | Error                        | fretted note without string                                                                          |
| AT208       | Error                        | string number out of range (e.g. no tuning)                                                          |
| AT209       | Error                        | invalid value (enum value, duration, tuplet, articulation name, tuning pitch, trill speed ...)       |
| AT211       | Error                        | value out of range (`\ts`, `\ae`, fingers, instrument program)                                       |
| AT212       | Error                        | unrecognized property (semantic phase)                                                               |
| AT213       | Error                        | invalid color format (only for formats that throw; CSS names silently give `null`)                   |
| AT214       | Error                        | `be`/`tbe` needs pairs of `offset value`                                                             |
| AT218       | Error                        | wrong note kind for this staff                                                                       |
| AT219       | Error                        | arguments match no signature                                                                         |
| AT220       | Error                        | unexpected extra arguments                                                                           |
| AT300       | Warning                      | arguments given to a tag that takes none                                                             |
| AT301       | Warning                      | metadata arguments should be in `( )`                                                                |
| AT302       | Warning                      | metadata arguments should come before properties                                                     |
| AT303       | Warning                      | property arguments should be in `( )`                                                                |
| AT304       | Warning                      | beat multiplier should come after the beat effects                                                   |
| AT305       | Warning                      | value should be given as a property (`\tuning ... hide` / name)                                      |
| AT400       | Hint                         | `.` separators can be removed                                                                        |

AT210, AT215-AT217 and AT306 are defined in the enum but never emitted by 1.8.4.

---

## 13. Traps and gotchas

Each item below is a verified case. Several of them are silent: no error is reported.

### 13.1 Syntax traps

```alphatex-invalid
3.3.8{pm}
```

_Verified to fail (case `trap.note-effect-after-duration`, AT205: "Unrecognized property 'pm'."):_ after `.duration` only BEAT properties are accepted -> write `3.3{pm}.8`.

```alphatex-invalid
\track "Drums" {instrument percussion}
38.4
```

_Verified to fail (case `trap.perc-number-duration`, AT218: "Wrong note kind 'Fretted' for staff with note kind ''Articulation'. Do not mix incompatible staves and notes."):_ `38.4` is read as fret 38 on string 4 (AT218); write `(38).4` or `:4 38`.

```alphatex-invalid
C4.2 -.2
```

_Verified to fail (case `trap.pitched-tie-duration`, AT218: "Wrong note kind 'Fretted' for staff with note kind ''Pitched'. Do not mix incompatible staves and notes."):_ `-.2` is read as "tie on string 2" (AT218); write `(-).2`.

```alphatex-invalid
3.3 C4
```

_Verified to fail (case `trap.mixed-note-kinds`, AT218: "Wrong note kind 'Pitched' for staff with note kind ''Fretted'. Do not mix incompatible staves and notes."):_ a staff holds ONE note kind (fretted, pitched or percussion) (AT218).

```alphatex-invalid
3.7
```

_Verified to fail (case `trap.string-range`, AT208: "Note string is out of range. Available range: 1-6"):_ string number beyond the tuning (AT208).

```alphatex
\tuning piano
C4 D4 E4 F4
```

_Verified (case `trap.tuning-swallow`, accepted with AT301 warning):_ unparenthesized `\tuning` consumes following note names as tuning values: the notes are LOST (only warning AT301). Write `\tuning (piano)`. Checks: bar is empty - notes swallowed = true.

```alphatex-invalid
\chord "C" 0 1 0 2 3 x
(0.1 1.2 0.3 2.4 3.5){ch "C"}
```

_Verified to fail (case `trap.chord-unparenthesized-swallow`, AT205: "Unrecognized property 'ch'."):_ unparenthesized `\chord` values greedily eat the following `( )` beat -> AT205; always write `\chord ("C" ...)`.

```alphatex
:8 {tu 3} C4 C4 C4.4 C4
```

_Verified (case `trap.tuplet-not-reset-by-dot-duration`):_ a running `:N {tu ...}` tuplet is only ended by the next `:N`, not by `.N`. Checks: beat 4 still in tuplet = 3.

```alphatex-invalid
C4 C4{tempo 112.5} C4
```

_Verified to fail (case `trap.beat-tempo-decimal`, AT206: "Unexpected end of file. Group not closed."):_ unlike `\tempo 112.5`, the beat property reads only integers without ( ): AT206/AT202.

```alphatex
\lyrics "[Verse] Do Re"
C4 D4 E4
```

_Verified (case `trap.lyrics-comment-space`):_ a space after a `[comment]` creates an empty first syllable: lyrics shift by one beat. Checks: beat 1 empty = ""; beat 2 = "Do".

### 13.2 Semantic traps (silent)

```alphatex
\track "Guitar" {instrument "Acoustic Steel Guitar"}
\tuning (E4 B3 G3 D3 A2 E2)
3.3
```

_Verified (case `trap.instrument-unknown-name`):_ unknown GM names silently become program 0 (piano). Correct name: "Acoustic Guitar Steel". Checks: program = 0.

```alphatex-invalid
\track "Keys" {instrument acousticGrandPiano}
3.3
```

_Verified to fail (case `trap.fretted-needs-strings`, AT208: "Note string is out of range. Available range: 1-0"):_ fret.string notes need a stringed program (24-43, 15, 105-107, 110) or an explicit `\tuning (...)`: here 0 strings (AT208).

```alphatex
\track "Guitar" {color "red"}
3.3
```

_Verified (case `trap.color-name`):_ CSS color NAMES are not parsed: track.color becomes null silently; use "#RRGGBB"/"rgb(...)". Checks: track.color = null.

```alphatex-invalid
\track "Drums" {instrument percussion}
KickHit SnareHit
```

_Verified to fail (case `trap.perc-names-need-defaults`, AT209: "Unexpected percussion articulation value 'kickhit', expected: oneOf()."):_ after `instrument percussion`, names only work once `\articulation defaults` (or custom ones) are declared (AT209).

```alphatex
\track "Drums" {instrument percussion}
\articulation defaults
SnareHit3
```

_Verified (case `trap.perc-legacy-alias-broken`):_ 1.8.4 bug: legacy aliases "Snare (hit) 3" and "Tinkle Bell (hat)" resolve to an UNDEFINED articulation without any diagnostic. Checks: articulation = undefined.

```alphatex
\tuning (piano)
C4
```

_Verified (case `trap.piano-tuning-display-transpose`):_ `\tuning (piano)` on the default guitar track keeps program 25 and its -12 display transposition; set `\track {instrument ...}` instead. Checks: program = 25; displayTranspositionPitch = -12.

```alphatex
\staff {tabs}
C4 D4
```

_Verified (case `trap.tabs-on-pitched`):_ a staff without strings never shows tablature: `{tabs}` alone on pitched notes leaves NOTHING visible. Checks: showTablature = false; showStandardNotation = false.

```alphatex
\track "Piano" {instrument acousticGrandPiano}
\staff {score}
C5 D5 E5 F5
\staff {score}
\lyrics "La la la la"
C3 D3 E3 F3
```

_Verified (case `trap.lyrics-first-staff`):_ `\lyrics` always attach to staff 1 / voice 1 of the track, wherever the tag is written. Checks: staff 1 has the lyrics = "La"; staff 2 none = null.

```alphatex
5.3{h} 5.2
```

_Verified (case `trap.hammer-no-target`):_ `h`/`sl`/`ss` need a following note on the SAME string, otherwise they are silently dropped. Checks: isHammerPullOrigin reset = false.

```alphatex
\ts (4 4)
C4.1 C4.1 C4.1
```

_Verified (case `trap.overfull-bar`):_ bar lengths are NOT validated: an overfull bar imports without any diagnostic. Checks: 3 whole notes in a 4/4 bar = 3.

```alphatex
\ts (4 4)
\beaming (4 1 1 1 1)
C4.8 * 8
```

_Verified (case `trap.beaming-quarter`):_ 1.8.4 bug: `\beaming (4 ...)` is stored under Duration.QuadrupleWhole (-4), so the rule does not apply; use (8 2 2 2 2). Checks: stored under -4 = [1, 1, 1, 1]; has a rule for Duration.Quarter = false.

### 13.3 Stale or incorrect statements in the official docs and definitions (as of 1.8.4)

`verify-official-examples.mjs` imports every example of the official language definitions (the same examples feed the
LSP hover docs and the website):

187 examples were extracted from `packages/alphatex/src/**/*.ts` and imported: **5 fail**, 25 import with warnings or hints, 157 are clean.

| Definition file           | Example | Result                   | Cause                                                                                                         |
| ------------------------- | ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `metadata/bar/ae.ts`      | #1      | **fails** (AT209, AT218) | the TS template literal contains `\rc`, which JS turns into CR + "c" (also visible on the website)            |
| `metadata/bar/jump.ts`    | #1      | **fails** (AT209, AT218) | the TS template literal contains `\rc`, which JS turns into CR + "c" (also visible on the website)            |
| `metadata/staff/chord.ts` | #5      | **fails** (AT205)        | Unrecognized property 'showfingers'.                                                                          |
| `properties/beat/p.ts`    | #1      | **fails** (AT218)        | Wrong note kind 'Fretted' for staff with note kind ''Articulation'. Do not mix incompatible staves and notes. |
| `properties/beat/s.ts`    | #1      | **fails** (AT218)        | Wrong note kind 'Fretted' for staff with note kind ''Articulation'. Do not mix incompatible staves and notes. |

Imported with warnings/hints (they use unparenthesized arguments, the pre-1.7 multiplier position or `.` separators): `metadata/bar/ac.ts` #1 (AT301), `metadata/bar/section.ts` #1 (AT301), `metadata/bar/sync.ts` #1 (AT301), `metadata/bar/ts.ts` #1 (AT301), `metadata/score/firstsystemtracknamemode.ts` #1 (AT301), `metadata/score/firstsystemtracknameorientation.ts` #1 (AT301), `metadata/score/multibarrest.ts` #1 (AT301), `metadata/score/multitracktracknamepolicy.ts` #1 (AT301), `metadata/score/othersystemtracknamemode.ts` #1 (AT301), `metadata/score/othersystemtracknameorientation.ts` #1 (AT301), `metadata/score/singletracktracknamepolicy.ts` #1 (AT301), `metadata/staff/chord.ts` #1 (AT301), `metadata/staff/chord.ts` #6 (AT400), `metadata/staff/lyrics.ts` #3 (AT301), `metadata/staff/tuning.ts` #1 (AT301), `metadata/structural/staff.ts` #1 (AT301), `metadata/structural/track.ts` #1 (AT301), `properties/beat/barre.ts` #1 (AT303), `properties/beat/dy.ts` #1 (AT301), `properties/beat/fermata.ts` #1 (AT303), `properties/beat/lyrics.ts` #1 (AT303), `properties/beat/rasg.ts` #1 (AT304), `properties/beat/tu.ts` #1 (AT303), `properties/note/t.ts` #2 (AT400), `properties/note/tr.ts` #1 (AT303).

The website check (`verify-website-examples.mjs`) fetched the alphaTex pages of https://alphatab.net/docs/alphatex/ (which say version 1.8.4). It skipped 177 "Syntax" signature blocks and imported the remaining 179 example code blocks: **4 fail** (staff-metadata #16, bar-metadata #7, bar-metadata #23, beat-properties #12; these are the same broken examples as above) and 24 import with warnings or hints.

Additional findings:

- The `\tuning` example (`metadata/staff/tuning.ts` #1, only warning AT301) writes `\tuning piano` followed by
  `C4 D4 E4 F4` on the next line. In 1.8.4 this **silently swallows the notes** (`trap.tuning-swallow`).
- `chord.ts` #5 uses `showfingers`; the property is `showFingering`.
- `s.ts` / `p.ts` (slap/pop) start with `(3 4)`. That is a percussion note group (ids 3 and 4), which turns the staff into
  a percussion staff before the fretted notes follow.
- The `\track` instrument example uses `"Acoustic Steel Guitar"`, which maps to program 0 (`trap.instrument-unknown-name`).
  The GM name is `Acoustic Guitar Steel`.
- The articulation table in `packages/alphatex/src/metadata/staff/articulation.ts` (also on the website) still lists
  some pre-rename names and numbers (e.g. `Hand (hit)` = 60). The importer uses `PercussionMapper`; use the table in
  [15.1](#151-percussion-articulations).
- The `\beaming` documentation proposes `(4 1 1 1 1)`, which does not work in 1.8.4 (`trap.beaming-quarter`).
- The harmonic value table in the note-property docs differs from the code (see [10.1](#101-harmonics)).

---

## 14. What alphaTex cannot express

These constructs **do not exist** in alphaTex 1.8.4. They are verified to fail, or there is no syntax for them at all.
Many correspond to Guitar Pro or alphaTab-model features that OpenTabz cannot write in fixtures and must cover with GP
files or model-level tests instead:

| Feature (Guitar Pro / model)                                                                                                                                 | Status in alphaTex 1.8.4                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Per-element **colors / styles** (note, beat, bar, voice, track styles in the model: `NoteStyle`, `BeatStyle`, `BarStyle`, `TrackStyle`, `ScoreStyle` colors) | not expressible (`{color}` -> AT205). Only the UI track color `\track {color ...}` and header/footer templates exist            |
| Custom **note heads** (`note.noteHead`), note-head centering                                                                                                 | not expressible                                                                                                                 |
| Custom **percussion articulations** (own note head, staff line, technique symbol, output note)                                                               | only aliasing built-in ids via `\articulation ("name" id)`                                                                      |
| Explicit **line / page breaks** (`track.lineBreaks` from GP)                                                                                                 | not expressible; use `\systemsLayout` / track `systemsLayout` (bars per system)                                                 |
| **Tempo ramps** (GP linear tempo transitions, accel./rit. curves)                                                                                            | not expressible; only stepwise `\tempo` / `{tempo}` (all `isLinear = false`)                                                    |
| **Volume / pan transitions** with a chosen shape or length                                                                                                   | only point automations on beats (`{volume}`, `{balance}`; the importer always sets `isLinear = true` for them, with no control) |
| **Nested tuplets**                                                                                                                                           | not expressible (one ratio per beat)                                                                                            |
| Additive / irrational **time signatures** (2+3/8, 4/3)                                                                                                       | not expressible (`\ts` numerator 1-32, power-of-two denominators)                                                               |
| Mid-bar **clef / key / time-signature** changes                                                                                                              | not expressible (bar-level only)                                                                                                |
| **Triple dots**                                                                                                                                              | not expressible (`d`, `dd` only)                                                                                                |
| **Partial capo**, multiple tunings per staff                                                                                                                 | not expressible (`\capo fret` only)                                                                                             |
| **Chord diagram fingering per string**, chord diagram from a voicing on another staff                                                                        | `\chord` has frets + barre + visibility flags only                                                                              |
| **Section/marker colors**                                                                                                                                    | not expressible (`\section` marker + text)                                                                                      |
| **Free-positioned text**, text styles/fonts                                                                                                                  | only `txt` above a beat                                                                                                         |
| **Wah-wah amount / automation**                                                                                                                              | only `waho` / `wahc`                                                                                                            |
| **RSE / sound settings, effect chains, audio tracks, backing tracks**                                                                                        | not expressible (`score.backingTrack` comes only from GP8 files)                                                                |
| Track **port**, explicit MIDI **channels**                                                                                                                   | not expressible (channels auto-assigned; percussion gets channel 10)                                                            |
| `track.isVisibleOnMultiTrack`, per-track chord-diagram / tuning visibility beyond `{hide}`                                                                   | not expressible                                                                                                                 |
| Global stylesheet flags `globalDisplayTuning`, `globalDisplayChordDiagramsOnTop`, `perTrackChordDiagramsOnTop`                                               | not expressible (the exporter comments list them as unsupported)                                                                |
| Beat `overrideDisplayDuration`, note `durationPercent`                                                                                                       | not expressible                                                                                                                 |
| Lyrics on voice 2+ / other staves via `\lyrics`                                                                                                              | only staff 1 / voice 1; use beat-level `{lyrics}` elsewhere                                                                     |
| Bar-length validation                                                                                                                                        | none (overfull/underfull bars import silently)                                                                                  |

```alphatex-invalid
3.3{color "#FF0000"}
```

_Verified to fail (case `gap.color`, AT205: "Unrecognized property 'color'."):_ no per-note/beat/bar colors in alphaTex (AT205 unrecognized property).

```alphatex-invalid
3.3{noteHead diamond}
```

_Verified to fail (case `gap.notehead`, AT205: "Unrecognized property 'noteHead'."):_ no custom note heads (AT205).

```alphatex-invalid
C4.1 | \lineBreak C4.1
```

_Verified to fail (case `gap.linebreak`, AT204: "Unrecognized metadata 'lineBreak'."):_ no explicit line/page breaks (AT204, unknown metadata aborts parsing).

```alphatex-invalid
\fine C4
```

_Verified to fail (case `gap.fine-tag`, AT204: "Unrecognized metadata 'fine'."):_ there are no `\fine`, `\segno`, `\coda` tags; use `\jump fine`, `\jump segno`, `\jump coda` (AT204).

```alphatex-invalid
\bank 2
C4
```

_Verified to fail (case `gap.bank-tag`, AT204: "Unrecognized metadata 'bank'."):_ `\bank` is NOT a metadata tag in 1.8.4 (AT204); use `\track {bank 2}` or `{bank 2}` on a beat.

```alphatex-invalid
3.3{tn}
```

_Verified to fail (case `gap.tn`, AT205: "Unrecognized property 'tn'."):_ there is no `tn`; tenuto is `ten`.

```alphatex-invalid
3.3{u}
```

_Verified to fail (case `gap.u-stroke`, AT205: "Unrecognized property 'u'."):_ there is no `u`/`d` stroke; `d` means dotted. Use `su`/`sd` (pick) or `bu`/`bd` (brush).

```alphatex-invalid
:4 {d} C4
```

_Verified to fail (case `gap.dot-in-duration-change`, AT205: "Unrecognized property 'd'."):_ dots cannot be set via `:N {...}` (only `tu` is allowed there).

```alphatex-invalid
\ts ("2+3" 8)
C4
```

_Verified to fail (case `gap.ts-additive`, AT219: "Error parsing arguments: no overload matched arguments (String, Number). Signatures:"):_ no additive/compound numerators like 2+3/8 (AT219).

```alphatex-invalid
\ts (5 6)
C4
```

_Verified to fail (case `gap.ts-denominator`, AT211: "Value is out of valid range. Allowed range: 1, 2, 4, 8, 16, 32, 64, 128, Actual Value: 6"):_ denominator must be 1|2|4|8|16|32|64|128 (AT211).

```alphatex-invalid
C4{tu 4}
```

_Verified to fail (case `gap.tu-invalid`, AT209: "Unexpected default tuplet value '4', expected: 3, 5, 6, 7, 9, 10, 11 or 12"):_ single-number tuplet must be 3,5,6,7,9,10,11,12; use (n d) otherwise (AT209).

```alphatex-invalid
C4{tp 6}
```

_Verified to fail (case `gap.tp-invalid`, AT209: "Unexpected tremolo marks value '6, expected: 0-5, or legacy: 8, 16 or 32"):_ tremolo marks 1-5 (or legacy 8/16/32) (AT209).

```alphatex-invalid
3.3{tr (5 8)}
```

_Verified to fail (case `gap.tr-invalid`, AT209: "Unexpected trill duration value '8', expected: 16, 32 or 64"):_ trill speed must be 16, 32 or 64 (AT209).

```alphatex-invalid
3.3{lf 6}
```

_Verified to fail (case `gap.finger-invalid`, AT211: "Value is out of valid range. Allowed range: 1-5, Actual Value: 6"):_ fingers are 1-5 (AT211).

```alphatex-invalid
\ae 32 C4
```

_Verified to fail (case `gap.ae-range`, AT211: "Value is out of valid range. Allowed range: %s, Actual Value: %s"):_ alternate endings 1-31 (AT211).

```alphatex
\tempo 100
C4 C4{tempo 105} C4{tempo 110} C4{tempo 115}
```

_Verified (case `trap.tempo-steps`):_ no tempo ramps (accel./rit. curves): only stepwise changes, every automation has isLinear = false. Checks: all isLinear false = true; four steps = 4.

```alphatex
:8 {tu 3} C4 C4.16{tu 5} C4 C4
```

_Verified (case `trap.nested-tuplet`):_ no nested tuplets: a beat has exactly one ratio; the inner `tu` replaces the outer one. Checks: beat 2 = 5:4 only = 5; beat 3 back to 3:2 = 3.

---

## 15. Appendix: tables

### 15.1 Percussion articulations

Built-in names that `\articulation defaults` registers (`PercussionMapper` @ 1.8.4). Each row was verified at build time
by importing both the string form and the identifier form, and by checking the numeric id. The _Id_ is what a bare
number note means. _GM output note_ is the MIDI key that is played. Ids 29-34 and 91-127 are Guitar Pro specific.

| Name (string form)        | Identifier form     | Id (numeric note)                   | GM output note | Element            | Staff line |
| ------------------------- | ------------------- | ----------------------------------- | -------------- | ------------------ | ---------- |
| `"Snare (hit)"`           | `SnareHit`          | 38                                  | 38             | Snare              | 3          |
| `"Snare (side stick)"`    | `SnareSideStick`    | 37                                  | 37             | Snare              | 3          |
| `"Snare (rim shot)"`      | `SnareRimShot`      | 91                                  | 38             | Snare              | 3          |
| `"Hi-Hat (closed)"`       | `HiHatClosed`       | 42                                  | 42             | Charley            | -1         |
| `"Hi-Hat (half)"`         | `HiHatHalf`         | 92                                  | 46             | Charley            | -1         |
| `"Hi-Hat (open)"`         | `HiHatOpen`         | 46                                  | 46             | Charley            | -1         |
| `"Pedal Hi-Hat (hit)"`    | `PedalHiHatHit`     | 44                                  | 44             | Charley            | 9          |
| `"Kick (hit)"`            | `KickHit`           | 35                                  | 35             | Acoustic Kick Drum | 8          |
| `"Kick (hit) 2"`          | `KickHit2`          | 36                                  | 36             | Kick Drum          | 7          |
| `"High Floor Tom (hit)"`  | `HighFloorTomHit`   | 50                                  | 50             | Tom Very High      | 1          |
| `"High Tom (hit)"`        | `HighTomHit`        | 48                                  | 48             | Tom High           | 2          |
| `"Mid Tom (hit)"`         | `MidTomHit`         | 47                                  | 47             | Tom Medium         | 4          |
| `"Low Tom (hit)"`         | `LowTomHit`         | 45                                  | 45             | Tom Low            | 5          |
| `"Very Low Tom (hit)"`    | `VeryLowTomHit`     | 43                                  | 43             | Tom Very Low       | 6          |
| `"Ride (edge)"`           | `RideEdge`          | 93                                  | 51             | Ride               | 0          |
| `"Ride (middle)"`         | `RideMiddle`        | 51                                  | 51             | Ride               | 0          |
| `"Ride (bell)"`           | `RideBell`          | 53                                  | 53             | Ride               | 0          |
| `"Ride (choke)"`          | `RideChoke`         | 94                                  | 51             | Ride               | 0          |
| `"Splash (hit)"`          | `SplashHit`         | 55                                  | 55             | Splash             | -2         |
| `"Splash (choke)"`        | `SplashChoke`       | 95                                  | 55             | Splash             | -2         |
| `"China (hit)"`           | `ChinaHit`          | 52                                  | 52             | China              | -3         |
| `"China (choke)"`         | `ChinaChoke`        | 96                                  | 52             | China              | -3         |
| `"Crash high (hit)"`      | `CrashHighHit`      | 49                                  | 49             | Crash High         | -2         |
| `"Crash high (choke)"`    | `CrashHighChoke`    | 97                                  | 49             | Crash High         | -2         |
| `"Crash medium (hit)"`    | `CrashMediumHit`    | 57                                  | 57             | Crash Medium       | -1         |
| `"Crash medium (choke)"`  | `CrashMediumChoke`  | 98                                  | 57             | Crash Medium       | -1         |
| `"Cowbell low (hit)"`     | `CowbellLowHit`     | 99                                  | 56             | Cowbell Low        | 1          |
| `"Cowbell low (tip)"`     | `CowbellLowTip`     | 100                                 | 56             | Cowbell Low        | 1          |
| `"Cowbell medium (hit)"`  | `CowbellMediumHit`  | 56                                  | 56             | Cowbell Medium     | 0          |
| `"Cowbell medium (tip)"`  | `CowbellMediumTip`  | 101                                 | 56             | Cowbell Medium     | 0          |
| `"Cowbell high (hit)"`    | `CowbellHighHit`    | 102                                 | 56             | Cowbell High       | -1         |
| `"Cowbell high (tip)"`    | `CowbellHighTip`    | 103                                 | 56             | Cowbell High       | -1         |
| `"Woodblock low (hit)"`   | `WoodblockLowHit`   | 77                                  | 77             | Woodblock Low      | -9         |
| `"Woodblock high (hit)"`  | `WoodblockHighHit`  | 76                                  | 76             | Woodblock High     | -10        |
| `"Bongo High (hit)"`      | `BongoHighHit`      | 60                                  | 60             | Bongo High         | -4         |
| `"Bongo High (mute)"`     | `BongoHighMute`     | 104                                 | 60             | Bongo High         | -5         |
| `"Bongo High (slap)"`     | `BongoHighSlap`     | 105                                 | 60             | Bongo High         | -6         |
| `"Bongo Low (hit)"`       | `BongoLowHit`       | 61                                  | 61             | Bongo Low          | -7         |
| `"Bongo Low (mute)"`      | `BongoLowMute`      | 106                                 | 61             | Bongo Low          | -8         |
| `"Bongo Low (slap)"`      | `BongoLowSlap`      | 107                                 | 61             | Bongo Low          | -16        |
| `"Timbale low (hit)"`     | `TimbaleLowHit`     | 66                                  | 66             | Timbale Low        | 10         |
| `"Timbale high (hit)"`    | `TimbaleHighHit`    | 65                                  | 65             | Timbale High       | 9          |
| `"Agogo low (hit)"`       | `AgogoLowHit`       | 68                                  | 68             | Agogo Low          | 12         |
| `"Agogo high (hit)"`      | `AgogoHighHit`      | 67                                  | 67             | Agogo High         | 11         |
| `"Conga low (hit)"`       | `CongaLowHit`       | 64                                  | 64             | Conga Low          | 17         |
| `"Conga low (slap)"`      | `CongaLowSlap`      | 108                                 | 64             | Conga Low          | 16         |
| `"Conga low (mute)"`      | `CongaLowMute`      | 109                                 | 64             | Conga Low          | 15         |
| `"Conga high (hit)"`      | `CongaHighHit`      | 63                                  | 63             | Conga High         | 14         |
| `"Conga high (slap)"`     | `CongaHighSlap`     | 110                                 | 63             | Conga High         | 13         |
| `"Conga high (mute)"`     | `CongaHighMute`     | 62                                  | 62             | Conga High         | 19         |
| `"Whistle low (hit)"`     | `WhistleLowHit`     | 72                                  | 72             | Whistle Low        | -11        |
| `"Whistle high (hit)"`    | `WhistleHighHit`    | 71                                  | 71             | Whistle High       | -17        |
| `"Guiro (hit)"`           | `GuiroHit`          | 73                                  | 73             | Guiro              | 38         |
| `"Guiro (scrap-return)"`  | `GuiroScrapReturn`  | 74                                  | 74             | Guiro              | 37         |
| `"Surdo (hit)"`           | `SurdoHit`          | 86                                  | 86             | Surdo              | 36         |
| `"Surdo (mute)"`          | `SurdoMute`         | 87                                  | 87             | Surdo              | 35         |
| `"Tambourine (hit)"`      | `TambourineHit`     | 54                                  | 54             | Tambourine         | 3          |
| `"Tambourine (return)"`   | `TambourineReturn`  | 111                                 | 54             | Tambourine         | 2          |
| `"Tambourine (roll)"`     | `TambourineRoll`    | 112                                 | 54             | Tambourine         | 1          |
| `"Tambourine (hand)"`     | `TambourineHand`    | 113                                 | 54             | Tambourine         | -7         |
| `"Cuica (open)"`          | `CuicaOpen`         | 79                                  | 79             | Cuica              | 30         |
| `"Cuica (mute)"`          | `CuicaMute`         | 78                                  | 78             | Cuica              | 29         |
| `"Vibraslap (hit)"`       | `VibraslapHit`      | 58                                  | 58             | Vibraslap          | 28         |
| `"Triangle (hit)"`        | `TriangleHit`       | 81                                  | 81             | Triangle           | 27         |
| `"Triangle (mute)"`       | `TriangleMute`      | 80                                  | 80             | Triangle           | 26         |
| `"Grancassa (hit)"`       | `GrancassaHit`      | 114                                 | 43             | Grancassa          | 25         |
| `"Piatti (hit)"`          | `PiattiHit`         | 115                                 | 49             | Piatti             | 18         |
| `"Piatti (hand)"`         | `PiattiHand`        | 116                                 | 49             | Piatti             | 24         |
| `"Cabasa (hit)"`          | `CabasaHit`         | 69                                  | 69             | Cabasa             | 23         |
| `"Cabasa (return)"`       | `CabasaReturn`      | 117                                 | 69             | Cabasa             | 22         |
| `"Castanets (hit)"`       | `CastanetsHit`      | 85                                  | 85             | Castanets          | 21         |
| `"Claves (hit)"`          | `ClavesHit`         | 75                                  | 75             | Claves             | 20         |
| `"Left Maraca (hit)"`     | `LeftMaracaHit`     | 70                                  | 70             | Left Maraca        | -12        |
| `"Left Maraca (return)"`  | `LeftMaracaReturn`  | 118                                 | 70             | Left Maraca        | -13        |
| `"Right Maraca (hit)"`    | `RightMaracaHit`    | 119                                 | 70             | Right Maraca       | -14        |
| `"Right Maraca (return)"` | `RightMaracaReturn` | 120                                 | 70             | Right Maraca       | -15        |
| `"Shaker (hit)"`          | `ShakerHit`         | 82                                  | 82             | Shaker             | -23        |
| `"Shaker (return)"`       | `ShakerReturn`      | 122                                 | 82             | Shaker             | -24        |
| `"Bell Tree (hit)"`       | `BellTreeHit`       | 84                                  | 53             | Bell Tree          | -18        |
| `"Bell Tree (return)"`    | `BellTreeReturn`    | 123                                 | 53             | Bell Tree          | -19        |
| `"Jingle Bell (hit)"`     | `JingleBellHit`     | 83 (number resolves to Tinkle Bell) | 53             | Jingle Bell        | -20        |
| `"Tinkle Bell (hit)"`     | `TinkleBellHit`     | 83                                  | 53             | Tinkle Bell        | -20        |
| `"Golpe (thumb)"`         | `GolpeThumb`        | 124                                 | 62             | Golpe              | -21        |
| `"Golpe (finger)"`        | `GolpeFinger`       | 125                                 | 62             | Golpe              | -22        |
| `"Hand Clap (hit)"`       | `HandClapHit`       | 39                                  | 39             | Hand Clap          | 3          |
| `"Electric Snare (hit)"`  | `ElectricSnareHit`  | 40                                  | 40             | Electric Snare     | 3          |
| `"Snare (side stick) 2"`  | `SnareSideStick2`   | 31                                  | 40             | Sticks             | 3          |
| `"Low Floor Tom (hit)"`   | `LowFloorTomHit`    | 41                                  | 41             | Very Low Floor Tom | 5          |
| `"Ride (edge) 2"`         | `RideEdge2`         | 59                                  | 59             | Ride Cymbal 2      | 2          |
| `"Ride (middle) 2"`       | `RideMiddle2`       | 126                                 | 59             | Ride Cymbal 2      | 2          |
| `"Ride (bell) 2"`         | `RideBell2`         | 127                                 | 59             | Ride Cymbal 2      | 2          |
| `"Ride (choke) 2"`        | `RideChoke2`        | 29                                  | 59             | Ride Cymbal 2      | 2          |
| `"Reverse Cymbal (hit)"`  | `ReverseCymbalHit`  | 30                                  | 49             | Reverse Cymbal     | -3         |
| `"Metronome (hit)"`       | `MetronomeHit`      | 33                                  | 37             | Metronome          | 3          |
| `"Metronome (bell)"`      | `MetronomeBell`     | 34                                  | 38             | Metronome          | 3          |

Legacy aliases (also registered by `\articulation defaults`). Two of them are broken in 1.8.4:

| Name (string form)       | Identifier form   | Id (numeric note) | GM output note                      | Element        | Staff line |
| ------------------------ | ----------------- | ----------------- | ----------------------------------- | -------------- | ---------- |
| `"Hand (hit)"`           | `HandHit`         | -                 | 61                                  | Bongo Low      | -7         |
| `"Tinkle Bell (hat)"`    | `TinkleBellHat`   | -                 | **broken** (undefined articulation) | -              | -          |
| `"Cymbal (hit)"`         | `CymbalHit`       | -                 | 49                                  | Reverse Cymbal | -3         |
| `"Snare (side stick) 3"` | `SnareSideStick3` | -                 | 37                                  | Snare          | 3          |
| `"Snare (hit) 2"`        | `SnareHit2`       | -                 | 38                                  | Snare          | 3          |
| `"Snare (hit) 3"`        | `SnareHit3`       | -                 | **broken** (undefined articulation) | -              | -          |
| `"Agogo tow (hit)"`      | `AgogoTowHit`     | -                 | 68                                  | Agogo Low      | 12         |
| `"Triangle (rnute)"`     | `TriangleRnute`   | -                 | 80                                  | Triangle       | 26         |
| `"Hand (mute)"`          | `HandMute`        | -                 | 60                                  | Bongo High     | -5         |
| `"Hand (slap)"`          | `HandSlap`        | -                 | 60                                  | Bongo High     | -6         |
| `"Hand (mute) 2"`        | `HandMute2`       | -                 | 61                                  | Bongo Low      | -8         |
| `"Hand (slap) 2"`        | `HandSlap2`       | -                 | 61                                  | Bongo Low      | -16        |
| `"Piatti (hat)"`         | `PiattiHat`       | -                 | 49                                  | Piatti         | 18         |
| `"Bell Tee (return)"`    | `BellTeeReturn`   | -                 | 53                                  | Bell Tree      | -19        |

### 15.2 General MIDI instrument names

`instrument` accepts the program number or one of these names. Matching ignores case and spaces, so
`"Acoustic Grand Piano"` = `acousticGrandPiano` = `acousticgrandpiano`. **Any other name silently gives program 0.**
Every row was verified by import.

|                          |                          |                         |                          |
| ------------------------ | ------------------------ | ----------------------- | ------------------------ |
| 0 `acousticgrandpiano`   | 1 `brightacousticpiano`  | 2 `electricgrandpiano`  | 3 `honkytonkpiano`       |
| 4 `electricpiano1`       | 5 `electricpiano2`       | 6 `harpsichord`         | 7 `clavinet`             |
| 8 `celesta`              | 9 `glockenspiel`         | 10 `musicbox`           | 11 `vibraphone`          |
| 12 `marimba`             | 13 `xylophone`           | 14 `tubularbells`       | 15 `dulcimer`            |
| 16 `drawbarorgan`        | 17 `percussiveorgan`     | 18 `rockorgan`          | 19 `churchorgan`         |
| 20 `reedorgan`           | 21 `accordion`           | 22 `harmonica`          | 23 `tangoaccordion`      |
| 24 `acousticguitarnylon` | 25 `acousticguitarsteel` | 26 `electricguitarjazz` | 27 `electricguitarclean` |
| 28 `electricguitarmuted` | 29 `overdrivenguitar`    | 30 `distortionguitar`   | 31 `guitarharmonics`     |
| 32 `acousticbass`        | 33 `electricbassfinger`  | 34 `electricbasspick`   | 35 `fretlessbass`        |
| 36 `slapbass1`           | 37 `slapbass2`           | 38 `synthbass1`         | 39 `synthbass2`          |
| 40 `violin`              | 41 `viola`               | 42 `cello`              | 43 `contrabass`          |
| 44 `tremolostrings`      | 45 `pizzicatostrings`    | 46 `orchestralharp`     | 47 `timpani`             |
| 48 `stringensemble1`     | 49 `stringensemble2`     | 50 `synthstrings1`      | 51 `synthstrings2`       |
| 52 `choiraahs`           | 53 `voiceoohs`           | 54 `synthvoice`         | 55 `orchestrahit`        |
| 56 `trumpet`             | 57 `trombone`            | 58 `tuba`               | 59 `mutedtrumpet`        |
| 60 `frenchhorn`          | 61 `brasssection`        | 62 `synthbrass1`        | 63 `synthbrass2`         |
| 64 `sopranosax`          | 65 `altosax`             | 66 `tenorsax`           | 67 `baritonesax`         |
| 68 `oboe`                | 69 `englishhorn`         | 70 `bassoon`            | 71 `clarinet`            |
| 72 `piccolo`             | 73 `flute`               | 74 `recorder`           | 75 `panflute`            |
| 76 `blownbottle`         | 77 `shakuhachi`          | 78 `whistle`            | 79 `ocarina`             |
| 80 `lead1square`         | 81 `lead2sawtooth`       | 82 `lead3calliope`      | 83 `lead4chiff`          |
| 84 `lead5charang`        | 85 `lead6voice`          | 86 `lead7fifths`        | 87 `lead8bassandlead`    |
| 88 `pad1newage`          | 89 `pad2warm`            | 90 `pad3polysynth`      | 91 `pad4choir`           |
| 92 `pad5bowed`           | 93 `pad6metallic`        | 94 `pad7halo`           | 95 `pad8sweep`           |
| 96 `fx1rain`             | 97 `fx2soundtrack`       | 98 `fx3crystal`         | 99 `fx4atmosphere`       |
| 100 `fx5brightness`      | 101 `fx6goblins`         | 102 `fx7echoes`         | 103 `fx8scifi`           |
| 104 `sitar`              | 105 `banjo`              | 106 `shamisen`          | 107 `koto`               |
| 108 `kalimba`            | 109 `bagpipe`            | 110 `fiddle`            | 111 `shanai`             |
| 112 `tinklebell`         | 113 `agogo`              | 114 `steeldrums`        | 115 `woodblock`          |
| 116 `taikodrum`          | 117 `melodictom`         | 118 `synthdrum`         | 119 `reversecymbal`      |
| 120 `guitarfretnoise`    | 121 `breathnoise`        | 122 `seashore`          | 123 `birdtweet`          |
| 124 `telephonering`      | 125 `helicopter`         | 126 `applause`          | 127 `gunshot`            |

### 15.3 Default tunings by MIDI program

Applied when a staff with fretted notes has no explicit `\tuning`. Verified by import:

| Program(s)                       | Default tuning (string 1 -> n)                                          | Display transposition | Initial clef |
| -------------------------------- | ----------------------------------------------------------------------- | --------------------- | ------------ |
| 15 (dulcimer)                    | `E4 B3 G3 D3 A2 E2`                                                     | 0                     | G2           |
| 24-31 (guitars)                  | `E4 B3 G3 D3 A2 E2`                                                     | -12                   | G2           |
| 32-39 (basses)                   | `G2 D2 A1 E1`                                                           | -12                   | F4           |
| 40, 44, 45, 48-51 ("violin" set) | `E3 A3 D3 G2`                                                           | 0                     | G2           |
| 41 (viola)                       | `A3 D3 G2 C2`                                                           | 0                     | G2           |
| 42 (cello)                       | `A2 D2 G1 C1`                                                           | 0                     | G2           |
| 43 (contrabass)                  | `G2 D2 A1 E1`                                                           | -12                   | G2           |
| 105 (banjo)                      | `D3 B2 G2 D2 G3`                                                        | 0                     | G2           |
| 106 (shamisen)                   | `A3 E3 A2`                                                              | 0                     | G2           |
| 107 (koto)                       | `E3 A2 D2 G1`                                                           | 0                     | G2           |
| 110 (fiddle)                     | `E4 A3 D3 G2`                                                           | 0                     | G2           |
| any other program                | none: fret.string notes fail with AT208 unless `\tuning (...)` is given | 0                     | G2           |

The violin-family default is unusual: not in descending order, and an octave low. Always give string instruments an
explicit `\tuning`. Bass programs also get an initial bass clef (F4).

### 15.4 Enumerations

Values are case-insensitive. Most can also be written as strings.

| Used by                   | Values                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| text align                | `left center right`                                                                                                                          |
| `\bracketExtendMode`      | `noBrackets groupStaves groupSimilarInstruments`                                                                                             |
| track name policy         | `hidden firstSystem allSystems`                                                                                                              |
| track name mode           | `fullName shortName`                                                                                                                         |
| track name orientation    | `horizontal vertical`                                                                                                                        |
| bar number display        | `allBars firstOfSystem hide`                                                                                                                 |
| `\clef`                   | `G2 F4 C3 C4 Neutral` / `treble bass alto tenor n` / `43 65 48 60 0`                                                                         |
| `\ottava`, `ot`           | `15ma 8va regular 8vb 15mb`                                                                                                                  |
| `\tf`                     | `none triplet16th triplet8th dotted16th dotted8th scottish16th scottish8th` (+ `no notripletfeel t16 t8 d16 d8 s16 s8`, dashed forms, `0-6`) |
| `\simile`                 | `simple firstOfDouble secondOfDouble` (`none` deprecated)                                                                                    |
| bar lines                 | `automatic dashed dotted heavy heavyHeavy heavyLight lightHeavy lightLight none regular short tick`                                          |
| `\accidentals`            | `auto explicit`                                                                                                                              |
| `\voiceMode`              | `staffWise barWise`                                                                                                                          |
| `gr`                      | `beforeBeat onBeat bendGrace` / `bb ob b`                                                                                                    |
| `fermata`                 | `short medium long`                                                                                                                          |
| `barre`                   | `full half`                                                                                                                                  |
| `tp` style                | `default buzzRoll`                                                                                                                           |
| `beam`                    | `invert up down auto split merge splitSecondary`                                                                                             |
| bend type (`b`, `be`)     | `custom bend release bendRelease hold prebend prebendBend prebendRelease`                                                                    |
| whammy type (`tb`, `tbe`) | `custom dive dip hold predive prediveDive`                                                                                                   |
| bend / whammy style       | `default gradual fast`                                                                                                                       |
| `acc`                     | `default forceNone forceNatural forceSharp forceDoubleSharp forceFlat forceDoubleFlat` / `d - n # ## x b bb`                                 |

### 15.5 Defaults

| Item            | Default                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| tempo           | 120 BPM (quarter)                                                        |
| time signature  | 4/4                                                                      |
| key             | C major                                                                  |
| clef            | G2 (F4 for bass programs 32-39)                                          |
| duration        | quarter; persists until changed (across tracks too)                      |
| dynamics        | `f`; persists within a staff, reset per track/staff                      |
| track           | program 25, volume 15, balance 8, 6-string standard tuning, score + tabs |
| staff note kind | from the first note / `\tuning (piano)` / `instrument percussion`        |
| accidental mode | `explicit`                                                               |
| voice mode      | `staffWise`                                                              |

---

## 16. Appendix: verification details

**Files** (all in `scratchpad/alphatex-verify/`):

- `package.json`, `node_modules/` - `npm install @coderline/alphatab@1.8.4`
- `lib.mjs` - `load(tex)` wrapper around `AlphaTexImporter`, which collects all diagnostics
- `caselib.mjs` - case registration and assertion helpers
- `cases-0-examples.mjs` ... `cases-5-gaps.mjs` - the cases (one per construct)
- `percussion-data.mjs` - built-in percussion names (copied from `PercussionMapper.ts`)
- `verify.mjs` - runs all cases, the exporter round trip and the API checks; writes `verify-results.json`
- `verify-official-examples.mjs` - imports every example of the official definitions (`packages/alphatex/src`); writes
  `official-examples-results.json`
- `verify-website-examples.mjs` - fetches the alphatab.net alphaTex pages (in memory) and imports their code blocks;
  writes `website-examples-results.json`
- `build-doc.mjs` + `doc-template-*.md` - generate this document. Examples are inserted from the verified cases, tables
  are built by importing alphaTex, and finally all 324 code blocks of the generated document are re-imported.
- `probe-run.mjs` / `probe-many.mjs` - small helpers to try out snippets: `node probe-run.mjs '3.3{pm}'`

**Case index:**

| Case group | Cases | Passed | Ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `example`  | 5     | 5      | guitar, drums, piano, vocal, glance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `syn`      | 13    | 13     | comments, strings, ident-as-string, case-insensitive, double-backslash, bars, empty-bar, no-separator-dots, floats, negative-numbers, arg-parens, trailing-empty-bars, trailing-rest-bars                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `score`    | 35    | 35     | title, title-template, title-hidden, subtitle, artist, album, words, music, wordsandmusic, copyright, copyright2, tab, instructions, notices, tempo, systemslayout, defaultsystemslayout, hidedynamics, showdynamics, usesystemsignseparator, multibarrest, bracketextendmode, singletracktracknamepolicy, multitracktracknamepolicy, firstsystemtracknamemode, othersystemstracknamemode, firstsystemtracknameorientation, othersystemstracknameorientation, extendbarlines, chorddiagramsinscore, chorddiagramsinscore-false, hideemptystaves, hideemptystavesinfirstsystem, showsinglestaffbrackets, defaultbarnumberdisplay |
| `struct`   | 25    | 25     | implicit, track, track-shortname-default, multi-track, track-props, track-instrument-number, track-instrument-name, track-instrument-ident, track-instrument-percussion, track-bank, track-multibarrest, track-systemslayout, staff-default, staff-score, staff-tabs, staff-slash, staff-numbered, staff-score-lines, grand-staff, voices-2, voices-4, voices-implicit-first, voicemode-barwise, voicemode-staffwise, track-staff-voice-full                                                                                                                                                                                    |
| `staff`    | 23    | 23     | tuning, tuning-7, tuning-bass, tuning-props, tuning-pitched, capo, transpose, displaytranspose, displaytranspose-default, chord, chord-props, chord-name-only, lyrics, lyrics-startbar, lyrics-verses, lyrics-comment, articulation-defaults, articulation-custom, instrument-tag, accidentals-auto, accidentals-explicit, accidentals-scope, tuning-none-voice                                                                                                                                                                                                                                                                 |
| `bar`      | 35    | 35     | ts, ts-common, ts-change, ks, clef, clef-aliases, clef-numeric, ottava, tempo, tempo-label, tempo-position-hide, tempo-multi, section, repeat, alternate-endings, jump, jump-all, jump-multi, ft, tf, tf-all, tf-aliases, ac, simile, barlines, barlines-all, db, sustain-pedal, width, scale, beaming, barnumberdisplay, sync, meta-persistence, ks-all                                                                                                                                                                                                                                                                        |
| `beat`     | 24    | 24     | single, chord, rest, empty, durations, duration-change, duration-remembered, default-duration, dotted, dotted-multiplier, tuplet, tuplet-multiplier, tuplet-group, tuplet-simple-values, tuplet-custom, tuplet-duration-change-ratio, multiplier, multiplier-effects, effects-separate, effects-combined, effects-duration-order, duration-persists-tracks, grace-timing, rest-effects                                                                                                                                                                                                                                          |
| `bfx`      | 49    | 49     | f, fo, vs, v, slap-pop-tap, pickstroke, brush, arpeggio, cre-dec, dy, dy-all, dy-default, sustain, slashed, ds, golpe, wah, legatoorigin, timer, txt, lyrics, ch, gr, gr-long, gr-chord, tempo, tempo-label-hide, volume, balance, instrument, bank, tp, tp-5, barre, rasg, rasg-all, ot, fermata, beam, beam-multiple, tb, tb-dive, tb-types, tb-style, tbe, tbe-typed, tp-default-style, fermata-masterbar, tempo-decimal                                                                                                                                                                                                     |
| `note`     | 23    | 23     | fret-string, fret-string-duration, high-frets, spacing, pitched, pitched-accidentals, pitched-octave-rollover, pitched-lowercase, pitched-range, pitched-chord-duration, perc-number, perc-number-durationchange, perc-name-string, perc-name-ident, perc-auto, perc-effects, perc-all-names, dead, tie, tie-effect, tie-across-bar, tie-pitched, tie-pitched-paren                                                                                                                                                                                                                                                             |
| `nfx`      | 40    | 40     | harmonics, harmonics-values, harmonic-decimal, vibrato, slide-legato, slide-in, slide-out, slide-combined, hammer, lht, ghost, accents, staccato, palmmute, letring, trill, trill-pitched, ornaments, string, hide, fingering, fingering-5, acc, acc-short, slur, slur-string-id, chord-note-effects, multiple, bend, bend-release, bend-prebend, bend-hold-release, bend-types, bend-style, bend-quarter, be, be-typed, be-decimal, bend-style-default, harmonic-pitch                                                                                                                                                         |
| `legacy`   | 15    | 15     | dots, meta-args-unparenthesized, prop-args-unparenthesized, tb-flat, multiplier-before-effects, tuning-hide-arg, tuning-name-arg, chord-props-first, chord-props-first-parens, tp-speed, instrument-tag, simile-none, tie-dash-prop, sync-unparenthesized, trailing-dot                                                                                                                                                                                                                                                                                                                                                         |
| `gap`      | 15    | 15     | color, notehead, linebreak, bank-tag, tn, u-stroke, dot-in-duration-change, ts-additive, ts-denominator, tu-invalid, tp-invalid, tr-invalid, finger-invalid, ae-range, fine-tag                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `trap`     | 23    | 23     | note-effect-after-duration, perc-number-duration, pitched-tie-duration, mixed-note-kinds, string-range, perc-names-need-defaults, chord-unparenthesized-swallow, tuning-swallow, instrument-unknown-name, fretted-needs-strings, color-name, beaming-quarter, lyrics-comment-space, lyrics-first-staff, hammer-no-target, tuplet-not-reset-by-dot-duration, overfull-bar, perc-legacy-alias-broken, piano-tuning-display-transpose, tempo-steps, nested-tuplet, tabs-on-pitched, beat-tempo-decimal                                                                                                                             |

**AlphaTexExporter round trip.** Every passing canonical or legacy case was exported with `AlphaTexExporter` (indent 2)
and re-imported. Failures are exporter limitations in 1.8.4:

- `nfx.harmonic-decimal` (reimport): AT206: Unexpected end of file. Group not closed. / AT202: Unexpected 'RBrace' token. Expected one of following: Number,String,Ident
- `trap.color-name` (export): Cannot read properties of null (reading 'rgba')
- `trap.beaming-quarter` (reimport): AT209: Value is out of valid range. Allowed range: 4,8,16 or 32, Actual Value: -4

In detail:

- The exporter writes fractional harmonic values without parentheses (`{ah 2.4}`), which the importer cannot read back.
- It crashes on a `null` track color.
- It writes the `-4` beaming key produced by the `\beaming (4 ...)` bug.

The exporter's output style is a convenient canonical reference, for example
`3.3{h}.8{dy f}`, `\tuning (E4 B3 G3 D3 A2 E2) {label "..."}`, `\track ("Name" "Short") {...}`, `be (bend 0 0 60 4)`.

**API checks:**

- passed: ScoreLoader.loadAlphaTex works in Node
- passed: parser error -> UnsupportedFormatError with cause AlphaTexErrorWithDiagnostics
- passed: semantic error -> AlphaTexErrorWithDiagnostics thrown directly
- passed: warnings/hints do not throw and are exposed on the importer
