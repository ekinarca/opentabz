/**
 * The edit bar (EDIT-004, EDIT-060, EDIT-123), under the view's toolbar while a score is edited:
 * the track edited, undo and redo, the caret beat's length and dot, frets to tap (for touch
 * screens and the mouse), beats put in and taken away, where the caret is, whether there are
 * changes not saved, saving, and "Done".
 */
import { DURATION_VALUES, type DurationValue } from '@opentabz/core/shared';
import {
  Button,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@opentabz/ui';
import {
  BetweenVerticalStart,
  Download,
  Eraser,
  FoldHorizontal,
  Hash,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import type { OpenDocument } from '../state/documents.ts';
import { fretAtCaret, rowOf } from '../state/edit-caret.ts';
import {
  BEAT_TOGGLE_NAMES,
  beatToggleOn,
  NOTE_TOGGLE_NAMES,
  noteToggleOn,
  restAtCaret,
  toggleBeatTechnique,
  toggleNoteTechnique,
  togglePalmMuteBeat,
  deleteBarAtCaret,
  deleteBeatAtCaret,
  deleteNoteAtCaret,
  insertBarAtCaret,
  insertBeatAtCaret,
  isDirty,
  NOT_EDITING,
  redoEdit,
  setDurationAtCaret,
  toggleDotAtCaret,
  toggleEditing,
  undoEdit,
  useEditing,
  writeFretAtCaret,
} from '../state/editing.ts';
import { strings } from '../strings.ts';
import { DurationIcon } from './icons.tsx';
import { focusScore, shortcutHint } from './keymap.ts';
import { saveDocument } from './save.ts';
import { TrackSelect } from './TrackSelect.tsx';

const e = strings.editing;

/** Frets on the pad: as many as a guitar's neck has, more by typing. */
const PAD_FRETS = Array.from({ length: 25 }, (_, fret) => fret);

/** A technique's shortcut id: its name in kebab case (palmMute: palm-mute). */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/** The strings of the caret's staff. */
function stringCount(doc: OpenDocument, caret: { readonly track: number; readonly staff: number }): number {
  return doc.summary.tracks[caret.track]?.staves[caret.staff]?.stringCount ?? 0;
}

/**
 * The bar's buttons leave the focus where it is when clicked, on the score: the keys go on writing
 * and moving the caret.
 */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

function Divider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />;
}

export function EditBar({ doc }: { readonly doc: OpenDocument }) {
  const editing = useEditing(state => state.docs[doc.key] ?? NOT_EDITING);
  const { caret, beats } = editing;
  const row = caret === null || beats === null ? null : rowOf(beats, caret.beatId);
  const fret = caret === null || beats === null ? null : fretAtCaret(beats, caret);
  const dirty = isDirty(editing);
  const ready = row !== null;
  const key = doc.key;

  return (
    <div
      role="toolbar"
      aria-label={e.bar}
      className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-accent-soft/40 px-3 [scrollbar-width:none]"
    >
      {/* The track edited: the caret goes to it. */}
      <div className="flex shrink-0 items-center gap-1.5 pr-1">
        <TrackSelect doc={doc} />
      </div>
      <Divider />
      <IconButton
        onMouseDown={keepFocus}
        label={e.undo}
        shortcut={shortcutHint('undo')}
        icon={<Undo2 size={18} aria-hidden />}
        disabled={!editing.canUndo}
        onClick={() => {
          undoEdit(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        label={e.redo}
        shortcut={shortcutHint('redo')}
        icon={<Redo2 size={18} aria-hidden />}
        disabled={!editing.canRedo}
        onClick={() => {
          redoEdit(key);
        }}
      />
      <Divider />
      <div role="group" aria-label={e.duration} className="flex shrink-0 items-center">
        {DURATION_VALUES.map((value: DurationValue) => (
          <IconButton
            onMouseDown={keepFocus}
            key={value}
            size="sm"
            label={e.durations[value]}
            icon={<DurationIcon value={value} />}
            pressed={row?.duration === value}
            disabled={!ready}
            onClick={() => {
              setDurationAtCaret(key, value);
            }}
          />
        ))}
        <IconButton
          onMouseDown={keepFocus}
          size="sm"
          label={e.dotted}
          shortcut={shortcutHint('dot')}
          icon={<DurationIcon value={4} dotted />}
          pressed={(row?.dots ?? 0) > 0}
          disabled={!ready}
          onClick={() => {
            toggleDotAtCaret(key);
          }}
        />
      </div>
      <Divider />
      <Popover>
        <Tooltip label={e.fretPad}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={e.fretPad}
              disabled={!ready}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <Hash size={18} aria-hidden />
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent label={e.fretPad} className="p-2">
          <div className="grid grid-cols-5 gap-1">
            {PAD_FRETS.map(value => (
              <button
                key={value}
                type="button"
                aria-label={e.fret(value)}
                aria-pressed={fret === value}
                onClick={() => {
                  writeFretAtCaret(key, value);
                }}
                className="inline-flex size-10 items-center justify-center rounded-md font-mono text-sm text-ink tabular-nums hover:bg-sunken aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                {value}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <IconButton
        onMouseDown={keepFocus}
        label={e.insertBeat}
        shortcut={shortcutHint('insert-beat')}
        icon={<Plus size={18} aria-hidden />}
        disabled={!ready}
        onClick={() => {
          insertBeatAtCaret(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        label={e.deleteNote}
        shortcut={shortcutHint('delete-note')}
        icon={<Eraser size={18} aria-hidden />}
        disabled={fret === null}
        onClick={() => {
          deleteNoteAtCaret(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        label={e.deleteBeat}
        shortcut={shortcutHint('delete-beat')}
        icon={<Trash2 size={18} aria-hidden />}
        disabled={!ready}
        onClick={() => {
          deleteBeatAtCaret(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        label={e.insertBar}
        shortcut={shortcutHint('insert-bar')}
        icon={<BetweenVerticalStart size={18} aria-hidden />}
        disabled={!ready}
        onClick={() => {
          insertBarAtCaret(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        label={e.deleteBar}
        shortcut={shortcutHint('delete-bar')}
        icon={<FoldHorizontal size={18} aria-hidden />}
        disabled={!ready || doc.summary.masterBars.length <= 1}
        onClick={() => {
          deleteBarAtCaret(key);
        }}
      />
      <Menu>
        <Tooltip label={e.techniques}>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={e.techniques}
              disabled={!ready}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <Sparkles size={18} aria-hidden />
            </button>
          </MenuTrigger>
        </Tooltip>
        <MenuContent
          onCloseAutoFocus={event => {
            // Back to the score, for the keys to go on writing.
            event.preventDefault();
            focusScore();
          }}
        >
          <MenuLabel>{e.onNote}</MenuLabel>
          {NOTE_TOGGLE_NAMES.map(toggle => (
            <MenuCheckboxItem
              key={toggle}
              checked={noteToggleOn(editing, toggle)}
              shortcut={shortcutHint(kebab(toggle))}
              onCheckedChange={() => {
                toggleNoteTechnique(key, toggle);
              }}
            >
              {strings.shortcuts.actions[toggle]}
            </MenuCheckboxItem>
          ))}
          <MenuSeparator />
          <MenuLabel>{e.onBeat}</MenuLabel>
          <MenuItem
            shortcut={shortcutHint('rest')}
            onSelect={() => {
              restAtCaret(key);
            }}
          >
            {strings.shortcuts.actions.rest}
          </MenuItem>
          <MenuItem
            shortcut={shortcutHint('palm-mute-beat')}
            onSelect={() => {
              togglePalmMuteBeat(key);
            }}
          >
            {strings.shortcuts.actions.palmMuteBeat}
          </MenuItem>
          {BEAT_TOGGLE_NAMES.map(toggle => (
            <MenuCheckboxItem
              key={toggle}
              checked={beatToggleOn(editing, toggle)}
              shortcut={shortcutHint(kebab(toggle))}
              onCheckedChange={() => {
                toggleBeatTechnique(key, toggle);
              }}
            >
              {strings.shortcuts.actions[toggle]}
            </MenuCheckboxItem>
          ))}
        </MenuContent>
      </Menu>
      <Divider />
      <p aria-live="polite" className="min-w-0 shrink truncate px-1 text-[12px] text-ink-muted">
        {editing.noStrings
          ? e.noStrings
          : caret === null || row === null
            ? ''
            : // Strings counted from the highest, as players count them.
              e.caret(row.bar + 1, stringCount(doc, caret) - caret.string + 1, fret)}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        {dirty && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            {e.unsaved}
          </span>
        )}
        <Button
          size="sm"
          icon={<Download size={16} aria-hidden />}
          onClick={() => {
            void saveDocument(key);
          }}
          title={e.save}
        >
          {e.saveShort}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            void toggleEditing(key);
          }}
        >
          {e.done}
        </Button>
      </div>
    </div>
  );
}
