/**
 * Demo scores shipped with OpenTabz: original or public-domain music authored in alphaTex
 * (fixtures/alphatex/demos). They double as fixtures for tests.
 */
import greensleevesUrl from '../../../../fixtures/alphatex/demos/greensleeves.atex?url';
import studyUrl from '../../../../fixtures/alphatex/demos/arpeggio-study.atex?url';
import shuffleUrl from '../../../../fixtures/alphatex/demos/twelve-bar-shuffle.atex?url';
import type { IntakeSource } from '../features/open/intake.ts';

export interface Demo {
  readonly id: 'shuffle' | 'greensleeves' | 'study';
  readonly fileName: string;
  readonly url: string;
}

export const DEMOS: readonly Demo[] = [
  { id: 'shuffle', fileName: 'twelve-bar-shuffle.atex', url: shuffleUrl },
  { id: 'greensleeves', fileName: 'greensleeves.atex', url: greensleevesUrl },
  { id: 'study', fileName: 'arpeggio-study.atex', url: studyUrl },
];

export function demoSource(demo: Demo): IntakeSource {
  return {
    name: demo.fileName,
    load: async () => {
      const response = await fetch(demo.url);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: 'network',
            fileName: demo.fileName,
            byteLength: 0,
            format: null,
            formatVersion: null,
            extensionMismatch: false,
            position: null,
            detail: `Loading the demo failed with HTTP ${response.status}.`,
          },
        };
      }
      return { ok: true, name: demo.fileName, bytes: await response.arrayBuffer() };
    },
  };
}
