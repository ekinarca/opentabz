/**
 * Opens the scores open last time again at the start (UX-028), when the settings ask and the
 * scores are kept on this device: in their order, the one in front again in front.
 */
import { useDocuments } from './documents.ts';
import { usePreferences } from './preferences.ts';
import { listRecent } from './recent-scores.ts';
import { recallSession, recentSource } from './session.ts';

export async function reopenLastSession(): Promise<void> {
  const { rememberRecent, reopenSession } = usePreferences.getState();
  if (!rememberRecent || !reopenSession) return;
  const session = recallSession();
  if (session === null || session.fingerprints.length === 0) return;
  const kept = await listRecent();
  const sources = session.fingerprints.flatMap(fingerprint => {
    const score = kept.find(candidate => candidate.fingerprint === fingerprint);
    return score === undefined ? [] : [recentSource(score)];
  });
  if (sources.length === 0) return;
  const before = useDocuments.getState().docs.length;
  await useDocuments.getState().open(sources);
  const opened = useDocuments.getState().docs.slice(before);
  // The one in front, when every score came back.
  const front = opened.length === session.fingerprints.length ? opened[session.active] : undefined;
  if (front !== undefined) useDocuments.getState().activate(front.key);
}
