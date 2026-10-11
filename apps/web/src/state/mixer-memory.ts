/**
 * Mixer settings remembered per song: opening the same file again brings back its mixer. Songs
 * are recognised by a SHA-256 hash of their bytes; settings live in localStorage (guarded like
 * the preferences) until the library (M3) keeps them with the documents.
 */

/** Mixer state of one track (applied to every MIDI channel the track uses). */
export interface TrackMix {
  readonly mute: boolean;
  readonly solo: boolean;
  /** Mix level, 0–1, on top of the volume stored in the file. */
  readonly volume: number;
  /** -1 (left) to 1 (right). */
  readonly pan: number;
  /** General MIDI program (instrument), 0–127. */
  readonly program: number;
  /** Playback transposition in semitones. */
  readonly transpose: number;
  /** Fine tuning in cents. */
  readonly detune: number;
  /** Playing style (Guitar Pro's track interpretation): every note rings on. */
  readonly letRing: boolean;
  /** Chords are strummed. */
  readonly brush: boolean;
  /** Palm mutes damped from light (0) to heavy (1); 0.5 as written. */
  readonly palmMute: number;
  /** Strong beats are stressed. */
  readonly accent: boolean;
}

/** The playing style when the file or the user says nothing. */
export const STYLE_DEFAULTS = { letRing: false, brush: false, palmMute: 0.5, accent: false } as const;

export interface RememberedMix {
  readonly tracks: readonly TrackMix[];
  /** The track the others are ducked against, if any. */
  readonly focus: number | null;
}

export const MIXER_STORAGE_KEY = 'opentabz.mixer.v1';
/** The most songs kept; the least recently used are forgotten first. */
export const MAX_REMEMBERED_SONGS = 100;
export const MAX_TRANSPOSE = 12;
export const MAX_DETUNE = 50;
/** Level of the other tracks while one track has the mixer's focus. */
export const FOCUS_DUCK = 0.2;

/** The level a track plays at: its own, ducked while another track has the focus. */
export function effectiveVolume(mix: readonly TrackMix[], focus: number | null, trackIndex: number): number {
  const volume = mix[trackIndex]?.volume ?? 1;
  return focus === null || focus === trackIndex ? volume : volume * FOCUS_DUCK;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTrack(value: unknown): TrackMix | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Partial<Record<keyof TrackMix, unknown>>;
  const number = (input: unknown) => (typeof input === 'number' && Number.isFinite(input) ? input : null);
  const volume = number(raw.volume);
  const pan = number(raw.pan);
  const program = number(raw.program);
  const transpose = number(raw.transpose);
  const detune = number(raw.detune);
  if (
    typeof raw.mute !== 'boolean' ||
    typeof raw.solo !== 'boolean' ||
    volume === null ||
    pan === null ||
    program === null ||
    transpose === null ||
    detune === null
  ) {
    return null;
  }
  // The playing style came later: songs remembered before it play as written.
  const palmMute = number(raw.palmMute);
  return {
    mute: raw.mute,
    solo: raw.solo,
    volume: clamp(volume, 0, 1),
    pan: clamp(pan, -1, 1),
    program: clamp(Math.round(program), 0, 127),
    transpose: clamp(Math.round(transpose), -MAX_TRANSPOSE, MAX_TRANSPOSE),
    detune: clamp(Math.round(detune), -MAX_DETUNE, MAX_DETUNE),
    letRing: typeof raw.letRing === 'boolean' ? raw.letRing : STYLE_DEFAULTS.letRing,
    brush: typeof raw.brush === 'boolean' ? raw.brush : STYLE_DEFAULTS.brush,
    palmMute: palmMute === null ? STYLE_DEFAULTS.palmMute : clamp(palmMute, 0, 1),
    accent: typeof raw.accent === 'boolean' ? raw.accent : STYLE_DEFAULTS.accent,
  };
}

/** Remembered songs, most recently used last; anything unreadable is left out. */
export function parseMemory(raw: string | null): Map<string, RememberedMix> {
  const memory = new Map<string, RememberedMix>();
  if (raw === null) return memory;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return memory;
    for (const [hash, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!/^[0-9a-f]{64}$/.test(hash) || typeof entry !== 'object' || entry === null) continue;
      const { tracks, focus } = entry as { tracks?: unknown; focus?: unknown };
      if (!Array.isArray(tracks)) continue;
      const parsed = tracks.map(parseTrack);
      if (parsed.some(track => track === null)) continue;
      memory.set(hash, {
        tracks: parsed.filter((track): track is TrackMix => track !== null),
        focus:
          typeof focus === 'number' && Number.isInteger(focus) && focus >= 0 && focus < parsed.length
            ? focus
            : null,
      });
    }
  } catch {
    return memory;
  }
  return memory;
}

function load(): Map<string, RememberedMix> {
  try {
    return parseMemory(localStorage.getItem(MIXER_STORAGE_KEY));
  } catch {
    return new Map();
  }
}

function save(memory: Map<string, RememberedMix>): void {
  try {
    localStorage.setItem(MIXER_STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Storage unavailable (private mode, quota): the mixer is remembered for this session only.
  }
}

/** Keeps a song's mixer, as the most recently used, forgetting the oldest beyond the limit. */
export function remember(
  memory: Map<string, RememberedMix>,
  hash: string,
  mix: RememberedMix,
): Map<string, RememberedMix> {
  const next = new Map(memory);
  next.delete(hash);
  next.set(hash, mix);
  while (next.size > MAX_REMEMBERED_SONGS) {
    const oldest = next.keys().next().value;
    if (oldest === undefined) break;
    next.delete(oldest);
  }
  return next;
}

export function rememberMix(hash: string, mix: RememberedMix): void {
  save(remember(load(), hash, mix));
}

/** A song's remembered mixer, if it has as many tracks as the file has now. */
export function recallMix(hash: string, trackCount: number): RememberedMix | null {
  const entry = load().get(hash);
  return entry?.tracks.length === trackCount ? entry : null;
}

/** SHA-256 of the file, as hex. */
export async function fingerprint(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
