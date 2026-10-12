/**
 * Open documents and the open pipeline on the main thread: intake → engine → tabs, failures and
 * notices. The engine holds the scores; this store holds summaries, view state and the original
 * bytes (so documents can be reopened if the engine worker has to be restarted).
 */
import type {
  DocSummary,
  LayoutKind,
  OpenError,
  ScoreStyle,
  StaffDisplay,
  SystemsLayout,
  TrackStaves,
} from '@opentabz/core/shared';
import { create } from 'zustand';
import { getEngine } from '../engine/instance.ts';
import { EngineTimeoutError } from '../engine/client.ts';
import type { IntakeSource } from '../features/open/intake.ts';
import type { PageArrangement, PageSetup } from '../score-view/pagination.ts';
import { describeFormat, strings } from '../strings.ts';
import { fingerprint, recallMix, rememberMix, STYLE_DEFAULTS, type TrackMix } from './mixer-memory.ts';
import { usePreferences } from './preferences.ts';
import { useRecentScores } from './recent-scores.ts';
import { forgetSession, saveSession, sessionOf } from './session.ts';
import { recallStyle, rememberStyle } from './style-memory.ts';
import { startingStyle } from './stylesheets.ts';

export type { TrackMix } from './mixer-memory.ts';

export interface DocViewState {
  readonly trackIndexes: readonly number[];
  readonly layout: LayoutKind;
  /** The paper, its orientation and margins (REND-012, REND-221, REND-222). */
  readonly page: PageSetup;
  /** How the pages sit on screen in the page layout (REND-212…REND-214). */
  readonly arrangement: PageArrangement;
  /** How the score is engraved: the file's stylesheet, as changed (REND-218). */
  readonly style: ScoreStyle;
  readonly systemsLayout: SystemsLayout;
  readonly staffDisplay: StaffDisplay;
  /** Tracks whose kinds of staff were chosen one by one (REND-031). */
  readonly staves: readonly TrackStaves[];
  /** Transposing instruments written at concert pitch (REND-032). */
  readonly concertPitch: boolean;
  readonly zoom: number;
  /** True until the view has fitted the zoom to the window once. */
  readonly autoFit: boolean;
  /** The zoom follows the window to show the page's width or a whole page (REND-216, REND-217). */
  readonly fit: ZoomFit | null;
}

export const ZOOM_FITS = ['width', 'page'] as const;
export type ZoomFit = (typeof ZOOM_FITS)[number];

export interface OpenDocument {
  /** Stable key for the UI; also the engine view id. */
  readonly key: string;
  /** Engine document id; changes when the engine is restarted. */
  readonly engineId: string;
  readonly summary: DocSummary;
  readonly view: DocViewState;
  readonly mix: readonly TrackMix[];
  /** The track the others are ducked against (the mixer's focus), if any. */
  readonly focus: number | null;
  /** The track instrument views (the fretboard) follow. */
  readonly activeTrack: number;
  /** SHA-256 of the file, once known: the mixer is remembered under it. */
  readonly fingerprint: string | null;
  readonly source: { readonly name: string; readonly bytes: ArrayBuffer };
  /** Performance mark set when the file arrived (drop, pick, paste or download). */
  readonly intakeMark: string;
}

export interface FailedOpen {
  readonly id: string;
  readonly error: OpenError;
}

export type NoticeTone = 'info' | 'warning' | 'error';

export interface Notice {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tone: NoticeTone;
}

export interface PendingOpen {
  readonly id: string;
  readonly name: string;
}

interface DocumentsState {
  readonly docs: readonly OpenDocument[];
  readonly activeKey: string | null;
  readonly failures: readonly FailedOpen[];
  readonly notices: readonly Notice[];
  readonly pending: readonly PendingOpen[];
  readonly open: (sources: readonly IntakeSource[]) => Promise<void>;
  readonly close: (key: string) => void;
  /** Shows a document, or the home page when `key` is null. */
  readonly activate: (key: string | null) => void;
  readonly updateView: (key: string, patch: Partial<DocViewState>) => void;
  /** The document as edited (EDIT-001): its summary as the engine gives it after the edit. */
  readonly setSummary: (key: string, summary: DocSummary) => void;
  readonly updateMix: (key: string, trackIndex: number, patch: Partial<TrackMix>) => void;
  readonly setFocus: (key: string, trackIndex: number | null) => void;
  /** Makes a track the active one; while one track is shown, the score shows the new one. */
  readonly setActiveTrack: (key: string, trackIndex: number) => void;
  /** Back to the mixer stored in the file. */
  readonly resetMix: (key: string) => void;
  readonly reportFailure: (error: OpenError) => void;
  readonly dismissFailures: () => void;
  readonly notify: (notice: Omit<Notice, 'id'>) => void;
  readonly dismissNotice: (id: string) => void;
  readonly reopenAll: () => Promise<void>;
}

/** The mixer as the file stores it. */
export function initialMix(summary: DocSummary): TrackMix[] {
  return summary.tracks.map(track => ({
    mute: track.mix.mute,
    solo: track.mix.solo,
    volume: 1,
    // Guitar Pro balance: 0 (left) to 16 (right), 8 in the middle.
    pan: Math.min(1, Math.max(-1, (track.mix.balance - 8) / 8)),
    program: track.program,
    transpose: 0,
    detune: 0,
    ...STYLE_DEFAULTS,
  }));
}

/** Keeps the document's mixer for the next time the same file is opened. */
function remembered(doc: OpenDocument | undefined): void {
  const hash = doc?.fingerprint ?? null;
  if (doc === undefined || hash === null) return;
  rememberMix(hash, { tracks: doc.mix, focus: doc.focus });
}

/** Brings back the mixer of a file opened before (recognised by its contents). */
async function restoreMix(key: string, bytes: ArrayBuffer, trackCount: number): Promise<void> {
  let hash: string;
  try {
    hash = await fingerprint(bytes);
  } catch {
    // No crypto.subtle (an insecure context): the mixer is simply not remembered.
    return;
  }
  const stored = recallMix(hash, trackCount);
  const style = recallStyle(hash, useDocuments.getState().docs.find(doc => doc.key === key)?.summary.style);
  useDocuments.setState(state => ({
    docs: state.docs.map(doc =>
      doc.key === key
        ? {
            ...doc,
            fingerprint: hash,
            ...(stored === null ? {} : { mix: stored.tracks, focus: stored.focus }),
            ...(style === null ? {} : { view: { ...doc.view, style } }),
          }
        : doc,
    ),
  }));
  // Kept to open again from the home page, on this device only (LIB-005).
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  if (doc !== undefined && usePreferences.getState().rememberRecent) {
    void useRecentScores.getState().remember(
      {
        fingerprint: hash,
        name: doc.source.name,
        title: doc.summary.title.trim(),
        artist: doc.summary.artist.trim(),
        openedAt: Date.now(),
        size: bytes.byteLength,
      },
      bytes,
    );
  }
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Date.now().toString(36)}`;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

/** A zoom within the limits, to a tenth of a percent: fine enough for the smallest steps. */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 1000) / 1000));
}

/** Below this width a printed page cannot be read; scores reflow to the screen instead. */
export const NARROW_SCREEN = 640;

function initialView(summary: DocSummary): DocViewState {
  const preferences = usePreferences.getState();
  const narrow = window.innerWidth < NARROW_SCREEN;
  return {
    trackIndexes: [0],
    layout: narrow && preferences.layout === 'page' ? 'scroll' : preferences.layout,
    page: preferences.page,
    arrangement: preferences.pageArrangement,
    // The default stylesheet, if one is chosen; the file's otherwise (REND-220).
    style: startingStyle(summary.style),
    systemsLayout: summary.hasModelLayout ? 'model' : 'auto',
    staffDisplay: preferences.staffDisplay,
    staves: [],
    concertPitch: preferences.concertPitch,
    zoom: 1,
    autoFit: true,
    fit: null,
  };
}

function internalError(name: string, byteLength: number, error: unknown): OpenError {
  const timeout = error instanceof EngineTimeoutError;
  return {
    code: timeout ? 'timeout' : 'internal',
    fileName: name,
    byteLength,
    format: null,
    formatVersion: null,
    extensionMismatch: false,
    position: null,
    detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  };
}

export const useDocuments = create<DocumentsState>((set, get) => ({
  docs: [],
  activeKey: null,
  failures: [],
  notices: [],
  pending: [],

  open: async sources => {
    const engine = getEngine();
    let lastOpened: string | null = null;
    for (const source of sources) {
      const pendingId = nextId('pending');
      set(state => ({ pending: [...state.pending, { id: pendingId, name: source.name }] }));
      const intakeMark = `ot:intake:${pendingId}`;
      performance.mark(intakeMark);
      try {
        const loaded = await source.load();
        if (!loaded.ok) {
          get().reportFailure(loaded.error);
          continue;
        }
        const bytes = loaded.bytes;
        // The engine receives a transferred copy; the original stays here for recovery.
        const copy = bytes.slice(0);
        let result;
        try {
          result = await engine.call('open', { name: loaded.name, bytes: copy }, [copy]);
        } catch (error) {
          get().reportFailure(internalError(loaded.name, bytes.byteLength, error));
          continue;
        }
        if (!result.ok) {
          get().reportFailure(result.error);
          continue;
        }
        const key = nextId('doc');
        const summary = result.summary;
        const doc: OpenDocument = {
          key,
          engineId: summary.id,
          summary,
          view: initialView(summary),
          mix: initialMix(summary),
          focus: null,
          activeTrack: 0,
          fingerprint: null,
          source: { name: loaded.name, bytes },
          intakeMark,
        };
        set(state => ({ docs: [...state.docs, doc] }));
        if (source.blank !== true) void restoreMix(key, bytes, summary.tracks.length);
        lastOpened = key;
        if (summary.truncated) get().notify({ ...strings.notices.truncated(loaded.name), tone: 'warning' });
        else if (summary.extensionMismatch) {
          get().notify({
            ...strings.notices.extensionMismatch(
              loaded.name,
              describeFormat(summary.format, summary.formatVersion),
            ),
            tone: 'info',
          });
        }
      } finally {
        set(state => ({ pending: state.pending.filter(entry => entry.id !== pendingId) }));
      }
    }
    if (lastOpened !== null) set({ activeKey: lastOpened });
  },

  close: key => {
    const doc = get().docs.find(candidate => candidate.key === key);
    if (doc === undefined) return;
    void getEngine()
      .call('closeDocument', { docId: doc.engineId })
      .catch(() => undefined);
    set(state => {
      const index = state.docs.findIndex(candidate => candidate.key === key);
      const docs = state.docs.filter(candidate => candidate.key !== key);
      let activeKey = state.activeKey;
      if (activeKey === key) activeKey = docs[Math.min(index, docs.length - 1)]?.key ?? null;
      return { docs, activeKey };
    });
  },

  activate: key => {
    if (key === null || get().docs.some(doc => doc.key === key)) set({ activeKey: key });
  },

  setSummary: (key, summary) => {
    set(state => ({ docs: state.docs.map(doc => (doc.key === key ? { ...doc, summary } : doc)) }));
  },

  updateView: (key, patch) => {
    set(state => ({
      docs: state.docs.map(doc => {
        if (doc.key !== key) return doc;
        const shown = patch.trackIndexes;
        // Hiding the active track hands the role to the first track shown.
        const activeTrack =
          shown === undefined || shown.includes(doc.activeTrack)
            ? doc.activeTrack
            : (shown[0] ?? doc.activeTrack);
        // A zoom chosen by hand ends fitting the page to the window.
        const fit = patch.fit !== undefined ? patch.fit : patch.zoom !== undefined ? null : doc.view.fit;
        // A style chosen for the song comes back when it is opened again.
        if (patch.style !== undefined && doc.fingerprint !== null)
          rememberStyle(doc.fingerprint, patch.style);
        return { ...doc, activeTrack, view: { ...doc.view, ...patch, fit } };
      }),
    }));
  },

  updateMix: (key, trackIndex, patch) => {
    set(state => ({
      docs: state.docs.map(doc =>
        doc.key === key
          ? { ...doc, mix: doc.mix.map((mix, index) => (index === trackIndex ? { ...mix, ...patch } : mix)) }
          : doc,
      ),
    }));
    remembered(get().docs.find(doc => doc.key === key));
  },

  setFocus: (key, trackIndex) => {
    set(state => ({
      docs: state.docs.map(doc => (doc.key === key ? { ...doc, focus: trackIndex } : doc)),
    }));
    remembered(get().docs.find(doc => doc.key === key));
  },

  setActiveTrack: (key, trackIndex) => {
    set(state => ({
      docs: state.docs.map(doc => {
        if (doc.key !== key || trackIndex < 0 || trackIndex >= doc.summary.tracks.length) return doc;
        const single = doc.view.trackIndexes.length === 1;
        return {
          ...doc,
          activeTrack: trackIndex,
          view:
            single && doc.view.trackIndexes[0] !== trackIndex
              ? { ...doc.view, trackIndexes: [trackIndex] }
              : doc.view,
        };
      }),
    }));
  },

  resetMix: key => {
    set(state => ({
      docs: state.docs.map(doc =>
        doc.key === key ? { ...doc, mix: initialMix(doc.summary), focus: null } : doc,
      ),
    }));
    remembered(get().docs.find(doc => doc.key === key));
  },

  reportFailure: error => {
    set(state => ({ failures: [...state.failures, { id: nextId('failure'), error }] }));
  },

  dismissFailures: () => {
    set({ failures: [] });
  },

  notify: notice => {
    set(state => ({ notices: [...state.notices, { ...notice, id: nextId('notice') }] }));
  },

  dismissNotice: id => {
    set(state => ({ notices: state.notices.filter(notice => notice.id !== id) }));
  },

  reopenAll: async () => {
    const engine = getEngine();
    const reopened: OpenDocument[] = [];
    for (const doc of get().docs) {
      const copy = doc.source.bytes.slice(0);
      try {
        const result = await engine.call('open', { name: doc.source.name, bytes: copy }, [copy]);
        if (result.ok) reopened.push({ ...doc, engineId: result.summary.id, summary: result.summary });
        else get().reportFailure(result.error);
      } catch (error) {
        get().reportFailure(internalError(doc.source.name, doc.source.bytes.byteLength, error));
      }
    }
    set(state => ({
      docs: reopened,
      activeKey: reopened.some(doc => doc.key === state.activeKey)
        ? state.activeKey
        : (reopened[0]?.key ?? null),
    }));
    get().notify({ ...strings.notices.engineRestarted, tone: 'warning' });
  },
}));

// The scores open now, kept to open again at the next start (UX-028), while recent scores are
// remembered.
useDocuments.subscribe((state, previous) => {
  if (state.docs === previous.docs && state.activeKey === previous.activeKey) return;
  if (usePreferences.getState().rememberRecent) saveSession(sessionOf(state.docs, state.activeKey));
  else forgetSession();
});
