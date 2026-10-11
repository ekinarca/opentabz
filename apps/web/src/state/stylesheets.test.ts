import { DEFAULT_SCORE_STYLE, SANS_SERIF } from '@opentabz/core/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyStylesheet,
  deleteStylesheet,
  loadStylesheets,
  parseStylesheets,
  saveStylesheet,
  setDefaultStylesheet,
  startingStyle,
  STYLESHEETS_STORAGE_KEY,
} from './stylesheets.ts';

const FILE = { ...DEFAULT_SCORE_STYLE, extendBarLines: true, chordSpelling: 'written' as const };

describe('stylesheets (REND-220, REND-310)', () => {
  beforeEach(() => {
    localStorage.removeItem(STYLESHEETS_STORAGE_KEY);
  });

  it('applies a look over the file’s style, keeping the rest of it', () => {
    const jazz = applyStylesheet({ look: 'jazz' }, FILE);
    expect(jazz).toMatchObject({ chordSpelling: 'jazz', tuning: false, extendBarLines: true });
    const pop = applyStylesheet({ look: 'pop' }, FILE);
    expect(pop.fonts.title).toEqual({ ...DEFAULT_SCORE_STYLE.fonts.title, family: SANS_SERIF });
    expect(applyStylesheet({ look: 'large' }, FILE).scale).toBe(1.5);
  });

  it('saves a style of one’s own under a name, replaces it by name, and deletes it', () => {
    const id = saveStylesheet('  Gig  ', { ...FILE, scale: 1.2 });
    expect(loadStylesheets().saved).toEqual([{ id, name: 'Gig', style: { ...FILE, scale: 1.2 } }]);
    expect(saveStylesheet('Gig', { ...FILE, scale: 1.3 })).toBe(id);
    expect(loadStylesheets().saved).toHaveLength(1);
    // One's own replaces the whole style.
    expect(applyStylesheet({ saved: id }, DEFAULT_SCORE_STYLE)).toEqual({ ...FILE, scale: 1.3 });
    deleteStylesheet(id);
    expect(loadStylesheets().saved).toEqual([]);
  });

  it('starts scores opened from now on with the default stylesheet, if one is chosen', () => {
    expect(startingStyle(FILE)).toBe(FILE);
    setDefaultStylesheet({ look: 'compact' });
    expect(startingStyle(FILE)).toMatchObject({ scale: 0.8, extendBarLines: true });
    const id = saveStylesheet('Mine', { ...DEFAULT_SCORE_STYLE, systemSeparator: true });
    setDefaultStylesheet({ saved: id });
    expect(startingStyle(FILE).systemSeparator).toBe(true);
    // Deleting the default stylesheet leaves scores as their files say.
    deleteStylesheet(id);
    expect(loadStylesheets().default).toBeNull();
    expect(startingStyle(FILE)).toBe(FILE);
  });

  it('reads nothing broken back', () => {
    expect(parseStylesheets('{oops')).toEqual({ saved: [], default: null });
    expect(
      parseStylesheets(
        JSON.stringify({
          saved: [
            { id: 'a', name: '', style: DEFAULT_SCORE_STYLE },
            { id: 'b', name: 'B', style: { scale: 9 } },
          ],
          default: { look: 'baroque' },
        }),
      ),
    ).toEqual({ saved: [], default: null });
  });
});
