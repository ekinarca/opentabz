# 0020 — Read a Guitar Pro 7+ document as it closes

## Problem

`GpifParser.parseXml` parses all of `score.gpif` into alphaTab's DOM (`XmlNode`) and only then
walks it to build the score. The DOM of a large file is far bigger than the score it describes:
the 20-track, 500-bar performance fixture (`pnpm fixtures` → `perf-20x500.gp`, 61 MB of XML,
2.2 million elements) held about 900 MB of nodes at its peak, while the finished score keeps
131 MB. The garbage collector dominated the import, and a phone may not have the memory at all.

## Change

- `src/xml/XmlParser.ts`: `parse(str, p, parent, closed?, depth?)` calls
  `closed(element, parent, depth)` when an element closes (with `/>` or its closing tag; never
  for an element left open at the end of the input). `XmlDocument.parse(xml, closed?)` passes it
  on. Without a listener nothing changes.
- `src/importer/GpifParser.ts`: `parseXml` listens while parsing. When a child of the `GPIF` root
  closes (`Score`, `MasterTrack`, `Tracks`, `MasterBars`, …), it is read with the same code
  `_parseDom` used (now `_parseGpifChild`); when an item of the big lists closes (`Bar` in
  `Bars`, `Voice`, `Beat`, `Note`, `Rhythm`), it is read with `_parseBar`, `_parseVoice`, …
  Each element read this way is then emptied (no name, children or attributes), so the later
  walk skips it and its nodes can be collected right away. `_parseDom` still walks the root:
  it reads what was left open by a truncated document, and reports a root that is not `GPIF`.
  Errors from reading an element are rethrown as they are; only XML errors become
  "Could not parse XML", as before.

Everything is read in the same order as before: the sections in document order, each list's
items in order, and nothing reads a later sibling.

## Evidence

Loading `perf-20x500.gp` cold, one process per load, Node 24 (Apple silicon):

| Build     | Time (ms)      | Heap right after loading | Retained by the score |
| --------- | -------------- | ------------------------ | --------------------- |
| 0001–0019 | 1038, 954, 970 | 1214 MB                  | 131 MB                |
| with 0020 | 711, 728, 712  | 325 MB                   | 131 MB                |

In Chromium, dropping the file and painting its first systems took 1232–1286 ms with the
previous build and 696–715 ms with this one (budget 1500 ms); the 5-track, 150-bar file paints
in 127 ms (budget 300 ms).

## Correctness

`packages/core/test/import-golden.test.ts` fingerprints the score of every public fixture (376
files: Guitar Pro 3–8, GPX, MusicXML and compressed MusicXML, Capella), serialised with
`JsonConverter.scoreToJsObject` with ids renumbered in order of appearance. The fingerprints were
taken before this change and are identical after it.

## Upstream

Not yet proposed: a self-contained memory and speed improvement of the Guitar Pro 7+ importer.
