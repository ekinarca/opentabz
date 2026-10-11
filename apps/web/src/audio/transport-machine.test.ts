import { describe, expect, it } from 'vitest';
import {
  canToggle,
  INITIAL_TRANSPORT,
  transition,
  type TransportEvent,
  type TransportStatus,
} from './transport-machine.ts';

const EVENTS: TransportEvent[] = [
  { type: 'load' },
  { type: 'loaded' },
  { type: 'play' },
  { type: 'pause' },
  { type: 'finished' },
  { type: 'fail', message: 'boom' },
  { type: 'unload' },
];

const at = (status: TransportStatus) => ({ status, error: status === 'error' ? 'earlier' : null });

/** Expected next status for every state × event pair. */
const TABLE: Record<TransportStatus, Record<TransportEvent['type'], TransportStatus>> = {
  unloaded: {
    load: 'loading',
    loaded: 'unloaded',
    play: 'unloaded',
    pause: 'unloaded',
    finished: 'unloaded',
    fail: 'error',
    unload: 'unloaded',
  },
  loading: {
    load: 'loading',
    loaded: 'ready',
    play: 'loading',
    pause: 'loading',
    finished: 'loading',
    fail: 'error',
    unload: 'unloaded',
  },
  ready: {
    load: 'loading',
    loaded: 'ready',
    play: 'playing',
    pause: 'ready',
    finished: 'ready',
    fail: 'error',
    unload: 'unloaded',
  },
  playing: {
    load: 'loading',
    loaded: 'playing',
    play: 'playing',
    pause: 'ready',
    finished: 'ready',
    fail: 'error',
    unload: 'unloaded',
  },
  error: {
    load: 'loading',
    loaded: 'error',
    play: 'error',
    pause: 'error',
    finished: 'error',
    fail: 'error',
    unload: 'unloaded',
  },
};

describe('transport state machine', () => {
  for (const status of Object.keys(TABLE) as TransportStatus[]) {
    for (const event of EVENTS) {
      it(`${status} + ${event.type} → ${TABLE[status][event.type]}`, () => {
        expect(transition(at(status), event).status).toBe(TABLE[status][event.type]);
      });
    }
  }

  it('keeps the failure message and clears it on recovery', () => {
    const failed = transition(INITIAL_TRANSPORT, { type: 'fail', message: 'no audio device' });
    expect(failed.error).toBe('no audio device');
    expect(transition(failed, { type: 'load' }).error).toBeNull();
  });

  it('only allows toggling when ready or playing', () => {
    expect(canToggle(at('ready'))).toBe(true);
    expect(canToggle(at('playing'))).toBe(true);
    expect(canToggle(at('loading'))).toBe(false);
    expect(canToggle(at('unloaded'))).toBe(false);
    expect(canToggle(at('error'))).toBe(false);
  });
});
