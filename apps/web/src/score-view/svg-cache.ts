/**
 * Painted SVG markup of partials that scrolled out of view, kept so that scrolling back
 * re-attaches them without a worker round trip. Bounded by size, least recently used first, so a
 * long score scrolled end to end does not keep every system's markup alive.
 */

/** Default budget: 24 million UTF-16 code units (about 48 MB of strings). */
export const SVG_CACHE_BUDGET = 24 * 1024 * 1024;

export class SvgCache {
  private readonly entries = new Map<string, string>();
  private readonly budget: number;
  private size = 0;

  public constructor(budget = SVG_CACHE_BUDGET) {
    this.budget = budget;
  }

  /** Total length of the cached markup. */
  public get length(): number {
    return this.size;
  }

  public get count(): number {
    return this.entries.size;
  }

  /** Returns the markup and marks it as recently used. */
  public get(id: string): string | undefined {
    const svg = this.entries.get(id);
    if (svg === undefined) return undefined;
    this.entries.delete(id);
    this.entries.set(id, svg);
    return svg;
  }

  public has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Stores markup, then evicts the least recently used entries until the cache is within budget.
   * Entries for which `keep` returns true (partials on screen) are never evicted. Returns the ids
   * that were evicted.
   */
  public set(id: string, svg: string, keep: (id: string) => boolean = () => false): string[] {
    const previous = this.entries.get(id);
    if (previous !== undefined) {
      this.size -= previous.length;
      this.entries.delete(id);
    }
    this.entries.set(id, svg);
    this.size += svg.length;

    const evicted: string[] = [];
    if (this.size <= this.budget) return evicted;
    for (const [candidate, markup] of this.entries) {
      if (this.size <= this.budget) break;
      if (candidate === id || keep(candidate)) continue;
      this.entries.delete(candidate);
      this.size -= markup.length;
      evicted.push(candidate);
    }
    return evicted;
  }

  public clear(): void {
    this.entries.clear();
    this.size = 0;
  }
}
