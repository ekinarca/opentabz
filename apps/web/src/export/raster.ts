/**
 * An SVG page drawn into a PNG image by the browser's own SVG renderer, at the size the SVG
 * declares, so the result is as sharp as the resolution asked for.
 */

export async function svgToPng(svg: string, width: number, height: number): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('This browser cannot draw images.');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
    // Release the pixels at once rather than when the canvas is collected.
    canvas.width = 0;
    canvas.height = 0;
    if (blob === null) throw new Error('The page is too large for an image on this device.');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
