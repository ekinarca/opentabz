import { DEFAULT_SCORE_STYLE } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { parseStyle, parseStyleMemory, recallStyle, rememberStyle } from './style-memory.ts';

const HASH = 'a'.repeat(64);

describe('styles remembered per song', () => {
  it('reads a stored style back, and nothing that is broken or out of range', () => {
    const style = { ...DEFAULT_SCORE_STYLE, scale: 1.5, brackets: 'none', singleTrackNames: 'all' };
    expect(parseStyle(JSON.parse(JSON.stringify(style)))).toEqual(style);
    expect(parseStyle({ ...style, scale: 7 })).toBeNull();
    expect(parseStyle({ ...style, brackets: 'curly' })).toBeNull();
    expect(parseStyle({ ...style, tuning: 'yes' })).toBeNull();
    expect(parseStyle(null)).toBeNull();
    const memory = parseStyleMemory(
      JSON.stringify({ [HASH]: style, short: style, ['b'.repeat(64)]: { scale: 1 } }),
    );
    expect([...memory.keys()]).toEqual([HASH]);
    expect(parseStyleMemory('{oops').size).toBe(0);
  });

  it('reads the title block, the pages’ lines and chord spelling, and takes what older versions lacked from the file', () => {
    const file = {
      ...DEFAULT_SCORE_STYLE,
      titleBlock: {
        ...DEFAULT_SCORE_STYLE.titleBlock,
        title: { visible: false, template: 'T: %TITLE%', align: 'left' as const },
      },
    };
    const stored = {
      ...DEFAULT_SCORE_STYLE,
      chordSpelling: 'jazz',
      pages: { ...DEFAULT_SCORE_STYLE.pages, laterFooter: { template: '%PAGE%', align: 'right' } },
    };
    expect(parseStyle(JSON.parse(JSON.stringify(stored)), file)).toMatchObject({
      chordSpelling: 'jazz',
      pages: { laterFooter: { template: '%PAGE%', align: 'right' } },
    });
    const older = JSON.parse(JSON.stringify(DEFAULT_SCORE_STYLE)) as Record<string, unknown>;
    delete older['titleBlock'];
    delete older['pages'];
    delete older['chordSpelling'];
    expect(parseStyle(older, file)?.titleBlock.title).toEqual(file.titleBlock.title);
    expect(parseStyle({ ...stored, chordSpelling: 'baroque' })).toBeNull();
    expect(parseStyle({ ...stored, pages: { laterFooter: { template: 1 } } })).toBeNull();
  });

  it('reads the staff lines, space between systems and indent (REND-228), in range', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        staffLineThickness: 2,
        systemSpacing: 0,
        firstSystemIndent: 15,
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)).toMatchObject({
      staffLineThickness: 2,
      systemSpacing: 0,
      firstSystemIndent: 15,
    });
    expect(parseStyle({ ...stored, staffLineThickness: 9 })).toBeNull();
    expect(parseStyle({ ...stored, firstSystemIndent: -1 })).toBeNull();
    const {
      staffLineThickness: _lines,
      systemSpacing: _spacing,
      firstSystemIndent: _indent,
      ...older
    } = stored;
    expect(parseStyle(older)).toMatchObject({
      staffLineThickness: 1,
      systemSpacing: 1,
      firstSystemIndent: 0,
    });
  });

  it('reads the chord diagrams’ sizes and spacing (REND-227), in range, as usual for older styles', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        chordDiagramsOnTopSize: 1.5,
        chordDiagramsOnTopSpacing: 0,
        chordDiagramsInScoreSize: 0.8,
        chordDiagramsInScoreSpacing: 2,
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)).toMatchObject({
      chordDiagramsOnTopSize: 1.5,
      chordDiagramsOnTopSpacing: 0,
      chordDiagramsInScoreSize: 0.8,
      chordDiagramsInScoreSpacing: 2,
    });
    expect(parseStyle({ ...stored, chordDiagramsOnTopSize: 0.1 })).toBeNull();
    expect(parseStyle({ ...stored, chordDiagramsInScoreSpacing: 9 })).toBeNull();
    const {
      chordDiagramsOnTopSize: _topSize,
      chordDiagramsOnTopSpacing: _topSpacing,
      chordDiagramsInScoreSize: _size,
      chordDiagramsInScoreSpacing: _spacing,
      ...older
    } = stored;
    expect(parseStyle(older)).toMatchObject({
      chordDiagramsOnTopSize: 1,
      chordDiagramsOnTopSpacing: 1,
      chordDiagramsInScoreSize: 1,
      chordDiagramsInScoreSpacing: 1,
    });
  });

  it('reads the techniques’ words (REND-242), the usual ones for older styles', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        techniqueLabels: { ...DEFAULT_SCORE_STYLE.techniqueLabels, palmMute: 'mute', letRing: 'ring' },
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)?.techniqueLabels).toMatchObject({
      palmMute: 'mute',
      letRing: 'ring',
      slide: '',
    });
    // Words left out of a stored style are the usual ones; anything but short words is refused.
    expect(parseStyle({ ...stored, techniqueLabels: { palmMute: 'mute' } })?.techniqueLabels).toEqual({
      ...DEFAULT_SCORE_STYLE.techniqueLabels,
      palmMute: 'mute',
    });
    expect(parseStyle({ ...stored, techniqueLabels: { palmMute: 4 } })).toBeNull();
    expect(parseStyle({ ...stored, techniqueLabels: { palmMute: 'x'.repeat(50) } })).toBeNull();
    const { techniqueLabels: _labels, ...older } = stored;
    expect(parseStyle(older)?.techniqueLabels).toEqual(DEFAULT_SCORE_STYLE.techniqueLabels);
  });

  it('reads how the tuning is written (REND-225, REND-232), as usual for older styles', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        tuningPlace: 'tab',
        tuningDetail: 'changed',
        tuningLayout: 'line',
        tuningFrame: true,
        capoAndTuningInNotation: false,
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)).toMatchObject({
      tuningPlace: 'tab',
      tuningDetail: 'changed',
      tuningLayout: 'line',
      tuningFrame: true,
      capoAndTuningInNotation: false,
    });
    expect(parseStyle({ ...stored, tuningDetail: 'everything' })).toBeNull();
    expect(parseStyle({ ...stored, tuningFrame: 'yes' })).toBeNull();
    const {
      tuningPlace: _place,
      tuningDetail: _detail,
      tuningLayout: _layout,
      tuningFrame: _frame,
      capoAndTuningInNotation: _capo,
      ...older
    } = stored;
    expect(parseStyle(older)).toMatchObject({
      tuningPlace: 'top',
      tuningDetail: 'auto',
      tuningLayout: 'columns',
      tuningFrame: false,
      capoAndTuningInNotation: true,
    });
  });

  it('reads the rhythm in the tablature (REND-244, REND-245), as usual for older styles', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        tabRhythm: 'always',
        tabStemsInside: false,
        tabRhythmVoices: ['below', 'above', 'none', 'below'],
        tabBeamsOverRests: false,
        tabCircleLongNotes: true,
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)).toMatchObject({
      tabRhythm: 'always',
      tabStemsInside: false,
      tabRhythmVoices: ['below', 'above', 'none', 'below'],
      tabBeamsOverRests: false,
      tabCircleLongNotes: true,
    });
    expect(parseStyle({ ...stored, tabRhythm: 'sometimes' })).toBeNull();
    expect(parseStyle({ ...stored, tabRhythmVoices: ['below', 'above'] })).toBeNull();
    expect(parseStyle({ ...stored, tabRhythmVoices: ['below', 'sideways', 'none', 'below'] })).toBeNull();
    const {
      tabRhythm: _rhythm,
      tabStemsInside: _inside,
      tabRhythmVoices: _voices,
      tabBeamsOverRests: _beams,
      tabCircleLongNotes: _circles,
      ...older
    } = stored;
    expect(parseStyle(older)).toMatchObject({
      tabRhythm: 'auto',
      tabStemsInside: true,
      tabRhythmVoices: ['below', 'below', 'below', 'below'],
      tabBeamsOverRests: true,
      tabCircleLongNotes: false,
    });
  });

  it('reads where the lyrics go (REND-239), between the staves for older styles', () => {
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, lyricsPlace: 'above' })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.lyricsPlace).toBe('above');
    expect(parseStyle({ ...stored, lyricsPlace: 'sideways' })).toBeNull();
    const { lyricsPlace: _place, ...older } = stored;
    expect(parseStyle(older)?.lyricsPlace).toBe('between');
  });

  it('reads the music font (REND-241): built in or one’s own, Bravura for older styles', () => {
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, musicFont: 'petaluma' })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.musicFont).toBe('petaluma');
    expect(parseStyle({ ...stored, musicFont: `own:${'0f'.repeat(8)}` })?.musicFont).toBe(
      `own:${'0f'.repeat(8)}`,
    );
    expect(parseStyle({ ...stored, musicFont: 'comic-sans' })).toBeNull();
    const { musicFont: _musicFont, ...older } = stored;
    expect(parseStyle(older)?.musicFont).toBe('bravura');
  });

  it('reads the notation switches (REND-248), older styles taking the file’s', () => {
    const switches = { commonTime: true, bentPitch: false, hideExtraRests: true, tupletBrackets: false };
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, ...switches })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)).toMatchObject(switches);
    expect(parseStyle({ ...stored, tupletBrackets: 'no' })).toBeNull();
    const { commonTime: _c, bentPitch: _b, hideExtraRests: _h, tupletBrackets: _t, ...older } = stored;
    expect(parseStyle(older, { ...DEFAULT_SCORE_STYLE, commonTime: true })).toMatchObject({
      commonTime: true,
      bentPitch: true,
      hideExtraRests: false,
      tupletBrackets: true,
    });
  });

  it('reads the technique and tablature switches (REND-249, REND-250), older styles as alphaTab draws', () => {
    const switches = {
      arpeggioArrows: false,
      trillNote: false,
      slideLabel: false,
      tiedTabNotes: true,
      dashQuarterRests: true,
      voiceColors: true,
    };
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, ...switches })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)).toMatchObject(switches);
    expect(parseStyle({ ...stored, voiceColors: 1 })).toBeNull();
    const older = Object.fromEntries(Object.entries(stored).filter(([key]) => !(key in switches)));
    expect(parseStyle(older)).toMatchObject({
      arpeggioArrows: true,
      trillNote: true,
      slideLabel: true,
      tiedTabNotes: false,
      dashQuarterRests: false,
      voiceColors: false,
    });
  });

  it('reads tempo decimals shown or not (REND-240), older styles taking the file’s', () => {
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, tempoDecimals: false })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.tempoDecimals).toBe(false);
    expect(parseStyle({ ...stored, tempoDecimals: 'no' })).toBeNull();
    const { tempoDecimals: _tempoDecimals, ...older } = stored;
    expect(parseStyle(older, { ...DEFAULT_SCORE_STYLE, tempoDecimals: false })?.tempoDecimals).toBe(false);
    expect(parseStyle(older)?.tempoDecimals).toBe(true);
  });

  it('reads the fonts, and nothing broken', () => {
    const fonts = {
      ...DEFAULT_SCORE_STYLE.fonts,
      title: { family: '"Comic Sans MS", sans-serif', size: 40, bold: true, italic: false },
    };
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, fonts })) as Record<string, unknown>;
    expect(parseStyle(stored)?.fonts.title).toEqual(fonts.title);
    expect(parseStyle({ ...stored, fonts: { ...fonts, title: { ...fonts.title, size: 500 } } })).toBeNull();
    expect(parseStyle({ ...stored, fonts: { ...fonts, tab: { ...fonts.tab, family: ' ' } } })).toBeNull();
    // A kind of text an older version did not keep comes from the file's style.
    const { tab: _tab, ...older } = fonts;
    expect(parseStyle({ ...stored, fonts: older })?.fonts.tab).toEqual(DEFAULT_SCORE_STYLE.fonts.tab);
  });

  it('reads the instructions and notice shown or not (REND-041), older styles hiding them', () => {
    const textBlocks = {
      instructions: { visible: true, align: 'center' },
      notices: { visible: false, align: 'right' },
    } as const;
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, textBlocks })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.textBlocks).toEqual(textBlocks);
    expect(parseStyle({ ...stored, textBlocks: { ...textBlocks, notices: { visible: 'yes' } } })).toBeNull();
    expect(
      parseStyle({ ...stored, textBlocks: { ...textBlocks, instructions: { visible: true, align: 'up' } } }),
    ).toBeNull();
    const { textBlocks: _textBlocks, ...older } = stored;
    expect(parseStyle(older)?.textBlocks).toEqual(DEFAULT_SCORE_STYLE.textBlocks);
  });

  it('keeps a song’s style for the next time it is opened', () => {
    const style = { ...DEFAULT_SCORE_STYLE, systemSeparator: true };
    rememberStyle(HASH, style);
    expect(recallStyle(HASH)).toEqual(style);
    expect(recallStyle('c'.repeat(64))).toBeNull();
  });
});
