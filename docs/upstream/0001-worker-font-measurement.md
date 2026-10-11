# 0001 — Measure text with `OffscreenCanvas` in workers

## Problem

alphaTab sizes text (titles, tempo marks, chord names, lyrics, section names) from per-font
width tables built by `FontSizes.generateFontLookup`. The builder measures with a DOM canvas,
which does not exist in a web worker, so in a worker every glyph falls back to a fixed 8 px
estimate. OpenTabz renders in a worker (ADR-0004), and the fallback overlapped and misplaced
text: long titles ran into the margins, "Shuffle ♩ = 112" collided with the triplet-feel mark.

## Change

`src/platform/svg/FontSizes.ts`, `generateFontLookup`:

```ts
let measureContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
if (typeof OffscreenCanvas !== 'undefined') {
  measureContext = new OffscreenCanvas(1, 1).getContext('2d');
} else if (!Environment.isRunningInWorker && Environment.webPlatform !== WebPlatform.NodeJs) {
  measureContext = document.createElement('canvas').getContext('2d');
}
if (measureContext) {
  // … unchanged measuring code …
}
```

`OffscreenCanvas` exists in workers in every current browser (Chrome 69, Firefox 105,
Safari 16.4). Where it is missing, the old behaviour is unchanged.

## Evidence

RESEARCH.md §2–3 (worker spike): the same score rendered on the main thread and in a worker produced
identical text positions only with this change.

## Tests

`packages/core/test/render-session.test.ts` renders in Node, where neither canvas exists (the
fallback path). The end-to-end tests render in workers in Chromium, WebKit and Firefox.
