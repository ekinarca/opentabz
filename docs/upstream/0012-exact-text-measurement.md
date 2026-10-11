# 0012 — Measure text exactly where a canvas exists

## Problem

alphaTab measures text from per-family tables: each character of the family is measured once
at 11 px and the widths are stored in a `Uint8Array`, which drops the fractions; bold and italic
add a flat 10 %, and every string is widened by 7 %. The error depends on the text: section
names, tempo marks and chord names can come out narrower than they are drawn. In a Guitar Pro 5
file we were sent, the note of "Moderate ♩ = 196" was drawn over the end of "Moderate".

## Change

Where a canvas can measure (`OffscreenCanvas`, also in workers, or a DOM canvas), the SVG canvas
measures each string with the font it will be drawn in: the same CSS font string
(`Font.toCssString(1)`: weight, style, size and family list). Results are cached per font and
text (cleared at 20,000 entries), so repeated strings such as fret numbers cost one measurement.
Without a canvas (Node) the tables are used as before.

`src/platform/svg/FontSizes.ts`:

```ts
private static _exactContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null | undefined;
private static _exactFont: string = '';
private static _exactCache: Map<string, [number, number]> = new Map();

public static measureExact(s: string, font: Font): MeasuredText | null {
    if (FontSizes._exactContext === undefined) {
        // OffscreenCanvas, else a DOM canvas outside workers and Node, else null
    }
    const context = FontSizes._exactContext;
    if (!context) {
        return null;
    }
    const css = font.toCssString(1);
    const key = `${css}\n${s}`;
    let size = FontSizes._exactCache.get(key);
    if (size === undefined) {
        if (FontSizes._exactFont !== css) {
            context.font = css;
            FontSizes._exactFont = css;
        }
        const metrics = context.measureText(s);
        size = [metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent];
        if (FontSizes._exactCache.size >= 20000) {
            FontSizes._exactCache.clear();
        }
        FontSizes._exactCache.set(key, size);
    }
    return new MeasuredText(size[0], size[1]);
}
```

`src/platform/svg/SvgCanvas.ts`:

```ts
public measureText(text: string): MeasuredText {
    if (!text) {
        return new MeasuredText(0, 0);
    }
    return FontSizes.measureExact(text, this.font) ??
        FontSizes.measureString(text, this.font.families, this.font.size, this.font.style, this.font.weight);
}
```

## Tests

`apps/web/e2e/engraving.spec.ts` renders `fixtures/alphatex/rendering/text-collisions.atex` in
Chromium and WebKit, desktop and phones, and checks that the note of the tempo mark starts after
its name. The performance budgets (drop to first render, view changes) are unchanged within
noise.
