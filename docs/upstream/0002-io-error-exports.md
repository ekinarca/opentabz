# 0002 — Export `EndOfReaderError` and `OverflowError` at runtime

## Problem

alphaTab's readers throw `EndOfReaderError` when a file ends early and `OverflowError` when a
length field points past the data. Both classes appear in the `alphaTab.io` type declarations,
but the published barrel only exports them as types: `alphaTab.io.EndOfReaderError` is
`undefined` at runtime, so `error instanceof alphaTab.io.EndOfReaderError` throws a `TypeError`.
OpenTabz needs the distinction to tell the user "this file is truncated" instead of "this file is
damaged".

## Change

`src/io/_barrel.ts`: export the two classes as values.

```ts
export { ByteBuffer } from '@coderline/alphatab/io/ByteBuffer';
export { IOHelper } from '@coderline/alphatab/io/IOHelper';
export { EndOfReaderError } from '@coderline/alphatab/io/IReadable';
export { OverflowError } from '@coderline/alphatab/io/IReadable';
```

## Tests

`packages/core/test/open.test.ts` (truncated Guitar Pro 3–5 and GPX files report `truncated`)
and `packages/core/test/fuzz.test.ts`.
