/**
 * The tuner (PRAC-100, PRAC-101, PRAC-102, PRAC-113, PRAC-114): the microphone heard on this
 * device, the note and how many cents off it is, on a needle or a strobe; aimed at the strings
 * of the active track's tuning (drop, open or custom) or at the nearest note; against a
 * reference pitch of A4 that can be set.
 */
import {
  chromaticTarget,
  frequencyOf,
  noteLabel,
  PitchTracker,
  stringTarget,
  type TuningTarget,
} from '@opentabz/audio/pitch';
import { Button, cx, Dialog, SegmentedControl } from '@opentabz/ui';
import { Check, Mic } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { MicrophoneListener, type MicrophoneResult } from '../audio/microphone.ts';
import { useDocuments } from '../state/documents.ts';
import { MAX_A4, MIN_A4, TUNER_DISPLAYS, TUNER_TARGETS, usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { Field, NumberField } from './MetronomeSettingsForm.tsx';
import { userJustActed } from './platform.ts';

const s = strings.tuner;

type Status = 'idle' | 'starting' | MicrophoneResult;

/** Within this many cents a note counts as in tune. */
const IN_TUNE_CENTS = 3;
/** A string counts as tuned once it has stayed in tune this long, in milliseconds. */
const TUNED_AFTER_MS = 400;
/** The lowest pitch listened for below the lowest string, as a ratio (a string tuned well down). */
const BELOW_LOWEST = 0.75;
/** The lowest pitch listened for on the chromatic scale, in hertz. */
const CHROMATIC_LOWEST = 27;
/** Strobe drift in pixels per second per cent. */
const STROBE_SPEED = 3;

export function openTuner(): void {
  useUi.getState().openPanel('tuner');
}

function label(midi: number): string {
  const note = noteLabel(midi);
  return `${note.name}${note.octave}`;
}

interface TrackStrings {
  /** Open strings as MIDI notes, lowest first. */
  readonly notes: readonly number[];
  readonly label: string;
}

/** The open strings of the active track's first staff with strings. */
function useTrackStrings(): TrackStrings | null {
  const doc = useDocuments(state => state.docs.find(candidate => candidate.key === state.activeKey) ?? null);
  const track = doc?.summary.tracks[doc.activeTrack];
  const staff = track?.staves.find(candidate => candidate.tuning.length > 0 && !candidate.isPercussion);
  if (track === undefined || staff === undefined) return null;
  return { notes: [...staff.tuning].reverse(), label: s.tuningOf(track.name, staff.tuningName) };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReduced(query.matches);
    };
    query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
    };
  }, []);
  return reduced;
}

/** A scale from 50 cents flat to 50 sharp with a needle, green near the middle. */
function NeedleMeter({ cents }: { readonly cents: number | null }) {
  const clamped = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS;
  return (
    <div
      role="meter"
      aria-label={s.meter}
      aria-valuemin={-50}
      aria-valuemax={50}
      aria-valuenow={Math.round(clamped)}
      data-testid="tuner-needle"
      className="relative h-14 w-full overflow-hidden rounded-[var(--radius-control)] border border-line bg-sunken"
    >
      <div className="absolute inset-y-0 left-1/2 w-[6%] -translate-x-1/2 bg-success/20" aria-hidden />
      {[-50, -25, 0, 25, 50].map(tick => (
        <div
          key={tick}
          aria-hidden
          className="absolute bottom-0 w-px bg-line-strong"
          style={{ left: `${50 + tick}%`, height: tick === 0 ? '100%' : '35%' }}
        />
      ))}
      {cents !== null && (
        <div
          aria-hidden
          className={cx(
            'absolute inset-y-1 w-1 -translate-x-1/2 rounded-full transition-[left] duration-100',
            inTune ? 'bg-success' : 'bg-accent',
          )}
          style={{ left: `${50 + clamped}%` }}
        />
      )}
    </div>
  );
}

/**
 * Stripes that drift right when sharp and left when flat, faster the further off the note is,
 * and stand still in tune, as a strobe tuner's do.
 */
function StrobeMeter({ cents }: { readonly cents: number | null }) {
  const stripes = useRef<HTMLDivElement | null>(null);
  const latest = useRef(cents);
  useEffect(() => {
    latest.current = cents;
  }, [cents]);
  useEffect(() => {
    let frame = 0;
    let phase = 0;
    let last = performance.now();
    const step = (now: number) => {
      const off = latest.current;
      phase = (phase + (off === null ? 0 : off * STROBE_SPEED * ((now - last) / 1000))) % 40;
      last = now;
      if (stripes.current !== null) stripes.current.style.transform = `translateX(${phase - 40}px)`;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      role="meter"
      aria-label={s.meter}
      aria-valuemin={-50}
      aria-valuemax={50}
      aria-valuenow={Math.round(Math.max(-50, Math.min(50, cents ?? 0)))}
      data-testid="tuner-strobe"
      className="relative h-14 w-full overflow-hidden rounded-[var(--radius-control)] border border-line bg-sunken"
    >
      <div
        ref={stripes}
        aria-hidden
        className={cx('absolute inset-y-0 -right-10 left-0', cents === null ? 'opacity-30' : 'opacity-90')}
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, var(--ot-text) 0 20px, transparent 20px 40px)',
        }}
      />
    </div>
  );
}

/** What a note is aimed at: a string held down, the nearest string, or the nearest note. */
function aimAt(midi: number, strings: TrackStrings | null, locked: number | null): TuningTarget {
  const held = locked === null ? undefined : strings?.notes[locked];
  if (held !== undefined && locked !== null)
    return { midi: held, cents: (midi - held) * 100, string: locked };
  return strings === null ? chromaticTarget(midi) : stringTarget(midi, strings.notes);
}

function TunerBody() {
  const a4 = usePractice(state => state.tunerA4);
  const target = usePractice(state => state.tunerTarget);
  const display = usePractice(state => state.tunerDisplay);
  const set = usePractice(state => state.set);
  const trackStrings = useTrackStrings();
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [midi, setMidi] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const [tuned, setTuned] = useState<ReadonlySet<number>>(new Set());
  const listener = useRef<MicrophoneListener | null>(null);
  const tracker = useRef(new PitchTracker());
  const inTuneSince = useRef<{ string: number; since: number } | null>(null);

  const strings = target === 'strings' ? trackStrings : null;
  const aim = midi === null ? null : aimAt(midi, strings, locked);
  const cents = aim === null ? null : Math.round(aim.cents);
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS;

  // What the microphone's readings are aimed at, for its callback.
  const aiming = useRef<{ strings: TrackStrings | null; locked: number | null }>({ strings, locked });
  useEffect(() => {
    aiming.current = { strings, locked };
  });

  const start = async () => {
    listener.current?.stop();
    tracker.current.reset();
    setStatus('starting');
    const lowest =
      strings === null ? CHROMATIC_LOWEST : frequencyOf(Math.min(...strings.notes), a4) * BELOW_LOWEST;
    const microphone = new MicrophoneListener((reading, time) => {
      const heard = tracker.current.push(reading, time, usePractice.getState().tunerA4);
      setMidi(heard);
      // Strings stay ticked once they have been in tune for a moment.
      const current = heard === null ? null : aimAt(heard, aiming.current.strings, aiming.current.locked);
      if (current?.string === null || current === null || Math.abs(current.cents) > IN_TUNE_CENTS) {
        inTuneSince.current = null;
        return;
      }
      const since = inTuneSince.current;
      if (since?.string !== current.string) inTuneSince.current = { string: current.string, since: time };
      else if (time - since.since >= TUNED_AFTER_MS) {
        const string = current.string;
        setTuned(previous => (previous.has(string) ? previous : new Set([...previous, string])));
      }
    });
    listener.current = microphone;
    const result = await microphone.start(Math.max(CHROMATIC_LOWEST, lowest));
    if (listener.current === microphone) setStatus(result);
  };

  // Opened by a click: listen at once (browsers ask for the microphone only after one).
  const startOnOpen = useEffectEvent(() => {
    if (userJustActed()) void start();
  });
  useEffect(() => {
    queueMicrotask(() => {
      startOnOpen();
    });
    return () => {
      listener.current?.stop();
      listener.current = null;
    };
  }, []);

  const shown = aim === null ? null : label(aim.midi);
  const state = cents === null ? null : inTune ? 'in' : cents < 0 ? 'flat' : 'sharp';
  return (
    <div className="flex flex-col gap-5">
      {status !== 'listening' && (
        <div className="flex flex-col items-start gap-2">
          {status === 'idle' || status === 'starting' ? (
            <Button
              variant="primary"
              icon={<Mic size={16} aria-hidden />}
              disabled={status === 'starting'}
              onClick={() => {
                void start();
              }}
            >
              {status === 'starting' ? s.starting : s.start}
            </Button>
          ) : (
            <>
              <p role="alert" className="text-[13px] text-danger">
                {s[status]}
              </p>
              <Button
                icon={<Mic size={16} aria-hidden />}
                onClick={() => {
                  void start();
                }}
              >
                {s.start}
              </Button>
            </>
          )}
        </div>
      )}
      {status === 'listening' && aim === null && <p className="text-[13px] text-ink-muted">{s.listening}</p>}

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-1" data-testid="tuner-note">
          <span className="font-display text-[56px] leading-none text-ink">
            {aim === null ? '–' : noteLabel(aim.midi).name}
          </span>
          {aim !== null && (
            <span className="text-[20px] text-ink-muted tabular-nums">{noteLabel(aim.midi).octave}</span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            data-testid="tuner-cents"
            className={cx(
              'font-mono text-[24px] tabular-nums',
              inTune ? 'text-success' : cents === null ? 'text-ink-faint' : 'text-ink',
            )}
          >
            {cents === null ? '' : s.cents(cents)}
          </span>
          <span className="font-mono text-[12px] text-ink-muted tabular-nums" data-testid="tuner-frequency">
            {midi === null ? '' : s.frequency(frequencyOf(midi, a4))}
          </span>
        </div>
      </div>
      {display === 'strobe' && !reducedMotion ? <StrobeMeter cents={cents} /> : <NeedleMeter cents={cents} />}
      <p className="sr-only" aria-live="polite">
        {state === null || shown === null ? '' : s.reading(shown, state)}
      </p>
      <p
        aria-hidden
        className={cx('min-h-5 text-[13px] font-medium', inTune ? 'text-success' : 'text-ink-muted')}
      >
        {state === null ? '' : state === 'in' ? s.inTune : state === 'flat' ? s.flat : s.sharp}
      </p>

      {strings !== null && (
        <Field label={s.strings} hint={strings.label}>
          <div className="flex flex-wrap gap-1.5">
            {strings.notes.map((note, index) => {
              const name = label(note);
              const aimed = aim?.string === index;
              return (
                <button
                  key={`${index}-${note}`}
                  type="button"
                  aria-pressed={locked === index}
                  aria-label={s.lockString(name)}
                  data-aimed={aimed}
                  data-tuned={tuned.has(index)}
                  onClick={() => {
                    setLocked(locked === index ? null : index);
                  }}
                  className={cx(
                    'inline-flex h-9 min-w-12 items-center justify-center gap-1 rounded-[var(--radius-control)] border px-2 font-mono text-[13px] tabular-nums',
                    aimed ? 'border-accent bg-accent-soft text-ink' : 'border-line text-ink-muted',
                    locked === index && 'ring-2 ring-accent',
                  )}
                >
                  {name}
                  {tuned.has(index) && <Check size={14} aria-hidden className="text-success" />}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field
        label={s.target}
        {...(target === 'strings' && trackStrings === null ? { hint: s.noStrings } : {})}
      >
        <SegmentedControl
          label={s.target}
          value={target}
          segments={TUNER_TARGETS.map(value => ({ value, label: s.targets[value] }))}
          onValueChange={value => {
            setLocked(null);
            set({ tunerTarget: value });
          }}
        />
      </Field>
      <Field
        label={s.display}
        {...(display === 'strobe' ? { hint: reducedMotion ? s.reducedMotion : s.strobeHint } : {})}
      >
        <SegmentedControl
          label={s.display}
          value={display}
          segments={TUNER_DISPLAYS.map(value => ({ value, label: s.displays[value] }))}
          onValueChange={value => {
            set({ tunerDisplay: value });
          }}
        />
      </Field>
      <div className="max-w-48">
        <NumberField
          label={s.reference}
          value={a4}
          min={MIN_A4}
          max={MAX_A4}
          unit={s.hz}
          onCommit={value => {
            set({ tunerA4: value });
          }}
        />
      </div>
    </div>
  );
}

export function TunerTool() {
  const open = useUi(state => state.panel === 'tuner');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        setPanelOpen('tuner', value);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="sm"
    >
      {open && <TunerBody />}
    </Dialog>
  );
}
