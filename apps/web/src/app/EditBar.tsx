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
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '@opentabz/ui';
import {
  BetweenVerticalStart,
  Check,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  Ellipsis,
  Eraser,
  FoldHorizontal,
  Hash,
  ListPlus,
  Plus,
  Redo2,
  Scissors,
  SquareDashedMousePointer,
  Settings2,
  SlidersHorizontal,
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
  copySelection,
  cutSelection,
  deleteBarAtCaret,
  deleteBeatAtCaret,
  deleteNoteAtCaret,
  duplicateTrack,
  insertBarAtCaret,
  insertBeatAtCaret,
  isDirty,
  NOT_EDITING,
  pasteAtCaret,
  redoEdit,
  selectAllToEdit,
  selectBarAtCaret,
  setDurationAtCaret,
  toggleDotAtCaret,
  toggleEditing,
  undoEdit,
  useClipboard,
  useEditing,
  writeFretAtCaret,
} from '../state/editing.ts';
import { strings } from '../strings.ts';
import { openBarDialog } from './BarDialog.tsx';
import { DurationIcon } from './icons.tsx';
import { focusScore, shortcutHint } from './keymap.ts';
import { saveDocument } from './save.ts';
import { openAddTrack, openTrackDialog } from './TrackDialog.tsx';
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

/** A menu of the bar, closing, gives the focus back to the score, for the keys to go on writing. */
function backToScore(event: Event): void {
  event.preventDefault();
  focusScore();
}

function Divider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-line max-md:hidden" aria-hidden />;
}

export function EditBar({ doc }: { readonly doc: OpenDocument }) {
  const editing = useEditing(state => state.docs[doc.key] ?? NOT_EDITING);
  const { caret, beats } = editing;
  const row = caret === null || beats === null ? null : rowOf(beats, caret.beatId);
  const fret = caret === null || beats === null ? null : fretAtCaret(beats, caret);
  const dirty = isDirty(editing);
  const ready = row !== null;
  const key = doc.key;
  const selected = editing.selection !== null;
  const copied = useClipboard(state => state.clip !== null);

  return (
    <div
      role="toolbar"
      aria-label={e.bar}
      className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-accent-soft/40 px-2 [scrollbar-width:none] md:px-3"
    >
      {/* The track edited: the caret goes to it. */}
      <div className="flex shrink-0 items-center gap-1.5 pr-1">
        <TrackSelect doc={doc} compact />
        <IconButton
          onMouseDown={keepFocus}
          size="sm"
          className="max-xl:hidden"
          label={strings.trackDialog.open}
          icon={<Settings2 size={16} aria-hidden />}
          onClick={() => {
            openTrackDialog(key);
          }}
        />
        <IconButton
          onMouseDown={keepFocus}
          size="sm"
          className="max-xl:hidden"
          label={strings.trackDialog.add}
          shortcut={shortcutHint('add-track')}
          icon={<ListPlus size={16} aria-hidden />}
          onClick={() => {
            openAddTrack(key);
          }}
        />
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
      {/* On a narrow screen redo is in the "More editing tools" menu. */}
      <IconButton
        onMouseDown={keepFocus}
        className="max-md:hidden"
        label={e.redo}
        shortcut={shortcutHint('redo')}
        icon={<Redo2 size={18} aria-hidden />}
        disabled={!editing.canRedo}
        onClick={() => {
          redoEdit(key);
        }}
      />
      <Divider />
      <div role="group" aria-label={e.duration} className="flex shrink-0 items-center max-xl:hidden">
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
      {/* On a narrow screen the lengths are one menu, showing the caret note's. */}
      <Menu>
        <Tooltip label={e.duration}>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={e.duration}
              disabled={!ready}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40 xl:hidden"
            >
              <DurationIcon
                value={DURATION_VALUES.find(value => value === row?.duration) ?? 4}
                dotted={(row?.dots ?? 0) > 0}
              />
            </button>
          </MenuTrigger>
        </Tooltip>
        <MenuContent onCloseAutoFocus={backToScore}>
          <MenuRadioGroup<string>
            value={String(row?.duration ?? '')}
            onValueChange={value => {
              const duration = DURATION_VALUES.find(candidate => String(candidate) === value);
              if (duration !== undefined) setDurationAtCaret(key, duration);
            }}
          >
            {DURATION_VALUES.map((value: DurationValue) => (
              <MenuRadioItem key={value} value={String(value)}>
                <span className="inline-flex items-center gap-2">
                  <DurationIcon value={value} size={16} />
                  {e.durations[value]}
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuCheckboxItem
            checked={(row?.dots ?? 0) > 0}
            onCheckedChange={() => {
              toggleDotAtCaret(key);
            }}
          >
            {e.dotted}
          </MenuCheckboxItem>
        </MenuContent>
      </Menu>
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
        className="max-xl:hidden"
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
        className="max-xl:hidden"
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
        className="max-xl:hidden"
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
        className="max-xl:hidden"
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
        className="max-xl:hidden"
        label={e.deleteBar}
        shortcut={shortcutHint('delete-bar')}
        icon={<FoldHorizontal size={18} aria-hidden />}
        disabled={!ready || doc.summary.masterBars.length <= 1}
        onClick={() => {
          deleteBarAtCaret(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        className="max-xl:hidden"
        label={strings.barDialog.open}
        icon={<SlidersHorizontal size={18} aria-hidden />}
        disabled={!ready}
        onClick={() => {
          openBarDialog(key);
        }}
      />
      {/* What is selected copied, cut, and pasted at the caret (EDIT-020). */}
      <IconButton
        onMouseDown={keepFocus}
        className="max-xl:hidden"
        label={e.copy}
        shortcut={shortcutHint('copy')}
        icon={<Copy size={18} aria-hidden />}
        disabled={!selected}
        onClick={() => {
          copySelection(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        className="max-xl:hidden"
        label={e.cut}
        shortcut={shortcutHint('cut')}
        icon={<Scissors size={18} aria-hidden />}
        disabled={!selected}
        onClick={() => {
          cutSelection(key);
        }}
      />
      <IconButton
        onMouseDown={keepFocus}
        className="max-xl:hidden"
        label={e.paste}
        shortcut={shortcutHint('paste')}
        icon={<ClipboardPaste size={18} aria-hidden />}
        disabled={!ready || !copied}
        onClick={() => {
          pasteAtCaret(key);
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
        <MenuContent onCloseAutoFocus={backToScore}>
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
      <p
        aria-live="polite"
        className="min-w-0 shrink truncate px-1 text-[12px] text-ink-muted max-md:sr-only"
      >
        {editing.noStrings
          ? e.noStrings
          : caret === null || row === null
            ? ''
            : // Strings counted from the highest, as players count them.
              e.caret(row.bar + 1, stringCount(doc, caret) - caret.string + 1, fret)}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2 md:pl-2">
        {dirty && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            <span className="max-xl:sr-only">{e.unsaved}</span>
          </span>
        )}
        <Button
          size="sm"
          icon={<Download size={16} aria-hidden />}
          onClick={() => {
            void saveDocument(key);
          }}
          title={e.save}
          className="max-md:hidden"
        >
          {e.saveShort}
        </Button>
        {/* On a narrow screen the rest of the bar's tools are one menu. */}
        <Menu>
          <Tooltip label={e.more}>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={e.more}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-sunken hover:text-ink xl:hidden"
              >
                <Ellipsis size={18} aria-hidden />
              </button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent align="end" onCloseAutoFocus={backToScore}>
            <MenuItem
              icon={<Redo2 size={16} aria-hidden />}
              disabled={!editing.canRedo}
              onSelect={() => redoEdit(key)}
            >
              {e.redo}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<SquareDashedMousePointer size={16} aria-hidden />}
              disabled={!ready}
              onSelect={() => selectBarAtCaret(key)}
            >
              {e.selectBar}
            </MenuItem>
            <MenuItem onSelect={() => selectAllToEdit(key)}>{e.selectAll}</MenuItem>
            <MenuItem
              icon={<Copy size={16} aria-hidden />}
              disabled={!selected}
              onSelect={() => copySelection(key)}
            >
              {e.copy}
            </MenuItem>
            <MenuItem
              icon={<Scissors size={16} aria-hidden />}
              disabled={!selected}
              onSelect={() => cutSelection(key)}
            >
              {e.cut}
            </MenuItem>
            <MenuItem
              icon={<ClipboardPaste size={16} aria-hidden />}
              disabled={!ready || !copied}
              onSelect={() => pasteAtCaret(key)}
            >
              {e.paste}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<Plus size={16} aria-hidden />}
              disabled={!ready}
              onSelect={() => insertBeatAtCaret(key)}
            >
              {e.insertBeat}
            </MenuItem>
            <MenuItem
              icon={<Eraser size={16} aria-hidden />}
              disabled={fret === null}
              onSelect={() => deleteNoteAtCaret(key)}
            >
              {e.deleteNote}
            </MenuItem>
            <MenuItem
              icon={<Trash2 size={16} aria-hidden />}
              disabled={!ready}
              onSelect={() => deleteBeatAtCaret(key)}
            >
              {e.deleteBeat}
            </MenuItem>
            <MenuItem
              icon={<BetweenVerticalStart size={16} aria-hidden />}
              disabled={!ready}
              onSelect={() => insertBarAtCaret(key)}
            >
              {e.insertBar}
            </MenuItem>
            <MenuItem
              icon={<FoldHorizontal size={16} aria-hidden />}
              disabled={!ready || doc.summary.masterBars.length <= 1}
              onSelect={() => deleteBarAtCaret(key)}
            >
              {e.deleteBar}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<SlidersHorizontal size={16} aria-hidden />}
              disabled={!ready}
              onSelect={() => openBarDialog(key)}
            >
              {strings.barDialog.open}
            </MenuItem>
            <MenuItem icon={<Settings2 size={16} aria-hidden />} onSelect={() => openTrackDialog(key)}>
              {strings.trackDialog.open}
            </MenuItem>
            <MenuItem icon={<ListPlus size={16} aria-hidden />} onSelect={() => openAddTrack(key)}>
              {strings.trackDialog.add}
            </MenuItem>
            <MenuItem
              icon={<CopyPlus size={16} aria-hidden />}
              onSelect={() => duplicateTrack(key, doc.activeTrack)}
            >
              {e.duplicateTrack}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Download size={16} aria-hidden />} onSelect={() => void saveDocument(key)}>
              {e.save}
            </MenuItem>
          </MenuContent>
        </Menu>
        <Button
          size="sm"
          variant="primary"
          className="max-md:hidden"
          onClick={() => {
            void toggleEditing(key);
          }}
        >
          {e.done}
        </Button>
        <Tooltip label={e.done}>
          <button
            type="button"
            aria-label={e.done}
            onClick={() => {
              void toggleEditing(key);
            }}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent text-on-accent shadow-sm hover:bg-accent-hover md:hidden"
          >
            <Check size={18} aria-hidden />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
