/**
 * The command palette (UX-014, UX-032, UX-033, UX-038, UX-043), as Guitar Pro 8's: ⌘/Ctrl K or E
 * opens it; a command is found by its name, an alias or its initials and runs with Enter; past
 * commands come first; "?" lists every command, those that cannot run now with why; "$" goes to
 * a section and ":" to a bar; a value after a name sets the zoom, the speed or the transposition.
 * On a phone it opens from the top bar's menu.
 */
import type { Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** ⌘ on Apple platforms, Ctrl elsewhere, as the app decides. */
function mod(page: Page): Promise<string> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac OS X')
      ? 'Meta'
      : 'Control',
  );
}

function palette(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  return {
    dialog,
    field: dialog.getByRole('combobox', { name: 'Command' }),
    options: dialog.getByRole('option'),
  };
}

/** Runs what is typed: the first option. */
async function run(page: Page, typed: string): Promise<void> {
  const { field, options } = palette(page);
  await field.fill(typed);
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await field.press('Enter');
}

test('finds and runs commands, past ones first, with values and jumps', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard shortcuts open it on a computer; phones use the menu (below).');
  await openShuffle(page);
  await page.getByRole('region', { name: /^Score: / }).focus();
  const key = await mod(page);
  const { dialog, field, options } = palette(page);

  await page.keyboard.press(`${key}+k`);
  await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();
  // By the start of a word, with its keys.
  await field.fill('fret');
  await expect(options.first()).toContainText('Fretboard on or off');
  await field.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('region', { name: /^Fretboard/ })).toBeVisible();

  // ⌘/Ctrl E, as in Guitar Pro: the command just run comes first.
  await page.keyboard.press(`${key}+e`);
  await expect(dialog.getByRole('group', { name: 'Recent' }).getByRole('option').first()).toContainText(
    'Fretboard on or off',
  );
  // An alias: the export dialog for "pdf".
  await run(page, 'pdf');
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible();
  await page.keyboard.press('Escape');

  // Values: zoom, speed.
  await page.keyboard.press(`${key}+k`);
  await field.fill('zoom 150');
  await expect(options.first()).toHaveText('Zoom to 150 %');
  await field.press('Enter');
  await expect(page.getByRole('button', { name: 'Zoom level' })).toHaveText('150 %');
  await page.keyboard.press(`${key}+k`);
  await run(page, 'speed 80');
  await expect(page.getByRole('button', { name: /^Playback speed: / })).toHaveText('80 %');

  // A bar, then a section.
  const position = page.getByRole('button', { name: /^Go to: / });
  await page.keyboard.press(`${key}+k`);
  await run(page, ':5');
  await expect(position).toHaveAccessibleName(/^Go to: Bar 5, beat 1,/);
  await page.keyboard.press(`${key}+k`);
  await field.fill('$');
  await expect(options).toHaveText(['Go to Twelve bars', 'Go to Turnaround', 'Go to Ending']);
  await field.fill('$turn');
  await field.press('Enter');
  await expect(position).not.toHaveAccessibleName(/^Go to: Bar 5,/);
  await expect(position).toHaveAccessibleName(/^Go to: Bar \d+, beat 1,/);

  // Every command after "?", alphabetically; one that cannot run now says why.
  await page.keyboard.press(`${key}+k`);
  await field.fill('?');
  const labels = await options.evaluateAll(elements =>
    elements.map(element => element.querySelector('span')?.textContent ?? ''),
  );
  expect(labels.length).toBeGreaterThan(60);
  expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  const unfocus = options.filter({ hasText: /^Unfocus/ });
  await expect(unfocus).toHaveAttribute('aria-disabled', 'true');
  await expect(unfocus).toContainText('Not now: no track is focused');
  // Arrow keys choose; Escape closes.
  await field.fill('zoom');
  await field.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await field.press('Escape');
  await expect(dialog).toBeHidden();
});

test('opens from the top bar on a phone, and runs a tapped command', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'On a computer the top bar has a button of its own.');
  await openShuffle(page);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Commands' }).click();
  const { dialog, field, options } = palette(page);
  await expect(dialog).toBeVisible();
  await field.fill('zoom 50');
  await options.first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Zoom level' })).toHaveText('50 %');
});
