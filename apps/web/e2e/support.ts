import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

export const FIXTURES = join(import.meta.dirname, '..', '..', '..', 'fixtures');

export function fixture(path: string): string {
  return join(FIXTURES, path);
}

interface ConsoleProblem {
  readonly type: string;
  readonly text: string;
}

/**
 * Every test fails on a console error or warning, or an uncaught exception, in the page or its
 * workers (budget: zero console messages of either kind in production).
 */
export const test = base.extend<{ consoleProblems: ConsoleProblem[]; silence: undefined }>({
  /**
   * Tests run on developers' machines: everything an AudioContext plays goes through a gain of
   * zero. The whole audio path still runs (worker, ring, worklet); nothing reaches the speakers.
   */
  silence: [
    async ({ context }, use) => {
      await context.addInitScript(() => {
        class SilentAudioContext extends AudioContext {
          private readonly silent: GainNode;
          public constructor(options?: AudioContextOptions) {
            super(options);
            this.silent = this.createGain();
            this.silent.gain.value = 0;
            this.silent.connect(super.destination);
          }
          public override get destination(): AudioDestinationNode {
            return this.silent as unknown as AudioDestinationNode;
          }
        }
        window.AudioContext = SilentAudioContext;
      });
      await use(undefined);
    },
    { auto: true },
  ],
  consoleProblems: [
    async ({ page }, use) => {
      const problems: ConsoleProblem[] = [];
      page.on('console', message => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push({ type: message.type(), text: message.text() });
        }
      });
      page.on('pageerror', error => problems.push({ type: 'pageerror', text: String(error) }));
      page.on('worker', worker => {
        worker.on('console', message => {
          if (message.type() === 'error' || message.type() === 'warning') {
            problems.push({ type: `worker ${message.type()}`, text: message.text() });
          }
        });
      });
      await use(problems);
      expect(problems, 'console errors and warnings').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Opens the home page and waits until it is interactive. */
export async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Opens files through the system file picker, as a user would. */
export async function openFiles(page: Page, paths: readonly string[]): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: /^Open (a )?file/ })
    .first()
    .click();
  await (await chooser).setFiles([...paths]);
}

/** Drops files onto the window (the drag-and-drop path). */
export async function dropFiles(page: Page, paths: readonly string[]): Promise<void> {
  const files = paths.map(path => ({ name: basename(path), base64: readFileSync(path).toString('base64') }));
  await page.evaluate(entries => {
    const transfer = new DataTransfer();
    for (const entry of entries) {
      const binary = atob(entry.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      transfer.items.add(new File([bytes], entry.name));
    }
    for (const type of ['dragenter', 'dragover', 'drop']) {
      window.dispatchEvent(new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }
  }, files);
}

/** Waits until the active document shows painted notation. */
export async function expectScore(page: Page): Promise<void> {
  await expect(
    page.locator('.ot-scroll:not([hidden]) .ot-partial[data-kind="system"] svg').first(),
  ).toBeVisible();
}

/** The latest performance measure with this name, in milliseconds (waits until it exists). */
export async function measure(page: Page, name: string): Promise<number> {
  const handle = await page.waitForFunction(
    measureName => performance.getEntriesByName(measureName, 'measure').at(-1)?.duration ?? null,
    name,
  );
  const value = await handle.jsonValue();
  if (value === null) throw new Error(`No ${name} measure.`);
  return value;
}

/** The playback bar's text: elapsed / total time and the bar status line. */
export async function transportText(page: Page): Promise<string> {
  return page.getByRole('toolbar', { name: 'Playback' }).innerText();
}

/** Elapsed playback time in seconds, read from the transport. */
export async function elapsedSeconds(page: Page): Promise<number> {
  const text = await transportText(page);
  const match = /(\d+):(\d{2})\s*\//.exec(text);
  if (match === null) throw new Error(`No time in the transport: ${text}`);
  return Number(match[1]) * 60 + Number(match[2]);
}
