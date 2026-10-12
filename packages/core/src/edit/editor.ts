/**
 * A score being edited (EDIT-001), with its undo and redo (EDIT-060): every edit, as many as are
 * made, undone and done again in turn. One edit may be several commands (a chord typed at once, a
 * selection cleared); it is made and undone whole, and an edit that cannot be made leaves the
 * score as it was.
 */
import type * as alphaTab from '@coderline/alphatab';
import type { EditCommand } from '../shared/edit.ts';
import { runCommand, Transaction } from './commands.ts';
import { Journal, type Patch } from './journal.ts';
import { refinish, refinishStaves, type Region } from './refinish.ts';

export interface EditResult {
  /** The first master bar whose engraving may have changed, to lay out again from. */
  readonly firstChangedMasterBar: number;
}

interface Step {
  /** The score's version once the edit is made. */
  readonly revision: number;
  readonly undo: Patch;
  readonly redo: Patch;
  readonly regions: readonly Region[];
  readonly result: EditResult;
}

export class ScoreEditor {
  private readonly done: Step[] = [];
  private readonly undone: Step[] = [];
  private revisions = 0;

  /**
   * Edits a score. What alphaTab works out from it is worked out once more, as it is after every
   * edit (alphaTab, opening a score, works out a few things from notes it then changes: a tied
   * note's pitch).
   */
  public constructor(
    public readonly score: alphaTab.model.Score,
    private readonly settings: alphaTab.Settings,
  ) {
    refinishStaves(
      score,
      score.tracks.flatMap(track => track.staves),
      settings,
    );
  }

  public get canUndo(): boolean {
    return this.done.length > 0;
  }

  public get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** The score's version: each edit made gives it a new one, undone it is the one before (0). */
  public get revision(): number {
    return this.done.at(-1)?.revision ?? 0;
  }

  /** Makes an edit, which can then be undone; what was undone can no longer be redone. */
  public apply(commands: readonly EditCommand[]): EditResult | null {
    const transaction = new Transaction(this.score, new Journal());
    try {
      for (const command of commands) runCommand(transaction, command);
    } catch (error) {
      // What the commands before changed is put back as it was.
      transaction.journal.changes().undo.apply();
      throw error;
    }
    const regions = transaction.regions;
    if (regions.length === 0) return null;
    refinish(this.score, regions, this.settings, true);
    const { undo, redo } = transaction.journal.changes();
    const result = { firstChangedMasterBar: transaction.firstChangedMasterBar() };
    this.revisions += 1;
    this.done.push({ revision: this.revisions, undo, redo, regions, result });
    this.undone.length = 0;
    return result;
  }

  /** Undoes the last edit, or nothing (null) when there is none. */
  public undo(): EditResult | null {
    const step = this.done.pop();
    if (step === undefined) return null;
    step.undo.apply();
    refinish(this.score, step.regions, this.settings, false);
    this.undone.push(step);
    return step.result;
  }

  /** Makes the last edit undone again, or nothing (null) when there is none. */
  public redo(): EditResult | null {
    const step = this.undone.pop();
    if (step === undefined) return null;
    step.redo.apply();
    refinish(this.score, step.regions, this.settings, false);
    this.done.push(step);
    return step.result;
  }
}
