/**
 * The title block (REND-236, REND-237): the lines a Guitar Pro file asks for, with their
 * templates, alignments and the lines it hides, and lines changed for a view.
 */
import type * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { readScoreStyle } from '../src/render/style.ts';
import { readTitleBlock } from '../src/render/title-block.ts';
import { Engraving, texts } from './engraving.ts';
import { readFixture } from './helpers.ts';

/** Guitar Pro 8's header and footer example, given something to write. */
function headerFooter(): alphaTab.model.Score {
  const score = openScore(readFixture('alphatab/guitarpro8/header-footer.gp'), 'header-footer.gp').score;
  score.title = 'Night Song';
  score.subTitle = 'Live';
  score.artist = 'The Band';
  score.album = 'Tour';
  score.words = 'Ann';
  score.music = 'Bob';
  score.tab = 'Cem';
  score.copyright = '2026';
  return score;
}

describe('the title block', () => {
  it('reads the templates, alignments and hidden lines of a Guitar Pro file', () => {
    const block = readTitleBlock(headerFooter());
    expect(block.title).toEqual({ visible: false, template: 'Title: %TITLE%', align: 'left' });
    expect(block.subtitle).toEqual({ visible: true, template: 'Subtitle: %SUBTITLE%', align: 'center' });
    expect(block.tabber).toEqual({ visible: true, template: 'Transcriber: %TABBER%', align: 'center' });
  });

  it('engraves the file’s lines, leaving out those it hides', () => {
    const score = headerFooter();
    const written = texts(new Engraving(score, { style: readScoreStyle(score) }).marks);
    expect(written).toContain('Subtitle: Live');
    expect(written).toContain('Album: Tour');
    expect(written).toContain('Music: Bob');
    expect(written).toContain('Transcriber: Cem');
    expect(written).toContain('Copyright: 2026');
    // Hidden in the file: alphaTab alone draws them anyway.
    expect(written).not.toContain('Title: Night Song');
    expect(written).not.toContain('Artist: The Band');
    expect(texts(new Engraving(headerFooter()).marks)).toContain('Title: Night Song');
  });

  it('engraves lines changed for the view, and gives the score its own back', () => {
    const score = headerFooter();
    const style = readScoreStyle(score);
    const view = new Engraving(score, {
      style: {
        ...style,
        titleBlock: {
          ...style.titleBlock,
          title: { visible: true, template: '%TITLE% (%ALBUM%)', align: 'center' },
          subtitle: { ...style.titleBlock.subtitle, visible: false },
        },
      },
    });
    const written = texts(view.marks);
    expect(written).toContain('Night Song (Tour)');
    expect(written).not.toContain('Subtitle: Live');
    // The title is centred: across the middle of the page.
    const title = view.marks.find(mark => mark.name === 'Night Song (Tour)');
    expect(title === undefined ? 0 : title.x + title.width / 2).toBeCloseTo(600, -2);
    expect(readTitleBlock(score).title.template).toBe('Title: %TITLE%');
  });
});
