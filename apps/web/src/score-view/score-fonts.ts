/**
 * The score's texts are set in Georgia and Arial (alphaTab's defaults, @opentabz/core
 * shared/text-fonts.ts). Where the device has them, they are used; where it does not (Linux,
 * Android, ChromeOS), Gelasio and Arimo stand in: the metric-compatible faces PDFs embed
 * (src/export/text-fonts.ts). The engine measures text in its worker and the page draws it, so
 * both get the same faces: every device then draws the score's text at the widths it was laid
 * out with, and a PDF puts each text exactly where the screen shows it.
 *
 * For each style a first face takes the installed font for every script it covers; the faces
 * after it, tried first for their ranges, add the web fonts for Latin text. The Georgia faces
 * carry Georgia's vertical metrics (hhea ascender 1878 and descender 449 of 2048 units), which
 * Gelasio's differ from, so that texts hanging from or centred on a line sit where they would in
 * Georgia.
 */
import arimoRanges from '@fontsource/arimo/unicode.json';
import gelasioRanges from '@fontsource/gelasio/unicode.json';

const GELASIO = import.meta.glob<string>(
  '../../node_modules/@fontsource/gelasio/files/gelasio-{latin,latin-ext}-{400,700}-{normal,italic}.woff2',
  { query: '?url', import: 'default', eager: true },
);
const ARIMO = import.meta.glob<string>(
  '../../node_modules/@fontsource/arimo/files/arimo-{latin,latin-ext}-{400,700}-{normal,italic}.woff2',
  { query: '?url', import: 'default', eager: true },
);

type Weight = '400' | '700';
type Style = 'normal' | 'italic';

interface Family {
  readonly name: string;
  readonly urls: Readonly<Record<string, string>>;
  readonly ranges: Readonly<Record<string, string>>;
  /** Names of the installed faces, by weight and style (full names, then PostScript names). */
  readonly local: Readonly<Record<`${Weight} ${Style}`, readonly string[]>>;
  readonly metrics?: FontFaceDescriptors;
}

const FAMILIES: readonly Family[] = [
  {
    name: 'Georgia',
    urls: GELASIO,
    ranges: gelasioRanges,
    local: {
      '400 normal': ['Georgia'],
      '400 italic': ['Georgia Italic', 'Georgia-Italic'],
      '700 normal': ['Georgia Bold', 'Georgia-Bold'],
      '700 italic': ['Georgia Bold Italic', 'Georgia-BoldItalic'],
    },
    metrics: { ascentOverride: '91.6992%', descentOverride: '21.9238%', lineGapOverride: '0%' },
  },
  {
    name: 'Arial',
    urls: ARIMO,
    ranges: arimoRanges,
    local: {
      '400 normal': ['Arial', 'ArialMT', 'Liberation Sans', 'LiberationSans'],
      '400 italic': ['Arial Italic', 'Arial-ItalicMT', 'Liberation Sans Italic', 'LiberationSans-Italic'],
      '700 normal': ['Arial Bold', 'Arial-BoldMT', 'Liberation Sans Bold', 'LiberationSans-Bold'],
      '700 italic': [
        'Arial Bold Italic',
        'Arial-BoldItalicMT',
        'Liberation Sans Bold Italic',
        'LiberationSans-BoldItalic',
      ],
    },
  },
];

/** Scripts the web fonts are given for, in the order their faces are added (the last wins). */
const SCRIPTS = ['latin-ext', 'latin'] as const;

function urlOf(family: Family, script: string, weight: Weight, style: Style): string | undefined {
  const suffix = `-${script}-${weight}-${style}.woff2`;
  return Object.entries(family.urls).find(([path]) => path.endsWith(suffix))?.[1];
}

/** The faces the score's text is drawn and measured with, new for each font set they join. */
export function scoreFontFaces(): FontFace[] {
  const faces: FontFace[] = [];
  for (const family of FAMILIES) {
    for (const weight of ['400', '700'] as const) {
      for (const style of ['normal', 'italic'] as const) {
        const local = family.local[`${weight} ${style}`].map(name => `local('${name}')`).join(', ');
        const descriptors: FontFaceDescriptors = { weight, style, display: 'swap', ...family.metrics };
        faces.push(new FontFace(family.name, local, descriptors));
        for (const script of SCRIPTS) {
          const url = urlOf(family, script, weight, style);
          const unicodeRange = family.ranges[script];
          if (url === undefined || unicodeRange === undefined) continue;
          faces.push(
            new FontFace(family.name, `${local}, url(${url}) format('woff2')`, {
              ...descriptors,
              unicodeRange,
            }),
          );
        }
      }
    }
  }
  return faces;
}

/** Adds the faces to the page; the browser loads each one when text first needs it. */
export function installScoreFonts(): void {
  for (const face of scoreFontFaces()) document.fonts.add(face);
}

/**
 * Adds the faces to a worker's fonts (where its canvases measure text) and loads them: the
 * engine measures nothing until they are in. Resolves once they are, failed to load (the fonts
 * installed on the device are then measured, as before) or took longer than `waitMs` on a slow
 * network. Workers without fonts of their own (Safari before 16.4) resolve at once.
 */
export async function loadScoreFontsInWorker(scope: object, waitMs = 4000): Promise<void> {
  const fonts = (scope as { fonts?: FontFaceSet }).fonts;
  if (fonts === undefined || typeof FontFace === 'undefined') return;
  const faces = scoreFontFaces();
  for (const face of faces) fonts.add(face);
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(faces.map(face => face.load().catch(() => null))),
    new Promise(resolve => {
      timer = setTimeout(resolve, waitMs);
    }),
  ]);
  clearTimeout(timer);
}
