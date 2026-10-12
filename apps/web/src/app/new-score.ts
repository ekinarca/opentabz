/**
 * A new score (COMP-001, UX-002): a blank one is opened and edited at once, the caret on its first
 * bar, so that the first note is a few keys away.
 */
import { getEngine } from '../engine/instance.ts';
import { useDocuments } from '../state/documents.ts';
import { toggleEditing } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { focusScore } from './keymap.ts';

/** The next new score's title: "Untitled", or numbered while other new scores are open. */
function nextTitle(): string {
  const taken = new Set(useDocuments.getState().docs.map(doc => doc.source.name));
  let number = 1;
  while (taken.has(`${strings.newScore.title(number)}.gp`)) number += 1;
  return strings.newScore.title(number);
}

export async function newScore(): Promise<void> {
  try {
    const title = nextTitle();
    const { bytes } = await getEngine().call('blankDocument', { title });
    const name = `${title}.gp`;
    const documents = useDocuments.getState();
    await documents.open([{ name, blank: true, load: () => Promise.resolve({ ok: true, name, bytes }) }]);
    const doc = useDocuments.getState().docs.find(candidate => candidate.source.name === name);
    if (doc === undefined) return;
    await toggleEditing(doc.key);
    requestAnimationFrame(focusScore);
  } catch (error) {
    useDocuments.getState().notify({
      title: strings.newScore.failed,
      description: error instanceof Error ? error.message : String(error),
      tone: 'error',
    });
  }
}
