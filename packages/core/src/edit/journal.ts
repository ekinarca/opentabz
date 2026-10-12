/**
 * What an edit changed, field by field, to undo and redo it exactly (EDIT-060). The score's objects
 * an edit may change are kept as they were before it (their own fields, lists and maps copied);
 * once it is made, only the fields that changed are kept, as they were and as they are. Putting
 * the first back undoes the edit, the second does it again. Objects an edit makes are not kept:
 * undone, nothing reaches them, and they wait unchanged to be put back in place.
 */

/** A field the object did not have. */
const ABSENT: unique symbol = Symbol('absent');

type State = ReadonlyMap<string, unknown>;

/** A field's value, a list, map or set copied so that later changes leave the copy as it was. */
function copied(value: unknown): unknown {
  if (Array.isArray(value)) return [...(value as readonly unknown[])];
  if (value instanceof Map) return new Map(value as ReadonlyMap<unknown, unknown>);
  if (value instanceof Set) return new Set(value as ReadonlySet<unknown>);
  return value;
}

/** Whether two values of a field are the same: lists, maps and sets by what they hold. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = a as readonly unknown[];
    const right = b as readonly unknown[];
    return left.length === right.length && left.every((item, index) => item === right[index]);
  }
  if (a instanceof Map && b instanceof Map) {
    const left = a as ReadonlyMap<unknown, unknown>;
    const right = b as ReadonlyMap<unknown, unknown>;
    return (
      left.size === right.size && [...left].every(([key, item]) => right.has(key) && right.get(key) === item)
    );
  }
  if (a instanceof Set && b instanceof Set) {
    const left = a as ReadonlySet<unknown>;
    const right = b as ReadonlySet<unknown>;
    return left.size === right.size && [...left].every(item => right.has(item));
  }
  return false;
}

/** An object's fields as they are now: all of them, or only those named. */
function stateOf(target: object, keys: ReadonlySet<string> | null = null): State {
  const state = new Map<string, unknown>();
  if (keys === null) {
    for (const [key, value] of Object.entries(target)) state.set(key, copied(value));
    return state;
  }
  for (const key of keys)
    state.set(key, Object.hasOwn(target, key) ? copied(Reflect.get(target, key)) : ABSENT);
  return state;
}

/** Fields to set on objects. */
export class Patch {
  public constructor(private readonly fields: ReadonlyMap<object, State>) {}

  /** How many objects it changes. */
  public get size(): number {
    return this.fields.size;
  }

  public apply(): void {
    for (const [target, fields] of this.fields) {
      for (const [key, value] of fields) {
        if (value === ABSENT) Reflect.deleteProperty(target, key);
        else Reflect.set(target, key, copied(value));
      }
    }
  }
}

/** The objects an edit may change, as they were before it. */
export class Journal {
  private readonly before = new Map<object, State>();
  /** Objects kept by some of their fields only: those an edit may change (a bar's place, say). */
  private readonly fields = new Map<object, Set<string>>();

  /** Keeps an object as it is now, unless it is kept already (as it was earlier). */
  public keep(target: object): void {
    const some = this.fields.get(target);
    if (some !== undefined) {
      // Kept by some fields: now all of them, those kept keeping their earlier values.
      const was = this.before.get(target);
      const all = new Map(stateOf(target));
      for (const key of some) all.set(key, was?.has(key) === true ? was.get(key) : ABSENT);
      this.before.set(target, all);
      this.fields.delete(target);
      return;
    }
    if (!this.before.has(target)) this.before.set(target, stateOf(target));
  }

  /**
   * Keeps some of an object's fields as they are now (cheaper than the whole object, for the many
   * bars a bar put in renumbers), unless they are kept already.
   */
  public keepFields(target: object, keys: readonly string[]): void {
    const some = this.fields.get(target);
    if (some === undefined) {
      if (this.before.has(target)) return;
      const set = new Set(keys);
      this.fields.set(target, set);
      this.before.set(target, stateOf(target, set));
      return;
    }
    const was = this.before.get(target);
    if (was === undefined) return;
    const added = keys.filter(key => !some.has(key));
    if (added.length === 0) return;
    const state = new Map(was);
    for (const [key, value] of stateOf(target, new Set(added))) state.set(key, value);
    for (const key of added) some.add(key);
    this.before.set(target, state);
  }

  /** What changed since the objects were kept: the fields that undo it and those that redo it. */
  public changes(): { readonly undo: Patch; readonly redo: Patch } {
    const undo = new Map<object, State>();
    const redo = new Map<object, State>();
    for (const [target, was] of this.before) {
      const now = stateOf(target, this.fields.get(target) ?? null);
      const undoFields = new Map<string, unknown>();
      const redoFields = new Map<string, unknown>();
      for (const key of new Set([...was.keys(), ...now.keys()])) {
        const before = was.has(key) ? was.get(key) : ABSENT;
        const after = now.has(key) ? now.get(key) : ABSENT;
        if (same(before, after)) continue;
        undoFields.set(key, before);
        redoFields.set(key, after);
      }
      if (undoFields.size === 0) continue;
      undo.set(target, undoFields);
      redo.set(target, redoFields);
    }
    return { undo: new Patch(undo), redo: new Patch(redo) };
  }
}
