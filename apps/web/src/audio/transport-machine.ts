/**
 * The transport as an explicit finite-state machine. Every transition is listed; events that do
 * not apply in a state are ignored (returning the same state), which the tests pin down.
 *
 *   unloaded ──load──▶ loading ──loaded──▶ ready ⇄ playing
 *        ▲                │                  │        │
 *        └────unload──────┴──────fail──▶ error ◀──────┘
 */

export type TransportStatus = 'unloaded' | 'loading' | 'ready' | 'playing' | 'error';

export type TransportEvent =
  | { readonly type: 'load' }
  | { readonly type: 'loaded' }
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'finished' }
  | { readonly type: 'fail'; readonly message: string }
  | { readonly type: 'unload' };

export interface TransportState {
  readonly status: TransportStatus;
  readonly error: string | null;
}

export const INITIAL_TRANSPORT: TransportState = { status: 'unloaded', error: null };

export function transition(state: TransportState, event: TransportEvent): TransportState {
  switch (event.type) {
    case 'load':
      return state.status === 'loading' ? state : { status: 'loading', error: null };
    case 'loaded':
      return state.status === 'loading' ? { status: 'ready', error: null } : state;
    case 'play':
      return state.status === 'ready' ? { status: 'playing', error: null } : state;
    case 'pause':
    case 'finished':
      return state.status === 'playing' ? { status: 'ready', error: null } : state;
    case 'fail':
      return { status: 'error', error: event.message };
    case 'unload':
      return INITIAL_TRANSPORT;
  }
}

/** Whether the play/pause control is usable. */
export function canToggle(state: TransportState): boolean {
  return state.status === 'ready' || state.status === 'playing';
}
