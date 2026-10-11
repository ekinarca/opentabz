# Fixtures

| Directory             | Contents                                                                                      | License                           |
| --------------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| `alphatex/`           | Scores authored for OpenTabz in alphaTex: demos and one file per feature-matrix area          | AGPL-3.0-or-later (original work) |
| `generated/`          | Binary files (`.gp`, …) produced from `alphatex/` by `pnpm fixtures`, plus corrupted variants | AGPL-3.0-or-later                 |
| `alphatab/`           | Feature test files from alphaTab, unmodified — see [NOTICE](alphatab/NOTICE.md)               | MPL-2.0                           |
| `musicxml-testsuite/` | Kainhofer's MusicXML unit tests, unmodified — see [NOTICE](musicxml-testsuite/NOTICE.md)      | MIT                               |
| `private/`            | Real-world files supplied locally by the owner; **gitignored, never committed**               | —                                 |

Rules: no copyrighted songs or tabs, ever. Every third-party file is reviewed for embedded song
titles, lyrics and texts before it is added (ADR-0010).
