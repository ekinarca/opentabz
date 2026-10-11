/**
 * Note colours (REND-300…REND-303, REND-316): notes coloured by string in standard or colour-blind
 * safe colours or one's own, by degree, and off again; remembered.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, expectScore, openHome, test } from './support.ts';

async function openShuffle(page: Page): Promise<void> {
  await openHome(page);
  await page.getByRole('button', { name: 'a blues shuffle' }).click();
  await expectScore(page);
}

/** The painted score's markup, upper case, for its colours. */
function score(page: Page): Promise<string> {
  return page
    .locator('.ot-scroll:not([hidden]) .ot-partials')
    .evaluate(element => element.innerHTML.toUpperCase());
}

async function panel(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Note colours' }).click();
  return page.getByRole('dialog', { name: 'Note colours' });
}

test('notes coloured by string, in colours of one’s choice, by degree, and off again', async ({ page }) => {
  await openShuffle(page);
  expect(await score(page)).not.toContain('#F9A825');

  let colours = await panel(page);
  await colours
    .getByRole('radiogroup', { name: 'Colour notes by' })
    .getByRole('radio', { name: 'String' })
    .click();
  // The shuffle's riff is on the A and D strings: the second and third colours up.
  await expect.poll(() => score(page)).toContain('#F9A825');
  expect(await score(page)).toContain('#1E88E5');
  await expect(colours.getByRole('list', { name: 'What the colours stand for' })).toContainText(
    'lowest string',
  );

  await colours
    .getByRole('radiogroup', { name: 'Colours' })
    .getByRole('radio', { name: 'Colour-blind safe' })
    .click();
  await expect.poll(() => score(page)).toContain('#E69F00');
  expect(await score(page)).not.toContain('#F9A825');

  await colours.getByRole('radiogroup', { name: 'Colours' }).getByRole('radio', { name: 'Your own' }).click();
  await colours.getByLabel('Colour of the 2nd string up').fill('#123456');
  await expect.poll(() => score(page)).toContain('#123456');

  await colours
    .getByRole('radiogroup', { name: 'Colour notes by' })
    .getByRole('radio', { name: 'Degree' })
    .click();
  await expect.poll(() => score(page)).not.toContain('#123456');
  await expect(colours.getByRole('list', { name: 'What the colours stand for' })).toContainText(
    'Outside the key',
  );
  await page.keyboard.press('Escape');

  // Remembered for the next score.
  await openShuffle(page);
  colours = await panel(page);
  await expect(
    colours.getByRole('radiogroup', { name: 'Colour notes by' }).getByRole('radio', { name: 'Degree' }),
  ).toHaveAttribute('aria-checked', 'true');
  await colours
    .getByRole('radiogroup', { name: 'Colour notes by' })
    .getByRole('radio', { name: 'Off' })
    .click();
  await page.keyboard.press('Escape');
  await expect.poll(() => score(page)).not.toContain('#E53935');
});
