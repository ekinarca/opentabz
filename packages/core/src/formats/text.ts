/**
 * Text decoding and classification for text-based formats: MusicXML / GPIF / Capella XML,
 * alphaTex, ASCII tab, ChordPro, HTML and plain text.
 */

export interface DecodedText {
  readonly text: string;
  readonly encoding: 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';
}

const SAMPLE_BYTES = 64 * 1024;

/**
 * Decodes bytes that look like text. Returns `null` for binary data. Honours byte order marks,
 * detects BOM-less UTF-16 and falls back to Windows-1252 for legacy 8-bit files.
 */
export function decodeText(bytes: Uint8Array): DecodedText | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return decodeAs(bytes.subarray(3), 'utf-8');
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return decodeAs(bytes.subarray(2), 'utf-16le');
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return decodeAs(bytes.subarray(2), 'utf-16be');

  const sample = bytes.subarray(0, Math.min(bytes.length, SAMPLE_BYTES));
  const utf16 = detectBomlessUtf16(sample);
  if (utf16 !== null) return decodeAs(bytes, utf16);
  if (!looksLikeText(sample)) return null;
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return decodeAs(bytes, 'windows-1252');
  }
}

function decodeAs(bytes: Uint8Array, encoding: DecodedText['encoding']): DecodedText | null {
  try {
    return {
      text: new TextDecoder(encoding, { fatal: encoding !== 'windows-1252' }).decode(bytes),
      encoding,
    };
  } catch {
    return null;
  }
}

function detectBomlessUtf16(sample: Uint8Array): 'utf-16le' | 'utf-16be' | null {
  if (sample.length < 8) return null;
  let evenZeros = 0;
  let oddZeros = 0;
  const pairs = Math.floor(sample.length / 2);
  for (let i = 0; i < pairs * 2; i += 2) {
    if (sample[i] === 0) evenZeros++;
    if (sample[i + 1] === 0) oddZeros++;
  }
  // Mostly-ASCII UTF-16 has a zero in every other byte.
  if (oddZeros > pairs * 0.6 && evenZeros < pairs * 0.1) return 'utf-16le';
  if (evenZeros > pairs * 0.6 && oddZeros < pairs * 0.1) return 'utf-16be';
  return null;
}

function looksLikeText(sample: Uint8Array): boolean {
  if (sample.length === 0) return false;
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    // Control characters other than tab, line feed, form feed and carriage return.
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0c && byte !== 0x0d) suspicious++;
  }
  return suspicious / sample.length < 0.02;
}

export type TextKind =
  | { readonly kind: 'musicxml'; readonly version: string | null }
  | { readonly kind: 'musicxml-opus' }
  | { readonly kind: 'gpif'; readonly version: string | null }
  | { readonly kind: 'capella' }
  | { readonly kind: 'musescore' }
  | { readonly kind: 'html' }
  | { readonly kind: 'xml'; readonly root: string }
  | { readonly kind: 'alphatex' }
  | { readonly kind: 'ascii-tab' }
  | { readonly kind: 'chordpro' }
  | { readonly kind: 'text' };

export function classifyText(text: string): TextKind {
  const start = text.trimStart();
  if (start.startsWith('<')) return classifyMarkup(start);
  if (looksLikeAlphaTex(text)) return { kind: 'alphatex' };
  if (looksLikeAsciiTab(text)) return { kind: 'ascii-tab' };
  if (looksLikeChordPro(text)) return { kind: 'chordpro' };
  return { kind: 'text' };
}

function classifyMarkup(text: string): TextKind {
  const head = text.slice(0, 16 * 1024);
  if (/^<!doctype\s+html/i.test(head)) return { kind: 'html' };
  const root = findRootElement(head);
  if (root === null) return { kind: 'text' };
  const name = root.name;
  const localName = name.includes(':') ? (name.split(':').pop() ?? name) : name;
  switch (localName) {
    case 'score-partwise':
    case 'score-timewise':
      return { kind: 'musicxml', version: attribute(root.tag, 'version') ?? '1.0' };
    case 'opus':
      return { kind: 'musicxml-opus' };
    case 'GPIF': {
      const match = /<GPVersion>([^<]+)<\/GPVersion>/.exec(head);
      return { kind: 'gpif', version: match?.[1]?.trim() ?? null };
    }
    case 'museScore':
      return { kind: 'musescore' };
    case 'html':
      return { kind: 'html' };
    case 'score':
      if (/capella/i.test(root.tag)) return { kind: 'capella' };
      return { kind: 'xml', root: name };
    default:
      return { kind: 'xml', root: name };
  }
}

interface RootElement {
  readonly name: string;
  readonly tag: string;
}

/** Finds the first element start tag, skipping the prolog, doctype, comments and processing instructions. */
function findRootElement(text: string): RootElement | null {
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('<', index);
    if (open < 0) return null;
    if (text.startsWith('<?', open)) {
      const end = text.indexOf('?>', open + 2);
      if (end < 0) return null;
      index = end + 2;
    } else if (text.startsWith('<!--', open)) {
      const end = text.indexOf('-->', open + 4);
      if (end < 0) return null;
      index = end + 3;
    } else if (text.startsWith('<!', open)) {
      index = skipDeclaration(text, open);
      if (index < 0) return null;
    } else {
      const match = /^<([A-Za-z_][\w.:-]*)/.exec(text.slice(open, open + 256));
      if (match?.[1] === undefined) return null;
      const end = text.indexOf('>', open);
      return { name: match[1], tag: text.slice(open, end < 0 ? text.length : end + 1) };
    }
  }
  return null;
}

/** Skips a `<!DOCTYPE …>` declaration, including an internal subset in brackets. */
function skipDeclaration(text: string, open: number): number {
  let depth = 0;
  for (let i = open + 2; i < text.length; i++) {
    const char = text[i];
    if (char === '[') depth++;
    else if (char === ']') depth--;
    else if (char === '>' && depth <= 0) return i + 1;
  }
  return -1;
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`).exec(tag);
  return match?.[1] ?? null;
}

const ALPHATEX_TAGS =
  /^\s*\\(title|subtitle|artist|album|words|music|wordsandmusic|copyright|copyright2|tab|instructions|notices|tempo|track|staff|tuning|instrument|capo|ts|ks|clef|section|chord|lyrics|ro|rc|ae|ft|tf|ac|jump|ottava|accidentals|displaytranspose|transpose|voice|bank|articulation|defaultsystemslayout|systemslayout|hidedynamics|showdynamics|bracketextendmode|usesystemsignseparator|singletracktracknamepolicy|multitracktracknamepolicy|firstsystemtracknamemode|othersystemstracknamemode|firstsystemtracknameorientation|othersystemstracknameorientation|multibarrest|scale|width|sync|barlineleft|barlineright|beaming|simile|spd|sph|db|dc|ds|fine|coda|segno)\b/im;

/** alphaTex starts with metadata tags or consists mostly of fret.string(.duration) tokens. */
function looksLikeAlphaTex(text: string): boolean {
  const head = text.slice(0, 8192);
  if (ALPHATEX_TAGS.test(head)) return true;
  const tokens = head
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/[\s|]+/)
    .filter(token => token.length > 0);
  if (tokens.length < 4) return false;
  const noteToken =
    /^(\(?[\dx-]+\.\d+(\s*[\dx-]+\.\d+)*\)?(\.\d+)?(\{[^}]*\})?|r(\.\d+)?|:\d+|[A-Ga-g][#b]?\d(\.\d+)?|\.)$/;
  const matching = tokens.filter(token => noteToken.test(token)).length;
  return matching / tokens.length >= 0.7;
}

const TAB_LINE = /^\s*[A-Ga-g][#b]?\s*[|:[]?[-0-9|hpbrsx/\\~()<>^.*=tPHl ]{6,}[|\]]?\s*$/;

/** At least one block of three or more consecutive string lines such as `e|---0---|`. */
function looksLikeAsciiTab(text: string): boolean {
  let run = 0;
  for (const line of text.split(/\r?\n/)) {
    if (TAB_LINE.test(line) && (line.match(/-/g)?.length ?? 0) >= 4) {
      run++;
      if (run >= 3) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

const CHORDPRO_DIRECTIVE =
  /^\s*\{\s*(title|t|subtitle|st|artist|composer|album|key|capo|tempo|time|comment|c|start_of_chorus|soc|end_of_chorus|eoc|start_of_verse|sov|start_of_tab|sot|define|chord)\s*[:}]/im;

function looksLikeChordPro(text: string): boolean {
  const head = text.slice(0, 16384);
  if (CHORDPRO_DIRECTIVE.test(head)) return true;
  const inlineChords =
    head.match(/\[[A-G][#b]?(m|maj|min|dim|aug|sus|add)?\d*(\/[A-G][#b]?)?\]/g)?.length ?? 0;
  return inlineChords >= 4;
}
