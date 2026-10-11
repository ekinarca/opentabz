/**
 * Every user-facing string in OpenTabz (English only). Components import from here; no literal
 * UI text lives anywhere else.
 */
import type { FormatId, LayoutKind, OpenError, StaffDisplay, SystemsLayout } from '@opentabz/core/shared';
import type { PaperId } from './score-view/pagination.ts';
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
    about: 'About OpenTabz',
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
    systems: 'Line breaks',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom to 100 %',
    zoomLevel: (zoom: number) => `${Math.round(zoom * 100)} %`,
    zoomMenu: 'Zoom level',
    songInfo: 'Song info',
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
    a4: 'A4',
    letter: 'US Letter',
  } satisfies Record<PaperId, string>,

  systemsLayouts: {
    model: 'As in file',
    auto: 'Automatic',
  } satisfies Record<SystemsLayout, string>,

  score: {
    region: (title: string) => `Score: ${title}`,
    pageNumber: (page: number, pages: number) => `${page} / ${pages}`,
    untitled: 'Untitled',
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
    metronome: 'Metronome',
    countIn: 'Count-in',
    practiceSettings: 'Practice settings…',
    speedTrainerOn: 'speed trainer on',
    more: 'More playback controls',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
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
    description: 'Keys follow Guitar Pro wherever it has a shortcut for the same action.',
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
      clearSelection: 'Clear the selection',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomReset: 'Zoom to 100 %',
      open: 'Open files',
      shortcuts: 'Show keyboard shortcuts',
    },
    or: 'or',
    close: 'Close',
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
    font: 'Music font: Bravura by Steinberg Media Technologies (SIL Open Font License 1.1).',
    privacy:
      'Privacy: OpenTabz has no server. Your files are opened in this browser tab and never uploaded. There are no cookies, analytics or trackers.',
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
