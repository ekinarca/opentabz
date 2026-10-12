import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Switch,
  Tooltip,
  cx,
} from '@opentabz/ui';
import { Settings2, X } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import type { TrackDrums } from '@opentabz/core/shared';
import {
  DRUM_MODES,
  drumNotes,
  kitPads,
  padLights,
  soundPads,
  type DrumPad,
  type PadLight,
} from '../instrument-view/drums.ts';
import { FRETBOARD_SHOWS, indexTrackNotes, NO_NOTES, NOTE_LABELS } from '../instrument-view/fretboard.ts';
import { useTrackDrums } from '../instrument-view/use-track-notes.ts';
import type { OpenDocument } from '../state/documents.ts';
import { rowOf } from '../state/edit-caret.ts';
import { onDrums, playDrumAtCaret, useEditing } from '../state/editing.ts';
import { usePlayer } from '../state/player.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { Field } from './MetronomeSettingsForm.tsx';
import { TrackSelect } from './TrackSelect.tsx';

const s = strings.drums;
const f = strings.fretboard;

function DrumSettings() {
  const preferences = usePreferences();
  return (
    <Popover>
      <Tooltip label={s.settings}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.settings}
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <Settings2 size={16} aria-hidden />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        label={s.settings}
        align="end"
        side="top"
        className="w-[min(340px,calc(100vw-16px))] p-4"
      >
        <div className="flex flex-col gap-4">
          <Field label={f.show} hint={s.showHints[preferences.fretboardShow]}>
            <SegmentedControl
              label={f.show}
              value={preferences.fretboardShow}
              segments={FRETBOARD_SHOWS.map(show => ({ value: show, label: f.shows[show] }))}
              onValueChange={fretboardShow => {
                preferences.set({ fretboardShow });
              }}
            />
          </Field>
          <Field label={f.labels} hint={s.labelHints[preferences.noteLabels]}>
            <SegmentedControl
              label={f.labels}
              value={preferences.noteLabels}
              segments={NOTE_LABELS.map(mode => ({ value: mode, label: f.labelModes[mode] }))}
              onValueChange={noteLabels => {
                preferences.set({ noteLabels });
              }}
            />
          </Field>
          <Switch
            label={s.largeLabels}
            checked={preferences.drumLargeLabels}
            onCheckedChange={drumLargeLabels => {
              preferences.set({ drumLargeLabels });
            }}
          />
          <Switch
            label={s.gmOnly}
            checked={preferences.drumGmOnly}
            onCheckedChange={drumGmOnly => {
              preferences.set({ drumGmOnly });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const NO_LIGHTS: ReadonlyMap<string, PadLight> = new Map();

/**
 * Reads which pads light at the playback position, for useSyncExternalStore: the same object
 * comes back until they change.
 */
function lightsReader(
  docKey: string,
  drums: TrackDrums | null,
  pads: readonly DrumPad[],
  show: (typeof FRETBOARD_SHOWS)[number],
): () => ReadonlyMap<string, PadLight> {
  if (drums === null) return () => NO_LIGHTS;
  const rows = indexTrackNotes(drums.notes);
  let cached: { signature: string; value: ReadonlyMap<string, PadLight> } = {
    signature: '',
    value: NO_LIGHTS,
  };
  return () => {
    const player = usePlayer.getState();
    const notes =
      player.docKey === docKey && player.timeline !== null
        ? drumNotes(player.timeline, drums, rows, player.tick, show)
        : NO_NOTES;
    const value = padLights(pads, notes);
    const signature = [...value].map(([key, light]) => `${key}:${light.kind}:${light.sound}`).join('|');
    if (signature !== cached.signature) cached = { signature, value };
    return cached.value;
  };
}

/**
 * The drums of the active track under the score (VIEW-006): a pad for each piece the track plays,
 * or for each sound its kit can make with its MIDI number (VIEW-020), lit as the music plays;
 * names never, on hover or always, large on request (VIEW-021).
 */
export function DrumsPanel({ doc }: { readonly doc: OpenDocument }) {
  const mode = usePreferences(state => state.drumMode);
  const gmOnly = usePreferences(state => state.drumGmOnly);
  const large = usePreferences(state => state.drumLargeLabels);
  const labels = usePreferences(state => state.noteLabels);
  const show = usePreferences(state => state.fretboardShow);
  const cursorColor = usePreferences(state => state.cursorColor);
  const setPreferences = usePreferences(state => state.set);
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  const drums = useTrackDrums(doc.engineId, track?.index ?? 0);
  const pads = useMemo(
    () => (drums === null ? [] : mode === 'kit' ? kitPads(drums) : soundPads(drums, gmOnly)),
    [drums, mode, gmOnly],
  );
  const read = useMemo(() => lightsReader(doc.key, drums, pads, show), [doc.key, drums, pads, show]);
  const lights = useSyncExternalStore(usePlayer.subscribe, read);
  const trackName = track === undefined ? '' : track.name.trim().length > 0 ? track.name : track.shortName;
  // While the drums are edited, the pads put sounds on the caret's beat and take them off (EDIT-097).
  const caretSounds = useEditing(state => {
    const editing = state.docs[doc.key];
    if (editing?.on !== true || !onDrums(editing.caret) || editing.caret?.track !== track?.index) return null;
    if (editing.beats === null || editing.caret === null) return null;
    return (
      rowOf(editing.beats, editing.caret.beatId)
        ?.notes.map(note => note.sound ?? '')
        .join('|') ?? ''
    );
  });
  const atCaret = caretSounds === null ? null : new Set(caretSounds.split('|').filter(sound => sound !== ''));
  const playing = pads.flatMap(pad => {
    const light = lights.get(pad.key);
    return light?.kind === 'current' ? [drums?.sounds[light.sound]?.name ?? pad.label] : [];
  });

  return (
    <section
      aria-label={s.title}
      className="ot-drums shrink-0 border-t border-line bg-surface"
      data-cursor-color={cursorColor}
    >
      <div className="flex h-10 items-center gap-2 px-3">
        <TrackSelect doc={doc} />
        <Tooltip label={s.modeHints[mode]}>
          <div>
            <SegmentedControl
              label={s.mode}
              value={mode}
              segments={DRUM_MODES.map(value => ({ value, label: s.modes[value] }))}
              onValueChange={drumMode => {
                setPreferences({ drumMode });
              }}
            />
          </div>
        </Tooltip>
        <div className="ml-auto flex items-center gap-1">
          <DrumSettings />
          <IconButton
            size="sm"
            label={s.close}
            icon={<X size={16} aria-hidden />}
            onClick={() => {
              setPreferences({ drums: false });
            }}
          />
        </div>
      </div>
      {drums !== null && drums.sounds.length === 0 ? (
        <p className="px-4 pt-1 pb-3 text-[13px] text-ink-muted">{s.notDrums(trackName)}</p>
      ) : (
        <ul
          aria-label={`${s.pads(trackName)}. ${s.playing(playing)}`}
          className="flex max-h-[38vh] flex-wrap gap-2 overflow-y-auto px-3 pb-3"
        >
          {pads.map(pad => {
            const light = lights.get(pad.key);
            const sound = light === undefined ? undefined : drums?.sounds[light.sound];
            const name =
              mode === 'kit' && light?.kind === 'current' && sound !== undefined ? sound.name : pad.label;
            const shown = labels === 'always';
            const keys = pad.sounds.flatMap(index => drums?.sounds[index]?.key ?? []);
            const on = atCaret === null ? undefined : keys.find(sound => atCaret.has(sound));
            const Pad = atCaret === null ? 'div' : 'button';
            return (
              <li key={pad.key}>
                <Pad
                  {...(atCaret === null
                    ? {}
                    : {
                        type: 'button' as const,
                        'aria-pressed': on !== undefined,
                        'aria-label': pad.label,
                        onClick: () => {
                          const sound = on ?? keys[0];
                          if (sound !== undefined) playDrumAtCaret(doc.key, sound);
                        },
                      })}
                  title={s.pad(pad.label, pad.midi)}
                  data-pad={pad.key}
                  data-kind={light?.kind ?? 'none'}
                  data-used={pad.used}
                  className={cx(
                    'group relative flex flex-col items-center justify-center gap-0.5 rounded-full border-2 text-center transition-colors duration-100',
                    atCaret !== null &&
                      'cursor-pointer hover:border-[var(--ot-cursor)] aria-pressed:ring-2 aria-pressed:ring-[var(--ot-cursor)] aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface',
                    large ? 'size-[92px]' : 'size-[72px]',
                    light?.kind === 'current'
                      ? 'border-[var(--ot-cursor)] bg-[var(--ot-cursor)] text-[var(--ot-on-cursor)]'
                      : light?.kind === 'next'
                        ? 'border-[var(--ot-cursor)] bg-surface text-ink'
                        : light?.kind === 'bar'
                          ? 'border-line bg-[color-mix(in_oklab,var(--ot-cursor)_22%,var(--ot-surface))] text-ink'
                          : pad.used
                            ? 'border-line bg-sunken text-ink'
                            : 'border-line bg-surface text-ink-faint opacity-60',
                  )}
                >
                  <span
                    className={cx(
                      'line-clamp-2 px-1 leading-tight font-medium',
                      large ? 'text-[13px]' : 'text-[10.5px]',
                      shown ? '' : labels === 'hover' ? 'opacity-0 group-hover:opacity-100' : 'sr-only',
                    )}
                  >
                    {name}
                  </span>
                  {pad.midi !== null && (
                    <span
                      className={cx(
                        'font-mono tabular-nums',
                        large ? 'text-[12px]' : 'text-[10px]',
                        shown
                          ? 'opacity-80'
                          : labels === 'hover'
                            ? 'opacity-0 group-hover:opacity-80'
                            : 'sr-only',
                      )}
                    >
                      {pad.midi}
                    </span>
                  )}
                </Pad>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
