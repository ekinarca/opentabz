import { getEngine } from '../engine/instance.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { openFiles } from './open-actions.ts';

/**
 * Opens the score with its repeats and jumps written out (REND-319), as a document of its own:
 * every bar as often and in the order it is played.
 */
export async function writeOutRepeats(doc: OpenDocument): Promise<void> {
  try {
    const { bytes } = await getEngine().call('unfoldDocument', { docId: doc.engineId });
    const base = doc.source.name.replace(/\.[^.]+$/, '');
    openFiles([new File([bytes], strings.toolbar.unfoldedName(base))]);
  } catch (error) {
    useDocuments.getState().notify({
      title: strings.toolbar.unfoldFailed,
      description: error instanceof Error ? error.message : String(error),
      tone: 'error',
    });
  }
}
