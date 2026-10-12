/**
 * A note's and its beat's marks (EDIT-012, EDIT-013, EDIT-043), as Guitar Pro's edition palette
 * sets them: the dynamics and the beam to the next beat of the beats acted on (those selected, or
 * the caret's), the caret's note's fingers and spelling, and the text above the beat. Only what is
 * changed is set, as one edit to undo.
 */
import {
  BEAMING_ORDER,
  DYNAMICS,
  FINGERS,
  SPELLING_ORDER,
  STEMS,
  TUPLETS,
  type Beaming,
  type Dynamic,
  type Finger,
  type Spelling,
  type Stem,
  type Tuplet,
} from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { rowOf, type BeatRow, type NoteRow } from '../state/edit-caret.ts';
import { applyMarks, editingOf, type Marks } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const e = strings.editing;
const INPUT_CLASS = `${SELECT_CLASS} w-full`;

/** The marks as they are where the dialog was opened. */
interface Opened {
  readonly key: string;
  readonly beat: BeatRow;
  /** The caret's note, if one is written on its string. */
  readonly note: NoteRow | null;
  /** Several beats are selected: their notes are spelled, not one note's. */
  readonly selection: boolean;
}

export const useMarksDialog = create<{ readonly open: Opened | null }>(() => ({ open: null }));

/** Opens the dialog for the caret's beat and note; false when nothing is being edited. */
export function openMarksDialog(key: string): boolean {
  const { on, caret, beats, selection } = editingOf(key);
  const beat = caret === null || beats === null ? null : rowOf(beats, caret.beatId);
  if (!on || caret === null || beat === null) return false;
  const note = beat.notes.find(candidate => candidate.string === caret.string) ?? null;
  useMarksDialog.setState({ open: { key, beat, note, selection: selection !== null } });
  return true;
}

function MarksForm({ open }: { readonly open: Opened }) {
  const id = useId();
  const [dynamics, setDynamics] = useState<Dynamic | ''>(open.beat.dynamics ?? '');
  const [beaming, setBeaming] = useState<Beaming>(open.beat.beaming ?? 'auto');
  const [tuplet, setTuplet] = useState<Tuplet | ''>(open.beat.tuplet ?? '');
  const [stem, setStem] = useState<Stem>(open.beat.stem);
  const [text, setText] = useState(open.beat.text ?? '');
  const [leftFinger, setLeftFinger] = useState<Finger>(open.note?.leftFinger ?? 'none');
  const [rightFinger, setRightFinger] = useState<Finger>(open.note?.rightFinger ?? 'none');
  const [spelling, setSpelling] = useState<Spelling | ''>(open.note?.spelling ?? '');
  const close = () => {
    useMarksDialog.setState({ open: null });
  };
  const apply = () => {
    const was = open.beat;
    const marks: { -readonly [K in keyof Marks]: Marks[K] } = {};
    if (dynamics !== '' && dynamics !== was.dynamics) marks.dynamics = dynamics;
    if (beaming !== (was.beaming ?? 'auto')) marks.beaming = beaming;
    if (tuplet !== '' && tuplet !== was.tuplet) marks.tuplet = tuplet;
    if (stem !== was.stem) marks.stem = stem;
    if (text.trim() !== (was.text ?? '')) marks.text = text.trim().length === 0 ? null : text;
    if (leftFinger !== (open.note?.leftFinger ?? 'none')) marks.leftFinger = leftFinger;
    if (rightFinger !== (open.note?.rightFinger ?? 'none')) marks.rightFinger = rightFinger;
    if (spelling !== '' && spelling !== (open.note?.spelling ?? '')) marks.spelling = spelling;
    if (Object.keys(marks).length > 0) applyMarks(open.key, marks);
    close();
  };
  const noNote = open.note === null;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={event => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={e.dynamics} htmlFor={`${id}-dynamics`}>
          <select
            id={`${id}-dynamics`}
            value={dynamics}
            onChange={event => {
              setDynamics(DYNAMICS.find(value => value === event.target.value) ?? '');
            }}
            className={INPUT_CLASS}
          >
            {dynamics === '' && <option value="">—</option>}
            {DYNAMICS.map(value => (
              <option key={value} value={value}>
                {e.dynamicNames[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={e.spelling} htmlFor={`${id}-spelling`}>
          <select
            id={`${id}-spelling`}
            value={spelling}
            disabled={noNote && !open.selection}
            onChange={event => {
              setSpelling(SPELLING_ORDER.find(value => value === event.target.value) ?? '');
            }}
            className={INPUT_CLASS}
          >
            {spelling === '' && <option value="">—</option>}
            {SPELLING_ORDER.map(value => (
              <option key={value} value={value}>
                {e.spellings[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={e.tuplet} htmlFor={`${id}-tuplet`}>
          <select
            id={`${id}-tuplet`}
            value={tuplet}
            onChange={event => {
              setTuplet(TUPLETS.find(value => value === event.target.value) ?? '');
            }}
            className={INPUT_CLASS}
          >
            {tuplet === '' && <option value="">—</option>}
            {TUPLETS.map(value => (
              <option key={value} value={value}>
                {e.tuplets[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={e.stem} htmlFor={`${id}-stem`}>
          <select
            id={`${id}-stem`}
            value={stem}
            onChange={event => {
              setStem(STEMS.find(value => value === event.target.value) ?? 'auto');
            }}
            className={INPUT_CLASS}
          >
            {STEMS.map(value => (
              <option key={value} value={value}>
                {e.stems[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={e.beaming}>
        <SegmentedControl<Beaming>
          label={e.beaming}
          value={beaming}
          onValueChange={setBeaming}
          segments={BEAMING_ORDER.map(value => ({ value, label: e.beamings[value] }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={e.frettingHand} htmlFor={`${id}-left`}>
          <select
            id={`${id}-left`}
            value={leftFinger}
            disabled={noNote}
            onChange={event => {
              setLeftFinger(FINGERS.find(value => value === event.target.value) ?? 'none');
            }}
            className={INPUT_CLASS}
          >
            {FINGERS.map(value => (
              <option key={value} value={value}>
                {e.leftFingers[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={e.pickingHand} htmlFor={`${id}-right`}>
          <select
            id={`${id}-right`}
            value={rightFinger}
            disabled={noNote}
            onChange={event => {
              setRightFinger(FINGERS.find(value => value === event.target.value) ?? 'none');
            }}
            className={INPUT_CLASS}
          >
            {FINGERS.map(value => (
              <option key={value} value={value}>
                {e.rightFingers[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={e.textLabel} hint={e.textHint} htmlFor={`${id}-text`}>
        <input
          id={`${id}-text`}
          value={text}
          maxLength={200}
          onChange={event => {
            setText(event.target.value);
          }}
          className={INPUT_CLASS}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          {e.textCancel}
        </Button>
        <Button variant="primary" type="submit">
          {e.textApply}
        </Button>
      </div>
    </form>
  );
}

export function MarksDialog() {
  const open = useMarksDialog(state => state.open);
  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) useMarksDialog.setState({ open: null });
      }}
      title={e.marksTitle}
      description={open?.selection === true ? e.marksSelection : e.marksDescription}
      closeLabel={e.textCancel}
    >
      {open !== null && <MarksForm key={`${open.key}:${String(open.beat.beatId)}`} open={open} />}
    </Dialog>
  );
}
