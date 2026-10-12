/**
 * Every user-facing string in OpenTabz (English only). Components import from here; no literal
 * UI text lives anywhere else.
 */
import type {
  BracketMode,
  BuiltInMusicFont,
  ChordSpelling,
  FormatId,
  LayoutKind,
  NoteColorMode,
  NoteNames,
  NotePalette,
  OpenError,
  PageLineId,
  StaffDisplay,
  SystemsLayout,
  TextAlign,
  TextBlockId,
  TextElement,
  TextOrientation,
  TitleElement,
  TrackNamePlace,
  TrackNameText,
} from '@opentabz/core/shared';
import type { PngResolution } from './export/page-files.ts';
import type { Orientation, PageArrangement, PaperId } from './score-view/pagination.ts';
import type { ZoomFit } from './state/documents.ts';
import type { LookId } from './state/stylesheets.ts';
import type { ThemePreference } from './state/preferences.ts';

const SUPPORTED_SUMMARY =
  'Guitar Pro (.gp, .gpx, .gp5, .gp4, .gp3), MusicXML (.musicxml, .xml, .mxl), Capella (.capx) and alphaTex';

export const formatNames: Readonly<Record<FormatId, string>> = {
  gp3: 'Guitar Pro 3',
  gp4: 'Guitar Pro 4',
  gp5: 'Guitar Pro 5',
  gpx: 'Guitar Pro 6',
  gp: 'Guitar Pro 7/8',
  gpif: 'Guitar Pro score XML (score.gpif)',
  musicxml: 'MusicXML',
  mxl: 'compressed MusicXML',
  capella: 'Capella',
  alphatex: 'alphaTex',
  otz: 'OpenTabz project',
  midi: 'Standard MIDI File',
  'ascii-tab': 'plain-text tab',
  chordpro: 'ChordPro chord sheet',
  powertab: 'Power Tab document',
  tuxguitar: 'TuxGuitar document',
  'gp-legacy': 'Guitar Pro 1–2',
  'gp-clipboard': 'Guitar Pro clipboard data',
  tabledit: 'TablEdit document',
  'capella-binary': 'capella document (binary .cap)',
  'musicxml-opus': 'MusicXML opus',
  musescore: 'MuseScore score',
  pdf: 'PDF document',
  image: 'image',
  audio: 'audio file',
  video: 'video file',
  archive: 'archive',
  html: 'web page',
  text: 'text file',
  unknown: 'unknown file',
};

/** Human-readable format with version, e.g. "Guitar Pro 8.1.3" or "MusicXML 4.0". */
export function describeFormat(format: FormatId, version: string | null): string {
  if (version === null || version.length === 0) return formatNames[format];
  switch (format) {
    case 'gp': {
      const major = version.split('.')[0];
      return major === '7' || major === '8' ? `Guitar Pro ${version}` : formatNames.gp;
    }
    case 'gp3':
    case 'gp4':
    case 'gp5':
    case 'gp-legacy':
      return `Guitar Pro ${version}`;
    case 'musicxml':
      return `MusicXML ${version}`;
    case 'gpif':
      return `Guitar Pro ${version} score XML`;
    default:
      return formatNames[format];
  }
}

function quoted(name: string): string {
  return `“${name}”`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function notSupportedExplanation(format: FormatId): string {
  switch (format) {
    case 'pdf':
      return 'A PDF holds printed pages, not the score itself. To open a song in OpenTabz you need its Guitar Pro, MusicXML or alphaTex file.';
    case 'image':
      return 'Pictures of sheet music cannot be opened as scores. OpenTabz needs the song’s Guitar Pro, MusicXML or alphaTex file.';
    case 'audio':
    case 'video':
      return 'Recordings cannot be opened as scores. OpenTabz needs the song’s Guitar Pro, MusicXML or alphaTex file.';
    case 'html':
      return 'It was probably saved from a website instead of downloading the score file itself. Download the actual file and open that.';
    case 'archive':
      return 'Extract the archive first, then open the score files inside it.';
    case 'musescore':
      return 'In MuseScore, choose File → Export → MusicXML, then open the exported file here.';
    case 'powertab':
    case 'tuxguitar':
    case 'tabledit':
      return 'TuxGuitar (free) can open this file and save it as Guitar Pro 5 (.gp5), which OpenTabz opens.';
    case 'otz':
      return 'This version of OpenTabz cannot read OpenTabz project files.';
    case 'capella-binary':
      return 'In capella, save the score as CapXML (.capx); OpenTabz opens that format.';
    case 'musicxml-opus':
      return 'An opus only lists other MusicXML files. Open the individual scores it refers to.';
    default:
      return `OpenTabz opens ${SUPPORTED_SUMMARY} files.`;
  }
}

export interface ErrorText {
  readonly title: string;
  readonly explanation: string;
}

/** Title and explanation for a file that failed to open. */
export function openErrorText(error: OpenError): ErrorText {
  const file = quoted(error.fileName);
  const format = error.format === null ? null : describeFormat(error.format, error.formatVersion);
  switch (error.code) {
    case 'empty':
      return {
        title: `${file} is empty`,
        explanation: 'The file contains no data. It may not have finished downloading.',
      };
    case 'too-large':
      return {
        title: `${file} is too large`,
        explanation: `OpenTabz opens files up to 256 MB; this one is ${formatBytes(error.byteLength)}.`,
      };
    case 'unrecognized':
      return {
        title: `OpenTabz can’t identify ${file}`,
        explanation: `Its contents don’t match any score format OpenTabz knows. OpenTabz opens ${SUPPORTED_SUMMARY} files.`,
      };
    case 'not-supported':
      return {
        title: `${file} is ${articleFor(format ?? 'unknown file')} ${format ?? 'unknown file'}`,
        explanation: notSupportedExplanation(error.format ?? 'unknown'),
      };
    case 'unsupported-version':
      return error.format === 'gp-clipboard'
        ? {
            title: `${file} is Guitar Pro clipboard data`,
            explanation:
              'It holds a copied selection, not a song. Paste it into Guitar Pro and save the song as a file.',
          }
        : {
            title: `${file} is from ${format ?? 'an old version of Guitar Pro'}`,
            explanation:
              'Files from Guitar Pro 1 and 2 can’t be read. Open the file in a later Guitar Pro or in TuxGuitar and save it as Guitar Pro 5 (.gp5).',
          };
    case 'truncated':
      return {
        title: `${file} is incomplete`,
        explanation:
          `This ${format ?? ''} file ends before all of its data. It was probably cut off while downloading or copying — try getting it again.`.replace(
            '  ',
            ' ',
          ),
      };
    case 'corrupt':
      return {
        title: `${file} is damaged`,
        explanation: `OpenTabz recognised it as ${format === null ? 'a score file' : `a ${format} file`}, but its contents are inconsistent. If it opens in other software, please report it so OpenTabz can be fixed.`,
      };
    case 'timeout':
      return {
        title: `Opening ${file} took too long`,
        explanation:
          'The engine stopped working on it and was restarted. Please report the file so OpenTabz can handle it.',
      };
    case 'read-failed':
      return {
        title: `${file} couldn’t be read`,
        explanation:
          'Your browser couldn’t read the file. Check that it still exists and that you’re allowed to open it.',
      };
    case 'network':
      return {
        title: 'The file couldn’t be downloaded',
        explanation:
          'The download failed or the website doesn’t allow other sites to fetch its files. Download the file yourself and drop it here instead.',
      };
    case 'internal':
      return {
        title: `Something went wrong opening ${file}`,
        explanation: 'This is a bug in OpenTabz. The technical details below help fix it.',
      };
  }
}

function articleFor(noun: string): string {
  return /^[aeiou]/i.test(noun) && !/^uni/i.test(noun) ? 'an' : 'a';
}

export const strings = {
  appName: 'OpenTabz',
  documentTitle: (title: string | null) =>
    title === null ? 'OpenTabz — guitar tabs, beautifully engraved' : `${title} · OpenTabz`,

  home: {
    eyebrow: 'Free and open source',
    /** Two lines on wide screens; read as one sentence. */
    headline: ['Guitar tabs,', 'beautifully engraved.'],
    lede: 'Open Guitar Pro, MusicXML, Capella and alphaTex files right in your browser — nothing to install, nothing uploaded.',
    openFile: 'Open a file',
    openFileShortcut: (mod: string) => `${mod} O`,
    openUrl: 'Open from a link',
    dropHint: 'or drop files anywhere on this page',
    /** Shown while files are dragged over the window ("let ring" is the tab marking for sustain). */
    release: 'Let it ring.',
    releaseDetail: 'Release to open — Guitar Pro, MusicXML, Capella or alphaTex',
    demosHeading: 'Or try',
    privacy: 'Free and open source. No account, no tracking — your files never leave this device.',
  },

  demos: {
    shuffle: { title: 'a blues shuffle' },
    greensleeves: { title: 'Greensleeves' },
    study: { title: 'an arpeggio study' },
  },

  drop: {
    overlay: 'Drop to open',
    overlayDetail: 'Guitar Pro, MusicXML, Capella or alphaTex',
    folder: (name: string) => ({
      title: `${quoted(name)} is a folder`,
      explanation: 'Drop the score files inside the folder instead of the folder itself.',
    }),
  },

  urlDialog: {
    title: 'Open from URL',
    description:
      'OpenTabz downloads the file directly into your browser. The website must allow cross-site downloads (CORS).',
    label: 'File address',
    placeholder: 'https://example.com/song.gp',
    submit: 'Open',
    cancel: 'Cancel',
    invalid: 'Enter a web address starting with https:// or http://',
  },

  topBar: {
    home: 'OpenTabz home',
    documents: 'Open documents',
    close: (name: string) => `Close ${name}`,
    openFile: 'Open file',
    theme: 'Theme',
    settings: 'Settings',
    about: 'About OpenTabz',
    export: 'Export',
    print: 'Print',
    more: 'More',
  },

  print: {
    useAppCommand:
      'To print the score, use Print in OpenTabz (the printer button, or Ctrl+P / ⌘P): it draws every page first.',
  },

  exportDialog: {
    title: 'Export',
    description: 'Save the score as a file for other programs. It is made on this device and sent nowhere.',
    close: 'Close',
    pages: 'Pages',
    pagesHint: 'The score on paper, as the page view shows it: the same tracks, staves and paper.',
    format: 'Format',
    formats: { pdf: 'PDF', png: 'PNG', svg: 'SVG' },
    formatHints: {
      pdf: 'One document of the pages, vector and with searchable text: to print, share or read anywhere.',
      png: 'An image of each page, for documents, messages and the web.',
      svg: 'Each page as vector graphics, for vector editors and the web.',
    },
    pdfCreator: 'OpenTabz',
    pdfProducer: 'OpenTabz, with the alphaTab notation engine',
    fileName: 'File name',
    fileNameHint: '%T title · %t track · %n track number · %N tracks · %d date · %h time',
    fileNamePreview: (name: string) => `Saved as “${name}”, with the extension of each format.`,
    pageChoice: 'Which pages',
    pageChoices: { all: 'All', range: 'Range', selection: 'Selection' },
    selectionBars: (first: number, last: number) =>
      first === last ? `Bar ${first} on a page of its own.` : `Bars ${first}–${last} on pages of their own.`,
    pageCount: (pages: number) =>
      pages === 1 ? 'The score fills one page.' : `The score fills ${pages} pages.`,
    countingPages: 'Counting the pages…',
    fromPage: 'From page',
    toPage: 'To page',
    resolution: 'Resolution',
    dpi: (dpi: number) => `${dpi} dpi`,
    resolutionHints: {
      72: 'Screen size: small files.',
      150: 'For screens with fine pixels and draft prints.',
      300: 'Print quality.',
    } satisfies Record<PngResolution, string>,
    transparent: 'Transparent background',
    exportPages: (format: string) => `Export ${format}`,
    severalFiles: 'More than one page is saved as a ZIP archive of one file per page.',
    print: 'Print…',
    printNow: 'Print now',
    printReady: 'The pages are ready.',
    preparing: (percent: number) => `Drawing pages… ${percent} %`,
    preparingLabel: 'Drawing the pages',
    midi: 'MIDI file',
    midiHint: 'Every track as it is played, with the tempo map and a marker at each section.',
    leaveOutMuted: 'Leave out muted tracks',
    channels: 'Channels per track',
    channelOptions: { two: 'Two', one: 'One' },
    channelHints: {
      two: 'Bends on a channel of their own, so they move only the bent note (as Guitar Pro does).',
      one: 'Each instrument on one channel, for programs that expect it; a bend moves every note sounding.',
    },
    exportMidi: 'Export MIDI',
    working: 'Exporting…',
    failed: (reason: string) => `The export failed: ${reason}`,
    audio: 'Audio (WAV)',
    audioHint: 'The song as playback plays it, with the mixer, made faster than real time.',
    selectionOnly: 'Only the selected bars',
    noSelection: 'Select bars in the score to export only them.',
    practiceSpeed: (percent: number) => `At the practice speed (${percent} %)`,
    metronome: 'Metronome',
    countIn: 'Count-in',
    exportWav: 'Export WAV',
    rendering: (percent: number) => `Rendering… ${percent} %`,
    progress: 'Rendering the audio',
    cancel: 'Cancel',
  },

  settings: {
    title: 'Settings',
    description: 'Sound, notation, instrument views, scores and the keyboard. Remembered on this device.',
    close: 'Close',
    sound: 'Sound',
    scores: 'Scores',
    latency: 'Audio delay',
    latencies: { interactive: 'Shortest', balanced: 'Balanced', playback: 'Steadiest' },
    latencyHints: {
      interactive: 'Sound follows Play and the metronome as fast as this device allows.',
      balanced: 'A little more delay, for fewer dropouts on busy devices.',
      playback: 'The most buffering: for slow devices, or when the sound breaks up.',
    },
    latencyApplies: 'A change takes effect the next time playback starts.',
    output: (latency: number | null, missed: number) =>
      latency === null
        ? 'Not started yet: press Play.'
        : `Output delay ${Math.round(latency)} ms · audio skipped ${Math.round(missed)} ms`,
    notation: 'Notation',
    newStaves: 'Staves of scores opened from now on',
    newConcertPitch: 'Transposing instruments at concert pitch',
    newConcertPitchHint: 'In scores opened from now on; each score’s Staves menu changes its own.',
    newStylesheet: 'Stylesheet of scores opened from now on',
    views: 'Instrument views',
    leftHanded: 'Left-handed fretboard and chord diagrams',
    invertedTab: 'Lowest string on top of the tablature',
    invertedTabHint: 'As you look down at the neck while playing.',
    keyboard: 'Keyboard',
  },

  themes: {
    system: 'Match system',
    light: 'Studio (light)',
    dark: 'Night (dark)',
    sepia: 'Parchment (sepia)',
    stage: 'Stage (high contrast)',
  } satisfies Record<ThemePreference, string>,

  toolbar: {
    label: 'Score view',
    tracks: 'Tracks',
    tracksAll: 'All tracks',
    tracksCount: (shown: number, total: number) =>
      shown === total ? 'All tracks' : `${shown} of ${total} tracks`,
    tracksHeading: 'Show tracks',
    staves: 'Staves',
    layout: 'Layout',
    paper: 'Paper',
    pages: 'Pages',
    systems: 'Line breaks',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom to 100 %',
    zoomLevel: (zoom: number) => `${Math.round(zoom * 100)} %`,
    zoomMenu: 'Zoom level',
    songInfo: 'Song info',
    moreTools: 'More view tools',
    unfold: 'Write out repeats',
    unfoldedName: (name: string) => `${name} (written out).gp`,
    unfoldFailed: 'The repeats could not be written out',
    fullScreen: 'Full screen',
  },

  readingAids: {
    noteNames: 'Note names',
    names: { off: 'None', letters: 'Letters', octaves: 'Letters and octaves' } satisfies Record<
      NoteNames,
      string
    >,
    counts: 'Beat counts',
    drumKey: 'Drum key',
  },

  noteColors: {
    open: 'Note colours',
    title: 'Note colours',
    mode: 'Colour notes by',
    modes: {
      off: 'Off',
      string: 'String',
      interval: 'Interval',
      degree: 'Degree',
      chordTone: 'Chord tone',
    } satisfies Record<NoteColorMode, string>,
    palette: 'Colours',
    palettes: { standard: 'Standard', colorBlind: 'Colour-blind safe', custom: 'Your own' } satisfies Record<
      NotePalette,
      string
    >,
    customHint: 'Your own colours are the strings’; the other ways keep the standard ones.',
    legendLabel: 'What the colours stand for',
    stringColor: (string: string) => `Colour of the ${string}`,
    legend: {
      strings: [
        'lowest string',
        '2nd string up',
        '3rd string up',
        '4th string up',
        '5th string up',
        '6th string up',
        '7th string up',
        '8th string up',
      ],
      intervals: ['Tonic', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'],
      degrees: [
        '1st degree',
        '2nd degree',
        '3rd degree',
        '4th degree',
        '5th degree',
        '6th degree',
        '7th degree',
        'Outside the key',
      ],
      chordTones: ['Root', 'Third', 'Fifth', 'Seventh', 'Other chord notes'],
    },
  },

  trackStaves: {
    open: 'Each track…',
    value: 'Each track',
    concertPitch: 'Concert pitch',
    title: 'Staves of each track',
    description:
      'Which staves each track shows: standard notation, tablature, rhythm slashes and numbered notation.',
    close: 'Close',
    reset: 'As the Staves menu says',
    track: 'Track',
    kinds: { standard: 'Standard', tablature: 'Tab', slash: 'Slash', numbered: 'Numbered' },
    kindFor: (kind: string, track: string) => `${kind} for ${track}`,
  },

  stylesheet: {
    open: 'Stylesheet',
    title: 'Stylesheet',
    description: 'How this score is engraved. It starts as the file asks, and is remembered for the file.',
    close: 'Close',
    reset: 'As in the file',
    sections: {
      page: 'Size and spacing',
      systems: 'Systems',
      names: 'Track names',
      notation: 'Notation',
      tablature: 'Tablature',
      headerFooter: 'Header and footer',
      text: 'Text',
      techniqueLabels: 'Technique labels',
      fingering: 'Fingering',
      choices: 'Stylesheets',
    },
    techniqueLabels: {
      names: {
        letRing: 'Let ring',
        palmMute: 'Palm mute',
        slide: 'Slide',
        hammerOn: 'Hammer-on',
        pullOff: 'Pull-off',
        slap: 'Slap',
        pop: 'Pop',
        pickScrape: 'Pick scrape',
        rasgueado: 'Rasgueado',
        whammyBar: 'Whammy bar',
      },
      hint: 'The words printed for these techniques; left empty, the usual one.',
    },
    choices: {
      apply: 'Apply a stylesheet',
      applyHint: 'A look changes some of the style and keeps the rest; one of your own replaces it all.',
      choose: 'Choose…',
      looks: 'Looks',
      own: 'Your stylesheets',
      lookNames: {
        classic: 'Classic',
        pop: 'Pop',
        jazz: 'Jazz chart',
        large: 'Large print',
        compact: 'Compact',
      } satisfies Record<LookId, string>,
      default: 'Scores opened from now on',
      defaultHint: 'The stylesheet they start with. A score you styled before keeps its own.',
      asInFile: 'As in the file',
      saveAs: 'Save this style as',
      namePlaceholder: 'My stylesheet',
      save: 'Save',
      delete: (name: string) => `Delete ${name}`,
    },
    text: {
      kind: 'Text',
      family: 'Font',
      size: 'Size',
      bold: 'Bold',
      italic: 'Italic',
      families: { serif: 'Serif', sans: 'Sans-serif', mono: 'Monospace', other: 'Named' },
      elements: {
        title: 'Title',
        subtitle: 'Subtitle',
        artist: 'Artist',
        album: 'Album',
        credits: 'Words, music, transcriber',
        copyright: 'Copyright',
        instructions: 'Instructions',
        notices: 'Notice',
        pageHeader: 'Page header',
        pageFooter: 'Page footer',
        trackNames: 'Track names',
        tuning: 'Tuning legend',
        sections: 'Sections',
        text: 'Free text',
        chordNames: 'Chord names',
        chordFrets: 'Chord diagram frets',
        lyrics: 'Lyrics',
        tab: 'Fret numbers',
        fingering: 'Fingering',
        techniques: 'Technique labels',
        barNumbers: 'Bar numbers',
        repeats: 'Repeats and endings',
        directions: 'Directions',
        timer: 'Timer',
      } satisfies Record<TextElement, string>,
      familyOf: (text: string) => `Font of ${text}`,
      fontOf: (text: string) => `Font name of ${text}`,
      sizeOf: (text: string) => `Size of ${text}`,
      boldOf: (text: string) => `${text} in bold`,
      italicOf: (text: string) => `${text} in italics`,
    },
    chordSpelling: 'Chord names',
    chordSpellings: {
      written: 'As written',
      classic: 'Classic',
      jazz: 'Jazz',
      rock: 'Rock',
    } satisfies Record<ChordSpelling, string>,
    chordSpellingHints: {
      written: 'Chord names as the file writes them.',
      classic: 'Cmaj7, Cm7, Cm7b5, Cdim, Caug.',
      jazz: 'CΔ7, C-7, Cø7, C°, C+.',
      rock: 'CM7, Cm7, Cm7(b5), Cdim, C+.',
    } satisfies Record<ChordSpelling, string>,
    headerFooter: {
      titleBlock: 'Title block on the first page',
      pageLines: 'On every page',
      elements: {
        title: 'Title',
        subtitle: 'Subtitle',
        artist: 'Artist',
        album: 'Album',
        words: 'Words',
        music: 'Music',
        wordsAndMusic: 'Words and music',
        tabber: 'Transcriber',
        copyright: 'Copyright',
        copyright2: 'Second copyright line',
      } satisfies Record<TitleElement, string>,
      blocks: 'Under the title block',
      blockNames: {
        instructions: 'Instructions',
        notices: 'Notice',
      } satisfies Record<TextBlockId, string>,
      blockHint: 'The score’s instructions and notice, as written in its information.',
      lines: {
        firstHeader: 'First page header',
        firstFooter: 'First page footer',
        laterHeader: 'Later pages header',
        laterFooter: 'Later pages footer',
      } satisfies Record<PageLineId, string>,
      aligns: { left: 'Left', center: 'Centre', right: 'Right' } satisfies Record<TextAlign, string>,
      text: (line: string) => `Text of ${line}`,
      align: (line: string) => `Alignment of ${line}`,
      tokens:
        'Write the score’s information with %TITLE%, %SUBTITLE%, %ARTIST%, %ALBUM%, %WORDS%, %MUSIC%, %WORDSMUSIC%, %TABBER% and %COPYRIGHT%; pages also with %PAGE% and %PAGES%. A line whose information is missing is left out.',
    },
    scale: 'Scale',
    scaleValue: (scale: number) => `${Math.round(scale * 100)} %`,
    keepTextSize: 'Keep the size of text and chord diagrams',
    keepTextSizeHint: 'Only the music grows or shrinks; titles, labels and chord diagrams stay as they are.',
    spacing: 'Rhythmic spacing',
    spacingValue: (spacing: number) => `× ${spacing.toFixed(1)}`,
    spacingHint: 'How much room the durations take across the page.',
    lineThickness: 'Staff line thickness',
    lineThicknessValue: (factor: number) => `× ${factor.toFixed(1)}`,
    systemSpacing: 'Space between systems',
    systemSpacingValue: (factor: number) => `× ${factor.toFixed(1)}`,
    firstSystemIndent: 'First system indent',
    firstSystemIndentValue: (mm: number) => `${mm} mm`,
    detachedCoda: 'Coda on a system of its own',
    codaGap: 'Space above the coda',
    codaGapValue: (mm: number) => `${mm} mm`,
    brackets: 'Brackets',
    bracketModes: {
      none: 'None',
      staves: 'Track',
      similar: 'Similar instruments',
    } satisfies Record<BracketMode, string>,
    singleStaffBrackets: 'Brackets around a single staff',
    extendBarLines: 'Barlines through all staves',
    systemSeparator: 'Separator between systems (//)',
    hideEmptyStaves: 'Leave out staves that rest for a whole system',
    hideEmptyStavesInFirstSystem: 'On the first system too',
    multiBarRests: 'Multi-bar rests',
    oneTrack: 'One track shown',
    severalTracks: 'Several tracks shown',
    places: { hidden: 'Hidden', first: 'First system', all: 'Every system' } satisfies Record<
      TrackNamePlace,
      string
    >,
    firstSystem: 'First system',
    otherSystems: 'Other systems',
    texts: { full: 'Full name', short: 'Short name' } satisfies Record<TrackNameText, string>,
    orientations: { horizontal: 'Across', vertical: 'Upright' } satisfies Record<TextOrientation, string>,
    dynamics: 'Dynamics',
    commonTime: 'C and cut C for 4/4 and 2/2',
    bentPitch: 'Pitch a bend reaches',
    extraRests: 'Rests of voices 2 to 4',
    tupletBrackets: 'Tuplet brackets',
    arpeggioArrows: 'Arrowheads on arpeggios',
    trillNote: 'A trill’s second note in the tablature',
    slideLabel: '"sl." over slides',
    hopoLetters: '"H" and "P" over hammer-ons and pull-offs',
    tabSlursOnOuterNotes: 'One slur over a chord’s outer notes in the tablature',
    tabSlursOnOuterNotesHint: 'Off, every note of a chord has its own hammer-on or pull-off slur.',
    linesOverRests: 'Technique lines over rests',
    linesOverRestsHint: 'P.M., let ring, harmonics and pick slides go on over the rests between them.',
    flatBeams: 'Level beams on the staff',
    flatDrumBeams: 'Level beams on drum staves',
    clefOnEverySystem: 'Clef on every system',
    timeSignatureOnEverySystem: 'Time signature on every system',
    timeSignatureAtSections: 'Time signature at every section',
    tiedTabNotes: 'Every tied note’s fret',
    tiedTabNotesHint: 'Otherwise only where a bar begins.',
    tabRhythm: 'Rhythm in the tablature',
    tabRhythms: { auto: 'Without a staff', always: 'Always', never: 'Never' },
    tabStemsInside: 'Stems from the frets',
    tabStemsInsideHint: 'Through the tablature; otherwise under it (or over it).',
    tabRhythmVoices: 'Each voice’s rhythm',
    tabRhythmVoice: (voice: number) => `Voice ${voice}`,
    tabRhythmPlaces: { below: 'Below', above: 'Above', none: 'None' },
    slashStaffLines: 'A line behind slash notation',
    slashBarLines: 'Barlines in slash notation',
    slashSingleNoteFrets: 'Frets and strings of single notes in slash notation',
    leftHandFingerLabels: 'Left-hand fingers',
    leftHandFingerLabelSets: { t1234: 't 1 2 3 4', T1234: 'T 1 2 3 4', p1234: 'p 1 2 3 4' },
    rightHandFingerLabels: 'Right-hand fingers',
    rightHandFingerLabelSets: {
      pimac: 'p i m a c',
      pimax: 'p i m a x',
      pimae: 'p i m a e',
      timao: 't i m a o',
    },
    fingeringPosition: 'On the staff',
    fingeringPositions: { before: 'Before the note', above: 'Above', below: 'Below' },
    tabFingeringPosition: 'In the tablature',
    tabFingeringPositions: { none: 'None', above: 'Above', below: 'Below' },
    fingeringSize: 'Size of the fingering',
    tabBeamsOverRests: 'Beams over rests',
    tabBeamsOverRestsHint: 'Otherwise a rest ends the beam.',
    tabCircleLongNotes: 'Half and whole notes circled',
    harmonicTouch: 'Where artificial harmonics are touched',
    harmonicTouchHint: 'After the fret, as 5 <17>.',
    octaveHarmonicDot: 'A dot for octave harmonics',
    octaveHarmonicDotHint: 'An artificial harmonic touched an octave up written 5.',
    dashQuarterRests: 'Quarter rests as a dash',
    voiceColors: 'Voices 2 to 4 in colour',
    voiceColorsHint: 'Their frets in green, pink and purple.',
    musicFont: 'Music font',
    musicFonts: {
      bravura: 'Engraved (Bravura)',
      petaluma: 'Handwritten (Petaluma)',
    } satisfies Record<BuiltInMusicFont, string>,
    musicFontHints: {
      bravura: 'Bravura: the notes as music is printed.',
      petaluma: 'Petaluma: the notes as if written by hand.',
    } satisfies Record<BuiltInMusicFont, string>,
    ownFonts: {
      group: 'Your own',
      add: 'Add a SMuFL font…',
      files: 'SMuFL font and its metadata',
      remove: (name: string) => `Remove ${name}`,
      missing: 'Your own font (not in this browser)',
      ownHint: 'A SMuFL font of your own, kept in this browser only.',
      missingHint: 'That font is not kept in this browser: the score is set in Bravura.',
      chooseBoth: 'Choose the font (.otf, .ttf or .woff) and its SMuFL metadata (.json) together.',
      notMetadata: (file: string) => `${file} is not a SMuFL font metadata file.`,
      notSmufl: (file: string) => `${file} has no SMuFL music symbols.`,
      notReadable: (file: string, detail: string) => `${file} cannot be read: ${detail}`,
    },
    tempoMarks: 'Tempo marks',
    tempoDecimals: 'Tempo decimals (120.5)',
    lyrics: 'Lyrics',
    tuning: 'Tuning legend',
    lyricsPlace: 'Where the lyrics go',
    lyricsPlaces: { between: 'Under the staff', above: 'Above the staves', below: 'Below the staves' },
    capoAndTuningInNotation: 'Capos and tunings change the written notes',
    capoAndTuningInNotationHint:
      'Off: guitars are written as if in standard tuning without a capo, in their own key.',
    tuningPlace: 'Where the tuning goes',
    tuningPlaces: { top: 'Above the music', tab: 'Before the tablature' },
    tuningDetail: 'What the legend says',
    tuningDetails: {
      auto: 'The name, and the strings when not standard',
      name: 'The name only',
      all: 'The name and every string',
      changed: 'Only strings tuned otherwise',
    },
    tuningLayout: 'Its strings',
    tuningLayouts: { columns: 'In two columns', line: 'On one line' },
    tuningFrame: 'A frame around the legend',
    chordDiagramsOnTop: 'Chord diagrams above the music',
    chordDiagramsInScore: 'Chord diagrams above their beats',
    diagramsOnTopSize: 'Size of the diagrams above the music',
    diagramsOnTopSpacing: 'Space between them',
    diagramsInScoreSize: 'Size of the diagrams above their beats',
    diagramsInScoreSpacing: 'Room each takes along the staff',
    diagramsInScoreSpacingHint:
      'At × 1.0 the diagrams of beats close together just keep apart; at × 0.0 they may overlap.',
    diagramFactorValue: (factor: number) => `× ${factor.toFixed(1)}`,
  },

  zoom: {
    slider: 'Zoom',
    presets: 'Zoom presets',
    fit: 'Fit to the window',
    fits: { width: 'Page width', page: 'Whole page' } satisfies Record<ZoomFit, string>,
    hint: (mod: string) => `${mod} with the wheel, or pinch, zooms the score too.`,
  },

  fullScreen: {
    controls: 'Full screen',
    leave: 'Leave full screen',
  },

  staffDisplays: {
    default: 'As in file',
    'score-tab': 'Notation + tab',
    score: 'Notation',
    tab: 'Tab',
  } satisfies Record<StaffDisplay, string>,

  layouts: {
    page: 'Page',
    scroll: 'Vertical',
    horizontal: 'Horizontal',
  } satisfies Record<LayoutKind, string>,

  papers: {
    a3: 'A3',
    a4: 'A4',
    a5: 'A5',
    b4: 'B4 (JIS)',
    b5: 'B5 (JIS)',
    letter: 'US Letter',
    legal: 'US Legal',
    tabloid: 'Tabloid',
    executive: 'Executive',
    statement: 'Statement',
    folio: 'Folio',
    quarto: 'Quarto',
    custom: 'Custom',
  } satisfies Record<PaperId, string>,

  orientations: {
    portrait: 'Portrait',
    landscape: 'Landscape',
  } satisfies Record<Orientation, string>,

  pageSetup: {
    open: 'Page setup…',
    title: 'Page setup',
    description: 'The paper, which way up, and the margins around the music. New scores start the same way.',
    paper: 'Paper',
    width: 'Width',
    height: 'Height',
    millimetres: 'mm',
    orientation: 'Orientation',
    margins: 'Margins',
    top: 'Top',
    right: 'Right',
    bottom: 'Bottom',
    left: 'Left',
    close: 'Close',
    paperValue: (paper: string, landscape: boolean) => (landscape ? `${paper}, landscape` : paper),
    size: (width: number, height: number) => `${width} × ${height} mm`,
  },

  arrangements: {
    vertical: 'Down',
    horizontal: 'Side by side',
    grid: 'Grid',
    endless: 'Endless',
  } satisfies Record<PageArrangement, string>,

  systemsLayouts: {
    model: 'As in file',
    auto: 'Automatic',
  } satisfies Record<SystemsLayout, string>,

  score: {
    region: (title: string) => `Score: ${title}`,
    untitled: 'Untitled',
    backToCursor: 'Back to the music',
    renderFailed: 'The score couldn’t be displayed',
    renderFailedDetail:
      'The engine reported an error while laying out this score. Technical details are below.',
  },

  transport: {
    label: 'Playback',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop and go to the start',
    loading: 'Loading sounds…',
    unavailable: 'Playback unavailable',
    retry: 'Try again',
    speed: 'Playback speed',
    speedValue: (speed: number) => `${Math.round(speed * 100)} %`,
    loop: 'Loop',
    loopSelection: 'Loop the selection',
    selection: (first: number, last: number) =>
      first === last ? `Bar ${first} selected` : `Bars ${first}–${last} selected`,
    selectionBars: (first: number, last: number) =>
      first === last ? `Bar ${first}` : `Bars ${first}–${last}`,
    clearSelection: 'Clear selection',
    selectionHelp:
      'Playback stays inside the selection. Drag across the music to select, Shift+click to extend, or long-press a bar on a touch screen.',
    speedSlower: 'Slower',
    speedFaster: 'Faster',
    speedPresets: 'Speed presets',
    speedHint: 'Practise slowly without changing the pitch. Keys: − and =.',
    speedTap: 'Tap tempo',
    fixedTempo: 'Fixed tempo',
    fixedTempoHint: 'Plays the whole song at one tempo, ignoring its tempo changes.',
    fixedTempoBpm: 'Fixed tempo, quarter notes per minute',
    fixedTempoPresets: 'Tempo presets',
    tempoFixed: (bpm: number) => `♩ ${bpm} fixed`,
    positionDetailFixed: 'fixed tempo',
    speedTapHint: 'Tap along at the tempo you want: the speed follows.',
    position: 'Position',
    positionDetail: (bar: number, beat: number, numerator: number, denominator: number, tempo: number) =>
      `Bar ${bar}, beat ${beat}, ${numerator}/${denominator}, ${tempo} beats per minute`,
    barBeat: (bar: number, beat: number) => `${bar}.${beat}`,
    meter: (numerator: number, denominator: number) => `${numerator}/${denominator}`,
    tempo: (bpm: number) => `♩ ${bpm}`,
    goTo: 'Go to',
    goToBar: 'Bar',
    goToBarHint: (count: number) => `1 to ${count}`,
    goToSubmit: 'Go',
    loopBars: 'Loop bars',
    loopBarsFrom: 'From bar',
    loopBarsTo: 'To bar',
    loopBarsSubmit: 'Loop',
    sections: 'Sections',
    sectionAt: (bar: number) => `Bar ${bar}`,
    selectSection: (name: string, first: number, last: number) =>
      first === last ? `Select ${name} (bar ${first})` : `Select ${name} (bars ${first}–${last})`,
    metronome: 'Metronome',
    countIn: 'Count-in',
    practiceSettings: 'Practice settings…',
    speedTrainerOn: 'speed trainer on',
    more: 'More playback controls',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
  },

  fretboard: {
    open: 'Fretboard',
    title: 'Fretboard',
    track: 'Track',
    trackOption: (number: number, name: string) => `${number}. ${name}`,
    tuning: (name: string, capo: number) =>
      [name.trim().length > 0 ? name : null, capo > 0 ? `Capo ${capo}` : null].filter(Boolean).join(' · '),
    settings: 'Fretboard settings',
    close: 'Close the fretboard',
    show: 'Show',
    shows: { beat: 'Now', next: 'Now and next', bar: 'Whole bar' },
    showHints: {
      beat: 'The notes being played.',
      next: 'The notes being played, and the next ones to play as rings.',
      bar: 'The notes being played, and the rest of the bar in a lighter colour.',
    },
    labels: 'Note names',
    labelModes: { off: 'Off', hover: 'On hover', always: 'Always' },
    labelHints: {
      off: 'No names, to practise finding the notes from memory.',
      hover: 'Point at the neck to see the name of a note.',
      always: 'Every note shown carries its name.',
    },
    leftHanded: 'Left-handed',
    noStrings: (track: string) => `${track} has no strings to show on a fretboard.`,
    neck: (track: string) => `Fretboard of ${track}`,
    place: (string: number, fret: number) =>
      fret === 0 ? `string ${string}, open` : `string ${string}, fret ${fret}`,
    playing: (notes: readonly string[]) =>
      notes.length === 0 ? 'Nothing playing.' : `Playing ${notes.join(', ')}.`,
    next: (notes: readonly string[]) => (notes.length === 0 ? '' : ` Next: ${notes.join(', ')}.`),
  },

  keyboard: {
    open: 'Keyboard',
    title: 'Keyboard',
    settings: 'Keyboard settings',
    close: 'Close the keyboard',
    hand: 'Hands',
    hands: { both: 'Both', right: 'Right', left: 'Left' },
    handHints: {
      both: 'The right hand in the cursor colour, the left hand in blue.',
      right: 'The upper staff only.',
      left: 'The lower staves only.',
    },
    showHints: {
      beat: 'The keys being played.',
      next: 'The keys being played, and the next ones to play outlined.',
      bar: 'The keys being played, and the rest of the bar in a lighter colour.',
    },
    labelHints: {
      off: 'No names, to practise finding the notes from memory.',
      hover: 'Point at a key to see its name.',
      always: 'Every white key carries its name; black keys theirs when played.',
    },
    range: (low: string, high: string) => `Range ${low}–${high}`,
    noPitches: (track: string) => `${track} has no pitched notes to show on a keyboard.`,
    keys: (track: string) => `Keyboard of ${track}`,
    playing: (notes: readonly string[]) =>
      notes.length === 0 ? 'Nothing playing.' : `Playing ${notes.join(', ')}.`,
    next: (notes: readonly string[]) => (notes.length === 0 ? '' : ` Next: ${notes.join(', ')}.`),
  },

  chords: {
    open: 'Chords',
    title: 'Chords',
    close: 'Close the chords',
    now: 'Now',
    next: 'Next',
    inBeats: (beats: number) => (beats === 0 ? 'now' : beats === 1 ? 'in 1 beat' : `in ${beats} beats`),
    all: 'Chords of the track',
    goTo: (name: string) => `Play from the next ${name}`,
    none: (track: string) => `${track} has no chords.`,
    mutedString: 'not played',
    openString: 'open',
    diagram: (name: string, frets: string) => `${name}: ${frets}, from the lowest string`,
    /** The fingering, from the lowest string (REND-208). */
    fingering: (fingers: string) => `; fingers ${fingers}`,
    noFinger: 'none',
    thumb: 'thumb',
  },

  lyrics: {
    open: 'Lyrics',
    title: 'Lyrics',
    close: 'Close the lyrics',
    verse: 'Lines of lyrics',
    verseOption: (number: number) => `Line ${number}`,
    only: 'Lyrics only',
    none: (track: string) => `${track} has no lyrics.`,
    sing: (text: string) => `Sing from “${text}”`,
  },

  drums: {
    open: 'Drums',
    title: 'Drums',
    settings: 'Drum view settings',
    close: 'Close the drums',
    mode: 'Show',
    modes: { kit: 'Kit', sounds: 'Sounds' },
    modeHints: {
      kit: 'A pad for each piece of the kit the track plays, cymbals first.',
      sounds: 'A pad for each sound the kit can make, by MIDI number.',
    },
    gmOnly: 'General MIDI sounds only',
    largeLabels: 'Large labels',
    labelHints: {
      off: 'No names, to read the kit from memory.',
      hover: 'Point at a pad to see its name and MIDI number.',
      always: 'Every pad carries its name and MIDI number.',
    },
    showHints: {
      beat: 'The pads being played.',
      next: 'The pads being played, and the next ones to play outlined.',
      bar: 'The pads being played, and the rest of the bar in a lighter colour.',
    },
    midi: (key: number) => `MIDI ${key}`,
    pad: (name: string, key: number | null) => (key === null ? name : `${name}, MIDI ${key}`),
    pads: (track: string) => `Drums of ${track}`,
    playing: (names: readonly string[]) =>
      names.length === 0 ? 'Nothing playing.' : `Playing ${names.join(', ')}.`,
    notDrums: (track: string) => `${track} is not a drum track.`,
  },

  overview: {
    open: 'Song overview',
    title: 'Song overview',
    close: 'Close the song overview',
    tracks: 'Tracks',
    bars: 'Bars of the song',
    value: (bar: number, count: number, section: string, playing: readonly string[]) =>
      `Bar ${bar} of ${count}${section.length > 0 ? `, ${section}` : ''}. ${
        playing.length === 0 ? 'Nothing plays' : `Playing: ${playing.join(', ')}`
      }.`,
  },

  songMap: {
    label: 'Song map',
    value: (bar: number, count: number, section: string) =>
      section.length > 0 ? `Bar ${bar} of ${count}, ${section}` : `Bar ${bar} of ${count}`,
  },

  playbackView: {
    open: 'Following the music',
    title: 'Following the music',
    scrolling: 'Scrolling',
    scrollModes: { continuous: 'Continuous', page: 'Page by page', off: 'Off' },
    scrollHints: {
      continuous: 'The view moves along so the music being played stays in the same place.',
      page: 'The view turns to the next page when the music gets there.',
      off: 'The view stays where you leave it.',
    },
    offset: 'Playing line',
    offsetValue: (offset: number) => `${Math.round(offset * 100)} % from the top`,
    cursor: 'Cursor',
    cursorStyles: { smooth: 'Smooth', note: 'Per note', beat: 'Per beat', hidden: 'Hidden' },
    barHighlight: 'Highlight the bar',
    noteHighlight: 'Colour the notes being played',
    colour: 'Colour',
    colours: { accent: 'Orange', blue: 'Blue', green: 'Green', violet: 'Violet', rose: 'Rose' },
  },

  practice: {
    title: 'Practice settings',
    description: 'The metronome, the count-in, how loops repeat, and the speed trainer.',
    close: 'Close',
    loop: 'Loop',
    loopPasses: 'Repeat a loop',
    loopPassesValue: (passes: number | null) =>
      passes === null ? 'Endlessly' : `${passes} times, then stop`,
    loopPassesHint: 'Applies to every loop: the selection, or the whole song.',
    loopRest: 'Rest between passes',
    loopRestValue: (bars: number) => (bars === 0 ? 'None' : bars === 1 ? '1 bar' : `${bars} bars`),
    loopRestHint: 'Silent bars before the loop starts again, to reset your hands.',
    resting: 'Rest',
    trainer: 'Speed trainer',
    trainerHint:
      'Loops the selection (or the whole song) and changes the speed step by step, after the same number of passes at each speed.',
    trainerFrom: 'Start at',
    trainerTo: 'Up to',
    trainerStep: 'Step',
    trainerPasses: 'Passes at each speed',
    trainerUnit: '%',
    trainerStatus: (speed: number, index: number, count: number) =>
      `Now ${Math.round(speed * 100)} %: speed ${index} of ${count}.`,
    trainerDone: (speed: number) => `At the target, ${Math.round(speed * 100)} %.`,
    metronome: 'Metronome',
    metronomeHint: 'Clicks along with the song, in its meter and tempo.',
    countIn: 'Count-in',
    countInHint: 'Clicks before playback starts, so you come in on time.',
    countInBars: 'Count-in length',
    countInBarsValue: (bars: number) => (bars === 1 ? '1 bar' : `${bars} bars`),
    countInEveryLoop: 'Before every pass of a loop',
    countInEveryLoopHint: 'Counts in again each time a loop starts over.',
    countInVolume: 'Count-in volume',
    volume: 'Metronome volume',
    percent: (value: number) => `${Math.round(value * 100)} %`,
    silentHint: 'At zero the metronome is silent and only the beat display moves.',
    sound: 'Sound',
    sounds: {
      click: 'Click',
      woodblock: 'Woodblock',
      claves: 'Claves',
      cowbell: 'Cowbell',
      sidestick: 'Side stick',
      hihat: 'Hi-hat',
    },
    subdivision: 'Clicks per beat',
    subdivisions: {
      1: 'One click per beat',
      2: 'Two clicks per beat',
      3: 'Three clicks per beat (triplets)',
      4: 'Four clicks per beat',
    },
    halfTime: 'Half time',
    halfTimeHint: 'Clicks on every other beat.',
    accents: 'Accents',
    accentModes: { first: 'First beat', none: 'None', pattern: 'Custom' },
    pattern: 'Custom accents',
    patternHint: 'Tap a beat to change it: accent, normal, soft, silent. The pattern repeats.',
    patternBeat: (beat: number, level: string) => `Beat ${beat}: ${level}`,
    levels: { accent: 'accent', normal: 'normal', soft: 'soft', off: 'silent' },
    patternShorter: 'One beat fewer',
    patternLonger: 'One beat more',
    patternLength: (beats: number) => (beats === 1 ? '1 beat' : `${beats} beats`),
    polyrhythm: 'Polyrhythm',
    polyrhythmHint: 'A second sound with its own number of clicks spread evenly across each bar.',
    polyrhythmOff: 'Off',
    polyrhythmValue: (count: number) => `${count} per bar`,
    swing: 'Swing',
    swingHint: 'Delays every second click; at 100 % it falls on the last triplet.',
    beatDrop: 'Silent bars',
    beatDropHint: 'Leaves out this share of bars at random, so you learn to keep time on your own.',
    beat: (beat: number, beats: number) => `Beat ${beat} of ${beats}`,
    countingIn: 'Counting in',
  },

  tuner: {
    open: 'Tuner',
    title: 'Tuner',
    description:
      'Play one string at a time. The sound is analysed on this device: nothing is recorded or sent.',
    close: 'Close',
    start: 'Start listening',
    starting: 'Asking for the microphone…',
    listening: 'Listening: play a string.',
    denied: 'The microphone is blocked. Allow it for this site in the browser’s settings, then start again.',
    unavailable: 'No microphone was found.',
    failed: 'The microphone could not be opened.',
    target: 'Tune to',
    targets: { strings: 'Track strings', chromatic: 'Any note' },
    noStrings: 'This track has no strings: the tuner shows the nearest note.',
    tuningOf: (track: string, tuning: string) => (tuning.length > 0 ? `${track}: ${tuning}` : track),
    display: 'Display',
    displays: { needle: 'Needle', strobe: 'Strobe' },
    strobeHint: 'The stripes drift right when sharp, left when flat, and stand still in tune.',
    reference: 'Reference pitch (A4)',
    hz: 'Hz',
    inTune: 'In tune',
    flat: 'Flat: tune up',
    sharp: 'Sharp: tune down',
    cents: (cents: number) => `${cents > 0 ? '+' : cents < 0 ? '−' : '±'}${Math.abs(cents)} ¢`,
    frequency: (hz: number) => `${hz.toFixed(1)} Hz`,
    strings: 'Strings',
    lockString: (note: string) => `Tune only the ${note} string`,
    reading: (note: string, state: 'in' | 'flat' | 'sharp') =>
      `${note}: ${state === 'in' ? 'in tune' : state === 'flat' ? 'flat' : 'sharp'}`,
    reducedMotion: 'Your device asks for less motion, so the needle is shown.',
    meter: 'How far from the note, in cents',
  },

  metronomeTool: {
    open: 'Standalone metronome',
    title: 'Metronome',
    description: 'A metronome on its own. The song, if one is open, waits until you close it.',
    close: 'Close',
    tempo: 'Tempo',
    bpm: 'BPM',
    bpmValue: (bpm: number) => `${bpm} beats per minute`,
    slower: 'Slower',
    faster: 'Faster',
    tap: 'Tap',
    tapLabel: 'Tap tempo',
    tapHint: 'Tap along at least twice (or press T) to set the tempo.',
    meter: 'Time signature',
    beatsPerBar: 'Beats per bar',
    beatUnit: 'Beat unit',
    beatUnitValue: (denominator: number) => `/${denominator}`,
    start: 'Start',
    stop: 'Stop',
    soundAndPattern: 'Sound and pattern',
    unavailable: 'Sound is unavailable in this browser.',
  },

  shortcuts: {
    title: 'Keyboard shortcuts',
    description:
      'Keys follow Guitar Pro wherever it has a shortcut for the same action. Click an action’s keys to change them.',
    edit: {
      change: (action: string) => `Change the keys of ${action}`,
      pressKeys: 'Press the new keys…',
      none: 'No keys',
      reset: (action: string) => `Put back the keys of ${action}`,
      resetAll: 'Put back every key',
      taken: (keys: string, action: string) => `${keys} is already for ${action}.`,
      useHere: 'Use it here',
      keep: 'Keep as it was',
    },
    groups: {
      playback: 'Playback',
      navigation: 'Moving around',
      selection: 'Selecting',
      view: 'View',
      files: 'Files',
      help: 'Help',
    },
    singleKeys: 'Single-key shortcuts (−, =, ?)',
    singleKeysHint: 'Turn off if these keys clash with your screen reader or keyboard.',
    actions: {
      playPause: 'Play or pause',
      stop: 'Stop and go back to the start (of the selection)',
      loop: 'Loop on or off',
      speed: 'Playback speed…',
      speedDown: 'Slower (5 %)',
      speedUp: 'Faster (5 %)',
      metronome: 'Metronome on or off',
      countIn: 'Count-in on or off',
      beatPrevious: 'Previous beat',
      beatNext: 'Next beat',
      beatPreviousAudible: 'Previous beat, and hear it',
      beatNextAudible: 'Next beat, and hear it',
      barPrevious: 'Previous bar',
      barNext: 'Next bar',
      sectionPrevious: 'Previous section',
      sectionNext: 'Next section',
      barStart: 'Start of the bar',
      barEnd: 'Last beat of the bar',
      songStart: 'First bar',
      songEnd: 'Last bar',
      goTo: 'Go to bar or section…',
      selectBeatLeft: 'Extend the selection one beat left',
      selectBeatRight: 'Extend the selection one beat right',
      selectBarLeft: 'Extend the selection one bar left',
      selectBarRight: 'Extend the selection one bar right',
      selectBarStart: 'Extend the selection to the start of the bar',
      selectBarEnd: 'Extend the selection to the end of the bar',
      selectSongStart: 'Extend the selection to the start',
      selectSongEnd: 'Extend the selection to the end',
      selectAll: 'Select everything',
      clearSelection: 'Clear the selection, or leave full screen',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomReset: 'Zoom to 100 %',
      fretboard: 'Fretboard on or off',
      fullScreen: 'Full screen on or off',
      overview: 'Song overview on or off',
      stylesheet: 'Stylesheet…',
      trackPrevious: 'Previous track',
      trackNext: 'Next track',
      open: 'Open files',
      print: 'Print the score',
      shortcuts: 'Show keyboard shortcuts',
      commandPalette: 'Command palette',
    },
    or: 'or',
    close: 'Close',
  },

  update: {
    title: 'A new version of OpenTabz is ready',
    reopens: 'Reload to use it; the scores open now open again.',
    plain: 'Reload to use it.',
    reload: 'Reload',
    later: 'Later',
  },

  recent: {
    heading: 'Recent scores',
    open: (title: string) => `Open ${title} again`,
    clear: 'Clear the list',
    clearCommand: 'Clear the recent scores',
    openedOn: (date: string) => `Opened ${date}`,
    byline: (artist: string, file: string) => (artist.length > 0 ? `${artist} · ${file}` : file),
    gone: 'This score is no longer kept on this device.',
    remember: 'Remember recent scores',
    rememberHint: 'Kept on this device only, to open again from the home page.',
    reopen: 'Open the scores from last time at the start',
    reopenHint: 'Needs recent scores to be remembered.',
  },

  palette: {
    open: 'Commands',
    label: 'Command palette',
    field: 'Command',
    hint: 'Type a command; ? lists them all, $ goes to a section, : to a bar',
    results: 'Commands',
    recent: 'Recent',
    none: 'No command matches',
    keys: 'Keys',
    unavailable: (reason: string) => `Not now: ${reason}`,
    reasons: {
      noScore: 'open a score first',
      noSelection: 'nothing is selected',
      noFocus: 'no track is focused',
      noSections: 'this score has no sections',
      drumsOnly: 'only drums are open',
      noRepeats: 'this score has no repeats or jumps',
      pagesOnly: 'only the page layout has paper and pages',
      noModelLayout: 'this score brings no layout of its own',
      notHorizontal: 'the horizontal layout has one system',
      noRecent: 'no scores are kept',
    },
    goToBar: (bar: number) => `Go to bar ${bar}`,
    goToBarField: 'Go to bar…',
    typeBar: (count: number) => `type a bar number from 1 to ${count}`,
    goToSection: (name: string) => `Go to ${name}`,
    goToSectionField: 'Go to a section…',
    sectionName: (marker: string, text: string) =>
      marker.length > 0 && text.length > 0 ? `${marker}: ${text}` : marker.length > 0 ? marker : text,
    /** Commands that take a value typed after their name. */
    values: {
      zoom: 'Zoom to…',
      zoomTo: (percent: number) => `Zoom to ${percent} %`,
      speed: 'Set the playback speed…',
      speedTo: (percent: number) => `Playback speed ${percent} %`,
      transpose: 'Transpose playback…',
      transposeTo: (semitones: number) =>
        semitones === 0
          ? 'Transpose playback back to as written'
          : `Transpose playback ${semitones > 0 ? '+' : '−'}${Math.abs(semitones)} semitone${Math.abs(semitones) === 1 ? '' : 's'}`,
      typeValue: 'type a value after it',
    },
    commands: {
      export: 'Export…',
      settings: 'Settings…',
      practice: 'Practice settings…',
      tuner: 'Tuner',
      metronomeTool: 'Standalone metronome',
      theme: (name: string) => `Theme: ${name}`,
      layout: (name: string) => `Layout: ${name}`,
      staves: (name: string) => `Staves: ${name}`,
      keyboard: 'Keyboard on or off',
      drums: 'Drums on or off',
      chords: 'Chords on or off',
      lyrics: 'Lyrics on or off',
      concertPitch: 'Concert pitch on or off',
      beatCounts: 'Beat counts on or off',
      drumKey: 'Drum key on or off',
      tempoMarks: 'Tempo marks on or off',
      allTracks: 'Show all tracks',
      focus: 'Focus on the active track',
      unfocus: 'Unfocus',
      close: 'Close the score',
      track: (name: string) => `Show or hide ${name}`,
      switchTo: (name: string) => `Switch to ${name}`,
      noteNames: (option: string) => `Note names: ${option}`,
      paper: (option: string) => `Paper: ${option}`,
      pages: (option: string) => `Pages: ${option}`,
      systems: (option: string) => `Systems: ${option}`,
    },
    /** Other words each command is found by. */
    aliases: {
      'play-pause': ['start', 'resume', 'pause'],
      stop: ['rewind', 'beginning'],
      loop: ['repeat', 'cycle'],
      metronome: ['click'],
      'count-in': ['countdown', 'precount'],
      'go-to': ['jump', 'bar', 'measure'],
      fretboard: ['neck', 'guitar view'],
      overview: ['global view', 'map', 'arrangement'],
      stylesheet: ['engraving', 'style', 'layout options'],
      'full-screen': ['presentation', 'distraction free'],
      open: ['file', 'load', 'import'],
      print: ['paper', 'printer'],
      export: ['pdf', 'midi', 'wav', 'png', 'svg', 'musicxml', 'xml', 'gp', 'save', 'download'],
      tuner: ['tune', 'tuning fork', 'pitch'],
      'metronome-tool': ['click', 'tempo', 'bpm'],
      keyboard: ['piano', 'keys'],
      drums: ['kit', 'percussion'],
      chords: ['diagrams', 'chord diagrams'],
      lyrics: ['words', 'text', 'karaoke'],
      zoom: ['magnify', 'size', 'scale'],
      speed: ['tempo', 'slow down', 'faster', 'slower'],
      transpose: ['tonality', 'key', 'pitch', 'semitones'],
      focus: ['duck', 'highlight'],
      'concert-pitch': ['transposing instruments', 'sounding pitch'],
      'tempo-marks': ['tempo automation', 'bpm marks'],
      'open-url': ['link', 'download', 'web'],
      'song-info': ['title', 'artist', 'information', 'notes'],
      'page-setup': ['paper', 'margins', 'orientation'],
      'track-staves': ['tablature', 'standard notation', 'slash', 'numbered'],
      mixer: ['volume', 'mute', 'solo', 'pan', 'instrument'],
      'note-colours': ['colors', 'colours', 'intervals', 'degrees'],
      following: ['cursor', 'scrolling', 'follow'],
      unfold: ['unroll', 'expand repeats', 'linear'],
    } satisfies Record<string, readonly string[]>,
  },

  mixer: {
    open: 'Mixer',
    title: 'Mixer',
    mute: (track: string) => `Mute ${track}`,
    solo: (track: string) => `Solo ${track}`,
    volume: (track: string) => `${track} level`,
    practice: 'Practice mode: mute the tracks you are reading',
    /** Abbreviations on the mute and solo toggles. */
    muteShort: 'M',
    soloShort: 'S',
    pan: (track: string) => `${track} pan`,
    panValue: (pan: number) =>
      Math.abs(pan) < 0.005
        ? 'Centre'
        : pan < 0
          ? `Left ${Math.round(-pan * 100)} %`
          : `Right ${Math.round(pan * 100)} %`,
    focus: (track: string) => `Focus on ${track}: the other tracks play quieter`,
    more: (track: string) => `More settings for ${track}`,
    instrument: 'Instrument',
    transpose: 'Transpose',
    transposeValue: (semitones: number) =>
      semitones === 0
        ? 'None'
        : `${semitones > 0 ? '+' : '−'}${Math.abs(semitones)} ${Math.abs(semitones) === 1 ? 'semitone' : 'semitones'}`,
    detune: 'Fine tuning',
    detuneValue: (cents: number) =>
      cents === 0 ? '0 cents' : `${cents > 0 ? '+' : '−'}${Math.abs(cents)} cents`,
    drumKit: 'Drum kit',
    style: 'Playing style',
    letRing: 'Let notes ring',
    brush: 'Strum chords',
    accent: 'Stress strong beats',
    palmMute: 'Palm mute',
    palmMuteValue: (damping: number) => (damping < 0.34 ? 'Light' : damping > 0.66 ? 'Heavy' : 'As written'),
    balance: 'Balance',
    reset: 'Back to the mixer in the file',
    remembered: 'Changes are remembered for this file.',
    /** General MIDI program names, by program number. */
    programs: [
      'Acoustic Grand Piano',
      'Bright Acoustic Piano',
      'Electric Grand Piano',
      'Honky-tonk Piano',
      'Electric Piano 1',
      'Electric Piano 2',
      'Harpsichord',
      'Clavinet',
      'Celesta',
      'Glockenspiel',
      'Music Box',
      'Vibraphone',
      'Marimba',
      'Xylophone',
      'Tubular Bells',
      'Dulcimer',
      'Drawbar Organ',
      'Percussive Organ',
      'Rock Organ',
      'Church Organ',
      'Reed Organ',
      'Accordion',
      'Harmonica',
      'Tango Accordion',
      'Acoustic Guitar (nylon)',
      'Acoustic Guitar (steel)',
      'Electric Guitar (jazz)',
      'Electric Guitar (clean)',
      'Electric Guitar (muted)',
      'Overdriven Guitar',
      'Distortion Guitar',
      'Guitar Harmonics',
      'Acoustic Bass',
      'Electric Bass (finger)',
      'Electric Bass (pick)',
      'Fretless Bass',
      'Slap Bass 1',
      'Slap Bass 2',
      'Synth Bass 1',
      'Synth Bass 2',
      'Violin',
      'Viola',
      'Cello',
      'Contrabass',
      'Tremolo Strings',
      'Pizzicato Strings',
      'Orchestral Harp',
      'Timpani',
      'String Ensemble 1',
      'String Ensemble 2',
      'Synth Strings 1',
      'Synth Strings 2',
      'Choir Aahs',
      'Voice Oohs',
      'Synth Voice',
      'Orchestra Hit',
      'Trumpet',
      'Trombone',
      'Tuba',
      'Muted Trumpet',
      'French Horn',
      'Brass Section',
      'Synth Brass 1',
      'Synth Brass 2',
      'Soprano Sax',
      'Alto Sax',
      'Tenor Sax',
      'Baritone Sax',
      'Oboe',
      'English Horn',
      'Bassoon',
      'Clarinet',
      'Piccolo',
      'Flute',
      'Recorder',
      'Pan Flute',
      'Blown Bottle',
      'Shakuhachi',
      'Whistle',
      'Ocarina',
      'Lead 1 (square)',
      'Lead 2 (sawtooth)',
      'Lead 3 (calliope)',
      'Lead 4 (chiff)',
      'Lead 5 (charang)',
      'Lead 6 (voice)',
      'Lead 7 (fifths)',
      'Lead 8 (bass and lead)',
      'Pad 1 (new age)',
      'Pad 2 (warm)',
      'Pad 3 (polysynth)',
      'Pad 4 (choir)',
      'Pad 5 (bowed)',
      'Pad 6 (metallic)',
      'Pad 7 (halo)',
      'Pad 8 (sweep)',
      'FX 1 (rain)',
      'FX 2 (soundtrack)',
      'FX 3 (crystal)',
      'FX 4 (atmosphere)',
      'FX 5 (brightness)',
      'FX 6 (goblins)',
      'FX 7 (echoes)',
      'FX 8 (sci-fi)',
      'Sitar',
      'Banjo',
      'Shamisen',
      'Koto',
      'Kalimba',
      'Bagpipe',
      'Fiddle',
      'Shanai',
      'Tinkle Bell',
      'Agogo',
      'Steel Drums',
      'Woodblock',
      'Taiko Drum',
      'Melodic Tom',
      'Synth Drum',
      'Reverse Cymbal',
      'Guitar Fret Noise',
      'Breath Noise',
      'Seashore',
      'Bird Tweet',
      'Telephone Ring',
      'Helicopter',
      'Applause',
      'Gunshot',
    ],
    /** General MIDI program families, eight programs each. */
    programGroups: [
      'Piano',
      'Chromatic percussion',
      'Organ',
      'Guitar',
      'Bass',
      'Strings',
      'Ensemble',
      'Brass',
      'Reed',
      'Pipe',
      'Synth lead',
      'Synth pad',
      'Synth effects',
      'Ethnic',
      'Percussive',
      'Sound effects',
    ],
  },

  songInfo: {
    title: 'Song info',
    fields: {
      title: 'Title',
      subtitle: 'Subtitle',
      artist: 'Artist',
      album: 'Album',
      words: 'Words',
      music: 'Music',
      copyright: 'Copyright',
      tab: 'Tab by',
      instructions: 'Instructions',
      notices: 'Notices',
    },
    file: 'File',
    format: 'Format',
    size: 'Size',
    bars: 'Bars',
    tempo: 'Tempo',
    tempoValue: (bpm: number, label: string) => (label.length > 0 ? `${label} (${bpm} BPM)` : `${bpm} BPM`),
    tracks: 'Tracks',
    tuning: 'Tuning',
    capo: (fret: number) => `capo ${fret}`,
    percussion: 'percussion',
    close: 'Close',
  },

  errors: {
    dialogTitle: (count: number) =>
      count === 1 ? 'The file couldn’t be opened' : `${count} files couldn’t be opened`,
    technical: 'Technical details',
    copy: 'Copy details',
    copied: 'Copied',
    dismiss: 'Close',
    format: 'Detected format',
    position: 'Position',
    size: 'Size',
  },

  notices: {
    extensionMismatch: (name: string, format: string) => ({
      title: `Opened ${quoted(name)} as ${format}`,
      description: 'The file’s extension suggested a different format; OpenTabz went by its contents.',
    }),
    truncated: (name: string) => ({
      title: `${quoted(name)} seems to be cut off`,
      description:
        'OpenTabz opened everything it could read, but the end of the file is missing, so some content may be lost.',
    }),
    engineRestarted: {
      title: 'The engine was restarted',
      description: 'It stopped responding. Your open scores were reloaded.',
    },
    toastRegion: 'Notifications',
    close: 'Dismiss',
  },

  about: {
    title: 'About OpenTabz',
    description: 'A free, open-source notation and tablature workstation that runs entirely in your browser.',
    license: 'OpenTabz is free software under the GNU Affero General Public License v3.0 or later.',
    source: 'Source code',
    engine: 'Notation engine',
    engineCredit:
      'Scores are parsed and engraved by alphaTab (Mozilla Public License 2.0) by Daniel Kuschny and contributors. OpenTabz applies small patches, published with its source code.',
    font: 'Music fonts: Bravura and Petaluma by Steinberg Media Technologies (SIL Open Font License 1.1).',
    privacy:
      'Privacy: OpenTabz has no server. Your files are opened in this browser tab and never uploaded; the scores you open lately are kept in this browser to open again, unless you turn that off in Settings. There are no cookies, analytics or trackers.',
    trademark:
      'Guitar Pro is a registered trademark of Arobas Music. OpenTabz is not affiliated with or endorsed by Arobas Music; it opens Guitar Pro files for compatibility.',
    notices: 'Third-party notices',
    alphaTab: 'alphaTab',
    maker: 'OpenTabz is a Whale Development Studios product.',
    close: 'Close',
  },

  footer: {
    license: 'Free software · AGPL-3.0',
    engine: 'Notation engine: alphaTab',
    trademark:
      'Guitar Pro is a registered trademark of Arobas Music. OpenTabz is not affiliated with Arobas Music.',
    /** Signature: "A Whale Development Studios product", with the studio name emphasised. */
    makerBefore: 'A',
    maker: 'Whale Development Studios',
    makerAfter: 'product',
  },

  loading: {
    opening: (name: string) => `Opening ${quoted(name)}…`,
    downloading: 'Downloading…',
  },
} as const;
