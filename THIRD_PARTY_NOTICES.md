# Third-party notices

OpenTabz is licensed under the GNU Affero General Public License v3.0 or later (see
[LICENSE](LICENSE)). It includes the following third-party software, fonts and data, each under
its own licence. Development-only tools (TypeScript, Vite, ESLint, Vitest, Playwright, Tailwind CSS
and others listed in the `package.json` files) are not shipped and are not listed here.

Guitar Pro is a registered trademark of Arobas Music. OpenTabz is not affiliated with, endorsed by
or sponsored by Arobas Music; the name is used only to say which files OpenTabz opens.

## Shipped in the web application

| Component                                                                                                         | Version | Licence    | Used for                                                         |
| ----------------------------------------------------------------------------------------------------------------- | ------- | ---------- | ---------------------------------------------------------------- |
| [alphaTab](https://github.com/CoderLine/alphaTab)                                                                 | 1.8.4   | MPL-2.0    | Import, layout, SVG rendering, MIDI, synthesizer                 |
| [Bravura](https://github.com/steinbergmedia/bravura) (font)                                                       | —       | OFL-1.1    | Music symbols (shipped with alphaTab), drawn in exported pages   |
| [Petaluma](https://github.com/steinbergmedia/petaluma) (font, via `@vexflow-fonts/petaluma`)                      | 1.0.1   | OFL-1.1    | Handwritten music symbols, on request; drawn in exported pages   |
| SONiVOX EAS sound bank (`sonivox.sf2`)                                                                            | —       | Apache-2.0 | Default playback sounds (shipped with alphaTab)                  |
| [React](https://react.dev), React DOM, scheduler                                                                  | 19.3.0  | MIT        | User interface                                                   |
| [Radix UI](https://www.radix-ui.com/primitives)                                                                   | 1.7.0   | MIT        | Accessible menus, dialogs, popovers, sliders, tooltips           |
| [Floating UI](https://floating-ui.com)                                                                            | 1.8     | MIT        | Positioning (used by Radix UI)                                   |
| aria-hidden, react-remove-scroll, react-style-singleton, use-callback-ref, use-sidecar, get-nonce, detect-node-es | —       | MIT        | Dialog focus and scroll handling (used by Radix UI)              |
| [tslib](https://github.com/microsoft/tslib)                                                                       | 2.8.1   | 0BSD       | Helpers (used by Radix UI)                                       |
| [Zustand](https://github.com/pmndrs/zustand)                                                                      | 5.0.15  | MIT        | Application state                                                |
| [Lucide](https://lucide.dev) icons                                                                                | 1.55.0  | ISC        | Icons                                                            |
| [fflate](https://github.com/101arrowz/fflate)                                                                     | 0.8.3   | MIT        | Reading ZIP containers; compressing PDF and ZIP exports          |
| [Instrument Sans](https://github.com/Instrument/instrument-sans) (via Fontsource)                                 | 5.3.0   | OFL-1.1    | Interface text; the OpenTabz wordmark is drawn from its outlines |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) (via Fontsource)                               | 5.3.0   | OFL-1.1    | Display text                                                     |
| [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (via Fontsource)                                     | 5.3.0   | OFL-1.1    | Times, tempos and other numbers                                  |
| [Arimo](https://github.com/googlefonts/arimo) (via Fontsource)                                                    | 5.3.0   | OFL-1.1    | Sans-serif text of exported PDFs (subsets embedded)              |
| [Gelasio](https://github.com/SorkinType/Gelasio) (via Fontsource)                                                 | 5.3.0   | OFL-1.1    | Serif text of exported PDFs (subsets embedded)                   |

### alphaTab and its integrated libraries

alphaTab is © Daniel Kuschny and contributors, licensed under the Mozilla Public License 2.0.
OpenTabz modifies alphaTab with the patch in
[`patches/@coderline__alphatab@1.8.4.patch`](patches/@coderline__alphatab@1.8.4.patch); the
modified source is that patch applied to the published package, and each change is described in
[`docs/upstream/`](docs/upstream/). alphaTab integrates:

| Library                                                                               | Licence      | Copyright                            |
| ------------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| [TinySoundFont](https://github.com/schellingb/TinySoundFont)                          | MIT          | © 2017, 2018 Bernhard Schelling      |
| [SFZero](https://github.com/stevefolta/SFZero)                                        | MIT          | © 2012 Steve Folta                   |
| [Haxe standard library](https://github.com/HaxeFoundation/haxe) (XML parser, inflate) | MIT          | © 2005–2025 Haxe Foundation          |
| [SharpZipLib](https://github.com/icsharpcode/SharpZipLib) (deflate)                   | MIT          | © 2000–2018 SharpZipLib contributors |
| [NVorbis](https://github.com/NVorbis/NVorbis)                                         | MIT          | © 2020 Andrew Ward                   |
| [libvorbis](https://github.com/xiph/vorbis) (parts, via NVorbis)                      | BSD-3-Clause | © 2002–2020 Xiph.org Foundation      |

### Bravura

Copyright © 2015, Steinberg Media Technologies GmbH, with Reserved Font Name "Bravura". Licensed
under the SIL Open Font License 1.1.

### Petaluma

Copyright © 2018, Steinberg Media Technologies GmbH, with Reserved Font Name "Petaluma". Licensed
under the SIL Open Font License 1.1. Shipped unmodified (its font files and SMuFL metadata, from
Steinberg's redistribution as packaged by the VexFlow project) and loaded only for scores set in
it; exported pages draw its symbols from its outlines.

### Arimo and Gelasio

Arimo: Copyright 2020 The Arimo Project Authors. Gelasio: Copyright 2022 The Gelasio Project
Authors. Both licensed under the SIL Open Font License 1.1. Exported PDFs embed subsets of them:
their widths match Arial's and Georgia's, the fonts the score is laid out with.

### SONiVOX EAS sound bank

Copyright © 2004–2006 Sonic Network Inc. Licensed under the Apache License 2.0. The bank is a
SoundFont conversion of the SONiVOX EAS wavetable from the Android Open Source Project
(`platform/external/sonivox`), distributed with alphaTab. The conversion's own notes mention
other tools and sources that could not be verified; ADR-0016 records the plan to replace it with
a bank OpenTabz builds from the AOSP sources.

## In the repository only (tests, not shipped)

| Material                                                                   | Licence | Notice                                                                         |
| -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| alphaTab test files (`fixtures/alphatab/`)                                 | MPL-2.0 | [fixtures/alphatab/NOTICE.md](fixtures/alphatab/NOTICE.md)                     |
| MusicXML test suite by Reinhold Kainhofer (`fixtures/musicxml-testsuite/`) | MIT     | [fixtures/musicxml-testsuite/NOTICE.md](fixtures/musicxml-testsuite/NOTICE.md) |

Full licence texts: MPL-2.0 <https://mozilla.org/MPL/2.0/>, OFL-1.1 <https://openfontlicense.org>,
Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0>, MIT, ISC, 0BSD and BSD-3-Clause as
included with each package in `node_modules`.
