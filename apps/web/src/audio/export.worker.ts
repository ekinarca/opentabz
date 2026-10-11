/**
 * Audio export worker: renders a song through a synthesizer of its own, faster than real time,
 * and encodes it as WAV, while playback goes on undisturbed in the synth worker.
 */
import { encodeWav, RenderCancelled, renderSong, type RenderRequest } from '@opentabz/audio';

export type ExportWorkerRequest =
  { readonly type: 'render'; readonly request: RenderRequest } | { readonly type: 'cancel' };

export type ExportWorkerEvent =
  | { readonly type: 'progress'; readonly fraction: number }
  | { readonly type: 'done'; readonly wav: Uint8Array }
  | { readonly type: 'cancelled' }
  | { readonly type: 'error'; readonly message: string };

interface WorkerScope {
  postMessage(message: ExportWorkerEvent, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<ExportWorkerRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;
let cancelled = false;

async function render(request: RenderRequest): Promise<void> {
  try {
    const audio = await renderSong(request, {
      progress: fraction => {
        scope.postMessage({ type: 'progress', fraction });
      },
      cancelled: () => cancelled,
      // Lets a cancel message in between chunks.
      yield: () =>
        new Promise(resolve => {
          setTimeout(resolve, 0);
        }),
    });
    const wav = encodeWav(audio.left, audio.right, audio.sampleRate);
    scope.postMessage({ type: 'done', wav }, [wav.buffer]);
  } catch (error) {
    if (error instanceof RenderCancelled) scope.postMessage({ type: 'cancelled' });
    else
      scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

scope.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'cancel') cancelled = true;
  else void render(message.request);
});
