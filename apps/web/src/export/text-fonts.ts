/**
 * The text fonts PDFs embed (see @opentabz/core/print text-fonts.ts): Arimo for sans-serif text
 * and Gelasio for serif text, regular, bold, italic and bold italic, as the app's own assets
 * (one WOFF file per script), fetched only when a PDF needs them.
 */
import type { TextFace, TextFontFile, TextFontSource } from '@opentabz/core/print';
import { parseUnicodeRanges } from '@opentabz/core/print';
import arimoRanges from '@fontsource/arimo/unicode.json';
import gelasioRanges from '@fontsource/gelasio/unicode.json';

const ARIMO = import.meta.glob<string>(
  '../../node_modules/@fontsource/arimo/files/arimo-*-{400,700}-{normal,italic}.woff',
  { query: '?url', import: 'default', eager: true },
);
const GELASIO = import.meta.glob<string>(
  '../../node_modules/@fontsource/gelasio/files/gelasio-*-{400,700}-{normal,italic}.woff',
  { query: '?url', import: 'default', eager: true },
);

/** Scripts in the order their files are tried: the common ones first. */
const SCRIPT_ORDER = [
  'latin',
  'latin-ext',
  'cyrillic',
  'cyrillic-ext',
  'greek',
  'greek-ext',
  'vietnamese',
  'hebrew',
];

interface FontFile extends TextFontFile {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly script: string;
}

function filesOf(
  urls: Readonly<Record<string, string>>,
  ranges: Readonly<Record<string, string>>,
): FontFile[] {
  const files: FontFile[] = [];
  for (const [path, url] of Object.entries(urls)) {
    const match = /-([a-z-]+?)-(400|700)-(normal|italic)\.woff$/.exec(path);
    const script = match?.[1];
    if (match === null || script === undefined) continue;
    const range = ranges[script];
    if (range === undefined) continue;
    files.push({
      id: url,
      ranges: parseUnicodeRanges(range),
      bold: match[2] === '700',
      italic: match[3] === 'italic',
      script,
    });
  }
  const rank = (file: FontFile) => {
    const index = SCRIPT_ORDER.indexOf(file.script);
    return index < 0 ? SCRIPT_ORDER.length : index;
  };
  return files.sort((a, b) => rank(a) - rank(b));
}

const FAMILIES = {
  sans: filesOf(ARIMO, arimoRanges),
  serif: filesOf(GELASIO, gelasioRanges),
} as const;

export const TEXT_FONTS: TextFontSource = {
  files: (face: TextFace) =>
    FAMILIES[face.family].filter(file => file.bold === face.bold && file.italic === face.italic),
  load: async file => {
    const response = await fetch(file.id);
    if (!response.ok) throw new Error(`A font for the PDF could not be loaded (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  },
};
