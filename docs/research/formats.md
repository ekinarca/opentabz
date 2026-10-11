# OpenTabz research note A: file format detection and structure

Researched 2026-10-11 for OpenTabz (AGPL-3.0-or-later, built on alphaTab MPL-2.0).
Every claim below was checked against a primary source: official repos, specs, or the source code of
working importers. Where I could not verify something, it is marked **UNVERIFIED** or **FLAG**.
Byte offsets are 0-based. Integers are little-endian unless stated otherwise. All prose is my own;
no importer code is copied here.

Primary sources used most often:

- alphaTab importers, local clone at the v1.8.4 release commit (`packages/alphatab/src/importer/*`),
  plus the published npm package `@coderline/alphatab@1.8.4`. MPL-2.0.
- PyGuitarPro source and docstrings: https://github.com/Perlence/PyGuitarPro (`src/guitarpro/*.py`).
  The docs at pyguitarpro.readthedocs.io are generated from these docstrings. LGPL-3.0.
- MuseScore Studio importers: https://github.com/musescore/MuseScore/tree/main/src/importexport. GPL-3.0.
- TuxGuitar importers: https://github.com/helge17/tuxguitar. LGPL-2.1, per `docs/LICENSE`.
- Power Tab Editor 2: https://github.com/powertab/powertabeditor. GPL-3.0-or-later.
- Sample files: about 90 GP3/4/5 files, about 80 GP7/8 files, and GPX files from alphaTab's `test-data/`,
  which I inspected locally (hex dumps, zip listings, my own BCFZ decoder run).

---

## 0. Summary

1. **Never trust the extension.** Sniff the first bytes. Then, for ZIPs, look at entry names. For text,
   decode it first and then look at the XML root element or the line patterns.
2. **alphaTab 1.8.4 reads:** GP3/4/5, GPX (BCFZ and BCFS), GP7/8 `.gp`, MusicXML (`.xml`/`.musicxml`/`.mxl`,
   partwise and timewise, but not `<opus>`), Capella CapXML (`.capx` zip or raw XML), and alphaTex.
   **It does not read:** GP1/GP2 `.gtp`, Guitar Pro _clipboard_ files, PowerTab, TuxGuitar `.tg`, TablEdit,
   binary Capella `.cap`, Standard MIDI files, ChordPro, or ASCII tab.
3. alphaTab's `ScoreLoader.loadScoreFromBytes` tries each importer in turn: GP3-5, GPX, GP7-8, MusicXML,
   Capella, alphaTex. It moves on only when an importer throws `UnsupportedFormatError`. Our own sniffer
   should pick the importer explicitly, so we get clear error messages and avoid wasted parsing.
4. **alphaTab 1.8.4 has hard safety caps** on GP3-5 input (verified in the published dist): bar count
   ≤ 1000, track count ≤ 100, beats per voice ≤ 100, notice lines ≤ 1000. `maxDecodingBufferSize`
   defaults to 128e6 bytes. **FLAG:** a legitimate GP3-5 file with more than 1000 bars is rejected with an
   `OverflowError`. We should surface that error clearly.
5. Several ZIP-based formats share the `PK\x03\x04` signature: GP7/8, MusicXML `.mxl`, Capella `.capx`,
   MuseScore `.mscz` (which also uses `META-INF/container.xml`), TuxGuitar 2.0 `.tg`, and our `.otz`.
   Telling them apart requires reading the central directory (section 4.5).
6. **Licensing traps for parsers:** ChordSheetJS is **GPL-2.0-only**, which is **incompatible** with
   AGPL-3.0-or-later. `musicxml-interfaces` is AGPL-3.0, which is compatible. Everything else listed in
   section 14 is compatible.

---

## 1. Content-only detection

### 1.1 Signature table

| Format                       | Where      | Signature                                                                                                                     | Strength                             |
| ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Guitar Pro 1 (`.gtp`)        | 0          | length byte (`0x16` for "v1", `0x19` for "v1.0x") + `FICHIER GUITARE PRO v1…`                                                 | strong                               |
| Guitar Pro 2 (`.gtp`)        | 0          | `0x18` + `FICHIER GUITAR PRO v2.20` / `v2.21`                                                                                 | strong                               |
| Guitar Pro 3/4/5             | 0          | `0x18` + `FICHIER GUITAR PRO ` + `v3.00`, `v4.00`, `v4.06`, `L4.06`, `v5.00`, `v5.10`                                         | strong                               |
| GP4/GP5 clipboard (`.tmp`)   | 0          | `0x1D` + `CLIPBOARD GUITAR PRO 4.0 [c6]`; `0x10` + `CLIPBOARD GP 5.0` / `5.1` / `5.2`                                         | strong                               |
| Guitar Pro 6 (`.gpx`)        | 0          | `42 43 46 5A` "BCFZ" (compressed) or `42 43 46 53` "BCFS" (raw)                                                               | strong                               |
| ZIP family                   | 0          | `50 4B 03 04` (an empty zip is `50 4B 05 06`)                                                                                 | container only, see 4.5              |
| Standard MIDI file           | 0          | `4D 54 68 64 00 00 00 06` "MThd" + header length 6                                                                            | strong                               |
| RIFF MIDI (`.rmi`)           | 0 / 8 / 12 | "RIFF" … "RMID" … "data" chunk containing an SMF                                                                              | strong                               |
| Power Tab 1.x (`.ptb`)       | 0          | `70 74 61 62` "ptab" + uint16 version 1–4                                                                                     | strong                               |
| Power Tab Editor 2 (`.pt2`)  | 0          | `1F 8B` gzip, which inflates to JSON                                                                                          | needs inflate                        |
| TuxGuitar ≤1.5 (`.tg`)       | 0          | length byte + UTF-16BE `TuxGuitar File Format - 1.x` (e.g. `1B 00 54 00 75 00 78 …`)                                          | strong                               |
| TuxGuitar 2.x (`.tg`)        | zip        | `version.txt` = `TuxGuitar_file_format 2.0`, plus `content.xml`                                                               | strong                               |
| TablEdit 3 (`.tef`)          | several    | byte 3 = `03`; 0x10–0x17 all zero; 0x38–0x3B = "tbed"; u16@0xCA = 4; 0xCC = `04`; 0xCD = `0A`                                 | strong                               |
| TablEdit ≤2 (`.tef`)         | none       | no magic number                                                                                                               | weak; ask the user                   |
| Capella binary (`.cap`)      | 0          | `cap3-v:` + one letter                                                                                                        | strong                               |
| Capella CapXML (`.capx`)     | zip        | `score.xml` whose root element is `<score>`                                                                                   | strong                               |
| MusicXML                     | text       | root element `score-partwise`, `score-timewise`, or `opus`                                                                    | strong                               |
| MusicXML compressed (`.mxl`) | zip        | first entry `mimetype` = `application/vnd.recordare.musicxml`, or `META-INF/container.xml` whose rootfile has a MusicXML root | strong                               |
| MuseScore (`.mscz`)          | zip        | `META-INF/container.xml` → `*.mscx` with root `<museScore>`                                                                   | strong (so we can reject it cleanly) |
| ChordPro                     | text       | `{directive…}` lines and `[Chord]` tokens inside lyrics                                                                       | heuristic                            |
| ASCII tab                    | text       | clusters of 4–8 aligned staff lines                                                                                           | heuristic                            |
| Chords over lyrics           | text       | chord-only lines alternating with lyric lines                                                                                 | heuristic                            |

### 1.2 Recommended detection order

```
detect(bytes):
  if bytes.length == 0                          -> EMPTY
  if starts "PK\x03\x04" or "PK\x05\x06"        -> detectZip(bytes)            (section 4.5)
  if starts "BCFZ" or "BCFS"                    -> GPX
  if gpHeader(bytes)                            -> GP1..GP5 or GP clipboard   (section 2.1)
  if starts "MThd"                              -> SMF
  if starts "RIFF" and bytes[8..12]=="RMID"     -> RMID, then unwrap the "data" chunk -> SMF
  if starts "ptab"                              -> PowerTab (uint16 at 4 gives 1.0/1.0.2/1.5/1.7)
  if starts "cap3-v:"                           -> Capella binary (unsupported, explain)
  if tgLegacyHeader(bytes)                      -> TuxGuitar <= 1.5 (unsupported, explain)
  if tefV3Header(bytes)                         -> TablEdit 3 (unsupported, explain)
  if starts 1F 8B                               -> gunzip (with a size cap), then run detect() again
                                                   (Power Tab .pt2 is gzip+JSON; gzipped XML also occurs)
  if looksBinary(bytes)                         -> UNKNOWN_BINARY
  text = decodeText(bytes)                                                       (section 5.3)
  if text starts "<" after BOM/whitespace       -> detectXmlRoot(text)  (MusicXML / GPIF / CapXML / mscx / HTML)
  if looksLikeHtml(text)                        -> "this is a web page, not a score" (a common failed download)
  if chordProScore(text) high                   -> ChordPro
  if asciiTabScore(text) high                   -> ASCII tab (may also contain chord lines)
  if chordsOverLyricsScore(text) high           -> chords-over-lyrics sheet
  if alphaTexScore(text) high                   -> alphaTex
  -> UNKNOWN_TEXT
```

Notes on the order:

- ZIP must be checked first. An `.otz` contains a `.gp` payload, a zip inside a zip. Inspect the outer
  container before anything else.
- The GP1–5 check is cheap and very specific. Run it before the text heuristics.
- Run `looksBinary` before decoding text: count NUL and C0 control bytes in the first 4 KB. Be careful:
  UTF-16 text has NUL bytes in every other position, so check for a UTF-16 BOM or pattern first.
- Wrap every parse in hard limits: maximum input size, maximum inflated size, and maximum zip entry count.
  alphaTab already caps decoded buffers at 128 MB. I suggest a lower UI-level cap. The best number
  depends on product decisions.

### 1.3 Real-world junk worth detecting explicitly

These are inferred from the formats, not taken from one specific source.

- **HTML error pages saved with a score extension.** They start with `<!DOCTYPE html` or `<html`. Report
  "download failed" instead of "corrupt file".
- **Zero-byte or truncated downloads.** For GP3-5, alphaTab throws `EndOfReaderError`. Its test suite
  truncates a healthy `.gp5` to exercise this.
- **User-zipped uploads.** A `.zip` holding exactly one `.gp5`, `.gpx`, or `.xml` file. Optionally unwrap
  a single-entry zip, ignoring `__MACOSX/` and AppleDouble `._*` entries (which start with `00 05 16 07`).
- **Renamed files.** A `.gp` that is really GPX or GP5, or a `.xml` that is really an `.mxl`. Content
  sniffing handles these automatically.

---

## 2. Guitar Pro 1–5 binary (`.gtp`, `.gp3`, `.gp4`, `.gp5`)

### 2.1 The header

- Byte 0 holds `n`, the length of the version string.
- Bytes 1..30 are a **fixed 30-byte field**. Only the first `n` bytes are meaningful.
- The header is always **31 bytes**, whatever `n` is, and the next field starts at **offset 31**.
  alphaTab (`gpReadStringByteLength(…, 30)`), PyGuitarPro (`readByteSizeString(30)`), MuseScore, and
  TuxGuitar all read it this way.
- **The padding is not zero-filled.** In 69 of the 90 alphaTab GP3/4/5 test files, the bytes after the
  string contain leftover memory. For example, a GP4 file has `00 00 64 80 A7 02 01` after `v4.06`. Never
  require zero padding.
- Cheap sanity check: in a FICHIER file the next field is an IntByteSizeString (the title), so
  `int32LE(@31) == byte(@35) + 1`. This held for all 90 test files. It does **not** apply to CLIPBOARD
  files, where clipboard integers come first.
- Recommended predicate:
  - `1 <= n <= 30`
  - `ascii(bytes[1..1+n])` starts with `FICHIER GUITAR PRO `, `FICHIER GUITARE PRO `,
    `CLIPBOARD GUITAR PRO `, or `CLIPBOARD GP `
  - then parse the version number

**Version strings.** Lengths were computed and match the length byte:

| String (n)                                           | Product                                                      | Readers that accept it                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FICHIER GUITARE PRO v1` (22), `…v1.01`–`v1.04` (25) | GP1 `.gtp`                                                   | TuxGuitar (GP1InputStream lists v1–v1.04), MuseScore (GuitarPro1)                                                                                       |
| `FICHIER GUITAR PRO v2.20` / `v2.21` (24)            | GP2 `.gtp`                                                   | TuxGuitar, MuseScore (GuitarPro2)                                                                                                                       |
| `FICHIER GUITAR PRO v3.00` (24)                      | GP3                                                          | all                                                                                                                                                     |
| `FICHIER GUITAR PRO v4.00` / `v4.06` (24)            | GP4                                                          | all                                                                                                                                                     |
| `FICHIER GUITAR PRO L4.06` (24)                      | GP4 variant; "L" is probably a Lite edition (**UNVERIFIED**) | PyGuitarPro and TuxGuitar list it explicitly. alphaTab and MuseScore also accept it, because they skip the character after the prefix (see note below). |
| `FICHIER GUITAR PRO v5.00` / `v5.10` (24)            | GP5                                                          | all. GP 5.2 also writes `v5.10`, so 5.1 and 5.2 look identical.                                                                                         |
| `CLIPBOARD GUITAR PRO 4.0 [c6]` (29)                 | GP4 clipboard                                                | PyGuitarPro only                                                                                                                                        |
| `CLIPBOARD GP 5.0` / `5.1` / `5.2` (16)              | GP5 clipboard `.tmp`                                         | PyGuitarPro only                                                                                                                                        |

Notes on the table:

- PRONOM agrees. Its entry fmt/1872 (GP v1) is `0x19` + "FICHIER GUITARE PRO". Its entry fmt/1873
  (GP v2–5) is `0x18` + "FICHIER GUITAR PRO".
- GP1 is "GUITARE", with an E.
- **How the readers parse the version:**
  - alphaTab accepts any string starting `FICHIER GUITAR PRO `, skips the next character (`v` or `L`),
    and parses the rest as `major.minor`. So `L4.06` works, but alphaTab has no GP1/GP2 layouts and no
    "GUITARE" or CLIPBOARD support.
  - MuseScore first requires "FIC" at bytes 1–3, then strips the prefix plus one character the same way.
  - TuxGuitar and PyGuitarPro use exact-match tables.
- **Clipboard files:** right after the header, a GP4 clipboard file stores four ints (start/stop measure,
  start/stop track). A GP5 clipboard file adds start beat, stop beat, and a sub-bar-copy flag. Only
  PyGuitarPro reads these files. It treats the `.tmp` extension as GP 5.2.

### 2.2 Primitive types

The names below are PyGuitarPro's (from the `format.rst` doc):

| Type                | Encoding                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------- |
| byte / sbyte / bool | 1 byte                                                                                        |
| short               | int16 LE                                                                                      |
| int                 | int32 LE                                                                                      |
| double              | float64 LE                                                                                    |
| ByteSizeString(k)   | u8 `len`, then a k-byte field of which `len` bytes are used. The total is always `1+k` bytes. |
| IntSizeString       | int32 `len`, then `len` bytes                                                                 |
| IntByteSizeString   | int32 `(len+1)`, then u8 `len`, then `len` bytes. Used for most metadata strings.             |

All strings use **an 8-bit code page with no encoding marker**:

- PyGuitarPro defaults to cp1252.
- alphaTab uses `settings.importer.encoding`, which defaults to `utf-8`. This often yields replacement
  characters for older Western European files.
- MuseScore decodes as UTF-8 if the bytes are valid UTF-8, and otherwise falls back to Latin-1.

**Recommendation:** try strict UTF-8 first (`TextDecoder` with `fatal: true`). On failure, fall back to
windows-1252 and offer a code-page picker (cp1251, Shift_JIS, GBK and so on) in the import dialog.

### 2.3 File layout (from PyGuitarPro's `readSong` docstrings and code)

**GP3**

1. version (31 bytes)
2. info: 8 IntByteSizeStrings (title, subtitle, artist, album, words, copyright, tabbed-by,
   instructions), then int `noticeCount` followed by that many IntByteSizeStrings
3. triplet feel: bool (eighth or none)
4. tempo: int
5. key: int
6. **MIDI channel table:** 64 entries (4 ports × 16 channels) of 12 bytes each, 768 bytes in total.
   Each entry is: int program, then one byte each for volume, balance, chorus, reverb, phaser, tremolo,
   then 2 padding bytes.
7. int measureCount, int trackCount
8. measure headers × measureCount
9. tracks × trackCount
10. measures, stored measure-major: for each measure, all tracks in order

**GP4** is GP3 plus:

- **lyrics**, inserted after the triplet feel: int lyric track, then 5 lines of (int starting measure +
  IntSizeString text)
- an **octave** byte after the key
- 2-byte effect flags (sections 2.6–2.7)
- the new-style chord format
- mix-table flags

**GP5** order. Items marked [5.10] exist only in 5.10 files.

1. version, then the clipboard block if this is a CLIPBOARD file
2. info: **9** strings, with `music` added after `words`, then the notice
3. lyrics (as in GP4)
4. [5.10] **RSE master effect:** int master volume (0–200), int reserved, 11 signed bytes of EQ (10 bands
   plus a gain stage). That is 19 bytes, which alphaTab skips as a block.
5. **page setup:** int width, int height; 4 ints of margins (left, right, top, bottom); int score size %;
   short header/footer visibility flags; 10 IntByteSizeString templates (title, subtitle, artist, album,
   words, music, words&music, copyright line 1, copyright line 2, page number)
6. tempo name (IntByteSizeString), tempo (int), [5.10] hide-tempo (bool)
7. key and octave, 5 bytes. PyGuitarPro reads sbyte key + int octave. alphaTab reads int + byte.
   Same span, different split.
8. MIDI channel table (768 bytes)
9. **directions:** 19 shorts, each a 1-based measure number or -1. Order: Coda, Double Coda, Segno,
   Segno Segno, Fine, Da Capo, DC al Coda, DC al Double Coda, DC al Fine, Da Segno, DS al Coda,
   DS al Double Coda, DS al Fine, Da Segno Segno, DSS al Coda, DSS al Double Coda, DSS al Fine,
   Da Coda, Da Double Coda.
10. master reverb (int). alphaTab just skips these 4 bytes.
11. measureCount, trackCount, measure headers, tracks, then padding: **2 bytes in 5.00, 1 byte in 5.10**
12. measures. Each measure/track pair holds **two voices**, each stored as (int beat count + beats),
    followed by a **line-break byte**. PyGuitarPro defaults this byte to 0 at end of file, so tolerate a
    missing final byte.

### 2.4 Measure headers

**GP3/4 flag byte.** Data follows in bit order.

| Bit    | Meaning                  | Data                                         |
| ------ | ------------------------ | -------------------------------------------- |
| `0x01` | time-signature numerator | byte                                         |
| `0x02` | denominator              | byte                                         |
| `0x04` | repeat open              | flag only                                    |
| `0x08` | repeat close             | byte (count)                                 |
| `0x10` | alternate ending         | byte (an ending _number_)                    |
| `0x20` | marker                   | IntByteSizeString + 4-byte color (RGB + pad) |
| `0x40` | key change               | sbyte root + byte type                       |
| `0x80` | double bar               | flag only                                    |

**GP5 differences:**

- There is 1 padding byte before every header except the first.
- The order is: numerator, denominator, repeat close, marker, key, **then** the alternate-ending byte,
  which is now a **bitmask** (bit k means ending k+1).
- If `0x01` or `0x02` is set, 4 beam-grouping bytes follow.
- If `0x10` is _not_ set, 1 padding byte follows.
- The header ends with a triplet-feel byte: 0 none, 1 eighth, 2 sixteenth.
- The repeat-close count is off by one between versions: alphaTab adds 1 for pre-GP5 files, and
  PyGuitarPro subtracts 1 for GP5. Normalize it per version.
- GP3/4 store the ending _number_. Rebuilding the bitmask needs context: OR together the earlier endings
  since the last repeat-open, as PyGuitarPro does.

### 2.5 Tracks

**GP3/4 track:**

- flags byte: `0x01` drums, `0x02` 12-string, `0x04` banjo
- name: ByteSizeString(40), 41 bytes in total
- int string count
- **7 ints of tuning**, as MIDI note numbers, highest string first. Only `stringCount` of them are used.
- int port
- int channel and int effects channel. Both are stored **1-based**: PyGuitarPro subtracts 1 even though
  its docstring says zero-based. Always range-check them against the 64-entry table.
- int fret count
- int capo fret
- color (4 bytes)

**GP5 track:**

- A padding byte precedes the first track (5.10) or every track (5.00).
- The flags byte adds `0x08` visible, `0x10` solo, `0x20` mute, `0x40` RSE, `0x80` show tuning.
- After the GP3-style fields comes a short of display flags: `0x0001` tab, `0x0002` standard notation,
  `0x0004` diagrams below, `0x0008` rhythm with tab, `0x0010` forced horizontal beams, `0x0020` force
  channels 11–16, `0x0040` diagram list, `0x0080` diagrams in score, `0x0200` auto let-ring,
  `0x0400` auto brush, `0x0800` extend rhythmic.
- Then: byte auto-accentuation, byte MIDI bank, byte humanize, int clef transpose, int secondary clef
  transpose (for grand staves), int unknown (usually -1 or 100), and 12 unknown bytes.
- Then the **RSE instrument**: int instrument, int unknown, int sound bank, and an effect number that is
  a short + 1 byte in 5.00 but an int in 5.10.
- [5.10 only] a 3-band EQ plus gain (4 bytes), then the effect name and category as two
  IntByteSizeStrings.
- PyGuitarPro and MuseScore treat MIDI channel index 9 (channel 10) as percussion, whatever the flags say.

### 2.6 Beats

**Beat flag byte:**

| Bit    | Meaning             |
| ------ | ------------------- |
| `0x01` | dotted              |
| `0x02` | chord diagram       |
| `0x04` | text                |
| `0x08` | beat effects        |
| `0x10` | mix-table change    |
| `0x20` | tuplet              |
| `0x40` | status byte present |

Data follows in this order:

1. [`0x40`] status: `0x00` empty beat, `0x02` rest
2. duration sbyte: −2 whole, −1 half, 0 quarter, 1 eighth, 2 sixteenth, 3 32nd, 4 64th. alphaTab maps
   anything else to a quarter note.
3. [`0x20`] tuplet as an int. alphaTab accepts 3, 5–7, and 9–13, and normalizes anything else to no
   tuplet. MuseScore notes that some files contain values such as 28 or 40.
4. [`0x02`] chord. A header byte selects the GP3 "old" format or the GP4 "new" format. The new format
   has root, type, extension, bass, alteration flags, the name (fixed-size ByteSizeString), frets,
   barres, omissions and, in GP4+, fingering. alphaTab uses 7-string diagrams for version ≥ 4.06.
5. [`0x04`] text, as an IntByteSizeString
6. [`0x08`] beat effects (below)
7. [`0x10`] mix-table change (below)
8. a string mask byte: `0x40` = string 1 (highest) … `0x01` = string 7. One note record follows per set
   bit.
9. [GP5] a short of display flags: beam breaks and directions, ottava `0x0010`, ottava bassa `0x0020`,
   15ma `0x0040`, 15mb `0x0100`, tuplet bracket start/end/force, and break-secondary-beams. Bit `0x0800`
   adds one extra byte.

**Beat effects:**

- GP3 uses one flag byte: `0x01` vibrato, `0x02` wide vibrato, `0x04` natural harmonic, `0x08` artificial
  harmonic, `0x10` fade-in, `0x20` tremolo bar or tap/slap/pop, `0x40` stroke.
  - `0x20` is followed by a byte. 0 means a tremolo-bar int follows; 1 is tap, 2 slap, 3 pop.
  - `0x40` is followed by 2 bytes, one each for the up and down stroke speeds.
- GP4/5 use two flag bytes.
  - First byte: `0x02` wide vibrato, `0x10` fade-in, `0x20` slap, `0x40` stroke.
  - Second byte: `0x01` rasgueado, `0x02` pick stroke, `0x04` tremolo bar.
  - Data order: slap sbyte; tremolo bar, using the same structure as a bend; stroke (2 bytes); pick
    stroke sbyte.

**Mix-table change:**

- **Values:** sbytes for instrument, volume, balance, chorus, reverb, phaser and tremolo, plus an int
  tempo; −1 means unchanged.
  - GP5 inserts a 16-byte RSE instrument after the instrument byte, plus 1 extra byte in 5.00.
  - GP5 also adds an IntByteSizeString tempo name before the tempo.
- **Durations:** one sbyte for each changed item. In 5.10 a hide-tempo bool follows the tempo duration.
- **Flags (GP4+):** "apply to all tracks" bits `0x01`–`0x20`. GP5 adds `0x40` use-RSE and `0x80`
  show-wah.
- **GP5 extras:** a wah sbyte, then [5.10] the RSE effect name and category strings.

### 2.7 Notes

**Note flag byte:**

| Bit    | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| `0x01` | GP3/4: time-independent duration. GP5: duration percent. |
| `0x02` | heavy accent                                             |
| `0x04` | ghost note                                               |
| `0x08` | note effects                                             |
| `0x10` | dynamics                                                 |
| `0x20` | note type + fret present                                 |
| `0x40` | accent                                                   |
| `0x80` | fingering                                                |

**GP3/4 note order:**

1. [`0x20`] type byte: 1 normal, 2 tie, 3 dead
2. [`0x01`] 2 sbytes for duration and tuplet
3. [`0x10`] dynamics sbyte (1..8 maps to ppp..fff)
4. [`0x20`] fret sbyte
5. [`0x80`] 2 sbytes for left-hand and right-hand fingering
6. [`0x08`] effects

**GP5 note order:**

1. [`0x20`] type byte
2. [`0x10`] dynamics sbyte
3. [`0x20`] fret sbyte
4. [`0x80`] fingering (2 sbytes)
5. [`0x01`] a float64 duration percent
6. a second flag byte, **always present**: `0x02` swap accidentals
7. [`0x08`] effects

PyGuitarPro clamps frets to 0–99. For tied notes it takes the fret from the previous note on the same
string.

**Note effects:**

- GP3 uses one flag byte: `0x01` bend, `0x02` hammer/pull, `0x04` slide, `0x08` let-ring, `0x10` grace.
- GP4/5 use two flag bytes.
  - First byte: `0x01` bend, `0x02` hammer/pull, `0x08` let-ring, `0x10` grace.
  - Second byte: `0x01` staccato, `0x02` palm mute, `0x04` tremolo picking, `0x08` slide, `0x10` harmonic,
    `0x20` trill, `0x40` vibrato.
  - Data order: bend, grace, tremolo-picking speed (sbyte), slide, harmonic, trill (fret sbyte + period
    sbyte).

**Effect payloads:**

- **Bend:** type sbyte, value int, then point count int. Each point is: int position (0–60 across the note
  duration), int value (25 units per semitone, the constant both PyGuitarPro and TuxGuitar use), and a
  vibrato bool.
- **Grace:**
  - fret sbyte, dynamic byte
  - transition byte: none, slide, bend or hammer
  - duration byte: 1 = 32nd, 2 = 24th, 3 = 16th
  - [GP5] flag byte: `0x01` dead, `0x02` on-beat
- **Slide:** GP4 uses an sbyte enum. GP5 uses a bitmask: `0x01` shift, `0x02` legato, `0x04` out-down,
  `0x08` out-up, `0x10` in-from-below, `0x20` in-from-above.
- **Harmonic:**
  - GP4 uses an sbyte: 1 natural, 3 tap, 4 pinch, 5 semi; 15/17/22 for artificial harmonics at +5, +7
    or +12 frets.
  - GP5 uses a type byte: 1 natural, 2 artificial, 3 tap, 4 pinch, 5 semi.
    - artificial adds 3 bytes: note, accidental, octave
    - tap adds a fret byte

### 2.8 GP 5.00 vs 5.10, all the places I found

| Area                                      | 5.00                                      | 5.10 (and 5.2)                                                      |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| RSE master effect after the lyrics        | absent                                    | 19 bytes                                                            |
| hide-tempo bool after the tempo           | absent                                    | present                                                             |
| padding before tracks                     | before every track                        | before the first track only                                         |
| padding after the track list              | 2 bytes                                   | 1 byte                                                              |
| RSE instrument effect number              | short + 1 byte                            | int                                                                 |
| per-track EQ and RSE effect name/category | absent                                    | present                                                             |
| mix table                                 | extra blank byte after the RSE instrument | hide-tempo bool after tempo duration; RSE effect strings at the end |

### 2.9 Real-world problems and quirks

- **Truncated files** are the most common problem.
  - alphaTab throws `EndOfReaderError` mid-file.
  - PyGuitarPro tolerates a missing final line-break byte.
  - Suggestion: offer "import what was readable", which would need a patched or wrapped importer.
- **Wrong code page in metadata and lyrics** (section 2.2).
- **Out-of-range values:**
  - tuplet values like 28 or 40 (MuseScore keeps the raw value)
  - unknown durations
  - frets ≥ 100
  - channel indexes outside 1–64
  - a lyrics track index outside the track list
- **Ties without a matching earlier note** on the same string. MuseScore logs "tied note not found" and
  drops the tie.
- **GP5 does not store let-ring on tied notes.** MuseScore carries let-ring forward from the start of the
  tie.
- **Incomplete or overfull bars:** Guitar Pro allows bar lengths that don't match the time signature.
  MuseScore sets the measure length from the content.
- **Percussion detection:** the drum flag and channel 10 can disagree.
- **Clipboard `.tmp` files** look like scores but hold extra header ints. Only PyGuitarPro reads them.
- **Hostile input:** absurd counts are a denial-of-service risk. alphaTab caps them (section 0). Do the
  same in any custom code.

### 2.10 Parsers (JS/TS unless noted)

| Library                        | License                                   | Notes                                          | Compatible with AGPL-3.0-or-later?                                                      |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| alphaTab `Gp3To5Importer`      | MPL-2.0                                   | GP3–5 only. No GP1/2, no clipboard.            | **Yes.** MPL §3.3 secondary licenses include AGPL v3. Modified alphaTab files stay MPL. |
| `guitarpro-parser` (npm 1.2.0) | Apache-2.0                                | gp, gpx, gp5, gp3 to a simple model            | Yes (Apache-2.0 is compatible one way with (A)GPLv3)                                    |
| PyGuitarPro (Python)           | LGPL-3.0                                  | reads and writes GP3–5; the best documentation | Yes. Useful as a format reference; not a JS dependency.                                 |
| TuxGuitar (Java)               | LGPL-2.1                                  | reads GP1–5, GPX, GP7                          | Yes, but Java. Reference only.                                                          |
| MuseScore (C++)                | GPL-3.0 (version 3 only, per LICENSE.txt) | reads GP1–5, GPX, GP7/8, PTB                   | Yes (GPLv3 §13), but C++. Reference only, as agreed.                                    |

---

## 3. Guitar Pro 6 (`.gpx`)

### 3.1 Signatures

- `BCFZ`: a compressed container. Bytes 4–7 hold int32 LE `expectedLength`, the size of the
  decompressed image _including_ its own 4-byte `BCFS` header.
- `BCFS`: an uncompressed image. These are rare in the wild.
  - **MuseScore's dispatcher only recognises `BCFZ`.**
  - alphaTab and TuxGuitar accept both. TuxGuitar compares the int32 values 1514554178 ("BCFZ") and
    1397113666 ("BCFS").

### 3.2 BCFZ decompression, at bit level

I verified this by writing an independent decoder against an alphaTab test `.gpx`. It produced a valid
`BCFS` image. The algorithm is credited by Power Tab Editor's `gpx/doc.rst` to TuxGuitar developers
J. Jørgen von Bargen and Julian Casadesus.

- **Bit order:** read the payload after byte 8 as a bit stream. Bits are taken from each byte **most
  significant first** (bit 7 down to bit 0). Multi-bit fields come in two flavours:
  - `bitsMSB(k)`: the first bit read is the most significant. Used for the 4-bit width field and for
    literal bytes.
  - `bitsLSB(k)`: the first bit read is the **least** significant. Used for offset, length and the
    literal count. alphaTab calls this `readBitsReversed`.
- **Main loop:** repeat while `out.length < expectedLength`.
  - Read 1 bit.
  - If the bit is **1**, it is a back-reference:
    - `w = bitsMSB(4)`, a field width from 0 to 15
    - `dist = bitsLSB(w)`, `len = bitsLSB(w)`
    - append `min(dist, len)` bytes copied from position `out.length - dist`
    - Because `len` is capped at `dist`, the source never overlaps the bytes being written.
  - If the bit is **0**, it is a literal run:
    - `n = bitsLSB(2)`, from 0 to 3
    - append `n` bytes, each read as `bitsMSB(8)`. Literal bytes are **not** byte-aligned.
- **Ending:** stop at `expectedLength` or at the end of input. alphaTab catches end-of-input and keeps
  what it has. Then truncate to `expectedLength`. My decode of one sample produced 69,637 bytes against
  an expected 69,636, because the final copy overshot by one byte.
- **Hardening:**
  - reject `dist == 0` with `len > 0`, and reject `dist > out.length`
  - cap `expectedLength`, for example at alphaTab's 128 MB budget
  - a zero-width (`w = 0`) copy is a no-op, but it still consumes 5 bits, so the loop always ends at
    end-of-input
- **Observed parameters:** in the sample, field widths never exceeded 9 bits (distances below 512) and
  literal runs were very frequent. GP6's compressor uses a small window.

### 3.3 BCFS sector file system

Offsets below are relative to the byte **after** the 4-byte `BCFS` tag:

- The image is an array of **0x1000-byte (4096) sectors**. Sector _i_ starts at `i × 0x1000`.
- **Sector 0** is not an entry. I observed it starting with `00 00 FF FF FF…`. alphaTab's comment calls it
  "filled with 0xFF".
- Every **entry sector** starts with an int32 entry type:

| Offset in sector | Size | Field                                                                                  |
| ---------------- | ---- | -------------------------------------------------------------------------------------- |
| 0x00             | 4    | entry type. **2 = file.** I also observed **1 = directory**: the root entry named "/". |
| 0x04             | 127  | NUL-terminated name                                                                    |
| 0x83             | 9    | unknown (observed `00…00 01 00 00 00`)                                                 |
| 0x8C             | 4    | int32 file size                                                                        |
| 0x90             | 4    | unknown                                                                                |
| 0x94             | 4·n  | int32 sector indices of the data blocks, terminated by 0                               |

A file's bytes are the listed data sectors concatenated and then truncated to the file size.

- **The directory entry**, observed in a sample and **UNVERIFIED in general**, lives in sector 1 with the
  name "/". Its single data sector held the int32 list `2, 7, 9, 13, 15`. Those are exactly the sector
  indices of the file entries.
- **A trap for naive readers:** if you scan every sector and accept any sector whose first int is 2, the
  directory's _data_ sector looks like a file entry (with a junk name `"\x07"`). alphaTab avoids this
  only because, after each file, it jumps past that file's last data sector. MuseScore scans in a
  similar way.
- **Robust approach:** start at the type-1 root entry and follow its index list. Fall back to the
  sequential scan, but reject entries with non-printable names or sizes larger than the image.

### 3.4 Files inside a GPX

Observed in a GP6 sample: `score.gpif`, `misc.xml`, `BinaryStylesheet`, `PartConfiguration`,
`LayoutConfiguration`.

- `score.gpif`: the score as GPIF XML (section 4.3). In GP6 the root has `<GPRevision>` (11686 in the
  sample) and **no `<GPVersion>`**. Strings are CDATA. Headers and footers are Qt rich-text HTML.
- `misc.xml`: `<MISC><TracksView><PreferredTrackCount>…`, a UI hint only.
- `BinaryStylesheet`, `PartConfiguration`, `LayoutConfiguration`: the same binary formats as GP7
  (section 4.2). alphaTab reads all three. MuseScore reads only `score.gpif`.

### 3.5 Problems and parsers

- **Problems:**
  - truncated or garbled compressed streams. alphaTab's catch-on-EOF means it returns a partial image,
    and the result is a confusing XML error.
  - stray directory or data sectors misread as entries (above)
  - GPIF with single-number automation values. alphaTab handles this specially for its issue #391.
- **Parsers:**
  - alphaTab `GpxImporter`/`GpxFileSystem` (MPL-2.0), compatible
  - `guitarpro-parser` (Apache-2.0), compatible
  - TuxGuitar and MuseScore as references

---

## 4. Guitar Pro 7/8 (`.gp`)

### 4.1 The ZIP container

The table comes from listing real GP7.x and GP8.1.3 files, alphaTab's `Gp7Exporter`, and TuxGuitar's
GP7 reader.

| Entry                                                | GP7 | GP8       | Contents                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VERSION`                                            | yes | yes       | ASCII `7.0`, 3 bytes, **in GP8 files too**. TuxGuitar requires exactly "7.0".                                                                                                                                                                          |
| `meta.json`                                          | no  | yes       | observed `{\n}\n`                                                                                                                                                                                                                                      |
| `Content/score.gpif`                                 | yes | yes       | the score as GPIF XML, UTF-8                                                                                                                                                                                                                           |
| `Content/BinaryStylesheet`                           | yes | yes       | engraving and stylesheet key/value store (4.2)                                                                                                                                                                                                         |
| `Content/PartConfiguration`                          | yes | yes       | which staves each track shows, per score view (4.2)                                                                                                                                                                                                    |
| `Content/LayoutConfiguration`                        | yes | yes       | zoom, view mode, per-view track visibility (4.2)                                                                                                                                                                                                       |
| `Content/Preferences.json`                           | yes | yes       | UI and practice state: `tonality` {isActive, value}; `tempo` speed-trainer settings {mode "Constant"/…, constantTempo/BPM, fromTempo, toTempo, step, repeatCount}; GP8 also adds `view` {globalViewHeight, backingTrackVisible, backingTrackHeight, …} |
| `Content/ScoreViews/N.gpsv`                          | no  | yes       | per-view data. Binary, looks like **Protocol Buffers** wire format (tag bytes `0x12`, `0x1A`). Contains track names.                                                                                                                                   |
| `Content/Stylesheets/score.gpss`, `scoreviewN.gpss`  | no  | yes       | binary, also protobuf-like. Embeds the version string `8.1.3121`.                                                                                                                                                                                      |
| `Content/Assets/<id>.<ext>`                          | no  | when used | **embedded backing-track audio** (an `.ogg` in the sample, about 0.9 MB)                                                                                                                                                                               |
| directory entries (`Content/`, `Content/Assets/`, …) | yes | yes       | entry order varies: alphaTab writes `VERSION` first, Guitar Pro 8 wrote `Content/` first                                                                                                                                                               |

### 4.2 The binary side files

All three are **big-endian**. The layouts below come from alphaTab's documented readers.

- **BinaryStylesheet:**
  - int32 entry count, then the entries
  - each entry: u8 key length, the UTF-8 key (for example `StandardNotation/tieWeight`), a u8 type, and
    the value
  - value types:

    | Type | Name   | Encoding             |
    | ---- | ------ | -------------------- |
    | 0    | bool   | 1 byte               |
    | 1    | int    | int32                |
    | 2    | float  | float32              |
    | 3    | string | int16 length + UTF-8 |
    | 4    | point  | 2 × int32            |
    | 5    | size   | 2 × int32            |
    | 6    | rect   | 4 × int32            |
    | 7    | color  | RGBA bytes           |

  - The GP8 sample had 654 entries.
- **PartConfiguration:**
  - int32 view count
  - per view: a u8 multi-rest flag, an int32 group count, then one u8 bit set per track (bit0 standard
    notation, bit1 tab, bit2 slash, bit3 numbered/jianpu in GP8; no bits set means standard notation)
  - a trailing int32 active-view index
  - View 0 is the multi-track view; the others are per-track views.
- **LayoutConfiguration:**
  - int32 zoom code (0 = 25% … 4 = 100% … 10 = 800%)
  - u8 view mode: 0 page-vertical, 1 grid, 2 parchment, 3 screen-vertical, 4 screen-horizontal,
    5 page-horizontal
  - u8 multi-voice cursor
  - then one visibility byte per (view, group), `FF` or `00`, laid out to match PartConfiguration

### 4.3 GPIF XML

Observed top-level children of `<GPIF>`:

| Element                        | Notes                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GPVersion`                    | GP7: `7`. GP8: `8.1.3`. Absent in GP6.                                                                                                                                                                                                                                                                                                  |
| `GPRevision`                   | GP6 11686. GP7.0 `12020`. Later GP7 `required="12021" recommended="12023"` (values 12024–12025). GP8 `required="12024" recommended="13000"` (values 13001–13007).                                                                                                                                                                       |
| `Encoding/EncodingDescription` |                                                                                                                                                                                                                                                                                                                                         |
| `Score`                        | Title, SubTitle, Artist, Album, Words, Music, WordsAndMusic, Copyright, Tabber, Instructions, Notices, page header/footer templates, layout and zoom settings, MultiVoice                                                                                                                                                               |
| `MasterTrack`                  | `Tracks` (space-separated track ids), `Automations`, `RSE`, and an optional `Anacrusis` (pickup bar) flag                                                                                                                                                                                                                               |
| `AudioTracks`                  | GP7; usually empty                                                                                                                                                                                                                                                                                                                      |
| `BackingTrack`                 | GP8: Name, ShortName, PlaybackState, ChannelStrip, `Enabled`, `Source` (`Local`; the presence of a `YouTubeVideoUrl` field suggests other sources), `AssetId`, Filter, FramesPerPixel, `FramePadding` (in samples at 44.1 kHz; alphaTab converts with 44100), Semitones, Cents                                                          |
| `Tracks/Track`                 | Name, ShortName, Color, `SystemsDefautLayout` (sic: the typo is in the files), SystemsLayout, PalmMute, PlayingStyle, UseOneChannelPerString, IconId, InstrumentSet, Transpose (Octave + Chromatic), RSE, Sounds, MidiConnection, PlaybackState, AudioEngineState, Lyrics, Staves (tuning, capo and similar in Properties), Automations |
| `MasterBars/MasterBar`         | Key (AccidentalCount, Mode, TransposeAs), Time (`4/4`), **Bars** (one Bar id per staff, in track/staff order), plus repeats, alternate endings, sections, directions, fermatas, triplet feel, XProperties                                                                                                                               |
| `Bars/Bar id=`                 | Clef, **Voices** (`"0 -1 -1 -1"`: four voice slots, `-1` = unused), SimileMark, XProperties                                                                                                                                                                                                                                             |
| `Voices/Voice id=`             | **Beats** (a list of ids)                                                                                                                                                                                                                                                                                                               |
| `Beats/Beat id=`               | Dynamic, `<Rhythm ref=…/>`, **Notes** (ids), GraceNotes, Properties, lyrics and free text, chord references                                                                                                                                                                                                                             |
| `Notes/Note id=`               | Properties: `String` (**0 = lowest string**), `Fret`, `Midi`, `ConcertPitch` / `TransposedPitch`; also tie, accent, let-ring, bend, harmonic and similar properties; InstrumentArticulation                                                                                                                                             |
| `Rhythms/Rhythm id=`           | NoteValue (`Quarter` and so on), AugmentationDot, PrimaryTuplet                                                                                                                                                                                                                                                                         |
| `Assets/Asset id=`             | GP8: OriginalFilePath, OriginalFileSha1 (a GUID-like id), `EmbeddedFilePath` (`Content/Assets/…`)                                                                                                                                                                                                                                       |
| `ScoreViews/ScoreView`         | GP8                                                                                                                                                                                                                                                                                                                                     |

Points worth knowing:

- **The structure is pools of objects referenced by id.** Parse all the pools first, then join them.
  Lists are space-separated ids.
- **Octave numbering:** in the GP7 sample, MIDI 57 (A3 in scientific pitch notation) was labelled
  `A`/octave 4. Guitar Pro octave numbers appear to be one higher than scientific notation. Prefer the
  `Midi`, or `String`/`Fret` plus tuning, over the `Pitch` elements. **UNVERIFIED** beyond this sample.
- **Automations** carry `Type`, `Linear`, `Bar`, `Position` (a ratio within the bar), `Visible` and
  `Value`. Tempo values look like `"90 2"`: BPM followed by a reference-unit code. A single number is
  possible (alphaTab issue #391).
- **SyncPoints (GP8)** are MasterTrack automations with `Type=SyncPoint`. Their `Value` holds child
  elements: `BarIndex`, `BarOccurrence` (which pass through a repeat), `ModifiedTempo`, `OriginalTempo`,
  and `FrameOffset` (samples at 44.1 kHz). This is the audio-to-score alignment map for the backing track.
  alphaTab parses it into `syncPointValue`.

### 4.4 GP7 vs GP8

GP8 is indicated by any of: `meta.json` present, a `<GPVersion>` starting with `8`, a `GPRevision` value
of 13000 or more, or `BackingTrack`/`Assets`/`ScoreViews` elements present. `VERSION` is "7.0" in both,
so don't rely on it.

### 4.5 Telling the ZIP-based formats apart

Read the **central directory**, not just the local headers. fflate's `unzip` and zip.js both do this.
alphaTab's own `ZipReader` only walks local headers sequentially. That has consequences:

- it stops at the first unexpected signature
- it supports only STORE and DEFLATE
- it has no Zip64
- it does not verify CRCs
- a STORE entry that uses a data descriptor cannot be read

**Suggested decision order:**

1. **`.otz`** (ours): `opentabz.json` at the root. Suggested refinement: also write a first, uncompressed
   `mimetype` entry such as `application/vnd.opentabz+zip`, the way EPUB and MXL do, so 70 bytes are
   enough to identify the file. This MIME type would be our own unregistered choice. Store the `.gp`
   payload uncompressed, since it is already deflated.
2. **GP7/8:** `Content/score.gpif` exists. Use `VERSION` and `meta.json` only as hints.
3. **TuxGuitar 2.x:** `version.txt` whose first line is `TuxGuitar_file_format <ver>`, plus `content.xml`
   (root `TuxGuitarFile`).
4. **`mimetype` as the first entry** (local header at offset 0 with the name `mimetype` at offset 30 and
   no extra field), with content read from offset 38:
   - `application/vnd.recordare.musicxml` means **MXL**. MusicXML 4.0 requires this entry to come first,
     be uncompressed, and have no extra field. Files from before 3.1 may lack it.
5. **`META-INF/container.xml` exists:** take the first `<rootfile full-path>` and look at the root
   element of that file:
   - `score-partwise` / `score-timewise` / `opus` means **MXL**
   - `museScore`, or a `*.mscx` path, means **MuseScore `.mscz`**. MuseScore writes `container.xml` with
     an `.mscx` rootfile and also adds `Thumbnails/thumbnail.png`, `audiosettings.json` and
     `viewsettings.json`. Reject it politely or route it elsewhere.
6. **Capella `.capx`:** `score.xml` at the root with root element `<score>`. CapXML schema versions run
   from 1.0.x to 5.4.0; capella 10 uses 5.4.0. **UNVERIFIED:** the exact namespace URI. Don't rely on it.
7. **Fallback:** if the zip holds exactly one entry with a supported signature (`.gp5`, `.gpx`, `.xml`,
   `.mid`), offer to import it, ignoring `__MACOSX/` and `._*` entries. Otherwise report "unknown zip".

### 4.6 Problems and parsers

- **Problems:**
  - **Files written by third-party tools.** alphaTab's `faulty.gp` test is a GP8 file that Guitar Pro
    did not write: it is missing MIDI channels, has formatting oddities, and does not reuse
    bars/voices/beats.
  - **The GP 7.0.0 tuning-flats bug.** MuseScore notes that GP 7.0.0 marks every tuning as "flats", so it
    ignores `<Flats/>` and `TuningFlat` when `GPVersion` is "7".
  - **GP6 bends with the middle point exactly in the middle** store the middle offsets as −1 (MuseScore
    comment).
  - **Backing tracks:**
    - a `BackingTrack` that points to an asset missing from the zip
    - non-local sources (alphaTab only loads `Source=Local`)
    - large audio assets, which are a memory cost
  - **Zip-level oddities:**
    - data descriptors (flag bit 3)
    - non-UTF-8 entry names
    - extra fields
- **Parsers:**
  - alphaTab `Gp7To8Importer` and `Gp7Exporter` (MPL-2.0; it writes `VERSION`=7.0, the `Content/*` files,
    and the backing-track asset)
  - `guitarpro-parser` (Apache-2.0)
  - Power Tab Editor 2's GP7 importer/exporter (GPL-3.0-or-later, C++, reference only)
  - All are compatible.

---

## 5. MusicXML (`.musicxml`, `.xml`, `.mxl`)

### 5.1 Uncompressed

- **Root elements:**
  - `score-partwise`: parts contain measures. This is what almost every application writes.
  - `score-timewise`: measures contain parts.
  - `opus`: a collection of scores. **alphaTab rejects `opus`.** It supports partwise and timewise.
- **DOCTYPE:** typically
  `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`,
  with `Timewise` and `timewise.dtd` for timewise files.
  - The DOCTYPE is optional, and MusicXML 4.0 deprecates the DTDs in favour of XSD.
  - **Never fetch the external DTD.** Browsers' `DOMParser` does not, which is good.
  - Treat entity-expansion bombs as a risk on the server side.
- **Sniffing:**
  - skip the BOM, the XML declaration, comments, processing instructions and the DOCTYPE
  - read the first element's local name, ignoring any namespace prefix
  - match `score-partwise`, `score-timewise` or `opus`; also recognise `GPIF`, CapXML `score` and
    `museScore`
  - do this with a small tokenizer over the first 4–16 KB, not a full DOM parse
- **File extensions and MIME types (MusicXML 4.0):**
  - `.musicxml` with `application/vnd.recordare.musicxml+xml`
  - `.mxl` with `application/vnd.recordare.musicxml`
  - `.xml` is common in practice but says nothing about the content

### 5.2 Compressed `.mxl`

- A ZIP with DEFLATE and UTF-8 entry names. `META-INF/container.xml` has a `<container><rootfiles>` with
  one or more `<rootfile full-path=… media-type=…>` entries. **The first rootfile is the MusicXML score.**
  Further rootfiles may be other renditions, such as a PDF.
- An optional first entry `mimetype`, stored uncompressed (see 4.5).
- Images and linked parts can sit anywhere in the archive.
- alphaTab implements the first-rootfile rule and reports clear errors for a malformed `container.xml`.
- **Real-world problems:**
  - zips without a `container.xml`, where someone just zipped an `.xml`. Fall back to the single root
    `.xml`/`.musicxml` entry outside `META-INF`.
  - a `container.xml` that points to a missing file

### 5.3 Text decoding

This applies to MusicXML and to every text format.

- **Byte-order marks:** `EF BB BF` (UTF-8), `FF FE` (UTF-16LE), `FE FF` (UTF-16BE).
- **UTF-16 without a BOM:** recognise it by the XML 1.0 Appendix F patterns `3C 00 3F 00` (LE) and
  `00 3C 00 3F` (BE). Otherwise use the `encoding=` value from the XML declaration.
- **Encodings seen in the wild:**
  - **UTF-16 from Sibelius with the Dolet plugin** caused a MuseScore import failure (musescore.org
    node 268614).
  - **Encore** wrote UTF-16 **without** a BOM.
  - Files that **declare UTF-8 but contain Latin-1 bytes**.
  - Invalid characters, such as a NUL inside a dynamics marking, which made Dorico reject the file.
- **alphaTab's `IOHelper.toString`:** detects UTF-16 and UTF-32 BOMs, but checks for `FF FE` _before_
  `FF FE 00 00`, so UTF-32LE is misdetected as UTF-16LE. **WHATWG `TextDecoder` does not support UTF-32
  at all.** Handle UTF-32 yourself or reject it.
- **Recommendation:**
  - sniff and decode the text ourselves, using the BOM, then the Appendix F pattern, then the declared
    encoding, then strict UTF-8, then windows-1252
  - remove C0 control characters that are illegal in XML
  - pass a JS string to the parser, or pass alphaTab correctly encoded UTF-8 bytes

### 5.4 Parsers

| Library                                     | License                                        | Compatible?                                    |
| ------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| alphaTab `MusicXmlImporter`                 | MPL-2.0                                        | Yes                                            |
| OpenSheetMusicDisplay (renderer and parser) | BSD-3-Clause                                   | Yes                                            |
| Verovio (WASM engraver; also MEI)           | LGPL-3.0-or-later                              | Yes                                            |
| `musicxml-interfaces`                       | AGPL-3.0                                       | Yes (same family). Stale, last published 2022. |
| `@stringsync/musicxml`                      | MIT                                            | Yes                                            |
| webmscore (MuseScore engine in WASM)        | GPL-3.0 per its `LICENSE.GPL` (version 3 only) | Yes via §13. Very large; last published 2023.  |

---

## 6. Standard MIDI files and RMID

- **SMF header:**
  - `MThd` and a big-endian uint32 length, which should be 6
  - uint16 format: 0, 1 or 2
  - uint16 track count
  - uint16 division: positive means ticks per quarter note; bit 15 set means SMPTE
- **Tracks:** each is `MTrk` + uint32 length + events. Events use variable-length delta times, running
  status, and meta (`FF`) and sysex (`F0`/`F7`) events.
- **RMID** (`.rmi`):
  - layout: `RIFF` <LE size> `RMID`, then a `data` chunk whose body is a complete SMF
  - optional `LIST`/`INFO` chunks
  - RP-029 (MMA, 2000) adds an embedded **DLS** chunk
  - there is also a community "SF2 RMIDI" specification (spessasus/sf2-rmidi-specification) for an
    embedded SoundFont
  - RIFF chunks are padded to even lengths
  - the MMA recommends XMF over RMID (Library of Congress FDD000120)
  - SpessaSynth (Apache-2.0) can read and write RMIDI, including embedded banks
- **Real-world problems:**
  - junk before `MThd`, such as a MacBinary header. Search the first 256 bytes for `MThd`.
  - a header length other than 6. Skip the extra bytes.
  - `ntrks` not matching the number of chunks
  - **alien (non-`MTrk`) chunks.** The SMF spec says to skip them. The `midi-file` parser _throws_
    instead.
  - track lengths that run past the end of the file, or end early
  - a missing End-of-Track
  - running status after sysex or meta events
  - wrong meta-event lengths. `midi-file` throws on these too.
  - format 2 files, which are rare and poorly supported
  - **Recommendation:** put a tolerant pre-pass in front of `midi-file` / `@tonejs/midi` that unwraps
    RIFF, skips unknown chunks, and clamps lengths.
- **Parsers:**
  - `@tonejs/midi` (MIT): last published 2022; built on `midi-file`
  - `midi-file` (MIT): strict
  - `spessasynth_core` (Apache-2.0)
  - All are compatible.
  - **alphaTab cannot import SMF.** It only generates and exports MIDI, so mapping MIDI to an alphaTab
    `Score` is our job, and it is lossy (no tab positions).

---

## 7. Power Tab (`.ptb`, `.pt2`; `.ptx` flagged)

- **`.ptb` (Power Tab Editor 1.x):**
  - a uint32 marker `0x62617470`, which reads as the bytes **`ptab`**
  - a uint16 version: **1** = 1.0, **2** = 1.0.2, **3** = 1.5, **4** = 1.7
  - Version 1.7 then has a file-type byte (0 song, 1 lesson). Older versions use different header
    layouts (Power Tab Editor 2's `powertabfileheader.cpp`).
  - TuxGuitar and MuseScore both accept **only `ptab` + version 4**, comparing against the string
    "ptab-4". Power Tab Editor 2 reads 1.0 through 1.7.
  - MuseScore's test data includes corruption cases: a file with no strings, and a staff index out of
    bounds.
- **`.pt2` (Power Tab Editor 2):** a **gzip-compressed JSON** score, serialized with nlohmann/json and
  carrying a `FileVersion` enum.
- **FLAG on `.ptx`:** I found no evidence that `.ptx` is a Power Tab format. Power Tab Editor 2 registers
  only `pt2` (native) and `ptb` (import). `.ptx` is best known as the **Avid Pro Tools 10+ session**
  extension (from memory, **UNVERIFIED** here). Treat it as unknown unless a sample shows otherwise.
- **Parsers:** no maintained JS `.ptb` parser found.
  - Power Tab Editor 2 (C++, GPL-3.0-or-later): could be compiled to WASM. Compatible with AGPL via §13.
  - TuxGuitar PTB (Java, LGPL-2.1): reference only.
  - MuseScore `importptb.cpp` (GPL-3.0): reference only.

## 8. TuxGuitar (`.tg`)

- **Legacy binary (TuxGuitar ≤ 1.5):**
  - byte 0 = the character count `n`, then `n` **UTF-16BE** characters. Java's `writeChars` writes 2
    bytes per character.
  - The string is `TuxGuitar File Format - 1.0`, `- 1.1`, `- 1.2`, `- 1.3` or `- 1.5`. Very old files use
    `TG_DEVEL-0.01`.
  - Example: `1B 00 54 00 75 00 78 00 47…` is `TuxGuitar File Format - 1.5` (27 characters).
  - Other strings in the format follow the same scheme: a u8 length plus UTF-16BE, capped at 255
    characters.
- **TuxGuitar 2.0 (released 2025-11-02)** introduced a **new, incompatible format**:
  - a ZIP containing `version.txt` (first line `TuxGuitar_file_format 2.0`) and `content.xml` (root
    `TuxGuitarFile`, then `TGSong`…)
  - The changelog says older versions cannot read it.
  - 2.0.1 fixed "gp/zip and gpx file detection on Linux", which is another reason to sniff by content.
- **Parsers:** no JS parser found. TuxGuitar itself (LGPL-2.1) is the reference.

## 9. TablEdit (`.tef`)

- **TEF version 3** (TablEdit 3.x). A comment in TuxGuitar's header check says the rules came from the
  TablEdit author and that every field must match. It reads 256 bytes and requires all of:
  - byte 3 (major version) = 3
  - bytes 16–23 all zero. MuseScore reads these as `securityCode` and `securityFlags`. A non-zero value
    means a **protected** file, and both importers refuse it.
  - bytes 56–59 = `tbed`
  - uint16 at 202 (0xCA, `wOldNum`) = 4
  - byte 204 = 4 and byte 205 = 10 (`wFormat` = 0x0A04). MuseScore accepts only a high byte of 10.
- **TEF version 2:** no magic number. TuxGuitar's v2 reader starts with 200 bytes of NUL-separated
  title strings. Treat it as "possibly TEF v2" and only try it when the user asserts the file type.
- **Parsers:**
  - MuseScore (C++, GPL-3.0; new in 2025)
  - TuxGuitar (Java, LGPL-2.1; v2, plus v3 since 2.0.0)
  - No JS parser found.

## 10. Capella

- **Binary `.cap`** (capella 2000 / v3.0 and later): an 8-byte signature `cap3-v:` plus a letter.
  MuseScore checks the first 7 bytes. Its error message suggests the file is either not Capella or older
  than capella 2000 (v3.0). MuseScore's tests include several corrupt variants: metafile size, staff
  index, string length, text size, and key.
- **CapXML `.capx`:** a zip with `score.xml`, root `<score>`.
  - alphaTab's `CapellaImporter` reads it from a zip, or treats the raw input as XML when it is not a zip.
  - Capella has no tablature (alphaTab hard-codes `showTablature = false`).
- **Parsers:** alphaTab (MPL-2.0, compatible).

## 11. ChordPro (ChordPro 6; the cheat sheet is labelled 6.07)

- **Line types:**
  - directives in `{…}`, which must fit on one line
  - lyrics with chords in `[…]` placed before the syllable
  - **annotations** `[*text]`, which are not chords: never transpose them or draw diagrams for them
  - `#` comment lines, ignored
  - blank lines
- **Line continuation:** a trailing backslash joins the next line, dropping that line's leading
  whitespace (6.01+).
- **Escapes:** `\uXXXX` (6.01+).
- **Input encodings:** ASCII, ISO-8859-1, UTF-8, UTF-16 or UTF-32, according to the cheat sheet.
- **Directive arguments:**
  - separated from the name by a colon, whitespace, or both
  - quotes with `"…"` or `'…'`
  - multi-valued directives use attribute syntax, for example `{image: src="x.png" scale="50%"}`
  - `{start_of_verse: Verse 1}` is equivalent to `{start_of_verse label="Verse 1"}`
- **Conditional directives:** `{name-selector: …}` applies only when the selector matches, checked in
  this order: instrument type, then user name, then a truthy metadata item. A trailing `!` negates the
  selector. On a `start_of_*` directive the selector covers the whole section, and the matching `end_of_*`
  must **not** repeat it.
- **Directives:**
  - **Preamble:** `new_song` (`ns`)
  - **Metadata:** `title` (`t`), `sorttitle`, `subtitle` (`st`), `artist`, `sortartist`, `composer`,
    `lyricist`, `copyright`, `album`, `year`, `key`, `time`, `tempo`, `duration`, `capo`, `tag`,
    `meta: name value`
  - **Formatting:** `comment` (`c`), `highlight`, `comment_italic` (`ci`), `comment_box` (`cb`), `image`
  - **Environments:**
    - `start_of_chorus`/`end_of_chorus` (`soc`/`eoc`), and `chorus` to recall a chorus
    - `start_of_verse`/`end_of_verse` (`sov`/`eov`)
    - `start_of_bridge`/`end_of_bridge` (`sob`/`eob`)
    - `start_of_tab`/`end_of_tab` (`sot`/`eot`): **ASCII tab blocks live here**
    - `start_of_grid`/`end_of_grid` (`sog`/`eog`)
    - any `start_of_<name>`/`end_of_<name>`
  - **Delegated environments:** `start_of_abc`, `start_of_ly` (LilyPond), `start_of_svg`,
    `start_of_textblock`
  - **Chord diagrams:** `{define: name base-fret N frets … fingers … keys …}` and `{chord: …}`, which
    takes the same arguments but displays the chord inline
  - **Transposition:** `{transpose: n}`
  - **Legacy font, size and colour directives:** `textfont`/`tf`, `textsize`/`ts`, `chordfont`/`cf`,
    `chordsize`/`cs`, plus the chorus/tab/grid/label/toc/title/footer variants
  - **Output:** `new_page` (`np`), `new_physical_page` (`npp`), `column_break` (`colb`), `pagetype`
  - **Legacy:** `columns` (`col`), `grid`/`g`, `no_grid`/`ng` (replaced by `{diagrams}`), `titles`
  - **Custom:** any directive starting with `x_`, which other readers must ignore
- **File extensions:** `.cho` is recommended; `.crd`, `.chopro`, `.chord` and `.pro` are also common.
  The spec says names and extensions can be anything, which is one more reason to detect by content.
- **Detection heuristic:** score these signals and require at least 2 directive lines, or at least 1
  directive line plus several bracketed chords:
  - lines matching `^\s*\{\s*[a-z_]+(?:-[^\s:}]+)?\s*(?::|\s|\})`, where the name is in the known set or
    starts with `x_`
  - lyric lines containing `\[[A-G][^\]\s]{0,15}\]`
- **Parsers:**

| Library                                | License                                                     | Compatible?                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **ChordSheetJS**                       | **GPL-2.0-only** (npm `license`; LICENSE is the GPLv2 text) | **No.** GPL-2.0-only cannot be relicensed under v3, so it cannot be combined with AGPL-3.0. **Do not bundle it.**         |
| `chord-mark` / `chord-mark-converters` | MIT                                                         | Yes. Converts _from_ ChordPro and from "chords over lyrics" to ChordMark, and auto-detects which of the two the input is. |
| `chord-symbol`                         | MIT                                                         | Yes. A chord-name parser and renderer, good for validating chord tokens.                                                  |
| `chordpro` (npm)                       | ISC                                                         | Yes, but it is an anonymous 1.0.0 package with no repo. Avoid.                                                            |
| `chordpro-parser`                      | GPL-3.0-or-later                                            | Yes, but obscure.                                                                                                         |
| `chordproject-parser`                  | no license                                                  | No. Unlicensed code means all rights reserved.                                                                            |

Writing our own ChordPro parser from the spec is a reasonable size of task.

## 12. Plain-text tab and chord sheets

There is no specification for ASCII tab. These heuristics are mine, written for this note; they are not
copied from any tool.

- **Normalize first:**
  - CRLF to LF
  - expand tab characters (they break column alignment), or reject them
  - map en/em dashes, `─` and non-breaking spaces to `-` and a normal space
  - remove a UTF-8 BOM
- **Staff line** (for one string):
  - an optional label: a note letter `[A-Ga-g]` with an optional `#`/`b` and an optional octave digit,
    or a string number
  - an optional separator from `| : ] [ )`
  - then a body of at least 8 characters drawn from `- 0-9 h p b r / \ ~ x ( ) < > . ^ * s t | : ` and
    spaces
  - at least 40% of the body is dashes
- **A tab system** is 4–8 consecutive staff lines (4 = bass, 5 = 5-string bass or banjo, 6 = guitar,
  7 or 8 = extended-range guitar) that also:
  - have similar lengths (within about 2 characters)
  - put most of their `|` characters in the same columns
  - carry labels that form a plausible tuning: `e B G D A E` top to bottom (case varies), drop tunings
    such as `D` at the bottom, or labels in `E A D G B E` order
- **Interleaved annotation lines** (keep them, but don't count them as strings):
  - rhythm lines above a system: duration letters `W H Q E S T`, dots, or `1 + 2 +` counting
  - technique lines below: `P.M.----|`, `let ring`, `~~~~`
  - chord-name lines
  - legend blocks such as `h = hammer-on`
- **Chord-over-lyrics:**
  - a _chord line_ is one where 80% or more of the whitespace-separated tokens are chord symbols (use a
    `chord-symbol`-style parser; allow `N.C.`, `x2`, `|`, `%`)
  - a chord line followed by a non-chord _lyric_ line pairs the two, and the chord's column gives its
    position in the lyrics
  - section headers look like `[Verse]`, `Intro:` or `Chorus:`
  - watch for German `H` = B
- **Problems:**
  - proportional-font paste misalignment
  - lines wrapped by the web page
  - mixed or missing labels
  - two voices written on one staff
  - lyrics interleaved between systems
  - "tab" sections inside ChordPro `{sot}` blocks
- **Existing parsers with compatible licenses:**
  - `tablature-parser` (1j01, MIT, npm 0.10.1). Groups consecutive lines containing dashes, requires
    exactly 6 strings in standard tuning, and checks alignment. Too limited to use directly, but a
    useful reference.
  - `scoreman` (Rust, MIT). Converts `.tab` to MIDI or MusicXML, has an auto-fix mode for parse errors,
    and can be used as a library, so a WASM build is possible.
  - `chord-mark-converters` (MIT) for chords-over-lyrics.
  - TuxGuitar only _exports_ ASCII tab.
  - ChordSheetJS has chords-over-words and Ultimate-Guitar parsers, but it is GPL-2.0-only, so not
    usable.
  - Conclusion: expect to write our own tab and text parsers.

---

## 13. How TuxGuitar and MuseScore handle GP import edge cases

This is a summary of behaviour only; no code is reused.

**MuseScore** (`src/importexport/guitarpro/internal`):

- **Dispatch:**
  - `ptab` goes to the PowerTab reader (requires `ptab-4`)
  - `PK\3\4` goes to the GP7 reader
  - `BCFZ` goes to the GP6 reader (**it does not recognise BCFS**)
  - otherwise it requires "FIC" at bytes 1–3 and then accepts `FICHIER GUITAR PRO ` or
    `FICHIER GUITARE PRO `, with major versions 1–5
- **It does not support** clipboard files.
- **Text decoding:** UTF-8 when valid, otherwise Latin-1.
- **Odd tuplet values** (28, 40 and the like) are kept as raw values.
- **GP5 let-ring:** GP5 doesn't store let-ring on tied notes, so MuseScore propagates it from the start
  of the tie.
- **Unmatched ties** are logged and dropped. Notes with no fret are handled. Empty chords are removed.
- **Measure lengths** are set from the actual content (irregular measures).
- **Bends and whammy dives** (GP6/7) have a dedicated subsystem with many regression files: prebends,
  tied bends, dives across bars, bends on grace notes, bends that split chords.
- **GP 7.0.0 tuning-flats bug:** it ignores `Flats` for `GPVersion` "7".
- **GP6 bends:** a middle offset of −1 means "exactly in the middle".
- **GP6/7 drum articulations** are mapped by internal name. For example `grcss` (grancassa) maps to bass
  drum, and `ptt` (piatti) maps to cymbal.

**TuxGuitar** (`common/TuxGuitar-gtp`, `-gpx`, `-ptb`, `desktop/TuxGuitar-tef`):

- **Version detection:** an exact-match string table per reader (GP1 v1–v1.04; GP2 v2.20/2.21; GP3
  v3.00; GP4 v4.00/v4.06/L4.06; GP5 v5.00/v5.10). No clipboard support.
- **GPX:** accepts BCFS and BCFZ.
- **GP7:** requires `VERSION` = "7.0" and `Content/score.gpif`, and reads only the score.
- **Key signatures:** GP stores them as a signed count. TuxGuitar maps negative (flat) keys into its own
  numbering.
- **Changelog fixes:** percussion-channel issues, GP5 alternate-ending bitmask fixes, harmonic import
  and export, and repeated "Improve Guitar Pro import" entries (latest in 2025–2026).
- **TEF v3:** strict header checks; refuses protected files.

**Lessons for OpenTabz:**

- detect by content
- support BCFS
- tolerate garbage padding in the GP3-5 header
- make the code page selectable
- normalize the off-by-one repeat count and alternate-ending encoding between versions
- keep bend and whammy import in the alphaTab model rather than inventing our own

---

## 14. Parser license matrix

Inbound license compared against outbound AGPL-3.0-or-later:

| Library                                 | Formats                                                                    | License (verified)                                         | Compatible?            |
| --------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| @coderline/alphatab 1.8.4               | GP3-5, GPX, GP7/8, MusicXML, CapXML, alphaTex; exports GP7, alphaTex, MIDI | MPL-2.0 (no "Incompatible With Secondary Licenses" notice) | Yes                    |
| guitarpro-parser 1.2.0                  | GP3, GP5, GPX, GP                                                          | Apache-2.0                                                 | Yes                    |
| @tonejs/midi 2.0.28                     | SMF                                                                        | MIT                                                        | Yes                    |
| midi-file 1.2.4                         | SMF                                                                        | MIT                                                        | Yes                    |
| spessasynth_core 4.3.x                  | SMF, RMIDI, SF2, DLS                                                       | Apache-2.0                                                 | Yes                    |
| fflate 0.8.3                            | ZIP, gzip, deflate                                                         | MIT                                                        | Yes                    |
| @zip.js/zip.js 2.23                     | ZIP (streaming, Zip64)                                                     | BSD-3-Clause                                               | Yes                    |
| jszip 3.10.2                            | ZIP                                                                        | MIT OR GPL-3.0-or-later (dual)                             | Yes (choose MIT)       |
| opensheetmusicdisplay 2.2               | MusicXML                                                                   | BSD-3-Clause                                               | Yes                    |
| verovio 6.3                             | MusicXML, MEI, ABC…                                                        | LGPL-3.0-or-later                                          | Yes                    |
| musicxml-interfaces 0.0.21              | MusicXML                                                                   | AGPL-3.0                                                   | Yes                    |
| @stringsync/musicxml 0.3.0              | MusicXML                                                                   | MIT                                                        | Yes                    |
| webmscore 1.2.1                         | many (MuseScore engine)                                                    | GPL-3.0 (version 3 only)                                   | Yes (§13); large       |
| ChordSheetJS 18.0.0                     | ChordPro, chords-over-words, UG                                            | **GPL-2.0-only**                                           | **No**                 |
| chord-mark / chord-mark-converters 0.18 | ChordPro and chords-over-lyrics to ChordMark                               | MIT                                                        | Yes                    |
| chord-symbol 4.0                        | chord names                                                                | MIT                                                        | Yes                    |
| tablature-parser 0.10.1                 | ASCII tab (6-string)                                                       | MIT                                                        | Yes                    |
| scoreman (Rust)                         | ASCII tab to MIDI/MusicXML                                                 | MIT                                                        | Yes (via WASM)         |
| PyGuitarPro                             | GP3-5 (Python)                                                             | LGPL-3.0                                                   | Yes (reference)        |
| TuxGuitar                               | GP1-7, PTB, TEF, TG                                                        | LGPL-2.1                                                   | Yes (reference)        |
| Power Tab Editor 2                      | PTB, PT2, GP                                                               | GPL-3.0-or-later                                           | Yes (reference / WASM) |
| MuseScore Studio                        | everything                                                                 | GPL-3.0 (version 3 only)                                   | Yes (reference)        |

---

## 15. Open questions and flags

1. **`L4.06`:** what product writes it? Probably a Lite edition (UNVERIFIED). alphaTab parses it like
   v4.06; confirm with a real file.
2. **GPX directory entries (type 1):** confirmed in one sample only. Confirm on more files before
   relying on root-directory traversal.
3. **The GP8 `.gpss` / `.gpsv` formats** are undocumented binaries that look like protobuf. Treat them as
   opaque when round-tripping.
4. **GPIF octave numbering** (+1 compared with scientific pitch) was seen in one sample. Rely on `Midi`
   and string/fret rather than `Pitch`.
5. **`.ptx`** is not a known Power Tab format (see section 7).
6. **alphaTab's 1000-bar cap** may reject legitimate long GP3-5 files. Consider raising it upstream as a
   setting.
7. **The CapXML namespace URI** was not verified. Sniff on the `score` root element instead.

## Sources

- alphaTab: https://github.com/CoderLine/alphaTab (v1.8.4: `ScoreLoader.ts`, `Gp3To5Importer.ts`,
  `GpxFileSystem.ts`, `GpxImporter.ts`, `Gp7To8Importer.ts`, `GpifParser.ts`, `BinaryStylesheet.ts`,
  `PartConfiguration.ts`, `LayoutConfiguration.ts`, `MusicXmlImporter.ts`, `CapellaImporter.ts`,
  `zip/ZipReader.ts`, `io/BitReader.ts`, `io/IOHelper.ts`, `exporter/Gp7Exporter.ts`, `ImporterSettings.ts`)
- PyGuitarPro: https://github.com/Perlence/PyGuitarPro (`src/guitarpro/io.py`, `iobase.py`, `gp3.py`,
  `gp4.py`, `gp5.py`, `docs/pyguitarpro/format.rst`); docs at https://pyguitarpro.readthedocs.io
- MuseScore: `src/importexport/guitarpro/internal/importgtp.cpp`, `importgtp-gp5.cpp`, `importgtp-gp6.cpp`,
  `gtp/gp7dombuilder.cpp`, `gtp/gpconverter.cpp`, `importptb.cpp`; `src/importexport/tabledit/internal/importtef.*`;
  `src/importexport/capella/internal/capella.cpp`, `capxml.cpp`; `src/engraving/infrastructure/mscwriter.cpp`
  (https://github.com/musescore/MuseScore)
- TuxGuitar: https://github.com/helge17/tuxguitar (`GP1..GP5InputStream.java`, `gpx/v6|v7/GPXFileSystem.java`,
  `ptb/PTFileFormatDetector.java`, `tef3/TEInputStream.java`, `io/tg/*/TGStream.java`, `TuxGuitar-lib/.../io/tg/TGStream.java`, `CHANGES`, `docs/LICENSE`)
- Power Tab Editor 2: https://github.com/powertab/powertabeditor (`source/formats/gpx/doc.rst`,
  `powertab_old/powertabdocument/powertabfileheader.*`, `powertab/powertabimporter.cpp`, `fileformatmanager.cpp`)
- PRONOM: https://pronom.nationalarchives.gov.uk/fmt/1872 and https://pronom.nationalarchives.gov.uk/fmt/1873
- MusicXML 4.0 (W3C): https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/ ,
  https://www.w3.org/2021/06/musicxml40/tutorial/hello-world/ ,
  https://www.w3.org/2021/06/musicxml40/tutorial/structure-of-musicxml-files/
- UTF-16 MusicXML reports: https://musescore.org/en/node/268614 , https://musescore.org/en/node/7731 ,
  https://forums.steinberg.net/t/xml-parsing-failed/154521
- RMID: https://loc.gov/preservation/digital/formats/fdd/fdd000120.shtml ;
  https://github.com/spessasus/sf2-rmidi-specification
- ChordPro: https://www.chordpro.org/chordpro/chordpro-directives/ ,
  https://chordpro.org/beta/chordpro-introduction/ , https://chordpro.org/beta/chordpro-cheat_sheet/
- CapXML: https://www.capella-software.com/CapXML/CapXML-5.4.0.html
- Parsers: https://github.com/martijnversluis/ChordSheetJS (LICENSE, npm `license: GPL-2.0-only`),
  https://github.com/no-chris/chord-mark , https://github.com/1j01/tablature-parser ,
  https://github.com/algorithmiker/scoreman , https://github.com/emilienbev/guitarpro-parser ,
  https://github.com/LibreScore/webmscore , npm registry metadata (`npm view <pkg> license`)
