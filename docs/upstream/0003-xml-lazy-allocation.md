# 0003 — Allocate XML child lists and attribute maps on first use

## Problem

Guitar Pro 7 and 8 files are ZIP archives holding one XML document (`score.gpif`). alphaTab
parses it into its own DOM (`XmlNode`) before building the score. Every node is created with an
empty child array and an empty `Map` for attributes, whether it will ever have children or
attributes or not: text nodes and most leaf elements never do.

The 20-track, 500-bar performance fixture (`pnpm fixtures` → `perf-20x500.gp`, 102,515 notes)
has 61 MB of XML and about 4.6 million nodes. Profiling `ScoreLoader.loadScoreFromBytes` in
Node showed 34 % of the time in garbage collection and 22 % in the XML parser loop.

## Change

`src/xml/XmlNode.ts`:

```ts
const EMPTY_XML_NODES: XmlNode[] = Object.freeze([]) as unknown as XmlNode[];

export class XmlNode {
  public childNodes: XmlNode[] = EMPTY_XML_NODES;
  private _attributes: Map<string, string> | null = null;

  public get attributes(): Map<string, string> {
    return (this._attributes ??= new Map<string, string>());
  }
  public set attributes(value: Map<string, string>) {
    this._attributes = value;
  }

  public addChild(node: XmlNode): void {
    if (this.childNodes === EMPTY_XML_NODES) {
      this.childNodes = [];
    }
    this.childNodes.push(node);
    // … unchanged …
  }

  public getAttribute(name: string, defaultValue: string = ''): string {
    const attributes = this._attributes;
    if (attributes !== null && attributes.has(name)) {
      return attributes.get(name)!;
    }
    return defaultValue;
  }
}
```

The shared empty array is frozen, so any code that pushed into `childNodes` directly would fail
loudly instead of corrupting other nodes; in 1.8.4 only `addChild` pushes, and the `innerText`
setter and `setCData` assign a new array.

## Evidence

Loading `perf-20x500.gp` five times in Node 24 (Apple silicon):

| Build   | Times (ms)                   |
| ------- | ---------------------------- |
| 1.8.4   | 1440, 1309, 1183, 1105, 1276 |
| patched | 1051, 966, 993, 923, 906     |

In Chromium, dropping the same file renders the first page in about 1.0 s (budget 1.5 s).

## Correctness

Every fixture in the repository (389 files: Guitar Pro 3–8, GPX, MusicXML and compressed
MusicXML, Capella, alphaTex, corrupt files) was loaded with the original and the patched build,
and the full scores were compared as JSON (`JsonConverter.scoreToJsObject`). All 382 readable
files produced identical scores and the 3 unreadable ones failed identically. Chord ids, which
the Guitar Pro 3–5 importer generates randomly, were normalised before comparing.
