# Keyboard shortcuts and gestures

Every shortcut OpenTabz supports today. Keys follow Guitar Pro 8 wherever it has a shortcut for
the same action, so switching is painless. The source of truth is the keymap in
[`apps/web/src/app/keymap.ts`](../apps/web/src/app/keymap.ts); a test checks that every entry
appears below with the same keys. Press `?` in the app to see the same list.

## Rules

- Score shortcuts work only while a score is open.
- Keys keep their usual meaning wherever focus gives them one: nothing happens while you type in
  a text field, and inside a dialog, menu or popover the keys belong to it. On a focused button
  or link, Space, Enter and the arrow keys keep their usual meaning, while typed characters
  (`-`, `=`, `?`), shortcuts with ⌘/Ctrl or Alt, function keys and Esc still work. Sliders, menus
  and other widgets keep typed characters too.
- Single-key shortcuts (`-`, `=`, `?` …) can be turned off in the shortcut sheet, for screen
  reader users and keyboards that need those keys (WCAG 2.2 SC 2.1.4).
- On macOS, ⌘⌥← and ⌘⌥→ switch browser tabs before a web page sees them, so the sections also
  answer to ⌥ Page Up and ⌥ Page Down.
- In the standalone metronome, `T` taps the tempo (outside its text fields).

## Playback

| Action                                           | Windows and Linux | macOS      |
| ------------------------------------------------ | ----------------- | ---------- |
| Play or pause                                    | `Space`           | `Space`    |
| Stop and go back to the start (of the selection) | `Shift Space`     | `⇧ Space`  |
| Loop on or off                                   | `F9`              | `F9`       |
| Playback speed…                                  | `Ctrl F9`         | `⌘ F9`     |
| Slower (5 %)                                     | `-` or `_`        | `-` or `_` |
| Faster (5 %)                                     | `=` or `+`        | `=` or `+` |
| Metronome on or off                              | `Alt M`           | `⌥ M`      |
| Count-in on or off                               | `Alt C`           | `⌥ C`      |

## Moving around

| Action                     | Windows and Linux               | macOS                    |
| -------------------------- | ------------------------------- | ------------------------ |
| Previous beat              | `←`                             | `←`                      |
| Next beat                  | `→`                             | `→`                      |
| Previous beat, and hear it | `Alt ←`                         | `⌥ ←`                    |
| Next beat, and hear it     | `Alt →`                         | `⌥ →`                    |
| Previous bar               | `Ctrl ←`                        | `⌘ ←`                    |
| Next bar                   | `Ctrl →`                        | `⌘ →`                    |
| Previous section           | `Ctrl Alt ←` or `Alt Page Up`   | `⌘ ⌥ ←` or `⌥ Page Up`   |
| Next section               | `Ctrl Alt →` or `Alt Page Down` | `⌘ ⌥ →` or `⌥ Page Down` |
| Start of the bar           | `Home`                          | `Home`                   |
| Last beat of the bar       | `End`                           | `End`                    |
| First bar                  | `Ctrl Home`                     | `⌘ Home`                 |
| Last bar                   | `Ctrl End`                      | `⌘ End`                  |
| Go to bar or section…      | `Ctrl G`                        | `⌘ G`                    |

## Selecting

| Action                                       | Windows and Linux | macOS      |
| -------------------------------------------- | ----------------- | ---------- |
| Extend the selection one beat left           | `Shift ←`         | `⇧ ←`      |
| Extend the selection one beat right          | `Shift →`         | `⇧ →`      |
| Extend the selection one bar left            | `Ctrl Shift ←`    | `⌘ ⇧ ←`    |
| Extend the selection one bar right           | `Ctrl Shift →`    | `⌘ ⇧ →`    |
| Extend the selection to the start of the bar | `Shift Home`      | `⇧ Home`   |
| Extend the selection to the end of the bar   | `Shift End`       | `⇧ End`    |
| Extend the selection to the start            | `Ctrl Shift Home` | `⌘ ⇧ Home` |
| Extend the selection to the end              | `Ctrl Shift End`  | `⌘ ⇧ End`  |
| Select everything                            | `Ctrl A`          | `⌘ A`      |
| Clear the selection                          | `Esc`             | `Esc`      |

## View

| Action              | Windows and Linux    | macOS          |
| ------------------- | -------------------- | -------------- |
| Zoom in             | `Ctrl =` or `Ctrl +` | `⌘ =` or `⌘ +` |
| Zoom out            | `Ctrl -` or `Ctrl _` | `⌘ -` or `⌘ _` |
| Zoom to 100 %       | `Ctrl 0`             | `⌘ 0`          |
| Fretboard on or off | `Ctrl F6`            | `⌘ F6`         |
| Previous track      | `Ctrl ↑`             | `⌘ ↑`          |
| Next track          | `Ctrl ↓`             | `⌘ ↓`          |

## Files

| Action          | Windows and Linux | macOS |
| --------------- | ----------------- | ----- |
| Open files      | `Ctrl O`          | `⌘ O` |
| Print the score | `Ctrl P`          | `⌘ P` |

## Help

| Action                  | Windows and Linux | macOS |
| ----------------------- | ----------------- | ----- |
| Show keyboard shortcuts | `?`               | `?`   |

## Pointer and touch gestures

| Gesture                                   | Action                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap a note                       | Move playback to that beat. A beat outside the selection clears it.                                                             |
| Drag across the music (mouse or trackpad) | Select from the beat where the drag starts to the beat under the pointer. Hold the pointer near the edge of the view to scroll. |
| Shift-click                               | Extend the selection to the clicked beat. With no selection, select from the start of the playing bar.                          |
| Double-click or double-tap                | Select that bar.                                                                                                                |
| Triple-click or triple-tap                | Select everything.                                                                                                              |
| Long-press a bar (finger or pen)          | Select that bar.                                                                                                                |
| Drag a selection handle                   | Move the start or the end of the selection, with a mouse, a finger or a pen. The view scrolls near its edges.                   |
| Drop files anywhere                       | Open them. A dropped folder is explained instead.                                                                               |

## What the selection does

Once a range is selected, playback stays inside it: Play starts at the start of the selection and
stops at its end, and with Loop on the selection repeats. If you change the selection while it
plays, playback continues from the current beat as long as that beat is still selected;
otherwise it jumps to the start of the new selection.

On phones, Stop, Clear selection, Metronome and Count-in are in the `⋯` menu of the playback bar.
