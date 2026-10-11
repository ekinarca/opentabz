/**
 * Printing (EXP-016): the pages, as SVG, in a print-only part of the document sized to the paper
 * with CSS paged media; the browser's print dialog does the rest (printer, copies, saving as PDF).
 */
import type { Size } from '../score-view/pagination.ts';
import { strings } from '../strings.ts';

const ROOT_ID = 'ot-print';
const STYLE_ID = 'ot-print-paper';
const MM_PER_UNIT = 25.4 / 96;

/**
 * The print-only element. Empty, it prints a note: printing from the browser's menu cannot wait
 * for the pages to be drawn, so the app's own Print command is needed.
 */
export function printRoot(): HTMLElement {
  const existing = document.getElementById(ROOT_ID);
  if (existing !== null) return existing;
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.dataset['note'] = strings.print.useAppCommand;
  document.body.append(root);
  return root;
}

const mm = (units: number) => `${Math.round(units * MM_PER_UNIT * 100) / 100}mm`;

/** Puts the pages in place for printing; they stay until the print dialog closes. */
export function preparePrint(svgs: readonly string[], paper: Size): void {
  const root = printRoot();
  root.replaceChildren(
    ...svgs.map(svg => {
      const page = document.createElement('div');
      page.className = 'ot-print-page';
      page.innerHTML = svg;
      return page;
    }),
  );
  let style = document.getElementById(STYLE_ID);
  if (style === null) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  style.textContent = [
    `@page { size: ${mm(paper.width)} ${mm(paper.height)}; margin: 0; }`,
    `.ot-print-page { width: ${mm(paper.width)}; height: ${mm(paper.height)}; }`,
  ].join('\n');
}

/** Clears the pages once printing is over. */
export function clearPrint(): void {
  document.getElementById(ROOT_ID)?.replaceChildren();
  document.getElementById(STYLE_ID)?.remove();
}

/**
 * Whether the print dialog may open now: browsers open it only while a click or key press still
 * counts as the user's (those without the API are taken to allow it).
 */
export function userJustActed(): boolean {
  const activation = (navigator as Partial<Navigator>).userActivation;
  return activation === undefined || activation.isActive;
}

/** Opens the browser's print dialog for the prepared pages. */
export function openPrintDialog(): void {
  window.addEventListener('afterprint', clearPrint, { once: true });
  window.print();
}
