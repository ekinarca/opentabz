/**
 * The fretboard: the active track's notes where the music is (now, with the next notes, or the
 * whole bar), any number of strings, a capo, note names, left-handed, switching tracks, phones.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function ready(page: Page): Promise<void> {
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
}

async function openFretboard(page: Page) {
  const toggle = page.getByRole('button', { name: 'Fretboard', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByRole('region', { name: 'Fretboard' });
  await expect(panel.getByRole('img', { name: /^Fretboard of / })).toBeVisible();
  return panel;
}

/** The marks on the neck, as "kind string:fret", sorted. */
function marks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<SVGGElement>('.ot-fret-note')]
      .map(
        mark => `${mark.dataset['kind'] ?? ''} ${mark.dataset['string'] ?? ''}:${mark.dataset['fret'] ?? ''}`,
      )
      .sort(),
  );
}

async function settings(page: Page, choose: (panel: ReturnType<Page['getByRole']>) => Promise<void>) {
  await page.getByRole('button', { name: 'Fretboard settings' }).click();
  const popover = page.getByRole('dialog', { name: 'Fretboard settings' });
  await expect(popover).toBeVisible();
  await choose(popover);
  await page.keyboard.press('Escape');
}

/** Keys go to the score, as after clicking it. */
async function focusScore(page: Page): Promise<void> {
  await page.getByRole('region', { name: /^Score: / }).focus();
}

/** ⌘ on Apple platforms, Ctrl elsewhere, as the app decides. */
function mod(page: Page): Promise<string> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac OS X')
      ? 'Meta'
      : 'Control',
  );
}

test.describe('fretboard', () => {
  test('shows where the music is: now, now and next, or the whole bar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Stepping by beat is a keyboard feature.');
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await ready(page);
    const panel = await openFretboard(page);
    const neck = panel.getByRole('img', { name: /^Fretboard of / });
    await expect(neck).toHaveAttribute('data-strings', '6');
    await expect(panel.getByRole('combobox', { name: 'Track' })).toHaveValue('0');
    // The first beat: the open A string and E on the D string; the same notes come next.
    await expect(neck).toHaveAccessibleName(
      'Fretboard of Rhythm Guitar. Playing A2 (string 5, open), E3 (string 4, fret 2). Next: A2 (string 5, open), E3 (string 4, fret 2).',
    );
    await expect.poll(() => marks(page)).toEqual(['current 4:2', 'current 5:0', 'next 4:2', 'next 5:0']);

    // Two beats on, the fourth fret; the whole bar shows the second fret too, lighter.
    await focusScore(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => marks(page)).toEqual(['current 4:4', 'current 5:0', 'next 4:4', 'next 5:0']);
    await settings(page, async popover => {
      await popover.getByRole('radio', { name: 'Whole bar' }).click();
    });
    await expect.poll(() => marks(page)).toEqual(['bar 4:2', 'current 4:4', 'current 5:0']);
    await settings(page, async popover => {
      await popover.getByRole('radio', { name: 'Now', exact: true }).click();
    });
    await expect.poll(() => marks(page)).toEqual(['current 4:4', 'current 5:0']);

    // Bar 5 is a D7 bar: the open D string and A on the G string.
    await page.keyboard.press(`${await mod(page)}+ArrowRight`);
    await page.keyboard.press(`${await mod(page)}+ArrowRight`);
    await page.keyboard.press(`${await mod(page)}+ArrowRight`);
    await page.keyboard.press(`${await mod(page)}+ArrowRight`);
    await expect(neck).toHaveAccessibleName(
      'Fretboard of Rhythm Guitar. Playing D3 (string 4, open), A3 (string 3, fret 2).',
    );

    // While playing, the marks follow the music.
    const seen = new Set<string>();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
      .poll(async () => {
        seen.add((await marks(page)).join(' '));
        return seen.size;
      })
      .toBeGreaterThanOrEqual(3);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });

  test('names notes always, on hover or never; mirrors for left-handed players; remembers', async ({
    page,
    isMobile,
  }) => {
    await openHome(page);
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await ready(page);
    const panel = await openFretboard(page);
    const neck = panel.getByRole('img', { name: /^Fretboard of / });
    await expect.poll(() => marks(page)).toContain('current 5:0');
    const names = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('.ot-fret-note[data-kind="current"] text')]
          .map(text => text.textContent)
          .sort(),
      );

    // On hover (the default): no names on the marks; pointing at the neck names the place.
    expect(await names()).toEqual([]);
    const box = await neck.boundingBox();
    if (box === null) throw new Error('No fretboard on screen.');
    const place = await page.evaluate(() => {
      const current = document.querySelector('.ot-fret-note[data-kind="current"][data-string="5"] circle');
      const rect = current?.getBoundingClientRect();
      return rect === undefined ? null : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    if (place === null) throw new Error('No open A on the neck.');
    if (isMobile) await page.touchscreen.tap(place.x, place.y);
    else await page.mouse.move(place.x, place.y);
    await expect(page.locator('[data-pointed]')).toHaveAttribute('data-pointed', 'A2');

    await settings(page, async popover => {
      await popover.getByRole('radio', { name: 'Always' }).click();
    });
    await expect.poll(names).toEqual(['A2', 'E3']);
    await settings(page, async popover => {
      await popover.getByRole('radio', { name: 'Off' }).click();
    });
    await expect.poll(names).toEqual([]);
    if (!isMobile) {
      await page.mouse.move(place.x, place.y + 1);
      await expect(page.locator('[data-pointed]')).toHaveCount(0);
    }

    // Left-handed: the nut on the right, so the open string sits right of the second fret.
    const openX = () =>
      page.evaluate(() => {
        const x = (selector: string) =>
          document
            .querySelector(`.ot-fret-note[data-kind="current"]${selector} circle`)
            ?.getBoundingClientRect().x ?? 0;
        return x('[data-fret="0"]') - x('[data-fret="2"]');
      });
    expect(await openX()).toBeLessThan(0);
    await settings(page, async popover => {
      await popover.getByRole('switch', { name: 'Left-handed' }).click();
    });
    await expect(neck).toHaveAttribute('data-left-handed', 'true');
    expect(await openX()).toBeGreaterThan(0);

    // All of it is remembered.
    await page.reload();
    await page.getByRole('button', { name: 'a blues shuffle' }).click();
    await ready(page);
    await expect(page.getByRole('button', { name: 'Fretboard', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('img', { name: /^Fretboard of / })).toHaveAttribute(
      'data-left-handed',
      'true',
    );
    await expect.poll(names).toEqual([]);
  });

  test('follows the active track: any strings, a capo, tracks without strings', async ({
    page,
    isMobile,
  }) => {
    await openHome(page);
    await dropFiles(page, [fixture('alphatex/views/fretboard.atex')]);
    await ready(page);
    const panel = await openFretboard(page);
    const neck = panel.getByRole('img', { name: /^Fretboard of / });
    const track = panel.getByRole('combobox', { name: 'Track' });
    await expect(neck).toHaveAttribute('data-strings', '7');
    await expect(panel.getByText('Capo 2')).toBeVisible();
    // Open B and the second fret of the E string, both counted from the capo.
    await expect.poll(() => marks(page)).toEqual(['current 6:4', 'current 7:2', 'next 5:2']);
    // In B♭, names are spelled with flats.
    await expect(neck).toHaveAccessibleName(/A♭2 \(string 6, fret 4\)/);
    await expect(neck).toHaveAccessibleName(/D♭2 \(string 7, fret 2\)/);

    if (isMobile) {
      await track.selectOption('1');
    } else {
      await focusScore(page);
      await page.keyboard.press(`${await mod(page)}+ArrowDown`);
    }
    await expect(track).toHaveValue('1');
    await expect(neck).toHaveAttribute('data-strings', '4');
    await expect.poll(() => marks(page)).toEqual(['current 4:0', 'next 3:3']);
    // One track was shown: the score shows the active track instead.
    await page.getByRole('button', { name: /^Tracks:/ }).click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'Bass' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('menuitemcheckbox', { name: 'Seven Strings' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.keyboard.press('Escape');

    if (isMobile) {
      await track.selectOption('2');
    } else {
      await focusScore(page);
      await page.keyboard.press(`${await mod(page)}+ArrowDown`);
    }
    await expect(panel.getByText('Drums has no strings to show on a fretboard.')).toBeVisible();
    await expect(panel.getByRole('img', { name: /^Fretboard of / })).toHaveCount(0);

    if (isMobile) await track.selectOption('1');
    else await page.keyboard.press(`${await mod(page)}+ArrowUp`);
    await expect(neck).toHaveAttribute('data-strings', '4');
    await track.selectOption('0');
    await expect(neck).toHaveAttribute('data-strings', '7');
  });

  test('on a narrow screen the neck scrolls to the notes being played', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones: the neck is wider than the screen.');
    await openHome(page);
    await dropFiles(page, [fixture('alphatex/views/fretboard.atex')]);
    await ready(page);
    await openFretboard(page);
    const scroller = page.locator('.ot-fretboard-scroll');
    expect(await scroller.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await scroller.evaluate(element => element.scrollLeft)).toBe(0);
    // Bar 3 plays at the 19th fret (17 from the capo).
    await page.getByRole('button', { name: /^Go to: / }).click();
    const bar = page.getByLabel('Bar', { exact: true });
    await bar.fill('3');
    await bar.press('Enter');
    await expect.poll(() => marks(page)).toEqual(['current 1:19']);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const view = document.querySelector('.ot-fretboard-scroll')?.getBoundingClientRect();
          const note = document
            .querySelector('.ot-fret-note[data-kind="current"] circle')
            ?.getBoundingClientRect();
          return (
            view !== undefined && note !== undefined && note.left >= view.left && note.right <= view.right
          );
        }),
      )
      .toBe(true);
  });
});
