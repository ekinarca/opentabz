# Keyboard shortcuts and gestures

This page lists every shortcut and pointer gesture that OpenTabz supports today. It grows with
each milestone. The source of truth is
[`apps/web/src/app/use-shortcuts.ts`](../apps/web/src/app/use-shortcuts.ts) for keys and
[`apps/web/src/score-view/score-view.ts`](../apps/web/src/score-view/score-view.ts) for gestures.
A change to either file must update this page in the same commit.

`Mod` means ⌘ on macOS, iOS and iPadOS, and Ctrl everywhere else.

## Rules

- Single keys (Space, the arrows, Esc) work only while a score is open. They do nothing while
  focus is in a text field, a slider, a menu or a dialog, so those controls keep their usual
  keys. Space and the arrows also do nothing while focus is on a button or a link.
- OpenTabz overrides a browser shortcut only when it does the same thing for the score. For
  example, `Mod` `+` zooms the score instead of the page. If no score is open, the browser
  shortcut works as usual.
- No shortcut uses a single letter key, so screen reader quick-navigation keys keep working
  (WCAG 2.2 SC 2.1.4).

## Playback

| Keys                      | Action                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Space`                   | Play or pause.                                                                                                                                     |
| `Shift` `Space`           | Stop and go back to the start, or to the start of the selection.                                                                                   |
| `←` / `→`                 | Go to the previous or next bar, in the order the bars are played. If playback is past the start of a bar, `←` first goes back to that bar's start. |
| `Shift` `→` / `Shift` `←` | Grow or shrink the selection by one bar at its end. With no selection, `Shift` `→` selects the bar that is playing.                                |
| `Esc`                     | Clear the selection.                                                                                                                               |

## Files

| Keys      | Action                                                                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mod` `O` | Open files.                                                                                                                                                                                                                             |
| `Mod` `V` | Open what is on the clipboard. Files open as files. A single `https://` link opens the file it points to. Any other text, such as alphaTex, ASCII tab or ChordPro, opens as a score. This does not work while focus is in a text field. |

## View

| Keys                   | Action                      |
| ---------------------- | --------------------------- |
| `Mod` `=` or `Mod` `+` | Zoom in.                    |
| `Mod` `-`              | Zoom out.                   |
| `Mod` `0`              | Set the zoom back to 100 %. |

## Pointer and touch gestures

| Gesture                                   | Action                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap a note                       | Move playback to that beat. If a selection exists and the beat is outside it, the selection is cleared.                                 |
| Drag across the music (mouse or trackpad) | Select a range from the beat where the drag starts to the beat under the pointer. Hold the pointer near the edge of the view to scroll. |
| `Shift` click                             | Extend the selection to the clicked beat. With no selection, select from the start of the playing bar.                                  |
| Long-press a bar (finger or pen)          | Select that bar.                                                                                                                        |
| Drag a selection handle                   | Move the start or the end of the selection. This works with a mouse, a finger or a pen, and the view scrolls near its edges.            |
| Drop files anywhere                       | Open them. If you drop a folder, OpenTabz explains why it cannot open it.                                                               |

## What the selection does

Once a range is selected, playback stays inside it. Play starts at the start of the selection
and stops at its end. When Loop is on, the selection repeats. If you change the selection while
it plays, playback continues from the current beat, as long as that beat is still inside the
selection. Otherwise playback jumps to the start of the new selection.

On phones, Stop, Clear selection, Metronome and Count-in are in the `⋯` menu of the playback bar.
