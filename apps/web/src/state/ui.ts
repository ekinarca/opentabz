/**
 * Transient interface state that shortcuts and components share: which panel is open.
 */
import { create } from 'zustand';

export type Panel =
  'speed' | 'goto' | 'shortcuts' | 'practice' | 'metronome' | 'settings' | 'export' | 'tuner' | 'stylesheet';

interface UiState {
  readonly panel: Panel | null;
  /** Printing was asked for (the Print command): the export panel prints and closes again. */
  readonly printRequested: boolean;
  /** The lyrics fill the workspace in place of the score (VIEW-022). */
  readonly lyricsOnly: boolean;
  readonly setLyricsOnly: (on: boolean) => void;
  /** The score fills the screen, the app's bars put away (VIEW-013). */
  readonly fullScreen: boolean;
  readonly setFullScreen: (on: boolean) => void;
  readonly openPanel: (panel: Panel) => void;
  readonly setPanelOpen: (panel: Panel, open: boolean) => void;
  readonly requestPrint: () => void;
  /** Whether printing was asked for, clearing the request. */
  readonly takePrintRequest: () => boolean;
}

export const useUi = create<UiState>((set, get) => ({
  panel: null,
  printRequested: false,
  lyricsOnly: false,
  setLyricsOnly: on => {
    set({ lyricsOnly: on });
  },
  fullScreen: false,
  setFullScreen: on => {
    set({ fullScreen: on });
  },
  openPanel: panel => {
    set({ panel });
  },
  setPanelOpen: (panel, open) => {
    set(state => ({ panel: open ? panel : state.panel === panel ? null : state.panel }));
  },
  requestPrint: () => {
    set({ panel: 'export', printRequested: true });
  },
  takePrintRequest: () => {
    const requested = get().printRequested;
    if (requested) set({ printRequested: false });
    return requested;
  },
}));
