/**
 * The effects dialog (EDIT-014, EDIT-113, EDIT-114): what Guitar Pro's edition palette sets beyond
 * the keys — on the beats acted on (those selected, or the caret's), a strum or an arpeggio and
 * how long it takes, a grace note, a fermata, a hairpin, an ottava, a rasgueado, a golpe, the wah
 * pedal, a barre, a dead slap, legato and a timer; on the caret's note, a harmonic (its kind,
 * where it is touched and what it sounds), a slide in, a trill, an ornament and left-hand
 * tapping. Only what is changed is set, as one edit to undo.
 */
import {
  BRUSH_LENGTHS,
  BRUSHES,
  FERMATAS,
  GOLPES,
  HARMONIC_NODES,
  HARMONIC_TYPES,
  GRACES,
  HAIRPINS,
  ORNAMENTS,
  OTTAVAS,
  RASGUEADOS,
  SLIDE_INS,
  TRILL_SPEEDS,
  WAHS,
  harmonicPitch,
  noteName,
  type BeatState,
  type BeatTechniques,
  type NoteState,
  type NoteTechniques,
} from '@opentabz/core/shared';
import { Button, Dialog, Switch } from '@opentabz/ui';
import { useEffect, useId, useState } from 'react';
import { create } from 'zustand';
import { useDocuments } from '../state/documents.ts';
import { rowOf } from '../state/edit-caret.ts';
import { applyEffects, editingOf, readTechniques, type CaretTechniques } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.effectsDialog;
const INPUT_CLASS = `${SELECT_CLASS} w-full`;

/** The frets a trill or a barre may name. */
const FRETS = Array.from({ length: 25 }, (_, fret) => fret);

/** Where the effects dialog was opened: the document, and the caret's note's string. */
interface Opened {
  readonly key: string;
  /** The string, as tablature numbers it (1 the highest). */
  readonly string: number;
  /** The note's fret (null without a note), and its string's open pitch with the capo. */
  readonly fret: number | null;
  readonly open: number;
}

export const useEffectsDialog = create<{ readonly open: Opened | null }>(() => ({ open: null }));

/** Opens the dialog for the caret's beat and note; false when nothing is being edited. */
export function openEffectsDialog(key: string): boolean {
  const { on, caret, beats } = editingOf(key);
  if (!on || caret === null) return false;
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  const staff = doc?.summary.tracks[caret.track]?.staves[caret.staff];
  const tuning = staff?.tuning ?? [];
  const row = beats === null ? null : rowOf(beats, caret.beatId);
  const note = row?.notes.find(candidate => candidate.string === caret.string) ?? null;
  useEffectsDialog.setState({
    open: {
      key,
      string: tuning.length - caret.string + 1,
      fret: note?.fret ?? null,
      open: (tuning[tuning.length - caret.string] ?? 0) + (staff?.capo ?? 0),
    },
  });
  return true;
}

/** What changed of a beat's effects, to set. */
export function beatChanges(was: BeatState, now: BeatState): BeatTechniques {
  const changes: { -readonly [K in keyof BeatTechniques]: BeatTechniques[K] } = {};
  if (was.brush !== now.brush) changes.brush = now.brush;
  if (now.brush !== 'none' && (was.brushLength !== now.brushLength || was.brush !== now.brush))
    changes.brushLength = now.brushLength;
  if (was.grace !== now.grace) changes.grace = now.grace;
  if (was.fermata !== now.fermata) changes.fermata = now.fermata;
  if (was.hairpin !== now.hairpin) changes.hairpin = now.hairpin;
  if (was.ottava !== now.ottava) changes.ottava = now.ottava;
  if (was.rasgueado !== now.rasgueado) changes.rasgueado = now.rasgueado;
  if (was.golpe !== now.golpe) changes.golpe = now.golpe;
  if (was.wah !== now.wah) changes.wah = now.wah;
  if (was.deadSlap !== now.deadSlap) changes.deadSlap = now.deadSlap;
  if (was.legato !== now.legato) changes.legato = now.legato;
  if (was.timer !== now.timer) changes.timer = now.timer;
  if (was.barre?.fret !== now.barre?.fret || was.barre?.half !== now.barre?.half) changes.barre = now.barre;
  return changes;
}

/** What changed of a note's effects, to set. */
export function noteChanges(was: NoteState, now: NoteState): NoteTechniques {
  const changes: { -readonly [K in keyof NoteTechniques]: NoteTechniques[K] } = {};
  if (was.slideIn !== now.slideIn) changes.slideIn = now.slideIn;
  if (was.trill?.fret !== now.trill?.fret || was.trill?.speed !== now.trill?.speed) changes.trill = now.trill;
  if (was.ornament !== now.ornament) changes.ornament = now.ornament;
  if (was.leftTap !== now.leftTap) changes.leftTap = now.leftTap;
  if (was.harmonic !== now.harmonic) changes.harmonic = now.harmonic;
  if (now.harmonic !== 'none' && (was.harmonicAt !== now.harmonicAt || was.harmonic !== now.harmonic))
    changes.harmonicAt = now.harmonicAt;
  return changes;
}

/** Where a harmonic of a kind is touched unless said: a natural one at its fret's node, the others an octave up. */
function defaultNode(harmonic: NoteState['harmonic'], fret: number | null): number {
  if (harmonic !== 'natural') return 12;
  return HARMONIC_NODES.find(node => Math.round(node) === fret) ?? 12;
}

/** The pitch a harmonic sounds: over the open string for a natural one, else over the note held. */
function harmonicSound(harmonic: NoteState['harmonic'], node: number, opened: Opened): number {
  return opened.open + (harmonic === 'natural' ? 0 : (opened.fret ?? 0)) + harmonicPitch(node);
}

/** A select of named values. */
function Choice<T extends string | number>({
  label,
  value,
  values,
  names,
  disabled = false,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly values: readonly T[];
  readonly names: (value: T) => string;
  readonly disabled?: boolean;
  readonly onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={String(value)}
        disabled={disabled}
        onChange={event => {
          const chosen = values.find(candidate => String(candidate) === event.target.value);
          if (chosen !== undefined) onChange(chosen);
        }}
        className={INPUT_CLASS}
      >
        {values.map(candidate => (
          <option key={String(candidate)} value={String(candidate)}>
            {names(candidate)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function EffectsForm({
  read,
  opened,
  onApply,
  onClose,
}: {
  readonly read: CaretTechniques;
  readonly opened: Opened;
  readonly onApply: (beat: BeatTechniques, note: NoteTechniques) => void;
  readonly onClose: () => void;
}) {
  const [beat, setBeat] = useState<BeatState>(read.beat);
  const [note, setNote] = useState<NoteState | null>(read.note);
  const updateBeat = (patch: Partial<BeatState>) => {
    setBeat(state => ({ ...state, ...patch }));
  };
  const updateNote = (patch: Partial<NoteState>) => {
    setNote(state => (state === null ? null : { ...state, ...patch }));
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={event => {
        event.preventDefault();
        onApply(
          beatChanges(read.beat, beat),
          read.note === null || note === null ? {} : noteChanges(read.note, note),
        );
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[13px] font-semibold text-ink">{s.beat}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Choice
            label={s.brush}
            value={beat.brush}
            values={BRUSHES}
            names={value => s.brushes[value]}
            onChange={brush => {
              updateBeat({ brush });
            }}
          />
          <Choice
            label={s.brushLength}
            value={beat.brushLength}
            values={BRUSH_LENGTHS}
            names={value => s.lengths[value]}
            disabled={beat.brush === 'none'}
            onChange={brushLength => {
              updateBeat({ brushLength });
            }}
          />
          <Choice
            label={s.grace}
            value={beat.grace}
            values={GRACES}
            names={value => s.graces[value]}
            disabled={!read.notes}
            onChange={grace => {
              updateBeat({ grace });
            }}
          />
          <Choice
            label={s.fermata}
            value={beat.fermata}
            values={FERMATAS}
            names={value => s.fermatas[value]}
            onChange={fermata => {
              updateBeat({ fermata });
            }}
          />
          <Choice
            label={s.hairpin}
            value={beat.hairpin}
            values={HAIRPINS}
            names={value => s.hairpins[value]}
            onChange={hairpin => {
              updateBeat({ hairpin });
            }}
          />
          <Choice
            label={s.ottava}
            value={beat.ottava}
            values={OTTAVAS}
            names={value => s.ottavas[value]}
            onChange={ottava => {
              updateBeat({ ottava });
            }}
          />
          <Choice
            label={s.rasgueado}
            value={beat.rasgueado}
            values={RASGUEADOS}
            names={value => s.rasgueados(value)}
            onChange={rasgueado => {
              updateBeat({ rasgueado });
            }}
          />
          <Choice
            label={s.golpe}
            value={beat.golpe}
            values={GOLPES}
            names={value => s.golpes[value]}
            onChange={golpe => {
              updateBeat({ golpe });
            }}
          />
          <Choice
            label={s.wah}
            value={beat.wah}
            values={WAHS}
            names={value => s.wahs[value]}
            onChange={wah => {
              updateBeat({ wah });
            }}
          />
          <Choice
            label={s.barre}
            value={beat.barre?.fret ?? 0}
            values={FRETS}
            names={fret => (fret === 0 ? s.none : s.fret(fret))}
            onChange={fret => {
              updateBeat({ barre: fret === 0 ? null : { fret, half: beat.barre?.half ?? false } });
            }}
          />
        </div>
        {beat.barre !== null && (
          <Switch
            label={s.halfBarre}
            checked={beat.barre.half}
            onCheckedChange={half => {
              updateBeat({ barre: beat.barre === null ? null : { ...beat.barre, half } });
            }}
          />
        )}
        <Switch
          label={s.deadSlap}
          checked={beat.deadSlap}
          onCheckedChange={deadSlap => {
            updateBeat({ deadSlap });
          }}
        />
        <Switch
          label={s.legato}
          checked={beat.legato}
          onCheckedChange={legato => {
            updateBeat({ legato });
          }}
        />
        <Switch
          label={s.timer}
          checked={beat.timer}
          onCheckedChange={timer => {
            updateBeat({ timer });
          }}
        />
      </fieldset>
      {note !== null && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-semibold text-ink">{s.note(opened.string)}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Choice
              label={s.harmonic}
              value={note.harmonic}
              values={HARMONIC_TYPES}
              names={value => s.harmonics[value]}
              onChange={harmonic => {
                updateNote({ harmonic, harmonicAt: defaultNode(harmonic, opened.fret) });
              }}
            />
            <Choice
              label={s.touchedAt}
              value={
                HARMONIC_NODES.find(node => node === note.harmonicAt) ??
                defaultNode(note.harmonic, opened.fret)
              }
              values={HARMONIC_NODES}
              names={node =>
                note.harmonic === 'natural'
                  ? s.nodeAt(node)
                  : s.fretsAbove(node, opened.fret === null ? null : opened.fret + node)
              }
              disabled={note.harmonic === 'none'}
              onChange={harmonicAt => {
                updateNote({ harmonicAt });
              }}
            />
          </div>
          {note.harmonic !== 'none' && (
            <p className="text-[13px] text-ink-muted" aria-live="polite">
              {s.sounds(noteName(harmonicSound(note.harmonic, note.harmonicAt, opened), false, true))}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Choice
              label={s.slideIn}
              value={note.slideIn}
              values={SLIDE_INS}
              names={value => s.slideIns[value]}
              onChange={slideIn => {
                updateNote({ slideIn });
              }}
            />
            <Choice
              label={s.ornament}
              value={note.ornament}
              values={ORNAMENTS}
              names={value => s.ornaments[value]}
              onChange={ornament => {
                updateNote({ ornament });
              }}
            />
            <Choice
              label={s.trill}
              value={note.trill === null ? -1 : note.trill.fret}
              values={[-1, ...FRETS]}
              names={fret => (fret < 0 ? s.none : s.trillWith(fret))}
              onChange={fret => {
                updateNote({ trill: fret < 0 ? null : { fret, speed: note.trill?.speed ?? 32 } });
              }}
            />
            <Choice
              label={s.trillSpeed}
              value={note.trill?.speed ?? 32}
              values={TRILL_SPEEDS}
              names={value => s.lengths[value]}
              disabled={note.trill === null}
              onChange={speed => {
                updateNote({ trill: note.trill === null ? null : { ...note.trill, speed } });
              }}
            />
          </div>
          <Switch
            label={s.leftTap}
            checked={note.leftTap}
            onCheckedChange={leftTap => {
              updateNote({ leftTap });
            }}
          />
        </fieldset>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {s.cancel}
        </Button>
        <Button variant="primary" type="submit">
          {s.apply}
        </Button>
      </div>
    </form>
  );
}

export function EffectsDialog() {
  const open = useEffectsDialog(state => state.open);
  const [read, setRead] = useState<{
    readonly for: typeof open;
    readonly techniques: CaretTechniques;
  } | null>(null);
  const close = () => {
    useEffectsDialog.setState({ open: null });
  };
  useEffect(() => {
    if (open === null) return undefined;
    let wanted = true;
    void readTechniques(open.key).then(techniques => {
      if (wanted && techniques !== null) setRead({ for: open, techniques });
    });
    return () => {
      wanted = false;
    };
  }, [open]);
  const current = read !== null && open !== null && read.for === open ? read.techniques : null;
  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) close();
      }}
      title={s.title}
      description={editingOf(open?.key ?? '').selection === null ? s.description : s.selection}
      closeLabel={s.cancel}
    >
      {open !== null && current !== null && (
        <EffectsForm
          read={current}
          opened={open}
          onApply={(beat, note) => {
            if (Object.keys(beat).length > 0 || Object.keys(note).length > 0)
              applyEffects(open.key, beat, note);
            close();
          }}
          onClose={close}
        />
      )}
    </Dialog>
  );
}
