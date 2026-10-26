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
- Any action's keys can be changed in the shortcut sheet: click its keys, then press the new
  ones (Esc keeps them as they were). Keys another action has are taken from it only when asked;
  one action's keys or every key can be put back. The keys listed below are the actions' own.
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

While the score is edited, the caret moved with Shift selects beats of its voice, from where it
was to where it goes; `Shift ↑` and `Shift ↓` reach the tracks above and below, whole bars of each.
Otherwise these keys select the part of the song played.

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
| Extend the selection to the track above      | `Shift ↑`         | `⇧ ↑`      |
| Extend the selection to the track below      | `Shift ↓`         | `⇧ ↓`      |
| Select everything                            | `Ctrl A`          | `⌘ A`      |
| Clear the selection, or leave full screen    | `Esc`             | `Esc`      |

## Editing

`F2` starts editing the score shown, and stops. While it is edited, a caret marks the beat and
the string the next fret is written on, and the keys below come before their other meanings (the
arrows move the caret, `-` and `+` change the note's length, as in Guitar Pro); they work whatever
the single-key setting. Undo and redo work whenever there is something to undo or redo. Past the last beat of a
bar with room left, `→` puts a rest there for the next note; past the score's last beat, a bar.
Some browsers keep `Ctrl 1` to `4` (`⌘ 1` to `4`) for their tabs; installed, OpenTabz gets them,
and the edit bar's Voice menu chooses the voice anywhere. The techniques' keys are Guitar Pro 8's: each turns its technique on or off on the caret's note, or
its beat.

| Action                                         | Windows and Linux                       | macOS                                   |
| ---------------------------------------------- | --------------------------------------- | --------------------------------------- |
| Edit the score, or stop                        | `F2`                                    | `F2`                                    |
| Undo                                           | `Ctrl Z`                                | `⌘ Z`                                   |
| Redo                                           | `Ctrl Shift Z` or `Ctrl Y`              | `⌘ ⇧ Z` or `⌘ Y`                        |
| Write a fret (two digits quickly for 10 to 99) | `0` `1` `2` `3` `4` `5` `6` `7` `8` `9` | `0` `1` `2` `3` `4` `5` `6` `7` `8` `9` |
| Caret to the previous beat                     | `←`                                     | `←`                                     |
| Caret to the next beat                         | `→`                                     | `→`                                     |
| Caret to the line above                        | `↑`                                     | `↑`                                     |
| Caret to the line below                        | `↓`                                     | `↓`                                     |
| Caret to the previous bar                      | `Ctrl ←`                                | `⌘ ←`                                   |
| Caret to the next bar                          | `Ctrl →`                                | `⌘ →`                                   |
| Delete the note, or the notes selected         | `Backspace` or `Delete`                 | `Backspace` or `Delete`                 |
| Delete the beat, or the beats selected         | `Shift Delete`                          | `⌘ -`                                   |
| Insert a bar                                   | `Insert`                                | `⌘ +`                                   |
| Delete the bar, or the bars selected           | `Ctrl Delete`                           | `⌃ -`                                   |
| Write in voice 1                               | `Ctrl 1`                                | `⌘ 1`                                   |
| Write in voice 2                               | `Ctrl 2`                                | `⌘ 2`                                   |
| Write in voice 3                               | `Ctrl 3`                                | `⌘ 3`                                   |
| Write in voice 4                               | `Ctrl 4`                                | `⌘ 4`                                   |
| Move the notes to voice 1                      | `Alt 1`                                 | `⌥ 1`                                   |
| Move the notes to voice 2                      | `Alt 2`                                 | `⌥ 2`                                   |
| Move the notes to voice 3                      | `Alt 3`                                 | `⌥ 3`                                   |
| Move the notes to voice 4                      | `Alt 4`                                 | `⌥ 4`                                   |
| Move, copy or swap voices…                     | `Ctrl Shift M`                          | `⌘ ⇧ M`                                 |
| Move the note a string up, at its pitch        | `Ctrl Alt ↑`                            | `⌘ ⌥ ↑`                                 |
| Move the note a string down, at its pitch      | `Ctrl Alt ↓`                            | `⌘ ⌥ ↓`                                 |
| Copy the selection                             | `Ctrl C`                                | `⌘ C`                                   |
| Cut the selection                              | `Ctrl X`                                | `⌘ X`                                   |
| Copy whole bars of every track                 | `Ctrl Shift C`                          | `⌘ ⇧ C`                                 |
| Cut whole bars of every track                  | `Ctrl Shift X`                          | `⌘ ⇧ X`                                 |
| Repeat the beat before                         | `C`                                     | `C`                                     |
| Paste at the caret                             | `Ctrl V`                                | `⌘ V`                                   |
| Insert a beat                                  | `Ctrl Insert`                           | `⌃ +`                                   |
| Longer note                                    | `-` or `_`                              | `-` or `_`                              |
| Shorter note                                   | `+` or `=`                              | `+` or `=`                              |
| Dotted or not                                  | `.`                                     | `.`                                     |
| Double-dotted or not                           | `Ctrl .`                                | `⌘ .`                                   |
| Rest                                           | `R`                                     | `R`                                     |
| Triplet                                        | `/`                                     | `/`                                     |
| Tie the note                                   | `L`                                     | `L`                                     |
| Hammer-on or pull-off                          | `H`                                     | `H`                                     |
| Legato slide                                   | `S`                                     | `S`                                     |
| Bend                                           | `B`                                     | `B`                                     |
| Vibrato                                        | `V`                                     | `V`                                     |
| Vibrato with the tremolo bar                   | `W`                                     | `W`                                     |
| Palm mute on the note                          | `P`                                     | `P`                                     |
| Palm mute on the beat                          | `Shift P`                               | `⇧ P`                                   |
| Let ring                                       | `I`                                     | `I`                                     |
| Dead note                                      | `X`                                     | `X`                                     |
| Ghost note                                     | `O`                                     | `O`                                     |
| Natural harmonic                               | `Y`                                     | `Y`                                     |
| Accent                                         | `;`                                     | `;`                                     |
| Heavy accent                                   | `:`                                     | `:`                                     |
| Staccato                                       | `!`                                     | `!`                                     |
| Slap                                           | `$`                                     | `$`                                     |
| Tapping                                        | `)`                                     | `)`                                     |
| Fade in                                        | `<`                                     | `<`                                     |
| Fade out                                       | `>`                                     | `>`                                     |
| Tremolo picking                                | `"`                                     | `"`                                     |
| Downstroke                                     | `Shift D`                               | `⇧ D`                                   |
| Upstroke                                       | `Shift U`                               | `⇧ U`                                   |
| Triplet feel in the bar, or not                | `Ctrl /`                                | `⌘ /`                                   |
| Free time in the bar, or not                   | `Alt Shift L`                           | `⌥ ⇧ L`                                 |
| Add a track                                    | `Ctrl Shift Insert`                     | `⌘ ⌥ N`                                 |

## View

| Action                  | Windows and Linux    | macOS            |
| ----------------------- | -------------------- | ---------------- |
| Zoom in                 | `Ctrl =` or `Ctrl +` | `⌘ =` or `⌘ +`   |
| Zoom out                | `Ctrl -` or `Ctrl _` | `⌘ -` or `⌘ _`   |
| Zoom to 100 %           | `Ctrl 0`             | `⌘ 0`            |
| Fretboard on or off     | `Ctrl F6`            | `⌘ F6`           |
| Song overview on or off | `F8`                 | `F8`             |
| Stylesheet…             | `F7`                 | `F7`             |
| Full screen on or off   | `F11`                | `⌃ ⌘ F` or `F11` |
| Previous track          | `Ctrl ↑`             | `⌘ ↑`            |
| Next track              | `Ctrl ↓`             | `⌘ ↓`            |

## Files

| Action                          | Windows and Linux | macOS |
| ------------------------------- | ----------------- | ----- |
| Open files                      | `Ctrl O`          | `⌘ O` |
| Save as a Guitar Pro file (.gp) | `Ctrl S`          | `⌘ S` |
| Print the score                 | `Ctrl P`          | `⌘ P` |

## Help

| Action                  | Windows and Linux    | macOS          |
| ----------------------- | -------------------- | -------------- |
| Show keyboard shortcuts | `?`                  | `?`            |
| Command palette         | `Ctrl K` or `Ctrl E` | `⌘ K` or `⌘ E` |

## Pointer and touch gestures

| Gesture                                                      | Action                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap a note                                          | Move playback to that beat. A beat outside the selection clears it.                                                             |
| Drag across the music (mouse or trackpad)                    | Select from the beat where the drag starts to the beat under the pointer. Hold the pointer near the edge of the view to scroll. |
| Shift-click                                                  | Extend the selection to the clicked beat. With no selection, select from the start of the playing bar.                          |
| Double-click or double-tap                                   | Select that bar.                                                                                                                |
| Triple-click or triple-tap                                   | Select everything.                                                                                                              |
| Long-press a bar (finger or pen)                             | Select that bar.                                                                                                                |
| Drag a selection handle                                      | Move the start or the end of the selection, with a mouse, a finger or a pen. The view scrolls near its edges.                   |
| ⌘/Ctrl with the wheel over the score                         | Zoom in or out around the pointer, from 10 % to 800 %.                                                                          |
| Pinch the score (trackpad, or two fingers on a touch screen) | Zoom around the fingers; the page around the score keeps its size.                                                              |
| Click a square of the song overview                          | Go to that bar and make its track the active one. Drag across squares (mouse or pen) to select bars.                            |
| Drop files anywhere                                          | Open them. A dropped folder opens the scores in it and in the folders inside it.                                                |

## What the selection does

Once a range is selected, playback stays inside it: Play starts at the start of the selection and
stops at its end, and with Loop on the selection repeats. If you change the selection while it
plays, playback continues from the current beat as long as that beat is still selected;
otherwise it jumps to the start of the new selection.

On phones, Stop, Clear selection, Metronome and Count-in are in the `⋯` menu of the playback bar.
