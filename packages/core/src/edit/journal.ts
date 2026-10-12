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

function stateOf(target: object): State {
  const state = new Map<string, unknown>();
  for (const [key, value] of Object.entries(target)) state.set(key, copied(value));
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

  /** Keeps an object as it is now, unless it is kept already (as it was earlier). */
  public keep(target: object): void {
    if (!this.before.has(target)) this.before.set(target, stateOf(target));
  }

  /** What changed since the objects were kept: the fields that undo it and those that redo it. */
  public changes(): { readonly undo: Patch; readonly redo: Patch } {
    const undo = new Map<object, State>();
    const redo = new Map<object, State>();
    for (const [target, was] of this.before) {
      const now = stateOf(target);
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
