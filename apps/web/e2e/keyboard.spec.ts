/**
 * The keyboard (VIEW-005, VIEW-019, VIEW-023): the active track's notes on piano keys, now and
 * next, a piano's two hands together or apart, and the keys outside the instrument's range
 * greyed.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, fixture, openHome, test } from './support.ts';

async function openKeyboard(page: Page) {
  await openHome(page);
  await dropFiles(page, [fixture('alphatex/views/keyboard.atex')]);
  await expectScore(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 });
  const toggle = page.getByRole('button', { name: 'Keyboard', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByRole('region', { name: 'Keyboard', exact: true });
  await expect(panel.getByRole('img', { name: /^Keyboard of / })).toBeVisible();
  return panel;
}

/** The keys marked, as "kind pitch hand", sorted. */
function marked(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<SVGGElement>('.ot-key')]
      .filter(key => key.dataset['kind'] !== 'none')
      .map(key => `${key.dataset['kind'] ?? ''} ${key.dataset['pitch'] ?? ''} ${key.dataset['hand'] ?? ''}`)
      .sort(),
  );
}

function playable(page: Page, pitch: number): Promise<string | null> {
  return page.evaluate(
    value => document.querySelector(`.ot-key[data-pitch="${value}"]`)?.getAttribute('data-playable') ?? null,
    pitch,
  );
}

test('shows the keys of both hands, or of one, coloured by hand', async ({ page }) => {
  const panel = await openKeyboard(page);
  const keys = panel.getByRole('img', { name: /^Keyboard of / });
  // The first beat: C major in the right hand over C3 in the left; next, D minor over G2.
  await expect(keys).toHaveAccessibleName('Keyboard of Piano. Playing C5, E5, G5, C3. Next: D5, F5, A5, G2.');
  await expect
    .poll(() => marked(page))
    .toEqual([
      'current 48 left',
      'current 72 right',
      'current 76 right',
      'current 79 right',
      'next 43 left',
      'next 74 right',
      'next 77 right',
      'next 81 right',
    ]);
  await panel.getByRole('radio', { name: 'Right', exact: true }).click();
  await expect
    .poll(() => marked(page))
    .toEqual([
      'current 72 right',
      'current 76 right',
      'current 79 right',
      'next 74 right',
      'next 77 right',
      'next 81 right',
    ]);
  await panel.getByRole('radio', { name: 'Left', exact: true }).click();
  await expect.poll(() => marked(page)).toEqual(['current 48 right', 'next 43 right']);
  // A piano plays every key.
  expect(await playable(page, 21)).toBe('true');
  expect(await playable(page, 108)).toBe('true');
});

test('greys the keys outside the instrument range, and follows the track chosen', async ({ page }) => {
  const panel = await openKeyboard(page);
  await panel.getByRole('combobox', { name: 'Track' }).selectOption('1');
  await expect(panel.getByRole('img', { name: /^Keyboard of Flute/ })).toBeVisible();
  // One staff: no hands to tell apart.
  await expect(panel.getByRole('radio', { name: 'Right', exact: true })).toHaveCount(0);
  // A flute plays from C4 to C7; the keyboard shows a little more on each side, greyed.
  expect(await playable(page, 59)).toBe('false');
  expect(await playable(page, 60)).toBe('true');
  expect(await playable(page, 96)).toBe('true');
  expect(await playable(page, 97)).toBe('false');
  await expect.poll(() => marked(page)).toEqual(['current 60 right', 'next 79 right']);
  // A guitar: from its low E to the 24th fret of its high E.
  await panel.getByRole('combobox', { name: 'Track' }).selectOption('2');
  expect(await playable(page, 39)).toBe('false');
  expect(await playable(page, 40)).toBe('true');
  expect(await playable(page, 88)).toBe('true');
  expect(await playable(page, 89)).toBe('false');
});
