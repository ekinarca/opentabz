/**
 * The fonts of the score's texts in alphaTab's terms (REND-238): each kind of text the stylesheet
 * names is one or more of alphaTab's fonts. Only fonts chosen differently from the defaults are
 * set, so untouched texts keep alphaTab's own.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  DEFAULT_TEXT_FONTS,
  fontFamilies,
  sameTextFont,
  TEXT_ELEMENTS,
  type TextElement,
  type TextFont,
  type TextFonts,
} from '../shared/text-fonts.ts';

const N = alphaTab.NotationElement;
const { Font, FontStyle, FontWeight } = alphaTab.model;

/** The notation elements whose fonts each kind of text sets. */
const ELEMENTS: Readonly<Record<TextElement, readonly alphaTab.NotationElement[]>> = {
  title: [N.ScoreTitle],
  subtitle: [N.ScoreSubTitle],
  artist: [N.ScoreArtist],
  album: [N.ScoreAlbum],
  credits: [N.ScoreWords, N.ScoreMusic, N.ScoreWordsAndMusic],
  copyright: [N.ScoreCopyright],
  // Written by the render session (text-blocks.ts), not by alphaTab.
  instructions: [],
  notices: [],
  // Written by the paged view and the print module, not by alphaTab.
  pageHeader: [],
  pageFooter: [],
  trackNames: [N.TrackNames],
  tuning: [N.GuitarTuning],
  sections: [N.EffectMarker],
  text: [N.EffectText],
  chordNames: [N.EffectChordNames, N.ChordDiagrams],
  chordFrets: [N.ChordDiagramFretboardNumbers],
  lyrics: [N.EffectLyrics],
  tab: [],
  fingering: [N.EffectFingering],
  techniques: [
    N.EffectCapo,
    N.EffectFreeTime,
    N.EffectTap,
    N.EffectPalmMute,
    N.EffectLetRing,
    N.EffectBeatBarre,
    N.EffectTripletFeel,
    N.EffectHarmonics,
    N.EffectPickSlide,
    N.EffectRasgueado,
    N.EffectWhammyBar,
    N.EffectHammerOnPullOffText,
    N.EffectSlideText,
  ],
  barNumbers: [N.BarNumber],
  repeats: [N.RepeatCount, N.EffectAlternateEndings],
  directions: [N.EffectDirections],
  timer: [N.EffectBeatTimer],
};

export function alphaTabFont(font: TextFont, size = font.size): alphaTab.model.Font {
  return Font.withFamilyList(
    fontFamilies(font.family),
    size,
    font.italic ? FontStyle.Italic : FontStyle.Plain,
    font.bold ? FontWeight.Bold : FontWeight.Regular,
  );
}

export function applyTextFonts(resources: alphaTab.RenderingResources, fonts: TextFonts): void {
  for (const element of TEXT_ELEMENTS) {
    const font = fonts[element];
    if (sameTextFont(font, DEFAULT_TEXT_FONTS[element])) continue;
    for (const notationElement of ELEMENTS[element])
      resources.elementFonts.set(notationElement, alphaTabFont(font));
    // Fret numbers are no notation element: alphaTab keeps them, and grace notes', apart.
    if (element === 'tab') {
      resources.tablatureFont = alphaTabFont(font);
      // Grace notes' frets stay smaller, in the same proportion as alphaTab's (12 to 14).
      resources.graceFont = alphaTabFont(font, (font.size * 12) / 14);
    }
  }
}
