/**
 * Editing a score (EDIT-001, EDIT-002, EDIT-004, EDIT-060, EDIT-064, EDIT-123), as in Guitar Pro:
 * F2 or "Edit the score" puts a caret on the tablature; keys write frets (two digits quickly for
 * 10 to 99), move the caret, change a note's length and take notes away; a click puts the caret on
 * the string clicked, and the edit bar's buttons do the same on touch screens. Every edit can be
 * undone and redone; a score with changes not saved says so, asks before it is closed, and is
 * saved as a Guitar Pro file that opens again with the changes.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

function editBar(page: Page) {
  return page.getByRole('toolbar', { name: 'Editing' });
}

/** Where the caret is, as the edit bar says it. */
function caret(page: Page) {
  return editBar(page).locator('p[aria-live]');
}

/** The primary modifier, as the app reads it (⌘ on Apple platforms, Ctrl elsewhere). */
function primary(page: Page): Promise<'Meta' | 'Control'> {
  return page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac OS X')
      ? 'Meta'
      : 'Control',
  );
}

/** Whether the first system of the score shown writes `text` as a fret (a whole SVG text). */
function firstSystemWrites(page: Page, text: string): Promise<boolean> {
  return page
    .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
    .first()
    .evaluate((element, wanted) => element.innerHTML.includes(`>${wanted}<`), text);
}

function pressed(page: Page, name: string) {
  return editBar(page).getByRole('button', { name, exact: true });
}

test.describe('on a computer', () => {
  test.skip(({ isMobile }) => isMobile, 'Writing with the keys is for computers.');

  test('writes frets with the keys, moves the caret, changes lengths, and undoes and redoes', async ({
    page,
  }) => {
    await openShuffle(page);
    const mod = await primary(page);
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('F2');
    await expect(editBar(page)).toBeVisible();
    await expect(page.locator('.ot-edit-caret')).toBeVisible();
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
    await expect(pressed(page, 'Undo')).toBeDisabled();

    // Two digits typed quickly are one fret.
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 23');
    await expect.poll(() => firstSystemWrites(page, '23')).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Twelve-Bar Shuffle in A, changes not saved' }),
    ).toBeVisible();
    await expect(editBar(page).getByText('Changes not saved')).toBeVisible();

    // To the next beat, down to the open A string, and its note taken away.
    await page.keyboard.press('ArrowRight');
    for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');
    await page.keyboard.press('Delete');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
    // Shorter (+ and = in Guitar Pro), then dotted.
    await expect(pressed(page, 'Eighth note')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('=');
    await expect(pressed(page, 'Sixteenth note')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('.');
    await expect(pressed(page, 'Dotted')).toHaveAttribute('aria-pressed', 'true');

    // Undone one by one, back to the note taken away; done again.
    for (let step = 0; step < 3; step++) await page.keyboard.press(`${mod}+z`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');
    await expect(pressed(page, 'Eighth note')).toHaveAttribute('aria-pressed', 'true');
    await expect(pressed(page, 'Dotted')).toHaveAttribute('aria-pressed', 'false');
    await expect(pressed(page, 'Redo')).toBeEnabled();
    await page.keyboard.press(`${mod}+Shift+z`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
    // Everything undone: nothing left to save.
    for (let step = 0; step < 3; step++) await page.keyboard.press(`${mod}+z`);
    await expect.poll(() => firstSystemWrites(page, '23')).toBe(false);
    await expect(pressed(page, 'Undo')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Twelve-Bar Shuffle in A', exact: true })).toBeVisible();
    await expect(editBar(page).getByText('Changes not saved')).toHaveCount(0);

    // F2 again stops editing; the arrows move the player again.
    await page.keyboard.press('F2');
    await expect(editBar(page)).toBeHidden();
    await expect(page.locator('.ot-edit-caret')).toBeHidden();
  });

  test('→ makes room for the next note, a bar at the end; bars are put in and taken away', async ({
    page,
  }) => {
    await openHome(page);
    const mod = await primary(page);
    await page.getByRole('button', { name: 'New score', exact: true }).click();
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
    await page.keyboard.press('3');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 3');
    // A quarter note written: → puts a quarter rest after it, for the next note.
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
    await page.keyboard.press('5');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
    // Two more rests fill the bar; then on to the next.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 2, string 1, nothing written');
    // To the last of the sixteen bars, and past it: a seventeenth.
    for (let bar = 2; bar < 16; bar++) await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 16, string 1, nothing written');
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 17, string 1, nothing written');
    // A bar put in before the caret's, and taken away again.
    await editBar(page).getByRole('button', { name: 'Insert a bar' }).click();
    await expect(caret(page)).toHaveText('Caret: bar 17, string 1, nothing written');
    await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 18, string 1, nothing written');
    // Guitar Pro's keys: Ctrl Del, ⌃ − on a Mac.
    await page.keyboard.press(mod === 'Meta' ? 'Control+Minus' : 'Control+Delete');
    await expect(caret(page)).toHaveText('Caret: bar 17, string 1, nothing written');
    await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 17, string 1, nothing written');
    // Undone back to the second note: the caret where it was each time.
    for (let step = 0; step < 5; step++) await page.keyboard.press(`${mod}+z`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
  });

  test('saves a Guitar Pro file that opens with the changes, and asks before closing changes not saved', async ({
    page,
  }) => {
    await openShuffle(page);
    const mod = await primary(page);
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('F2');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 23');

    const downloading = page.waitForEvent('download');
    await page.keyboard.press(`${mod}+s`);
    const file = await downloading;
    expect(file.suggestedFilename()).toBe('twelve-bar-shuffle.gp');
    await expect(page.getByText('Saved as twelve-bar-shuffle.gp', { exact: true })).toBeVisible();
    await expect(editBar(page).getByText('Changes not saved')).toHaveCount(0);

    // The file saved opens with the fret written.
    const saved = test.info().outputPath('twelve-bar-shuffle.gp');
    await file.saveAs(saved);
    await dropFiles(page, [saved]);
    await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(
      2,
    );
    await expectScore(page);
    await expect.poll(() => firstSystemWrites(page, '23')).toBe(true);

    // Back on the score edited: a change not saved, and closing it asks first.
    await page.getByRole('button', { name: 'Twelve-Bar Shuffle in A', exact: true }).first().click();
    await expect(editBar(page)).toBeVisible();
    await page
      .getByRole('region', { name: /^Score: / })
      .first()
      .focus();
    await page.keyboard.press('5');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
    const close = page.getByRole('button', { name: 'Close Twelve-Bar Shuffle in A' }).first();
    await close.click();
    const ask = page.getByRole('dialog', { name: 'Save the changes to Twelve-Bar Shuffle in A?' });
    await expect(ask).toBeVisible();
    await expect(ask).toContainText('twelve-bar-shuffle.gp');
    await ask.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(ask).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(
      2,
    );
    await close.click();
    await ask.getByRole('button', { name: 'Close without saving' }).click();
    await expect(page.getByRole('navigation', { name: 'Open documents' }).getByRole('listitem')).toHaveCount(
      1,
    );
  });
});

test('a click puts the caret on a string; the edit bar writes frets and lengths, on any screen', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(editBar(page)).toBeVisible();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  // The tablature in sight, the caret on its top line: four lines down is the open A string.
  await page.locator('.ot-scroll:not([hidden])').evaluate(element => {
    element.scrollBy(0, 120);
  });
  const box = await page.locator('.ot-edit-caret').boundingBox();
  if (box === null) throw new Error('No caret on screen.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2 + 4 * box.height;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');

  await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
  await page.getByRole('button', { name: 'Fret 5', exact: true }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 5');
  await page.keyboard.press('Escape');
  await pressed(page, 'Quarter note').click();
  await expect(pressed(page, 'Quarter note')).toHaveAttribute('aria-pressed', 'true');
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(pressed(page, 'Eighth note')).toHaveAttribute('aria-pressed', 'true');

  // A track without strings has nothing to write frets on.
  await editBar(page).getByRole('combobox', { name: 'Track' }).selectOption({ label: '4. Drums' });
  await expect(caret(page)).toHaveText(/no strings to write frets on/);
  await editBar(page).getByRole('combobox', { name: 'Track' }).selectOption({ label: '1. Rhythm Guitar' });
  await expect(caret(page)).toHaveText(/^Caret: bar \d+, string 1/);

  await editBar(page).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(editBar(page)).toBeHidden();
});

test('a new score opens blank and edited: the first note is written in seconds', async ({
  page,
  isMobile,
}) => {
  await openHome(page);
  const started = Date.now();
  await page.getByRole('button', { name: 'New score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Untitled', exact: true })).toBeVisible();
  await expect(editBar(page)).toBeVisible();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  if (isMobile) {
    await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
    await page.getByRole('button', { name: 'Fret 3', exact: true }).click();
  } else {
    await page.keyboard.press('3');
  }
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 3');
  // Blank page to first note in under five seconds (UX-002).
  expect(Date.now() - started).toBeLessThan(5000);
  await expect.poll(() => firstSystemWrites(page, '3')).toBe(true);
  await expect(page.getByRole('button', { name: 'Untitled, changes not saved' })).toBeVisible();
  // A second new score is numbered; neither is kept among the recent scores.
  if (isMobile) await page.locator('header').getByRole('button', { name: 'OpenTabz home' }).click();
  else await page.locator('header').getByRole('button', { name: 'New score' }).click();
  if (isMobile) await page.getByRole('button', { name: 'New score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Untitled 2', exact: true })).toBeVisible();
  await page.locator('header').getByRole('button', { name: 'OpenTabz home' }).click();
  await expect(page.getByRole('heading', { name: 'Recent scores' })).toHaveCount(0);
});

/** The edit bar's Techniques menu, opened. */
async function techniques(page: Page) {
  await editBar(page).getByRole('button', { name: 'Techniques' }).click();
  return page.getByRole('menu');
}

test('Guitar Pro’s keys and the Techniques menu turn a note’s and a beat’s techniques on and off', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  // Down to the open A string, which has a note.
  if (isMobile) {
    await page.locator('.ot-scroll:not([hidden])').evaluate(element => {
      element.scrollBy(0, 120);
    });
    const box = await page.locator('.ot-edit-caret').boundingBox();
    if (box === null) throw new Error('No caret on screen.');
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 4 * box.height);
  } else {
    await page.getByRole('region', { name: /^Score: / }).focus();
    for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
  }
  await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');
  const before = await page
    .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
    .first()
    .evaluate(element => element.innerHTML);

  if (!isMobile) {
    await page.keyboard.press('x');
    await page.keyboard.press('/');
  }
  let menu = await techniques(page);
  if (isMobile) {
    await menu.getByRole('menuitemcheckbox', { name: 'Dead note' }).click();
    await menu.getByRole('menuitemcheckbox', { name: 'Triplet' }).click();
  }
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Dead note' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Triplet' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Let ring' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await menu.getByRole('menuitemcheckbox', { name: 'Let ring' }).click();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Let ring' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  // The score is drawn anew with them.
  await expect
    .poll(() =>
      page
        .locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"]')
        .first()
        .evaluate(element => element.innerHTML),
    )
    .not.toBe(before);

  // Undone one by one: let ring, then the triplet.
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  menu = await techniques(page);
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Let ring' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Triplet' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Dead note' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // A rest: the beat's notes taken away.
  await menu.getByRole('menuitem', { name: 'Rest' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
});
