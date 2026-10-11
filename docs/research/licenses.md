# OpenTabz research note B: asset and dependency licenses

Researched 2026-10-11. OpenTabz is distributed under **AGPL-3.0-or-later**.

**How the licenses were verified.** Each license was checked against a primary source:

- the repository's LICENSE/COPYING file, read through the GitHub API
- the `license` field of the published npm package (`npm view`)
- the distributor's own license page or file

GitHub's detected SPDX identifier, which comes from the LICENSE file, was cross-checked against npm.

**How sizes were measured.** Sizes come from the GitHub contents API, the npm `dist.unpackedSize` field
(which includes every build format, source maps, and type files, so it is much larger than the real
bundle cost), Debian package pages, or the distributor's own listing. Nothing large was downloaded;
only license texts and pages were read.

**What the verdicts mean.**

- **OK:** can ship inside OpenTabz.
- **OK-cond:** can ship, with the stated obligations.
- **NO:** do not ship.
- **UNCLEAR:** resolve before shipping.

**FLAG** marks a problem that needs attention.

---

## 0. Key findings

1. **Incompatible as currently licensed:**
   - **ChordSheetJS** is GPL-2.0-only. See note A.
   - **@echogarden/rubberband-wasm** declares GPL-2.0-only.
   - The **Arachno SoundFont** has no license and its site reserves all rights.
   - **Essentia's pretrained models** are CC BY-NC-ND 4.0.
   - The **Voxengo IR pack** allows use but not free redistribution with modification.
2. **Licenses that differ from the assumptions in the brief:**
   - **mediabunny** is **MPL-2.0**, not MIT. Its MP3 encoder embeds LAME (LGPL).
   - **flexlayout-react** is **MIT**, not ISC.
   - **pitchfinder** declares the non-SPDX string `"GNU v3"` and ships no LICENSE file: UNCLEAR.
   - **SoundTouchJS** has been **relicensed from LGPL-2.1 to MPL-2.0** in its 2.x packages.
   - **TimGM6mb** is labelled `GPL-2` (no "or later") by Debian.
   - **aubio** is GPL-3.0-or-later. That is _compatible_ with AGPL; it is not a blocker.
3. **Provenance flag on alphaTab's bundled SONiVOX bank.** alphaTab ships it as Apache-2.0, on the basis
   that it derives from the AOSP Sonivox EAS wavetable, which is verified Apache-2.0. The community upload
   it was taken from (musical-artifacts #1517) labels it **CC-BY-3.0** and has a garbled provenance text
   that mentions a "Creative Sound Blaster GM bank". It is probably fine. For a clean chain, we could
   regenerate the SF2 ourselves from the AOSP `wt_200k_G` data. See 2.1.
4. **Recommended picks:**
   - **SoundFonts:** SONiVOX (instant, ~1 MB) plus MuseScore_General.sf3 (MIT, 38 MB) as an optional
     download, and a custom guitar/bass/drum bank built from **CC0** FreePats and Karoryfer instruments.
   - **Docking:** **FlexLayout** (`flexlayout-react`, MIT, React 18/19, documented WAI-ARIA tabs pattern
     and remappable keyboard).
   - **PDF:** convert alphaTab's SMuFL `<text>` glyphs to outlines with **opentype.js** and the
     unmodified Bravura.otf, then assemble pages with **jsPDF + svg2pdf.js** (all MIT).
   - **Time-stretch:** **signalsmith-stretch** (MIT) by default, with Rubber Band WASM (GPL-2.0-or-later)
     as an optional high-quality engine.
   - **Pitch detection:** **pitchy** (MIT).
   - **Encoders:**
     - FLAC: `@mediabunny/flac-encoder` or `libflacjs` (BSD core)
     - Ogg Vorbis: `wasm-media-encoders`
     - Opus: WebCodecs plus mediabunny
     - MP3: LAME is unavoidable, so it is LGPL. Lazy-load it as a separate module.
   - **Impulse responses:** generate our own IRs and release them CC0. No verified CC0 cab-IR pack exists.

---

## 1. Compatibility rules for an AGPL-3.0-or-later web app

This section restates the license terms in my own words. Sources: FSF license list, GPLv3/AGPLv3 §13,
MPL-2.0 §3.3.

| Inbound license                                                             | Can it go into OpenTabz?      | Why                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MIT/Expat, BSD-2/3, ISC, 0BSD, Zlib, Unlicense, CC0                         | Yes                           | Permissive. The FSF lists them as GPL-compatible. Keep the notices.                                                                                                                                                                                                                                                                   |
| Apache-2.0                                                                  | Yes                           | Compatible with GPLv3 and AGPLv3, but not with GPLv2. Keep LICENSE and NOTICE and mark changes.                                                                                                                                                                                                                                       |
| MPL-2.0                                                                     | Yes                           | MPL §3.3 lets MPL files be combined with "Secondary Licenses", which include AGPL-3.0, _unless_ a file carries the Exhibit B "Incompatible With Secondary Licenses" notice. Neither alphaTab nor mediabunny uses it. Modified MPL files must stay MPL and their source must be available.                                             |
| LGPL-2.1 / LGPL-3.0                                                         | Yes, with conditions          | LGPL-2.1 can be converted to GPL. LGPLv3 is GPLv3 plus extra permissions. Either way the code can sit inside an AGPLv3 combination. Users must get the source of the LGPL part, any changes to it, and the ability to replace it. Our AGPL source offer covers most of this; also keep the component in a separately loadable module. |
| GPL-3.0-only / GPL-3.0-or-later                                             | Yes (see below)               | GPLv3 §13 and AGPLv3 §13 explicitly allow combining the two licenses.                                                                                                                                                                                                                                                                 |
| GPL-2.0-or-later                                                            | Yes                           | Take it under v3, then combine it as above.                                                                                                                                                                                                                                                                                           |
| **GPL-2.0-only**                                                            | **No**                        | GPLv2-only cannot be upgraded to v3, so it cannot be combined with AGPLv3 code.                                                                                                                                                                                                                                                       |
| AGPL-3.0                                                                    | Yes                           | Same license family. If the dependency is AGPL-3.0-_only_, the combination is effectively v3-only.                                                                                                                                                                                                                                    |
| CC BY 4.0 / CC BY-SA 4.0 (assets)                                           | Yes                           | The FSF lists CC BY 4.0 as compatible with every GPL version, and CC BY-SA 4.0 as one-way compatible with GPLv3. Give attribution.                                                                                                                                                                                                    |
| CC BY 3.0 (assets)                                                          | Yes, as a separate asset file | A free license. FreePats accepts version 3.0 and later. Attribution is required.                                                                                                                                                                                                                                                      |
| CC BY-NC / -ND, "personal use only", "no redistribution", no license at all | **No**                        | Not free licenses. Shipping them would contradict OpenTabz's license grant and block forks. At most, let users load their own copies at runtime.                                                                                                                                                                                      |
| SIL OFL 1.1 (fonts)                                                         | Yes                           | A free license. It cannot be sold on its own (trivially satisfied). Reserved Font Names limit what modified copies may be called (section 6).                                                                                                                                                                                         |

**GPL-3.0 versus AGPL-3.0, and why the compatibility runs one way only.** Both licenses have a section 13.

- GPLv3 §13 allows a GPLv3 work to be linked or combined with an AGPLv3 work and the result conveyed.
  The GPL part stays under the GPL, but the AGPL's network clause applies to the combination as a whole.
- AGPLv3 §13 mirrors this. The AGPL part stays AGPL, the GPL part stays GPLv3, and the source a network
  user is entitled to includes the incorporated GPL code.
- So GPL-3.0 code, such as aubio or Rubber Band taken under v3, can ship inside OpenTabz. The combination
  must meet the AGPL's offer-source-to-network-users duty, which OpenTabz already meets.
- It is "one-way" in this sense: the GPL component does not _become_ AGPL. Anyone can extract it and use
  it under plain GPLv3. Our own AGPL code can never be relicensed as GPL.
- Software under GPLv2-only has no such clause, which is why ChordSheetJS is excluded.

**Assets are separate works.** SoundFonts, sample libraries, impulse responses and fonts loaded at
runtime are aggregated with the program rather than combined into it. Each keeps its own license, and we
must honour each one: attribution, license text, share-alike. That is why the asset verdicts below are
about the asset's own terms.

---

## 2. SoundFonts and sample libraries

### 2.1 Table

| Asset                                                                           | SPDX                                                          | Verified at                                                                                                                                                                                                                                                                                           | Size                                                                       | Verdict                            | Attribution and obligations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SONiVOX EAS GM**, as bundled by alphaTab (`font/sonivox/sonivox.sf2`, `.sf3`) | Apache-2.0 (alphaTab's label)                                 | https://github.com/CoderLine/alphaTab/blob/develop/packages/alphatab/font/sonivox/LICENSE ; upstream AOSP: https://android.googlesource.com/platform/external/sonivox/+/refs/heads/main/arm-wt-22k/NOTICE and `lib_src/wt_22khz.c` (generated from `wt_200k_G.dls`, © 2009 Sonic Network, Apache-2.0) | sf2 1,351,896 B; sf3 977,208 B                                             | **OK-cond** (**FLAG**: provenance) | Ship the Apache-2.0 text and the notice "Copyright (c) 2004-2006 Sonic Network Inc." **FLAG:** alphaTab's README cites musical-artifacts #1517 (file `wt_210k_G.sf2`). That page's metadata says `license: by-3` (CC BY 3.0), and its description mentions a Creative Sound Blaster GM bank and Vienna SoundFont Studio. The AOSP wavetable really is Apache-2.0, but this conversion's chain is murky. Either credit both (Apache notice plus a CC BY 3.0-style credit to Sonic Network) or regenerate an SF2 from the AOSP C data ourselves. |
| **FluidR3_GM** (Frank Wen)                                                      | MIT                                                           | https://sources.debian.org/data/main/f/fluid-soundfont/3.1-6/debian/copyright                                                                                                                                                                                                                         | about 142 MiB sf2 (Debian installed size 145,170 kB; the .deb is 116.8 MB) | **OK**                             | Keep the MIT notice: "© 2000-2002, 2008 Frank Wen; 2008 Toby Smithe". Too big for the web as is. Use MuseScore_General.sf3 instead, which derives from it.                                                                                                                                                                                                                                                                                                                                                                                     |
| **MuseScore_General** v0.2.0 (2020)                                             | MIT                                                           | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General_License.md                                                                                                                                                                                                         | **sf3 38 MB**, sf2 206 MB (OSUOSL listing)                                 | **OK-cond**                        | The license says its acknowledgements must stay in any derivative: FluidR3 (Frank Wen), FluidR3Mono (Michael Cowgill), adaptation (S. Christian Collins), Temple Blocks (Ethan Winer), Drumline Cymbals (Michael Schorsch). Also include the MIT text. The `Sample_Sources.csv` lists sources as public domain (AKAI "Splendid Grand", confirmed with an AKAI representative), VCSL **CC0**, Michael Schorsch **MIT**, and FluidR3Mono **MIT**. All permissive.                                                                                |
| **GeneralUser GS** v2.0.3 (2026-02-22)                                          | `LicenseRef-scancode-generaluser-gs-2.0` (custom, permissive) | https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt                                                                                                                                                                                                                      | 32,319,396 B sf2                                                           | **OK-cond**                        | Allows unrestricted use, including commercial, and use in software projects with modification. Asks that we not hot-link the author's downloads. **FLAG:** the author says he cannot be 100% sure where every sample came from, although none is from a commercial pack. Credit is courteous but not required.                                                                                                                                                                                                                                 |
| **TimGM6mb** (Tim Brechbill)                                                    | `GPL-2.0` per Debian (`GPL-2`, no "+")                        | https://sources.debian.org/data/main/t/timgm6mb-soundfont/1.3-5/debian/copyright                                                                                                                                                                                                                      | about 5.9 MiB (installed 6,073 kB)                                         | **UNCLEAR, avoid**                 | Debian labels it GPL version 2. The author's original statement, quoted by Debian, only says "GNU General Public License" with no version, which under GPLv2 §9 would allow any version. Ambiguous, and it adds nothing over MuseScore_General. Skip it.                                                                                                                                                                                                                                                                                       |
| **Arachno SoundFont**                                                           | none (all rights reserved)                                    | https://www.arachnosoft.com/main/soundfont.php (no license section; the footer says any reproduction is forbidden without authorization)                                                                                                                                                              | SF2 136 MB (sfArk 78.7 MB)                                                 | **NO**                             | A second-hand report (OpenGameArt comment, 2015) quotes the old docs as saying the bank was primarily for private, non-commercial use because it contains other authors' material.                                                                                                                                                                                                                                                                                                                                                             |
| **Salamander Grand Piano** v3 (Alexander Holm)                                  | CC-BY-3.0                                                     | https://github.com/sfzinstruments/SalamanderGrandPiano/blob/master/LICENSE                                                                                                                                                                                                                            | SF2 296 MiB; SFZ FLAC 707 MiB; WAV 44.1k/16-bit 394 MiB (FreePats listing) | **OK-cond**                        | Credit the author, link the license, and note any changes (conversion, trimming).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### 2.2 Permissively licensed SFZ libraries (sfzinstruments org)

The SPDX ids come from each repo's LICENSE file. I read the full text for the starred (*) entries.
"Repo size" is GitHub's `diskUsage`, which includes git history, so treat it as an approximation.

| Library                                                                                            | Instrument                      | SPDX              | Repo size                                           |
| -------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------- | --------------------------------------------------- |
| `karoryfer.black-and-green-guitars`*                                                               | electric guitars                | **CC0-1.0**       | about 444 MB                                        |
| `karoryfer.shinyguitar`*                                                                           | electric guitar                 | CC0-1.0           | about 351 MB                                        |
| `karoryfer.emilyguitar`*                                                                           | guitar                          | CC0-1.0           | about 99 MB                                         |
| `ganjo`                                                                                            | guitar-banjo                    | CC0-1.0           | about 22 MB                                         |
| `karoryfer.black-and-blue-basses`*                                                                 | bass guitars (KVRDC 2023 entry) | CC0-1.0           | about 962 MB                                        |
| `karoryfer.big-little-bass`, `.meatbass`, `.pastabass`, `.growlybass`, `.swagbass`, `.fashionbass` | bass guitars                    | CC0-1.0           | about 138–302 MB each                               |
| `dsmolken.double-bass`, `karoryfer.sneakybass`                                                     | double bass                     | CC0-1.0           | about 253 / 324 MB                                  |
| `virtuosity_drums`* (Versilian and Karoryfer)                                                      | acoustic kit                    | CC0-1.0           | about 1.14 GB                                       |
| `karoryfer.big-rusty-drums`*, `.swirly-drums`, `.unruly-drums`, `.frankensnare`                    | drums                           | CC0-1.0           | about 329–821 MB                                    |
| `DrumGizmo.DRSKit`*, `DrumGizmo.MuldjordKit`                                                       | drums                           | CC-BY-4.0         | about 719 / 329 MB                                  |
| `WilkinsonAudio.NakedDrums`                                                                        | drums (10 round-robins)         | CC-BY-4.0         | about 1.19 GB                                       |
| `SamsSonor`                                                                                        | drums                           | CC-BY-SA-4.0      | about 35 MB                                         |
| `Osiris_Piano`                                                                                     | piano                           | CC0-1.0           | about 437 MB                                        |
| `BengtNilsson.HeadroomPiano`                                                                       | Yamaha C3                       | CC-BY-4.0         | about 134 MB                                        |
| `Discord-SFZ-GM-Bank`                                                                              | GM bank in SFZ                  | **none detected** | about 175 MB, **do not use** until it has a license |

URL pattern: `https://github.com/sfzinstruments/<repo>/blob/<branch>/LICENSE` (the branch is `main` or
`master`). These libraries are multi-hundred-MB, multi-velocity sets. For the web, extract a reduced
subset (fewer velocity layers, shorter loops) into an SF3 file. CC0 allows this without any conditions.

### 2.3 FreePats (https://freepats.zenvoid.org)

FreePats only accepts licenses compatible with the DFSG. New contributions should be CC0. The
"GPL + exception" license is deprecated for new work. Its exception says a composition that uses the
sounds does not, by that alone, become GPL-covered.

| Instrument                                                                       | SPDX                                        | Smallest SF2                                        | Notes                    |
| -------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------ |
| FSBS Electric Guitar Clean #1 / #2 (Jazz)                                        | CC0-1.0                                     | **small SF2 6.3 MiB / 5.0 MiB** (full 129 / 66 MiB) | Fender, bridge pickup    |
| FSBS Electric Guitar Direct (DI, for amp-sim)                                    | CC0-1.0                                     | SF2 60 MiB                                          |                          |
| FSBS Electric Guitar Distorted #1 / #2                                           | CC0-1.0                                     | SF2 317 / 121 MiB                                   |                          |
| Nylon-string acoustic guitar                                                     | CC0-1.0                                     | SF2 9.5 MiB                                         |                          |
| Clean Electric Bass (Yamaha RBX), picked and finger                              | CC0-1.0                                     | **SF2 2.2 / 2.5 MiB**                               |                          |
| FSS Steel-string acoustic guitar                                                 | GPL-3.0-or-later + FreePats sound exception | small SF2 2.7 MiB                                   | OK (GPLv3 is compatible) |
| Upright Piano KW                                                                 | CC0-1.0                                     | small SF2 5.8 MiB                                   |                          |
| MuldjordKit (drums)                                                              | CC-BY-4.0                                   | SF2 53 MiB                                          |                          |
| FreePats General MIDI set (2022-10-26, _incomplete_: 45 melodic + 43 percussion) | GPL-3.0-or-later + exception                | SF2 227 MiB (307 MiB unpacked)                      |                          |
| FreePats GM percussion set                                                       | GPL-3.0-or-later + exception                | SFZ/WAV 20 MiB                                      |                          |

Pages: `ElectricGuitar/clean-electric-guitar.html`, `distorted-electric-guitar.html`,
`clean-electric-bass.html`, `Guitar/acoustic-guitar.html`, `Guitar/steel-acoustic-guitar.html`,
`Piano/acoustic-grand-piano.html`, `Percussion/acoustic-drum-kit.html`, `SoundSets/general-midi.html`,
`licenses.html`.

**Recommendation.**

- **Tier 0 (bundled, instant):** SONiVOX, about 1 MB, already in alphaTab.
- **Tier 1 (default guitar-centric bank, roughly 20–40 MB SF3):**
  - FreePats CC0 clean and jazz guitars, nylon guitar, picked and finger bass, upright piano
  - a reduced CC0 Karoryfer or Virtuosity drum kit
  - SONiVOX for the remaining GM programs
  - Keep a `CREDITS.md` that maps each preset to its source and license.
- **Tier 2 (optional download):** MuseScore_General.sf3 (MIT, 38 MB) for full GM coverage.

alphaTab's synth (based on TinySoundFont, MIT) reads SF2 and SF3.

---

## 3. sfizz and SFZ playback in the browser

| Item                                            | SPDX                                                      | Verified at                                                             | Size                     | Verdict            | Notes                                                                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **sfizz** (SFZ parser and synth, C++)           | BSD-2-Clause                                              | https://github.com/sfztools/sfizz/blob/develop/LICENSE                  | n/a (C++)                | **OK**             | Last push 2025-03. Activity has slowed.                                                                                                                                               |
| **sfizz-webaudio** (sfztools)                   | MIT (front-end); the sfizz core inside is BSD-2-Clause    | https://github.com/sfztools/sfizz-webaudio/blob/main/LICENSE            | not on npm               | **OK, but a demo** | README: an Emscripten branch of sfizz; only generators and embedded samples supported; all files loaded into memory; Chrome-only demo. Last push 2024-06. A prototype, not a library. |
| `sfz-web-player` (kmturley) + `@sfz-tools/core` | CC0-1.0                                                   | https://github.com/kmturley/sfz-web-player                              | small                    | **OK**             | A pure Web Audio SFZ player. Worth evaluating if real SFZ features are needed (round-robins, release triggers).                                                                       |
| `spessasynth_core` / `_lib` 4.3.x               | Apache-2.0                                                | https://github.com/spessasus/spessasynth_core                           | 2.4 MB unpacked (`_lib`) | **OK**             | SF2/SF3/**DLS** synth, RMIDI with embedded banks. An alternative to alphaTab's synth. Not SFZ.                                                                                        |
| `js-synthesizer` 1.13                           | BSD-3-Clause wrapper **plus LGPL-2.1 libfluidsynth WASM** | https://github.com/jet2jet/js-synthesizer (README states both licenses) | 6.9 MB unpacked          | **OK-cond**        | FluidSynth in WASM. The LGPL obligations apply to `libfluidsynth-*.js`.                                                                                                               |

**Recommendation.** Keep alphaTab's SF2/SF3 synth. Convert SFZ libraries offline into SF3 subsets.
Only consider a sfizz WASM build (BSD-2, built by us) or `sfz-web-player` if SFZ-specific behaviour
becomes a product requirement.

---

## 4. Audio encoders and muxers

| Package / library                      | Wrapper SPDX                                                                               | Embedded codec license                                                              | Size                                                  | Verdict                                       | Notes                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LAME** (reference MP3 encoder)       | **LGPL-2.0-or-later** (COPYING is the GNU _Library_ GPL v2; source headers add "or later") | n/a                                                                                 | n/a                                                   | **OK-cond**                                   | https://lame.sourceforge.io/license.txt (asks for an acknowledgement and a link). COPYING checked via the mirror https://github.com/rbrito/lame/blob/origin/COPYING. LAME's mpglib _decoder_ is GPL, but encoding does not use it. MP3 patents have expired. |
| `lamejs` 1.2.1                         | `LGPL-3.0` in package.json                                                                 | a pure-JS port of LAME                                                              | 6.5 MB unpacked                                       | **OK-cond**, **FLAG**                         | https://github.com/zhuker/lamejs/blob/master/LICENSE contains only LAME's "can I use it commercially" FAQ, with no license text. As a derivative, the code is LAME's LGPL-2+. Last npm publish 2022.                                                         |
| `@breezystack/lamejs` 1.2.7            | `LGPL-3.0`                                                                                 | same port, ESM/TypeScript                                                           | 471 KB unpacked                                       | **OK-cond**                                   | https://github.com/shijinyu/lamejs . A modernized fork.                                                                                                                                                                                                      |
| `wasm-media-encoders` 0.7.0            | MIT                                                                                        | **LAME (LGPL-2.0+) in `mp3.wasm`**; libvorbis/libogg (BSD-3) in `ogg.wasm`          | README: MP3 66 KiB, Vorbis 158 KiB (JS+WASM, gzipped) | **OK-cond** (MP3), **OK** (Vorbis)            | https://github.com/arseneyr/wasm-media-encoders/blob/master/LICENSE . **FLAG:** the README's "MIT" covers the wrapper only; the MP3 binary carries LGPL obligations. Last publish 2024-05.                                                                   |
| **libogg / libvorbis**                 | BSD-3-Clause                                                                               |                                                                                     |                                                       | **OK**                                        | https://github.com/xiph/ogg/blob/main/COPYING , https://github.com/xiph/vorbis/blob/main/COPYING                                                                                                                                                             |
| **libopus**                            | BSD-3-Clause, plus royalty-free patent licenses (IETF IPR 1524, 1914, 1526)                |                                                                                     |                                                       | **OK**                                        | https://github.com/xiph/opus/blob/main/COPYING                                                                                                                                                                                                               |
| **libFLAC**                            | BSD-3-Clause (`COPYING.Xiph`)                                                              |                                                                                     |                                                       | **OK**                                        | https://github.com/xiph/flac (README: the libraries are BSD-style, the `flac`/`metaflac` CLI tools are GPL-2.0-or-later, the docs are GFDL)                                                                                                                  |
| `libflacjs` 5.6.0 (mmig)               | MIT (© DFKI)                                                                               | libFLAC BSD-3, libogg BSD-3                                                         | 8.2 MB unpacked (several builds)                      | **OK**                                        | https://github.com/mmig/libflac.js/blob/master/LICENSE . Active (2026-07).                                                                                                                                                                                   |
| `flac.js` (audiocogs)                  | LGPL                                                                                       | **a decoder** (Aurora.js plugin)                                                    | n/a                                                   | n/a                                           | Not an encoder. Not needed.                                                                                                                                                                                                                                  |
| "wasm-flac"                            | no npm package by that name. The closest is `g-plane/flac.wasm`.                           | GPL-2.0 (wraps the GPL `flac` CLI)                                                  | n/a                                                   | **OK-cond** (FLAC tools are GPL-2.0-or-later) | https://github.com/g-plane/flac.wasm/blob/main/LICENSE . Prefer libflacjs or the mediabunny FLAC encoder.                                                                                                                                                    |
| `ogg-vorbis-encoder-js` (higuma)       | MIT (wrapper), BSD (libvorbis)                                                             | asm.js                                                                              | not on npm                                            | **OK, but stale (2016)**                      | https://github.com/higuma/ogg-vorbis-encoder-js/blob/master/LICENSE.txt . Use `wasm-media-encoders` instead.                                                                                                                                                 |
| **`mediabunny`** 1.61.3                | **MPL-2.0** (not MIT)                                                                      | uses WebCodecs; PCM codecs built in                                                 | 10.9 MB unpacked                                      | **OK**                                        | https://github.com/Vanilagy/mediabunny/blob/main/LICENSE . Reads and writes MP4/MOV, WebM/MKV, Ogg, MP3, WAV, ADTS, FLAC, MPEG-TS, HLS. Replaces mp4-muxer and webm-muxer. Very active.                                                                      |
| `@mediabunny/mp3-encoder`              | MPL-2.0                                                                                    | **LAME 3.100 WASM (LGPL)**                                                          | about 130 kB gzipped (README)                         | **OK-cond**                                   | The README itself says LAME is LGPL. SIMD build, about 55× real time.                                                                                                                                                                                        |
| `@mediabunny/flac-encoder`             | MPL-2.0                                                                                    | libFLAC (BSD-3)                                                                     | 1.6 MB unpacked                                       | **OK**                                        |                                                                                                                                                                                                                                                              |
| `@mediabunny/aac-encoder`              | MPL-2.0                                                                                    | FFmpeg's native AAC encoder, built without `--enable-gpl`, so **LGPL-2.1-or-later** | 4.7 MB unpacked                                       | **OK-cond**                                   | **FLAG:** possible AAC patent-pool questions in some jurisdictions (not researched). Prefer Opus or FLAC, or the browser's own AAC encoder.                                                                                                                  |
| `mp4-muxer` 5.2.2 / `webm-muxer` 5.1.4 | MIT                                                                                        | n/a                                                                                 |                                                       | **OK, deprecated**                            | npm says they are superseded by Mediabunny.                                                                                                                                                                                                                  |
| `gifenc` 1.0.3                         | MIT                                                                                        | n/a                                                                                 | 172 KB unpacked                                       | **OK**                                        | https://github.com/mattdesl/gifenc/blob/main/LICENSE.md . Stable, no recent releases.                                                                                                                                                                        |
| `opus-recorder` 8.0.5                  | MIT                                                                                        | Opus BSD-3                                                                          |                                                       | **OK**                                        | https://github.com/chris-rudmin/opus-recorder/blob/master/LICENSE.md . A fallback Opus encoder for when WebCodecs is unavailable.                                                                                                                            |

**WebCodecs.** MDN marks `AudioEncoder` as _limited availability_, not Baseline. Probe it with
`AudioEncoder.isConfigSupported()` and keep WASM fallbacks.

**Best-licensed option for each format:**

- **WAV:** our own writer (about 50 lines), or mediabunny's PCM. No third-party license.
- **FLAC:** `@mediabunny/flac-encoder` if we adopt mediabunny; otherwise `libflacjs`. MPL or MIT
  wrapper, BSD core.
- **Ogg Vorbis:** `wasm-media-encoders` (`audio/ogg` only). MIT plus BSD.
- **Opus (Ogg or WebM):** the WebCodecs `AudioEncoder` with mediabunny muxing; fallback
  `opus-recorder`. All permissive.
- **MP3:** every serious option is LAME, so **LGPL**. Use `@mediabunny/mp3-encoder` (faster) or
  `wasm-media-encoders` (smaller). Lazy-load it as its own chunk or worker. Include the LGPL-2.0 text and
  LAME's credit and link, and keep our build scripts in the repo.
- **AAC/M4A:** only through the browser's own WebCodecs encoder. Don't bundle one unless users ask.
- **Video export (MP4/WebM of the score with audio):** mediabunny and WebCodecs.
- **GIF:** `gifenc`.

**What LGPL means for an AGPL web app, in practice.**

1. The LGPL part can legally live inside the AGPL combination.
2. Recipients must be able to get the LGPL source and our changes. Our AGPL "Source" link must cover the
   encoder sources and build scripts too.
3. Users must be able to swap in a modified version. Shipping the encoder as a separate `.wasm` and JS
   worker, rather than inlined into the main bundle, makes this concrete.
4. Keep the license texts in the app's `/licenses` view and in the repo.

---

## 5. Impulse responses (convolution reverb and cabinets)

| Source                                                                                  | License                                                         | Verified at                                                                                                                                                                                                                          | Size                                        | Verdict               | Notes                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAIR** (Univ. of York / AHRC)                                                      | **per IR**: contributors choose a CC license or keep all rights | secondary: https://sonicfield.org/openair-a-collective-library-of-impulse-responses ; the official site https://www.openair.hosted.york.ac.uk/ returned **"Account Suspended"** on 2026-10-11, and `openairlib.net` does not resolve | varies                                      | **UNCLEAR, per item** | Only use an IR whose own page (or an archived copy of it) shows CC0, CC BY or CC BY-SA. Record that page's URL in CREDITS. Skip NC and ND items.                                                                                                                                 |
| **Voxengo IM Reverbs**                                                                  | custom (not a CC license)                                       | https://www.voxengo.com/impulses/                                                                                                                                                                                                    | 6.9 MB zip, 44.1 kHz/16-bit WAV, 38 designs | **NO for bundling**   | Royalty-free _use_ is allowed, including commercially. Redistribution must be complete, unaltered and free of charge, with the copyright notice, and the recipient must acknowledge the author's exclusive ownership. That is not a free license. Users may load their own copy. |
| **CC0 guitar-cab IR packs**                                                             | none found                                                      | Searched GitHub and the web                                                                                                                                                                                                          |                                             | **none verified**     | Popular free packs (God's Cab, Metal Cabs, OwnHammer freebies, ML Sound Lab, Devil's Lab) either state no license or forbid redistribution. Don't bundle them.                                                                                                                   |
| Aalto Univ., "Measured room impulse responses for the transition between coupled rooms" | CC-BY-4.0                                                       | https://research.aalto.fi/en/datasets/a-dataset-of-measured-room-impulse-responses-for-the-transition-b/ (DOI 10.5281/zenodo.4095493)                                                                                                |                                             | **OK-cond**           | Research-grade spherical-array captures (Eigenmike, 32 capsules). They need decoding or downmixing to stereo, and attribution.                                                                                                                                                   |
| MIT IR Survey (McDermott lab, 271 IRs)                                                  | **no license stated**                                           | https://mcdermottlab.mit.edu/Reverb/IR_Survey.html                                                                                                                                                                                   |                                             | **NO** (no grant)     |                                                                                                                                                                                                                                                                                  |

**Recommendation.**

1. **Make our own IRs and publish them as CC0.**
   - Synthetic room and plate reverbs: filtered, exponentially decaying stereo noise with early
     reflections.
   - Cab simulators: minimum-phase FIRs designed from published or generic speaker response curves.
   - We would own the copyright outright.
2. Accept community-recorded IRs under CC0, with a contributor attestation.
3. Let users import their own IR files locally (never uploaded) for anything else.

---

## 6. Fonts

| Font                                                                                               | SPDX                                       | Verified at                                                                                                                                                                        | Size                                                                                           | Verdict     | Notes                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| **Bravura** (Steinberg)                                                                            | **OFL-1.1-RFN** (reserved name "Bravura")  | https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt (also `redist/OFL.txt`)                                                                                          | upstream otf 889 KB, **woff2 323 KB**. alphaTab ships an older copy: otf 508 KB, woff2 313 KB. | **OK-cond** | Ship `OFL.txt` with the copyright line. The renaming rule for modified versions applies (below).       |
| **Petaluma** (Steinberg)                                                                           | OFL-1.1-RFN ("Petaluma")                   | https://github.com/steinbergmedia/petaluma/blob/master/redist/OFL.txt                                                                                                              | otf 397 KB, woff2 225 KB                                                                       | **OK-cond** | Handwritten "jazz" SMuFL style.                                                                        |
| **Leland** v0.80 (MuseScore)                                                                       | OFL-1.1-RFN ("Leland")                     | https://github.com/musescore/MuseScore/blob/main/fonts/leland/LICENSE.txt                                                                                                          | Leland.otf 89 KB, LelandText.otf 42 KB (OpenType-CFF)                                          | **OK-cond** |                                                                                                        |
| **Inter**                                                                                          | OFL-1.1 (no RFN)                           | https://github.com/rsms/inter/blob/master/LICENSE.txt                                                                                                                              | `@fontsource-variable/inter` 1.9 MB unpacked (all subsets)                                     | **OK**      | UI text.                                                                                               |
| **JetBrains Mono**                                                                                 | OFL-1.1 (no RFN)                           | https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt                                                                                                                     | about 0.2 MB unpacked (fontsource variable)                                                    | **OK**      | Code and alphaTex editor.                                                                              |
| Display: **Space Grotesk**, **Fraunces**, **Bricolage Grotesque**, **Instrument Serif**, **Geist** | OFL-1.1 (no RFN line in their OFL headers) | `floriankarsten/space-grotesk/OFL.txt`, `undercasetype/Fraunces/OFL.txt`, `ateliertriay/bricolage/OFL.txt`, `Instrument/instrument-serif/OFL.txt`, `vercel/geist-font/LICENSE.txt` |                                                                                                | **OK**      | Distinctive choices: Bricolage Grotesque or Fraunces for headings; Space Grotesk for a technical feel. |

**What the OFL means in practice.** Source: the OFL-FAQ shipped with Petaluma and Bravura.

- **Embedding a font in a PDF, in full or as a subset, is allowed.** It does not change the document's
  license (FAQ 1.12–1.13).
- **Web delivery:**
  - Serve the **upstream** WOFF/WOFF2 files byte-for-byte.
  - Our own WOFF conversion counts as unmodified only if the font data and metadata are exactly
    preserved (FAQ 2.2).
  - **Subsetting or "optimizing" creates a Modified Version (FAQ 2.5–2.6), which must not use the
    reserved name.** For Bravura, Petaluma and Leland, either ship the full upstream WOFF2 or rename
    our subset (for example "OpenTabz Music Glyphs").
- **Converting OTF to TTF**, for example for jsPDF, and _shipping_ the result is a Modified Version and
  must be renamed. Converting at runtime inside the user's browser only to embed into a PDF falls under
  the embedding allowance (UNVERIFIED legal nuance). Outlining glyphs (section 9) avoids the question.

---

## 7. Pitch detection

| Library                      | SPDX                                                                                                | Verified at                                                                                                  | Size                    | Verdict                                                                                                  | Notes                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pitchy** 4.1.0             | **MIT** (npm). The repo HEAD has been relicensed to **0BSD**, not yet released.                     | https://github.com/ianprime0509/pitchy/blob/main/LICENSE (0BSD) and `npm view pitchy license` (MIT)          | 33 KB unpacked          | **OK** (recommended)                                                                                     | McLeod Pitch Method. Pure ESM, built for real-time tuners.                                                                                                                                                                        |
| **pitchfinder** 2.3.4        | **`"GNU v3"`** in package.json. Not a valid SPDX id. **No LICENSE file**, and the README is silent. | https://github.com/peterkhayes/pitchfinder (package.json)                                                    | 229 KB unpacked         | **UNCLEAR**                                                                                              | It probably means GPL-3.0, which _would_ be compatible (§13). But with no license text and an ambiguous id, the legal footing is weak. YIN, McLeod, AMDF, dynamic wavelet. Prefer pitchy, or ask the author for a proper SPDX id. |
| **aubio**                    | **GPL-3.0-or-later** (README and source headers)                                                    | https://github.com/aubio/aubio/blob/master/COPYING                                                           | C library               | **OK-cond** (compatible through §13; the whole combination's source must be offered, which we do anyway) | `aubiojs` (qiuxiang, MIT wrapper; npm 0.2.1, 2022) compiles aubio itself, so the shipped build is GPL-3.0-or-later. Not "incompatible", just copyleft.                                                                            |
| **essentia.js**              | AGPL-3.0 (headers say "version 3 … or any later")                                                   | https://github.com/MTG/essentia.js/blob/master/LICENSE ; https://essentia.upf.edu/licensing_information.html | large                   | **OK** (code). **NO for MTG's pretrained models** (CC BY-NC-ND 4.0).                                     | MTG describes the AGPL edition as being for non-commercial applications, but the AGPL itself has no non-commercial limit. Their _models_ are NC-ND and must not be shipped.                                                       |
| `@spotify/basic-pitch` 1.0.1 | Apache-2.0                                                                                          | https://github.com/spotify/basic-pitch-ts/blob/main/LICENSE                                                  | 1.8 MB plus TF.js       | **OK**                                                                                                   | **Polyphonic** audio-to-MIDI transcription. Useful for a future "audio to tab" feature.                                                                                                                                           |
| CREPE (marl/crepe)           | MIT                                                                                                 | https://github.com/marl/crepe/blob/master/LICENSE                                                            | model size not measured | **OK**                                                                                                   | A neural monophonic pitch tracker in Python/Keras. Older `ml5` 0.x releases (MIT) wrapped a CREPE model for pitch detection. UNVERIFIED for ml5 1.x.                                                                              |

---

## 8. Time-stretching and pitch-shifting

| Library                                                                     | SPDX                                                                                                                            | Verified at                                                                                 | Size                      | Verdict                                   | Notes                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **signalsmith-stretch** 1.3.2 (JS/WASM)                                     | **MIT** (dependency Signalsmith Linear is also MIT)                                                                             | https://github.com/Signalsmith-Audio/signalsmith-stretch/blob/main/LICENSE.txt              | 232 KB unpacked           | **OK** (recommended default)              | `web/` is an AudioWorklet and WASM release on npm. The README says time-stretching sounds best between 0.75× and 1.5×, while pitch-shifting handles several octaves. Supports formant and tonality controls.                                                                                              |
| **SoundTouchJS**: `@soundtouchjs/core`, `@soundtouchjs/audio-worklet` 2.1.1 | **MPL-2.0** (the current repo LICENSE). The README says that after significant rewrites the project moved from LGPL to MPL-2.0. | https://github.com/cutterbl/SoundTouchJS/blob/master/LICENSE                                | 296 KB unpacked (worklet) | **OK**, **FLAG**                          | The legacy `soundtouchjs` 0.3.0 on npm is **LGPL-2.1**. The code descends from SoundTouch (Olli Parviainen, LGPL). The relicensing relies on the rewrite claim. If in doubt, treat it as LGPL-2.1, which is still compatible. The demo music (Bensound) has a limited license, so don't copy demo assets. |
| **Rubber Band Library** 4.0.0                                               | **GPL-2.0-or-later**, or a commercial license                                                                                   | https://github.com/breakfastquay/rubberband/blob/default/COPYING (README "Licence" section) | C++                       | **OK** (taken under GPLv3, then combined) | The best quality for large stretches (the R3 engine). Distributing under non-GPL terms needs a commercial license. Not relevant to us.                                                                                                                                                                    |
| `rubberband-wasm` 3.3.0 (Daninet)                                           | npm `"GPLv2"` (not SPDX); README just says "GNU GPL"                                                                            | https://github.com/Daninet/rubberband-wasm/blob/master/LICENSE                              | 644 KB unpacked           | **UNCLEAR**                               | It is unclear whether the _wrapper_ is v2-only. Safer: build our own WASM from upstream Rubber Band (GPL-2.0-or-later) and license our wrapper as AGPL.                                                                                                                                                   |
| `rubberband-web` 0.2.1                                                      | GPL-2.0-or-later                                                                                                                | https://github.com/delude88/rubberband-web/blob/main/LICENSE                                | 1.45 MB unpacked          | **OK**                                    | Stale (2022).                                                                                                                                                                                                                                                                                             |
| `@echogarden/rubberband-wasm` 0.2.0                                         | **GPL-2.0-only** (as declared)                                                                                                  | npm metadata                                                                                |                           | **NO** (as declared)                      |                                                                                                                                                                                                                                                                                                           |

**Recommendation.** Use signalsmith-stretch for live practice speed (about 70–150%) and transposition.
Offer an optional, lazily loaded Rubber Band WASM engine (our own build, GPL-2.0-or-later used under v3)
for very slow practice speeds (below 70%), where the phase-vocoder artifacts of lighter engines are most
noticeable. The quality claim is from my experience, not measured here.

---

## 9. Web UI dependencies

Versions are as of 2026-10-11 (npm).

| Package                                               | Version         | SPDX              | Verified at                                                        | Verdict              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | --------------- | ----------------- | ------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react / react-dom                                     | 19.3.0          | MIT               | https://github.com/facebook/react/blob/main/LICENSE                | OK                   |                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Radix UI primitives (`radix-ui`, `@radix-ui/react-*`) | 1.7.0 / 1.x–2.x | MIT               | https://github.com/radix-ui/primitives/blob/main/LICENSE           | OK                   |                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| tailwindcss                                           | 4.3.3           | MIT               | https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE      | OK                   | Only the framework is MIT. Tailwind's paid component kits are not.                                                                                                                                                                                                                                                                                                                                                                           |
| zustand                                               | 5.0.15          | MIT               | https://github.com/pmndrs/zustand/blob/main/LICENSE                | OK                   |                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| dexie                                                 | 4.4.6           | **Apache-2.0**    | https://github.com/dexie/Dexie.js/blob/master/LICENSE              | OK                   | Compatible with GPLv3 and AGPLv3, but not GPLv2. Keep the notice. Dexie Cloud is a separate commercial service.                                                                                                                                                                                                                                                                                                                              |
| fflate                                                | 0.8.3           | MIT               | https://github.com/101arrowz/fflate/blob/master/LICENSE            | OK                   |                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| cmdk                                                  | 1.1.1           | MIT               | https://github.com/pacocoursey/cmdk/blob/main/LICENSE.md           | OK                   | Last release 2025.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **dockview**, `dockview-react`, `dockview-core`       | 8.5.1           | MIT               | https://github.com/mathuo/dockview/blob/master/LICENCE.md          | OK, **FLAG**         | The monorepo also contains **`dockview-enterprise`, which is proprietary**. According to dockview.dev's licensing page, spatial keyboard navigation, keyboard docking, multi-row and pinned tabs, layout history, smart guides and similar features are Enterprise-only. The MIT core keeps ARIA roles and labels, screen-reader announcements, focus indicators and basic keyboard focus navigation. Never depend on `dockview-enterprise`. |
| **flexlayout-react** (Caplin)                         | 0.11.1          | **MIT** (not ISC) | https://github.com/caplin/FlexLayout/blob/master/LICENSE           | **OK (recommended)** | Peer deps `react ^18 \|\| ^19`; React is its only dependency. Documented accessibility: the WAI-ARIA Tabs pattern (tablist, tab, tabpanel), `separator` splitters with aria values, menus with roles, `aria-keyshortcuts`, a **remappable `keyMap`** (it cites WCAG 2.1.4), and visible focus styling. Popouts and floating panels, tab overflow menu. Pushed 2026-10-09.                                                                    |
| golden-layout                                         | 2.6.0           | MIT               | https://github.com/golden-layout/golden-layout/blob/master/LICENSE | OK                   | No React binding. Last npm publish 2023-02. Not recommended for React 19.                                                                                                                                                                                                                                                                                                                                                                    |
| rc-dock                                               | 4.1.0           | Apache-2.0        | https://github.com/ticlo/rc-dock/blob/master/LICENSE               | OK                   | React ≥ 18, active. No documented accessibility story.                                                                                                                                                                                                                                                                                                                                                                                       |
| react-mosaic-component                                | 7.2.1           | Apache-2.0        | https://github.com/nomcopter/react-mosaic/blob/master/LICENSE      | OK                   | Tiling, not docking with tabs. React 16–19.                                                                                                                                                                                                                                                                                                                                                                                                  |
| allotment / react-resizable-panels                    | 1.20.5 / 4.14.4 | MIT               | `johnwalley/allotment`, `bvaughn/react-resizable-panels`           | OK                   | Split panes only. Useful if full docking is overkill.                                                                                                                                                                                                                                                                                                                                                                                        |

**Docking recommendation: FlexLayout** (`flexlayout-react`). It is fully MIT, with no paid tier to drift
into, supports React 19, has the most complete _documented_ keyboard and ARIA behaviour of the options,
and is actively maintained.

Runner-up: `dockview-react`. It is more popular and has zero dependencies, but some of its accessibility
and keyboard features sit in the commercial tier.

---

## 10. PDF generation (alphaTab SVG to vector PDF with Bravura)

How alphaTab draws music symbols: `CssFontSvgCanvas` writes each glyph as
`<g class="at"><text>&#xE0A4;</text></g>`, using SMuFL code points. The font family comes from the
page's CSS (`.at { font-family: … }`). A standalone SVG therefore carries no font information, and a
converter must either know the font or replace the text with outlines.

| Library         | Version | SPDX                       | Verified at                                                     | Size (unpacked)    | Notes                                                                                                                                                                                                                          |
| --------------- | ------- | -------------------------- | --------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| jsPDF           | 4.2.1   | MIT                        | https://github.com/parallax/jsPDF/blob/master/LICENSE           | 30 MB (all builds) | **The README says custom fonts must be TrueType (`.ttf`).** Bravura, Petaluma and Leland are CFF-based OTF, so they need conversion, which creates an OFL Modified Version (rename required if the converted file is shipped). |
| svg2pdf.js      | 2.8.1   | MIT                        | https://github.com/yWorks/svg2pdf.js/blob/master/LICENSE        | 2.4 MB             | Good SVG coverage. Fonts must be registered with jsPDF beforehand. Active (2026-08).                                                                                                                                           |
| pdfkit          | 0.20.2  | MIT                        | https://github.com/foliojs/pdfkit/blob/master/LICENSE           | 10.5 MB            | Through **fontkit** (MIT) it embeds TTF, **OTF/CFF**, WOFF and WOFF2, with subsetting. SVG needs `svg-to-pdfkit`.                                                                                                              |
| svg-to-pdfkit   | 0.1.8   | MIT                        | https://github.com/alafr/SVG-to-PDFKit/blob/master/LICENSE      | small              | Last npm release 2022. The repo is still pushed to.                                                                                                                                                                            |
| fontkit         | 2.0.4   | MIT (package.json, README) | https://github.com/foliojs/fontkit                              |                    | CFF outlines, subsetting, glyph path extraction.                                                                                                                                                                               |
| pdf-lib         | 1.17.1  | MIT                        | https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md       |                    | **Unmaintained** (last publish 2022). Only `drawSvgPath`.                                                                                                                                                                      |
| @cantoo/pdf-lib | 2.11.1  | MIT                        | https://github.com/cantoo-scribe/pdf-lib/blob/master/LICENSE.md | 26 MB              | An active fork. Adds full `drawSvg`/`embedSvg` with text. Newer and less proven on complex SVG.                                                                                                                                |
| opentype.js     | 2.0.0   | MIT                        | https://github.com/opentypejs/opentype.js/blob/master/LICENSE   | 3.6 MB             | Reads CFF OTF and returns glyph outlines as SVG path data.                                                                                                                                                                     |

**Recommended pipeline.** All MIT, and it avoids OFL renaming.

1. Render each page with alphaTab's SVG engine.
2. Convert every `.at` glyph run to `<path>` elements. Load the **unmodified upstream Bravura.otf** with
   opentype.js (fontkit also works), look up each SMuFL code point, and emit
   `glyph.getPath(x, y, size).toPathData()`. Use the same font size and scale alphaTab used, and apply the
   `<g transform>`. The PDF then contains vector outlines. No font file is redistributed or modified, and
   the OFL explicitly allows using the font to make graphics (FAQ 1.1).
3. Inline the remaining CSS: colours and the text fonts for titles and lyrics.
4. Assemble pages with **jsPDF + svg2pdf.js**. For selectable title and lyrics text, embed a TTF UI font
   (for example Inter or Noto Sans TTF) through `addFileToVFS`/`addFont`, or outline those too.

**Alternatives.**

- **pdfkit + svg-to-pdfkit** with Bravura.otf registered under the SVG's font-family name. fontkit
  subsets the CFF font and embeds it, which the OFL allows (FAQ 1.12). This is the least preprocessing,
  but svg-to-pdfkit is less maintained.
- **The browser's print-to-PDF** (`window.print()` with `@page` CSS). It produces vector output and
  embeds font subsets automatically, with no extra code or license risk. The trade-off is that it goes
  through the user's print dialog and gives no programmatic PDF bytes. Good as a v1 fallback.

---

## 11. MusicXML, MIDI and ZIP libraries

| Library        | Version | SPDX                        | Verified at                                                        | Size (unpacked)                                                                | Verdict              | Notes                                                                                                                                                       |
| -------------- | ------- | --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @tonejs/midi   | 2.0.28  | MIT                         | https://github.com/Tonejs/Midi/blob/master/LICENSE.md              | 288 KB                                                                         | OK                   | Last npm publish 2022. Built on `midi-file`, which is strict: it throws on alien chunks and bad meta lengths. Put a sanitizer in front (note A, section 6). |
| midi-file      | 1.2.4   | MIT                         | https://github.com/carter-thaxton/midi-file/blob/master/LICENSE.md | 47 KB                                                                          | OK                   |                                                                                                                                                             |
| **fflate**     | 0.8.3   | MIT                         | https://github.com/101arrowz/fflate/blob/master/LICENSE            | 797 KB (about 8–30 kB minified + gzipped per feature, from memory, UNVERIFIED) | **OK (recommended)** | Zip read and write (central directory), gzip and deflate, streaming, workers.                                                                               |
| jszip          | 3.10.2  | `(MIT OR GPL-3.0-or-later)` | https://github.com/Stuk/jszip/blob/main/LICENSE.markdown           | 693 KB                                                                         | OK (choose MIT)      | Slower and heavier than fflate.                                                                                                                             |
| @zip.js/zip.js | 2.23.0  | BSD-3-Clause                | https://github.com/gildas-lormeau/zip.js/blob/master/LICENSE       | 8.7 MB                                                                         | OK                   | Use it if Zip64, streaming of very large files, or encryption is ever needed.                                                                               |

---

## 12. Red flags, all in one place

1. **ChordSheetJS is GPL-2.0-only.** Do not use it.
2. **dockview-enterprise is proprietary.** Guard against it with a lint rule or a dependency allowlist.
3. **mediabunny is MPL-2.0, and its MP3 and AAC encoders embed LGPL code** (LAME, FFmpeg).
4. **wasm-media-encoders and lamejs:** the "MIT"/"LGPL-3.0" labels hide the fact that LAME is
   LGPL-2.0-or-later. Treat both as LGPL.
5. **Unclear metadata:** `pitchfinder` (`"GNU v3"`, no LICENSE file), `rubberband-wasm` (`"GPLv2"`), and
   TimGM6mb (Debian says GPL-2, the author gave no version).
6. **SoundTouchJS relicensing** from LGPL to MPL rests on the project's "significant rewrites" claim.
7. **Provenance of SONiVOX** (alphaTab default bank): Apache-2.0 according to alphaTab and AOSP, but CC
   BY 3.0 according to the community upload, which also has a murky description. See 2.1.
8. **GeneralUser GS:** the author admits some uncertainty about where samples came from.
9. **NC/ND or unlicensed items:** Essentia models (CC BY-NC-ND 4.0), Arachno (all rights reserved),
   MIT IR Survey (no license), Voxengo IRs (no modification or redistribution freedom), most "free" cab
   IR packs.
10. **OpenAIR** was offline when checked (account suspended), and its licenses vary per item.
11. **OFL Reserved Font Names** on Bravura, Petaluma and Leland: don't ship subsetted or converted copies
    under those names.

## 13. Attribution checklist for `THIRD_PARTY_NOTICES` and the About screen

- **alphaTab (MPL-2.0):** the license text, a link to the source, and the libraries it bundles
  (TinySoundFont MIT, SFZero MIT, Haxe std MIT, SharpZipLib MIT, NVorbis MIT, libvorbis BSD-3), as
  listed in its `LICENSE.header`.
- **Every MIT, BSD, ISC or Apache dependency:** its copyright line and license text. For Apache-2.0
  (Dexie, basic-pitch, rc-dock, SpessaSynth), also any NOTICE files.
- **LGPL components** (LAME through the MP3 encoder, FFmpeg's AAC encoder if used, libfluidsynth if
  used): the license text, a source link, the build scripts, and LAME's requested credit and link.
- **MPL components** (alphaTab, mediabunny, SoundTouchJS): the license text and source links. Publish
  any changes to MPL files.
- **SoundFonts and samples:** a per-preset CREDITS table.
  - SONiVOX: Apache notice (plus a Sonic Network credit)
  - MuseScore_General: its full acknowledgement block plus MIT
  - FreePats and Karoryfer CC0: credit is optional but recommended
  - CC BY items (Salamander, DrumGizmo, MuldjordKit): author, title, license link, changes made
- **Fonts:** `OFL.txt` with the copyright and Reserved Font Name lines for Bravura, Petaluma and Leland;
  the OFL for each UI font.

## Sources (beyond the per-row URLs)

- FSF license list: https://www.gnu.org/licenses/license-list.html ; GPLv3 text https://www.gnu.org/licenses/gpl-3.0.txt (§13);
  AGPLv3 text https://www.gnu.org/licenses/agpl-3.0.txt (§13)
- OFL-FAQ: shipped as `OFL-FAQ.txt` in `steinbergmedia/bravura/redist` and alphaTab `font/petaluma/OFL-FAQ.txt`
- musical-artifacts SONiVOX entry (JSON metadata): https://musical-artifacts.com/artifacts/1517.json
- AOSP Sonivox: https://android.googlesource.com/platform/external/sonivox/
- OSUOSL MuseScore_General directory listing: https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/
- Debian package pages: https://packages.debian.org/sid/fluid-soundfont-gm , https://packages.debian.org/sid/timgm6mb-soundfont
- ScanCode license DB (GeneralUser GS): https://scancode-licensedb.aboutcode.org/generaluser-gs-2.0.html
- Arachno second-hand terms: https://opengameart.org/user/19902/comments?page=20
- sfzinstruments org: https://github.com/sfzinstruments (repo list via `gh repo list`, LICENSE files via the API)
- FreePats: https://freepats.zenvoid.org/ and https://freepats.zenvoid.org/licenses.html
- mediabunny formats: https://mediabunny.dev/guide/supported-formats-and-codecs ; extension READMEs in
  `packages/mp3-encoder`, `packages/aac-encoder`, `packages/flac-encoder`
- dockview licensing matrix: https://dockview.dev/docs/overview/licence ; FlexLayout accessibility:
  https://github.com/caplin/FlexLayout/blob/master/docs/accessibility.md
- MDN AudioEncoder: https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder
- npm registry metadata: `npm view <package> license version time.modified dist.unpackedSize peerDependencies`
