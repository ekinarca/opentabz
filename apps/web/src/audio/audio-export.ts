/**
 * Audio export from the UI: the song as playback would play it (the engine's MIDI, the mixer,
 * and on request the practice speed, the metronome and the count-in), rendered in a worker of
 * its own and saved as WAV. Nothing leaves the device.
 */
import sonivoxUrl from '@coderline/alphatab/soundfont/sonivox.sf2?url';
import type { TickRange } from '@opentabz/core/shared';
import { getEngine } from '../engine/instance.ts';
import type { OpenDocument } from '../state/documents.ts';
import { interpretations, mixCommands, type ChannelCommand } from '../state/player.ts';
import type { PracticeSettings } from '../state/practice.ts';
import type { ExportWorkerEvent, ExportWorkerRequest } from './export.worker.ts';

export const EXPORT_SAMPLE_RATE = 44100;
/** Seconds the last notes are given to die away after the song. */
const TAIL_SECONDS = 1.5;

export interface AudioExportOptions {
  /** Only these ticks (the selection), or the whole song. */
  readonly range: TickRange | null;
  /** The practice speed (1 is as written). */
  readonly speed: number;
  readonly metronome: boolean;
  readonly countIn: boolean;
}

export class AudioExportCancelled extends Error {
  public constructor() {
    super('The export was cancelled.');
    this.name = 'AudioExportCancelled';
  }
}

/** The practice settings an audio export plays with. */
function practiceCommands(practice: PracticeSettings, options: AudioExportOptions): ChannelCommand[] {
  return [
    { type: 'setSpeed', value: options.speed },
    {
      type: 'setMetronome',
      enabled: options.metronome,
      volume: practice.metronomeVolume,
      settings: practice.click,
    },
    {
      type: 'setCountIn',
      enabled: options.countIn,
      volume: practice.countInVolume,
      bars: practice.countInBars,
      everyLoop: false,
    },
  ];
}

export async function exportWav(
  doc: OpenDocument,
  practice: PracticeSettings,
  options: AudioExportOptions,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const [soundFont, { song, timeline }] = await Promise.all([
    fetch(sonivoxUrl).then(response => response.arrayBuffer()),
    getEngine().call('exportAudioSong', {
      docId: doc.engineId,
      interpretations: interpretations(doc),
      // A selection ends where it ends; the whole song lets its last notes ring out.
      tailSeconds: options.range === null ? TAIL_SECONDS : 0,
    }),
  ]);
  if (signal.aborted) throw new AudioExportCancelled();
  const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const cancel = () => {
        worker.postMessage({ type: 'cancel' } satisfies ExportWorkerRequest);
      };
      signal.addEventListener('abort', cancel, { once: true });
      worker.addEventListener('message', (event: MessageEvent<ExportWorkerEvent>) => {
        const message = event.data;
        if (message.type === 'progress') onProgress(message.fraction);
        else if (message.type === 'done') resolve(message.wav);
        else if (message.type === 'cancelled') reject(new AudioExportCancelled());
        else reject(new Error(message.message));
      });
      worker.addEventListener('error', event => {
        event.preventDefault();
        reject(new Error(event.message || 'The export worker failed.'));
      });
      const request: ExportWorkerRequest = {
        type: 'render',
        request: {
          sampleRate: EXPORT_SAMPLE_RATE,
          soundFont,
          song,
          commands: [...mixCommands(doc, timeline), ...practiceCommands(practice, options)],
          range: options.range,
        },
      };
      worker.postMessage(request, [soundFont]);
    });
  } finally {
    worker.terminate();
  }
}
