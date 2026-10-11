/**
 * Transient interface state that shortcuts and components share: which panel is open.
 */
import { create } from 'zustand';

export type Panel = 'speed' | 'goto' | 'shortcuts' | 'practice' | 'metronome';

interface UiState {
  readonly panel: Panel | null;
  readonly openPanel: (panel: Panel) => void;
  readonly setPanelOpen: (panel: Panel, open: boolean) => void;
}

export const useUi = create<UiState>(set => ({
  panel: null,
  openPanel: panel => {
    set({ panel });
  },
  setPanelOpen: (panel, open) => {
    set(state => ({ panel: open ? panel : state.panel === panel ? null : state.panel }));
  },
}));
