/**
 * Editing a score (EDIT-001, EDIT-002, EDIT-004, EDIT-060, EDIT-064, EDIT-123), as in Guitar Pro:
 * F2 or "Edit the score" puts a caret on the tablature; keys write frets (two digits quickly for
 * 10 to 99), move the caret, change a note's length and take notes away; a click puts the caret on
 * the string clicked, and the edit bar's buttons do the same on touch screens. Every edit can be
 * undone and redone; a score with changes not saved says so, asks before it is closed, and is
 * saved as a Guitar Pro file that opens again with the changes.
 */
import type { Page } from '@playwright/test';
import { dropFiles, expect, expectScore, openHome, test, viewTool } from './support.ts';

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

/**
 * Runs one of the edit bar's tools: its button, or on a narrow screen its item in the "More editing
 * tools" menu.
 */
async function editTool(page: Page, name: string): Promise<void> {
  const button = editBar(page).getByRole('button', { name, exact: true });
  if (await button.isVisible()) {
    await button.click();
    return;
  }
  await editBar(page).getByRole('button', { name: 'More editing tools' }).click();
  await page.getByRole('menu').getByRole('menuitem', { name, exact: true }).click();
}

/** Gives the caret's note a length: its button, or on a narrow screen the Note length menu's item. */
async function noteLength(page: Page, name: string): Promise<void> {
  const button = editBar(page).getByRole('button', { name, exact: true });
  if (await button.isVisible()) {
    await button.click();
    return;
  }
  await editBar(page).getByRole('button', { name: 'Note length' }).click();
  await page.getByRole('menu').getByRole('menuitemradio', { name }).click();
}

/** Whether the caret's note has a length: its button pressed, or its Note length item checked. */
async function hasLength(page: Page, name: string): Promise<boolean> {
  const button = editBar(page).getByRole('button', { name, exact: true });
  if (await button.isVisible()) return (await button.getAttribute('aria-pressed')) === 'true';
  await editBar(page).getByRole('button', { name: 'Note length' }).click();
  const item = page.getByRole('menu').getByRole('menuitemradio', { name });
  const checked = (await item.getAttribute('aria-checked')) === 'true';
  await page.keyboard.press('Escape');
  return checked;
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

  test('Shift and the arrows select; Delete clears, ⌘/Ctrl C and V copy and paste, Esc lets go', async ({
    page,
  }) => {
    await openShuffle(page);
    const mod = await primary(page);
    const score = page.getByRole('region', { name: /^Score: / });
    await score.focus();
    await page.keyboard.press('F2');
    for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');
    const shades = page.locator('.ot-edit-selection:not([hidden])');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(shades).toHaveCount(1);
    await page.keyboard.press(`${mod}+c`);
    // Delete takes the selection's notes away, leaving rests.
    await page.keyboard.press('Delete');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
    await expect(shades).toHaveCount(0);
    await page.keyboard.press('ArrowLeft');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
    // Pasted where the D7 bar has nothing on the A string.
    for (let step = 0; step < 4; step++) await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, nothing written');
    await page.keyboard.press(`${mod}+v`);
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, fret 0');
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, fret 0');
    await page.keyboard.press('ArrowRight');
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, nothing written');
    // Shift ↓ reaches the next track, whole bars; Esc lets go and leaves editing on.
    await page.keyboard.press('Shift+ArrowDown');
    await expect(shades).not.toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(shades).toHaveCount(0);
    await expect(editBar(page)).toBeVisible();
  });

  test('C repeats the beat before; ⌘/Ctrl Shift C copies whole bars of every track', async ({ page }) => {
    await openShuffle(page);
    const mod = await primary(page);
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('F2');
    for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
    // The second beat's note on the A string taken away, then the first beat repeated over it.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Delete');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, nothing written');
    await page.keyboard.press('c');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 5, fret 0');
    // Bar 1 of every track over bar 5's: the A string sounds where the D7 had nothing on it.
    await page.keyboard.press(`${mod}+Shift+c`);
    for (let step = 0; step < 4; step++) await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, nothing written');
    await page.keyboard.press(`${mod}+v`);
    await expect(caret(page)).toHaveText('Caret: bar 5, string 5, fret 0');
  });

  test('the bar dialog starts a new system at the caret’s bar (EDIT-109)', async ({ page }) => {
    await openShuffle(page);
    const mod = await primary(page);
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('F2');
    await page.keyboard.press(`${mod}+ArrowRight`);
    await expect(caret(page)).toHaveText('Caret: bar 2, string 1, nothing written');
    const starts = page.locator(
      '.ot-scroll:not([hidden]) .ot-partial[data-kind="system"][data-first-bar="1"]',
    );
    await expect(starts).toHaveCount(0);
    await editTool(page, 'Bar properties');
    const dialog = page.getByRole('dialog', { name: 'Bar 2' });
    await dialog.getByRole('switch', { name: 'A new system starts here' }).click();
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(starts).toHaveCount(1);
    await page.keyboard.press(`${mod}+z`);
    await expect(starts).toHaveCount(0);
  });

  test('a fret written is heard when asked (EDIT-096)', async ({ page }) => {
    // The engine's requests to play beats, counted.
    await page.addInitScript(() => {
      const heard: unknown[] = [];
      Object.assign(window, { heard });
      const Original = window.Worker;
      window.Worker = class extends Original {
        public override postMessage(message: unknown, transfer?: unknown): void {
          const request = message as { method?: string; args?: { beatIds?: unknown } };
          if (request.method === 'previewBeats') heard.push(request.args?.beatIds);
          super.postMessage(message, transfer as Transferable[]);
        }
      };
    });
    const heard = () => page.evaluate(() => (window as unknown as { heard: unknown[] }).heard.length);
    await openShuffle(page);
    const score = page.getByRole('region', { name: /^Score: / });
    await score.focus();
    await page.keyboard.press('F2');
    await page.keyboard.press('5');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
    await page.waitForTimeout(300);
    expect(await heard()).toBe(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('switch', { name: 'Hear the notes written' }).click();
    await page.keyboard.press('Escape');
    await expect(settings).toBeHidden();
    await score.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('7');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 7');
    await expect.poll(heard).toBe(1);
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
    await editTool(page, 'Insert a bar');
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
  // The whole edit bar fits the screen, a phone's too.
  await expect(editBar(page).getByRole('button', { name: 'Done', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await editBar(page).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
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
  await noteLength(page, 'Quarter note');
  await expect.poll(() => hasLength(page, 'Quarter note')).toBe(true);
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => hasLength(page, 'Eighth note')).toBe(true);
  // On a phone, redo is in the "More editing tools" menu.
  await editTool(page, 'Redo');
  await expect.poll(() => hasLength(page, 'Quarter note')).toBe(true);

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

test('the bar dialog sets a bar’s meter, key, tempo, repeats and section, as one edit', async ({ page }) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  await editTool(page, 'Bar properties');
  const dialog = page.getByRole('dialog', { name: 'Bar 1' });
  await expect(dialog.getByLabel('Beats')).toHaveValue('4');
  await expect(dialog.getByLabel('Key signature', { exact: true })).toHaveValue('3');
  await expect(dialog.getByLabel('Quarter notes a minute')).toHaveValue('112');
  await dialog.getByLabel('Beats').selectOption('3');
  await dialog.getByLabel('Quarter notes a minute').fill('96');
  await dialog.getByRole('switch', { name: 'A repeat starts here' }).click();
  // The shuffle's first bar starts its "Twelve bars" section.
  await expect(dialog.getByRole('switch', { name: 'A section starts here' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(dialog.getByLabel('Name')).toHaveValue('Twelve bars');
  await dialog.getByLabel('Name').fill('Intro');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => firstSystemWrites(page, 'Intro')).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Twelve-Bar Shuffle in A, changes not saved' }),
  ).toBeVisible();

  // Read back as set; one undo takes it all away.
  await editTool(page, 'Bar properties');
  await expect(dialog.getByLabel('Beats')).toHaveValue('3');
  await expect(dialog.getByLabel('Quarter notes a minute')).toHaveValue('96');
  await expect(dialog.getByRole('switch', { name: 'A repeat starts here' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).first().click();
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => firstSystemWrites(page, 'Intro')).toBe(false);
  await editTool(page, 'Bar properties');
  await expect(dialog.getByLabel('Beats')).toHaveValue('4');
  await expect(dialog.getByLabel('Quarter notes a minute')).toHaveValue('112');
});

test('changes not saved are offered back after a reload, and forgotten once closed', async ({
  page,
  isMobile,
}) => {
  // Leaving a page with changes not saved asks first: the test leaves.
  page.on('dialog', dialog => {
    void dialog.accept();
  });
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  if (isMobile) {
    await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
    await page.getByRole('button', { name: 'Fret 23', exact: true }).click();
    await page.keyboard.press('Escape');
  } else {
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('2');
    await page.keyboard.press('3');
  }
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 23');
  // The draft is written a moment after the last edit.
  await page.waitForTimeout(800);
  await page.reload();
  const offer = page.getByRole('dialog', { name: 'Recover the changes not saved?' });
  await expect(offer).toBeVisible();
  await offer.getByRole('button', { name: 'Recover Twelve-Bar Shuffle in A' }).click();
  await expect(offer).toBeHidden();
  await expectScore(page);
  await expect(
    page.getByRole('button', { name: 'Twelve-Bar Shuffle in A, changes not saved' }),
  ).toBeVisible();
  await expect(editBar(page)).toBeVisible();
  await expect(editBar(page).getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await expect.poll(() => firstSystemWrites(page, '23')).toBe(true);

  // Closed without saving: not offered again.
  await page.getByRole('button', { name: 'Close Twelve-Bar Shuffle in A' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close without saving' }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(offer).toHaveCount(0);
});

test('tracks are added from an instrument, set, moved and deleted, each an edit to undo', async ({
  page,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  const track = editBar(page).getByRole('combobox', { name: 'Track' });
  await expect(track.locator('option')).toHaveCount(4);

  await editTool(page, 'Add a track');
  const add = page.getByRole('dialog', { name: 'Add a track' });
  await add.getByLabel('Instrument').selectOption({ label: '5-string Bass' });
  await expect(add.getByLabel('Name', { exact: true })).toHaveValue('5-string Bass');
  await expect(add.getByLabel('Strings')).toHaveValue('5');
  await add.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(add).toBeHidden();
  // Shown, active, the caret on it, ready to write.
  await expect(track.locator('option')).toHaveCount(5);
  await expect(track).toHaveValue('4');
  await expect(caret(page)).toHaveText(/^Caret: bar \d+, string 1, nothing written$/);

  await editTool(page, 'Track properties');
  const set = page.getByRole('dialog', { name: 'Track: 5-string Bass' });
  await set.getByLabel('Name', { exact: true }).fill('Low end');
  await set.getByLabel('Capo on fret').selectOption('2');
  await set.getByRole('button', { name: 'Apply' }).click();
  await expect(track.locator('option').nth(4)).toHaveText('5. Low end');

  await editTool(page, 'Track properties');
  await page.getByRole('dialog', { name: 'Track: Low end' }).getByRole('button', { name: 'Move up' }).click();
  await expect(track.locator('option').nth(3)).toHaveText('4. Low end');
  await expect(track).toHaveValue('3');

  await editTool(page, 'Track properties');
  await page
    .getByRole('dialog', { name: 'Track: Low end' })
    .getByRole('button', { name: 'Delete the track' })
    .click();
  await expect(track.locator('option')).toHaveCount(4);
  // Undone: back, moved back, named as added, gone.
  const undo = editBar(page).getByRole('button', { name: 'Undo', exact: true });
  await undo.click();
  await expect(track.locator('option')).toHaveCount(5);
  await undo.click();
  await expect(track.locator('option').nth(4)).toHaveText('5. Low end');
  await undo.click();
  await expect(track.locator('option').nth(4)).toHaveText('5. 5-string Bass');
  await undo.click();
  await expect(track.locator('option')).toHaveCount(4);
});

test('what is selected is copied and pasted at the caret, and a track duplicated (EDIT-020, EDIT-030)', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  // A fret of its own on the first beat, to know the bar by.
  await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
  await page.getByRole('button', { name: 'Fret 12', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 12');

  // The bar selected: with Shift and the keys, or on a phone from the menu.
  if (isMobile) await editTool(page, 'Select the bar');
  else {
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('Shift+End');
  }
  await expect(page.locator('.ot-edit-selection:not([hidden])')).toHaveCount(1);
  await editTool(page, 'Copy');

  // Pasted in a bar put in before it: the copy's first beat has the fret.
  await editTool(page, 'Insert a bar');
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  await expect(page.locator('.ot-edit-selection:not([hidden])')).toHaveCount(0);
  await editTool(page, 'Paste');
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 12');
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');

  // A track duplicated is put in after it, as it is.
  const track = editBar(page).getByRole('combobox', { name: 'Track' });
  await expect(track.locator('option')).toHaveCount(4);
  await editTool(page, 'Track properties');
  await page
    .getByRole('dialog', { name: 'Track: Rhythm Guitar' })
    .getByRole('button', { name: 'Duplicate' })
    .click();
  await expect(track.locator('option')).toHaveCount(5);
  await expect(track.locator('option').nth(1)).toHaveText('2. Rhythm Guitar');
});

test('notes are transposed by semitones and octaves, and moved from string to string at their pitch (EDIT-050 … EDIT-052)', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
  await page.getByRole('button', { name: 'Fret 3', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 3');

  // Nothing selected: the caret's beat, a tone up.
  await editTool(page, 'Transpose…');
  const dialog = page.getByRole('dialog', { name: 'Transpose' });
  await expect(dialog.getByLabel('Semitones')).toHaveValue('2');
  await dialog.getByRole('button', { name: 'Transpose', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
  await editTool(page, 'Transpose…');
  await dialog.getByRole('button', { name: 'Octave up' }).click();
  await expect(dialog.getByLabel('Semitones')).toHaveValue('12');
  await dialog.getByRole('button', { name: 'Transpose', exact: true }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 17');

  if (!isMobile) {
    // Guitar Pro's Ctrl Alt ↓ and ↑: a string down at its pitch, the caret with it, and back.
    const mod = await primary(page);
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press(`${mod}+Alt+ArrowDown`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 2, fret 22');
    await page.keyboard.press(`${mod}+Alt+ArrowUp`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 17');
  }
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  if (!isMobile) await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  if (!isMobile) await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');

  // A third below the caret's A, in A major: F♯, on the B string's 7th fret.
  await expect.poll(() => firstSystemWrites(page, '7')).toBe(false);
  await editBar(page).getByRole('button', { name: 'More editing tools' }).click();
  await page.getByRole('menuitem', { name: 'Harmonize…' }).click();
  const harmonize = page.getByRole('dialog', { name: 'Harmonize' });
  await harmonize.getByRole('radio', { name: 'Below' }).click();
  await harmonize.getByRole('button', { name: 'Harmonize', exact: true }).click();
  await expect(harmonize).toBeHidden();
  await expect.poll(() => firstSystemWrites(page, '7')).toBe(true);
});

test('dynamics, beams, fingering, spelling and text for a note and its beat, directions from the bar dialog (EDIT-012, EDIT-013, EDIT-025, EDIT-043)', async ({
  page,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
  await page.getByRole('button', { name: 'Fret 5', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
  const marks = page.getByRole('dialog', { name: 'Note and beat' });
  const open = async () => {
    await editBar(page).getByRole('button', { name: 'Techniques' }).click();
    await page
      .getByRole('menuitem', { name: 'Dynamics, tuplet, stems, beam, fingering, spelling, text…' })
      .click();
    await expect(marks).toBeVisible();
  };
  await open();
  await marks.getByLabel('Dynamics').selectOption({ label: 'pp, very soft' });
  await marks.getByLabel('Tuplet').selectOption({ label: '5 in the time of 4' });
  await marks.getByLabel('Stems').selectOption({ label: 'Down' });
  await marks.getByRole('radio', { name: 'Broken' }).click();
  await marks.getByLabel('Fretting hand').selectOption({ label: '3, ring' });
  await marks.getByLabel('Picking hand').selectOption({ label: 'i, index' });
  await marks.getByLabel('Spelling').selectOption({ label: 'With a flat' });
  await marks.getByLabel('Text above the beat').fill('a tempo');
  await marks.getByRole('button', { name: 'Apply' }).click();
  await expect(marks).toBeHidden();
  await expect.poll(() => firstSystemWrites(page, 'a tempo')).toBe(true);
  // Read back as set, as one edit.
  await open();
  await expect(marks.getByLabel('Dynamics')).toHaveValue('pp');
  await expect(marks.getByLabel('Tuplet')).toHaveValue('5:4');
  await expect(marks.getByLabel('Stems')).toHaveValue('down');
  await expect(marks.getByRole('radio', { name: 'Broken' })).toHaveAttribute('aria-checked', 'true');
  await expect(marks.getByLabel('Fretting hand')).toHaveValue('ring');
  await expect(marks.getByLabel('Picking hand')).toHaveValue('index');
  await expect(marks.getByLabel('Spelling')).toHaveValue('flat');
  await expect(marks.getByLabel('Text above the beat')).toHaveValue('a tempo');
  await marks.getByRole('button', { name: 'Cancel', exact: true }).first().click();
  await editBar(page).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => firstSystemWrites(page, 'a tempo')).toBe(false);

  // A Segno at the bar, and a D.S. al Fine at its end.
  await editTool(page, 'Bar properties');
  const bar = page.getByRole('dialog', { name: 'Bar 1' });
  await bar.getByRole('checkbox', { name: 'Segno', exact: true }).check();
  await bar.getByLabel('Jump', { exact: true }).selectOption({ label: 'D.S. al Fine' });
  await bar.getByRole('button', { name: 'Apply' }).click();
  await expect(bar).toBeHidden();
  await expect.poll(() => firstSystemWrites(page, 'D.S. al Fine')).toBe(true);
  await editTool(page, 'Bar properties');
  await expect(bar.getByRole('checkbox', { name: 'Segno', exact: true })).toBeChecked();
  await expect(bar.getByLabel('Jump', { exact: true })).toHaveValue('dal-segno-al-fine');
});

test('the caret writes in voices 2 to 4, put in the staff as needed (EDIT-011)', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  // From the Voice menu, or on a phone the "More editing tools" menu.
  await editBar(page)
    .getByRole('button', { name: isMobile ? 'More editing tools' : 'Voice 1' })
    .click();
  await page.getByRole('menuitemradio', { name: 'Voice 2' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, voice 2, string 1, nothing written');
  await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
  await page.getByRole('button', { name: 'Fret 7', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(caret(page)).toHaveText('Caret: bar 1, voice 2, string 1, fret 7');
  // The first voice is as it was; undone, the voice put in goes too, the caret back in the first.
  if (!isMobile) {
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press(`${await primary(page)}+1`);
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  }
  const undo = editBar(page).getByRole('button', { name: 'Undo', exact: true });
  await undo.click();
  await undo.click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  await expect(undo).toBeDisabled();
});

test('a new tuning keeps the notes’ pitches, and a voice’s notes move to another (EDIT-054, EDIT-102)', async ({
  page,
  isMobile,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  // A note of one's own: on the low E string's 3rd fret, or on a phone the high E string's.
  if (isMobile) {
    await editBar(page).getByRole('button', { name: 'Write a fret' }).click();
    await page.getByRole('button', { name: 'Fret 3', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 3');
  } else {
    await page.getByRole('region', { name: /^Score: / }).focus();
    for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('3');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 6, fret 3');
  }
  // Drop D: the note keeps its pitch (the high E string's is as it was).
  await editTool(page, 'Track properties');
  const track = page.getByRole('dialog', { name: 'Track: Rhythm Guitar' });
  await track.getByLabel('Tuning', { exact: true }).selectOption({ label: 'Drop D (D A D G B E)' });
  await expect(track.getByRole('switch', { name: 'Keep the notes’ pitches' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await track.getByRole('button', { name: 'Apply' }).click();
  await expect(track).toBeHidden();
  await expect(caret(page)).toHaveText(
    isMobile ? 'Caret: bar 1, string 1, fret 3' : 'Caret: bar 1, string 6, fret 5',
  );

  // The first voice's notes of the bar to the second: the caret goes with them.
  await editBar(page).getByRole('button', { name: 'More editing tools' }).click();
  await page.getByRole('menuitem', { name: 'Move, copy or swap voices…' }).click();
  const voices = page.getByRole('dialog', { name: 'Voices' });
  await expect(voices.getByLabel('To')).toHaveValue('1');
  await voices.getByRole('button', { name: 'Apply' }).click();
  await expect(voices).toBeHidden();
  await expect(caret(page)).toHaveText(
    isMobile ? 'Caret: bar 1, voice 2, string 1, fret 3' : 'Caret: bar 1, voice 2, string 6, fret 5',
  );
  if (!isMobile) {
    // Back with Alt 1, as in Guitar Pro.
    await page.getByRole('region', { name: /^Score: / }).focus();
    await page.keyboard.press('Alt+1');
    await expect(caret(page)).toHaveText('Caret: bar 1, string 6, fret 5');
  }
});

test('a note clicked on the fretboard is written at the caret, and taken away clicked again (EDIT-097)', async ({
  page,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  await viewTool(page, 'Fretboard');
  const neck = page.getByRole('region', { name: 'Fretboard' }).getByRole('img', { name: /^Fretboard of / });
  await expect(neck).toBeVisible();
  // The high E string, the top one (16 px down), a little way up the neck.
  const box = await neck.boundingBox();
  if (box === null) throw new Error('No fretboard.');
  const point = { x: Math.min(box.width * 0.3, 260), y: 16 };
  await neck.click({ position: point });
  await expect(caret(page)).toHaveText(/^Caret: bar 1, string 1, fret \d+$/);
  await neck.click({ position: point });
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
});

test('a key clicked on the keyboard view is written at the caret, on a string that plays it (EDIT-097)', async ({
  page,
}) => {
  await openShuffle(page);
  await page.getByRole('button', { name: 'Edit the score' }).click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
  await viewTool(page, 'Keyboard');
  // A4: the high E string's 5th fret.
  const key = page.getByRole('region', { name: 'Keyboard', exact: true }).locator('[data-pitch="69"]');
  await key.click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, fret 5');
  await key.click();
  await expect(caret(page)).toHaveText('Caret: bar 1, string 1, nothing written');
});
