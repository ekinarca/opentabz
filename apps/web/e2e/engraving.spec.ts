/** Engraving checks on the rendered SVG: text never runs into other text. */
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

interface Box {
  readonly text: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Music-font glyphs (SMuFL, private use area) have tall boxes and are checked separately. */
function isGlyph(text: string): boolean {
  return /[-]/u.test(text);
}

test('section names, tempo marks and effect texts do not overlap', async ({ page }) => {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/rendering/text-collisions.atex')]);
  await expectScore(page);
  const boxes: Box[] = await page.evaluate(() =>
    [...document.querySelectorAll<SVGTextElement>('.ot-scroll:not([hidden]) svg text')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        // From the first glyph to the last: Firefox's box takes in the spaces around a text
        // ("Moderate " before its tempo note), Chromium's does not.
        const content = element.textContent;
        const first = content.length - content.trimStart().length;
        const last = content.trimEnd().length - 1;
        const matrix = element.getScreenCTM();
        let { left, right } = rect;
        if (matrix !== null && matrix.b === 0 && matrix.c === 0 && last < element.getNumberOfChars()) {
          if (first > 0 && first <= last) left = matrix.a * element.getExtentOfChar(first).x + matrix.e;
          if (last >= 0 && last < content.length - 1) {
            const extent = element.getExtentOfChar(last);
            right = matrix.a * (extent.x + extent.width) + matrix.e;
          }
        }
        return { text: content, left, right, top: rect.top, bottom: rect.bottom };
      })
      .filter(box => box.text.trim().length > 0 && box.right > box.left),
  );
  const plain = boxes.filter(box => !isGlyph(box.text));
  expect(plain.map(box => box.text.trim())).toEqual(
    expect.arrayContaining(['Moderate', 'Intro', 'N.H.', 'Verse with a long name', 'P.M.', 'Chorus']),
  );
  // Two texts on the same line (more than half their height in common) must not share columns.
  const overlaps: string[] = [];
  plain.forEach((a, index) => {
    for (const b of plain.slice(index + 1)) {
      const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const lineHeight = Math.min(a.bottom - a.top, b.bottom - b.top);
      if (width > 1 && height > lineHeight / 2) overlaps.push(`${a.text} × ${b.text}`);
    }
  });
  expect(overlaps).toEqual([]);
  // The note of "Moderate ♩ = 196" comes after the word, not on top of it.
  const moderate = plain.find(box => box.text.trim() === 'Moderate');
  if (moderate === undefined) throw new Error('No tempo name');
  const middle = (box: Box) => (box.top + box.bottom) / 2;
  const note = boxes
    .filter(box => isGlyph(box.text) && box.left > moderate.left)
    .filter(box => Math.abs(middle(box) - middle(moderate)) < 12)
    .sort((a, b) => a.left - b.left)[0];
  expect(note?.left ?? -Infinity).toBeGreaterThanOrEqual(moderate.right - 0.5);
});
