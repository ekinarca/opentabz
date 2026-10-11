# Changes to alphaTab

OpenTabz uses [alphaTab](https://github.com/CoderLine/alphaTab) 1.8.4 (MPL-2.0) with a few
small changes, applied with `pnpm patch` to the published ESM build
([`patches/@coderline__alphatab@1.8.4.patch`](../../patches/@coderline__alphatab@1.8.4.patch)),
as decided in ADR-0003. Each change is written up here as the equivalent change to alphaTab's
TypeScript sources, ready to be offered upstream. Under MPL-2.0 §3.2 the modified files are
available as source: the patch file is that source.

| #                                       | Change                                                   | Why                                                          | Upstream |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| [0001](0001-worker-font-measurement.md) | Measure text with `OffscreenCanvas` in workers           | Titles, tempo text and lyrics were spaced at 8 px per glyph  | not yet  |
| [0002](0002-io-error-exports.md)        | Export `EndOfReaderError` and `OverflowError` at runtime | Callers cannot recognise truncated files                     | not yet  |
| [0003](0003-xml-lazy-allocation.md)     | Allocate XML child lists and attribute maps on first use | Large Guitar Pro 7+ files spent a third of parsing in the GC | not yet  |

## Working on a patch

```bash
pnpm patch @coderline/alphatab@1.8.4 --edit-dir /tmp/alphatab-edit
# edit /tmp/alphatab-edit/dist/alphaTab.core.mjs (the existing patch is already applied)
pnpm patch-commit /tmp/alphatab-edit
```

Only `dist/alphaTab.core.mjs` is patched: the web app bundles it directly (see `vite.config.ts`)
and the Node entry point (`dist/alphaTab.mjs`, used by the unit tests) imports it.
After changing a patch, run `pnpm test` and `pnpm test:e2e`; for parser changes, also compare
parsed scores across all fixtures as described in 0003.
