/**
 * The landing page: the whole window is the drop zone, with one primary action (Open a file).
 *
 * Its centrepiece is the stage, a live tablature staff across the full width. On load the six
 * strings are ruled in and the opening bars of one of OpenTabz's own demo scores are engraved note
 * by note; each note plucks its string. Then everything rests (the intro ends within five seconds)
 * and the strings answer the pointer: move across them to strum. While a file is dragged over the
 * window they ring in the accent colour, and dragging the file across them strums them too. With
 * `prefers-reduced-motion: reduce` the stage is drawn complete and never moves.
 *
 * Like ScoreView, the stage is a framework-free class wrapped by a thin component, so its animation
 * frames never go through React.
 */
import { LogoMark } from '@opentabz/ui';
import { FilePlus2, Link2 } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useDocuments } from '../state/documents.ts';
import { usePreferences } from '../state/preferences.ts';
import { useRecentScores } from '../state/recent-scores.ts';
import { recentSource } from '../state/session.ts';
import { strings } from '../strings.ts';
import { DEMOS, demoSource } from './demos.ts';
import { newScore } from './new-score.ts';
import { pickFiles } from './open-actions.ts';
import { modKey } from './platform.ts';

/* Excerpt ------------------------------------------------------------------------------------- */

/** One beat: [fret, string], string 1 = high E (the top line of a tab staff). */
type Beat = readonly [fret: number, string: number];

/**
 * The first eight bars of the Arpeggio Study in E minor (fixtures/alphatex/demos/arpeggio-study.atex),
 * original music written for OpenTabz, as alphaTex `fret.string` beats. It opens on open strings:
 * the 0 of the OpenTabz mark.
 */
const EXCERPT: readonly (readonly Beat[])[] = [
  '0.6 0.3 0.2 0.1 0.2 0.3 0.2 0.1',
  '0.5 2.3 1.2 0.1 1.2 2.3 1.2 0.1',
  '2.5 2.3 0.2 2.1 0.2 2.3 0.2 2.1',
  '0.6 0.3 0.2 0.1 0.2 0.3 0.2 0.1',
  '3.5 0.3 1.2 0.1 1.2 0.3 1.2 0.1',
  '0.5 2.3 1.2 0.1 1.2 2.3 1.2 0.1',
  '0.4 2.3 3.2 2.1 3.2 2.3 3.2 2.1',
  '3.6 0.3 0.2 3.1 0.2 0.3 0.2 3.1',
].map(bar =>
  bar.split(' ').map(beat => {
    const [fret = 0, string = 1] = beat.split('.').map(Number);
    return [fret, string] as const;
  }),
);

/* Layout -------------------------------------------------------------------------------------- */

const STRING_COUNT = 6;
/** String thickness relative to the line spacing, high E first: a hint of real gauges. */
const GAUGES = [0.06, 0.066, 0.074, 0.084, 0.096, 0.108];
/** Each string is ruled across the stage in this time, one after another. */
const RULE_MS = 1000;
const RULE_STAGGER_MS = 45;
/** The first note is engraved at this time; the sweep then crosses the stage. */
const NOTES_START_MS = 420;

/**
 * The engraving sweep: slower on wide screens, never longer than 2.4 s, so that the last pluck has
 * rung out (see prune) and every motion has ended within 5 s of loading.
 */
function sweepDuration(width: number): number {
  return Math.min(2400, Math.max(1500, width * 1.65));
}

/** Inverse of the ease-in-out-cubic ruling curve: when the ruling reaches `progress` (0…1). */
function rulingTime(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2;
}

interface StageNote {
  readonly x: number;
  /** 0 = high E. */
  readonly string: number;
  readonly fret: number;
  /** Milliseconds after the intro starts. */
  readonly delay: number;
}

interface StageBeam {
  readonly from: number;
  readonly to: number;
  readonly delay: number;
  readonly span: number;
}

interface StageLayout {
  readonly width: number;
  readonly height: number;
  readonly gap: number;
  readonly stringY: readonly number[];
  readonly bars: readonly { readonly x: number; readonly delay: number }[];
  readonly notes: readonly StageNote[];
  readonly beams: readonly StageBeam[];
  readonly stemTop: number;
  readonly stemBottom: number;
}

/** Places the excerpt on a full-width staff: whole bars centred, partial bars faded at the edges. */
function layoutStage(width: number, height: number): StageLayout {
  const gap = height / 9.85;
  const top = gap * 1.4;
  const stringY = Array.from({ length: STRING_COUNT }, (_, index) => Math.round(top + index * gap) + 0.5);
  const stemTop = (stringY.at(-1) ?? top) + gap * 0.8;
  const barWidth = Math.round(gap * (width < 640 ? 17.5 : 19.5));
  const step = barWidth / 8.6;
  const fullBars = Math.max(1, Math.floor(width / barWidth));
  const origin = (width - fullBars * barWidth) / 2;
  const before = Math.ceil(origin / barWidth);
  const sweep = sweepDuration(width);
  const noteDelay = (x: number) => NOTES_START_MS + sweep * Math.min(1, Math.max(0, x / width));
  const ruled = (x: number) => RULE_STAGGER_MS * 2.5 + RULE_MS * rulingTime(x / width);

  const bars: { x: number; delay: number }[] = [];
  const notes: StageNote[] = [];
  const beams: StageBeam[] = [];
  for (let bar = -before; bar <= fullBars + before; bar += 1) {
    const x = origin + bar * barWidth;
    if (x >= 0 && x <= width) bars.push({ x: Math.round(x) + 0.5, delay: ruled(x) + 60 });
    const beats = EXCERPT[((bar % EXCERPT.length) + EXCERPT.length) % EXCERPT.length] ?? [];
    for (let half = 0; half < 2; half += 1) {
      const group: StageNote[] = [];
      beats.slice(half * 4, half * 4 + 4).forEach(([fret, string], index) => {
        const noteX = x + step * (0.8 + half * 4 + index);
        if (noteX < step * 0.5 || noteX > width - step * 0.5) return;
        const note = { x: noteX, string: string - 1, fret, delay: noteDelay(noteX) };
        notes.push(note);
        group.push(note);
      });
      const first = group.at(0);
      const last = group.at(-1);
      if (first !== undefined && last !== undefined && first !== last) {
        beams.push({ from: first.x, to: last.x, delay: first.delay, span: last.delay - first.delay });
      }
    }
  }
  return {
    width,
    height,
    gap,
    stringY,
    bars,
    notes,
    beams,
    stemTop,
    stemBottom: stemTop + gap * 1.45,
  };
}

/* String physics ------------------------------------------------------------------------------ */

/**
 * How each string moves, high E first. These are visual rates (a real string vibrates far too fast
 * to see): thinner strings vibrate faster, ring shorter and kink over a shorter stretch.
 */
const STRING_FEEL = [
  { hz: 11, ring: 0.34, width: 15 },
  { hz: 10, ring: 0.38, width: 17 },
  { hz: 9.1, ring: 0.43, width: 20 },
  { hz: 8.2, ring: 0.48, width: 23 },
  { hz: 7.3, ring: 0.54, width: 27 },
  { hz: 6.5, ring: 0.6, width: 31 },
] as const;

type StringFeel = (typeof STRING_FEEL)[number];

/** A pluck starts as a sharp kink and spreads along the string as it rings out. */
function pluckWidth(feel: StringFeel, seconds: number): number {
  return feel.width * (1 + 3.2 * seconds);
}

interface Pluck {
  readonly x: number;
  /** Initial displacement in pixels; the sign is the direction the string was pulled. */
  readonly amplitude: number;
  readonly time: number;
}

interface QueuedPluck {
  readonly at: number;
  readonly string: number;
  readonly x: number;
  readonly amplitude: number;
}

/** Peak displacement left in a pluck: it decays exponentially with the string's ring time. */
function envelope(pluck: Pluck, feel: StringFeel, now: number): number {
  return Math.abs(pluck.amplitude) * Math.exp(-(now - pluck.time) / 1000 / feel.ring);
}

/** A pluck is a damped vibration around the point where the string was struck. */
function displacement(plucks: readonly Pluck[], string: number, x: number, now: number): number {
  const feel = STRING_FEEL[string] ?? STRING_FEEL[0];
  let y = 0;
  for (const pluck of plucks) {
    const t = (now - pluck.time) / 1000;
    if (t < 0) continue;
    const u = (x - pluck.x) / pluckWidth(feel, t);
    if (u > 3 || u < -3) continue;
    y += pluck.amplitude * Math.exp(-t / feel.ring - u * u) * Math.cos(2 * Math.PI * feel.hz * t);
  }
  return y;
}

/** Drops plucks that have died away (under 0.12 px, too small to see). */
function prune(plucks: Pluck[], string: number, now: number): void {
  const feel = STRING_FEEL[string] ?? STRING_FEEL[0];
  for (let index = plucks.length - 1; index >= 0; index -= 1) {
    const pluck = plucks[index];
    if (pluck !== undefined && envelope(pluck, feel, now) < 0.12) plucks.splice(index, 1);
  }
}

/* Stage --------------------------------------------------------------------------------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Readonly<Record<string, string | number>>,
  parent: Element,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  parent.append(element);
  return element;
}

const px = (value: number) => value.toFixed(2);

let stageCount = 0;

/** The vibrating stretch of a string lights up in the accent colour, fading out at both ends. */
interface Glow {
  readonly gradient: SVGLinearGradientElement;
  readonly path: SVGPathElement;
}

/** The animated tablature staff. Owns its SVG; `dispose()` removes everything it added. */
class TabStage {
  private readonly host: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly motion: boolean;
  private readonly resizeObserver: ResizeObserver;
  /** Prefix for the gradient ids, unique in the document. */
  private readonly id: string;
  private layout: StageLayout | null = null;
  private paths: SVGPathElement[] = [];
  private glows: Glow[] = [];
  /** Per string: the note groups that ride on it, with their x position. */
  private riders: { readonly element: SVGGElement; readonly x: number }[][] = [];
  private readonly plucks: Pluck[][] = Array.from({ length: STRING_COUNT }, () => []);
  private readonly ringing: boolean[] = Array.from({ length: STRING_COUNT }, () => false);
  private readonly lastStrum: number[] = Array.from({ length: STRING_COUNT }, () => 0);
  private queue: QueuedPluck[] = [];
  private frame = 0;
  private introTimer = 0;
  private introPlayed = false;
  private dragging = false;
  private nextShimmer = 0;
  private pointer: { readonly x: number; readonly y: number; readonly time: number } | null = null;

  constructor(host: HTMLElement, motion: boolean) {
    stageCount += 1;
    this.id = `ot-stage-${String(stageCount)}`;
    this.host = host;
    this.motion = motion;
    this.svg = svgElement('svg', { class: 'ot-stage-svg', focusable: 'false' }, host);
    this.resizeObserver = new ResizeObserver(() => {
      this.measure();
    });
    this.resizeObserver.observe(host);
    if (motion) {
      host.addEventListener('pointermove', this.onPointerMove);
      host.addEventListener('pointerleave', this.onPointerLeave);
      host.addEventListener('pointerdown', this.onPointerDown);
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.introTimer);
    this.resizeObserver.disconnect();
    this.host.removeEventListener('pointermove', this.onPointerMove);
    this.host.removeEventListener('pointerleave', this.onPointerLeave);
    this.host.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('dragover', this.onDragOver);
    this.host.removeAttribute('data-intro');
    this.svg.remove();
  }

  /** While files are dragged over the window the strings ring, and the dragged file strums them. */
  setDragging(dragging: boolean): void {
    if (dragging === this.dragging) return;
    this.dragging = dragging;
    this.pointer = null;
    if (!this.motion) return;
    if (dragging) {
      window.addEventListener('dragover', this.onDragOver);
      this.strumAcross(performance.now());
      this.wake();
    } else {
      window.removeEventListener('dragover', this.onDragOver);
    }
  }

  private measure(): void {
    const width = Math.round(this.host.clientWidth);
    const height = Math.round(this.host.clientHeight);
    if (width === 0 || height === 0) return;
    if (this.layout?.width === width && this.layout.height === height) return;
    this.build(layoutStage(width, height));
  }

  private build(layout: StageLayout): void {
    const intro = this.motion && !this.introPlayed;
    this.introPlayed = true;
    // A rebuild (resize) draws the staff complete; only the first build plays the intro.
    window.clearTimeout(this.introTimer);
    this.host.removeAttribute('data-intro');
    this.layout = layout;
    this.queue = [];
    for (const plucks of this.plucks) plucks.length = 0;
    this.ringing.fill(false);

    const { width, height, gap, stringY } = layout;
    const svg = this.svg;
    svg.replaceChildren();
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const defs = svgElement('defs', {}, svg);
    const rhythm = svgElement('g', { class: 'ot-stage-rhythm' }, svg);
    const bars = svgElement('g', { class: 'ot-stage-bars' }, svg);
    const strings = svgElement('g', { class: 'ot-stage-strings' }, svg);
    const glows = svgElement('g', { class: 'ot-stage-glows' }, svg);
    const notes = svgElement('g', { class: 'ot-stage-notes' }, svg);

    const top = stringY.at(0) ?? 0;
    const bottom = stringY.at(-1) ?? 0;
    for (const bar of layout.bars) {
      svgElement(
        'path',
        {
          class: 'ot-stage-bar',
          d: `M${bar.x} ${top}V${bottom}`,
          pathLength: 1,
          style: `--d:${Math.round(bar.delay)}ms`,
        },
        bars,
      );
    }
    this.paths = stringY.map((y, index) =>
      svgElement(
        'path',
        {
          class: 'ot-stage-string',
          d: `M0 ${y}H${width}`,
          'stroke-width': px(gap * (GAUGES[index] ?? 0.06)),
          pathLength: 1,
          style: `--d:${index * RULE_STAGGER_MS}ms`,
        },
        strings,
      ),
    );
    this.glows = stringY.map((y, index) => {
      const id = `${this.id}-glow-${String(index)}`;
      const gradient = svgElement(
        'linearGradient',
        { id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: width, y2: 0 },
        defs,
      );
      for (const offset of [0, 0.5, 1]) {
        svgElement(
          'stop',
          { class: 'ot-stage-glow-stop', offset, 'stop-opacity': offset === 0.5 ? 1 : 0 },
          gradient,
        );
      }
      const path = svgElement(
        'path',
        {
          class: 'ot-stage-glow',
          d: `M0 ${y}H${width}`,
          stroke: `url(#${id})`,
          'stroke-width': px(gap * (GAUGES[index] ?? 0.06) + 0.4),
          opacity: 0,
        },
        glows,
      );
      return { gradient, path };
    });

    const fontSize = gap * 0.86;
    const knockoutWidth = fontSize * 0.62 + gap * 0.42;
    const knockoutHeight = fontSize * 0.9;
    const beamHeight = Math.max(2.5, gap * 0.19);
    this.riders = Array.from({ length: STRING_COUNT }, () => []);
    for (const note of layout.notes) {
      const delay = `--d:${Math.round(note.delay)}ms`;
      const anchor = svgElement(
        'g',
        { transform: `translate(${px(note.x)} ${stringY[note.string] ?? 0})` },
        notes,
      );
      const rider = svgElement('g', {}, anchor);
      const glyph = svgElement('g', { class: 'ot-stage-note', style: delay }, rider);
      svgElement(
        'rect',
        {
          class: 'ot-stage-knockout',
          x: px(-knockoutWidth / 2),
          y: px(-knockoutHeight / 2),
          width: px(knockoutWidth),
          height: px(knockoutHeight),
          rx: px(gap * 0.12),
        },
        glyph,
      );
      const text = svgElement(
        'text',
        {
          class: 'ot-stage-fret',
          'font-size': px(fontSize),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          style: delay,
        },
        glyph,
      );
      text.textContent = String(note.fret);
      this.riders[note.string]?.push({ element: rider, x: note.x });
      svgElement(
        'path',
        {
          class: 'ot-stage-stem',
          d: `M${px(note.x)} ${px(layout.stemTop)}V${px(layout.stemBottom)}`,
          pathLength: 1,
          style: `--d:${Math.round(note.delay + 30)}ms`,
        },
        rhythm,
      );
    }
    for (const beam of layout.beams) {
      svgElement(
        'rect',
        {
          class: 'ot-stage-beam',
          x: px(beam.from - 0.5),
          y: px(layout.stemBottom - beamHeight),
          width: px(beam.to - beam.from + 1),
          height: px(beamHeight),
          style: `--d:${Math.round(beam.delay)}ms;--span:${Math.round(beam.span + 140)}ms`,
        },
        rhythm,
      );
    }

    if (!intro) return;
    this.host.setAttribute('data-intro', '');
    const start = performance.now();
    this.queue = layout.notes
      .map((note, index) => ({
        // The string is struck once the numeral has popped in.
        at: start + note.delay + 70,
        string: note.string,
        x: note.x,
        amplitude: (index % 2 === 0 ? 1 : -1) * (2.6 + note.string * 0.3),
      }))
      .sort((a, b) => a.at - b.at);
    const end = Math.max(0, ...layout.notes.map(note => note.delay));
    this.introTimer = window.setTimeout(() => {
      this.host.removeAttribute('data-intro');
    }, end + 1600);
    this.wake();
  }

  private pluck(string: number, x: number, amplitude: number, now: number): void {
    const plucks = this.plucks[string];
    if (plucks === undefined) return;
    if (plucks.length >= 10) plucks.shift();
    plucks.push({ x, amplitude, time: now });
  }

  /** A quick strum through all six strings, as when a file first arrives over the window. */
  private strumAcross(now: number): void {
    const layout = this.layout;
    if (layout === null) return;
    for (let string = 0; string < STRING_COUNT; string += 1) {
      this.queue.push({
        at: now + string * 32,
        string,
        x: layout.width * (0.5 + (string - 2.5) * 0.012),
        amplitude: 4,
      });
    }
    this.queue.sort((a, b) => a.at - b.at);
  }

  private wake(): void {
    if (this.frame === 0) this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    this.frame = 0;
    const layout = this.layout;
    if (layout === null) return;
    let due = this.queue.at(0);
    while (due !== undefined && due.at <= now) {
      this.queue.shift();
      this.pluck(due.string, due.x, due.amplitude, now);
      due = this.queue.at(0);
    }
    if (this.dragging && now >= this.nextShimmer) {
      // Sympathetic ringing while a file hovers over the window.
      this.pluck(
        Math.floor(Math.random() * STRING_COUNT),
        Math.random() * layout.width,
        (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 1.3),
        now,
      );
      this.nextShimmer = now + 60 + Math.random() * 60;
    }

    let busy = this.queue.length > 0 || this.dragging;
    for (let string = 0; string < STRING_COUNT; string += 1) {
      if (this.drawString(string, layout, now)) busy = true;
    }
    if (busy) this.wake();
  };

  /** Draws one string for this frame; returns whether it is still ringing. */
  private drawString(string: number, layout: StageLayout, now: number): boolean {
    const plucks = this.plucks[string];
    const path = this.paths[string];
    const glow = this.glows[string];
    const y = layout.stringY[string];
    if (plucks === undefined || path === undefined || glow === undefined || y === undefined) return false;
    prune(plucks, string, now);
    const riders = this.riders[string] ?? [];
    if (plucks.length === 0) {
      if (this.ringing[string] === true) {
        this.ringing[string] = false;
        path.setAttribute('d', `M0 ${y}H${layout.width}`);
        glow.path.setAttribute('opacity', '0');
        for (const rider of riders) rider.element.removeAttribute('transform');
      }
      return false;
    }
    this.ringing[string] = true;
    const d = this.curve(plucks, string, y, now);
    path.setAttribute('d', d);
    for (const rider of riders) {
      rider.element.setAttribute(
        'transform',
        `translate(0 ${px(displacement(plucks, string, rider.x, now))})`,
      );
    }

    // The glow follows the liveliest pluck on the string and fades with it.
    const feel = STRING_FEEL[string] ?? STRING_FEEL[0];
    let strongest: Pluck | undefined;
    let energy = 0;
    for (const pluck of plucks) {
      const left = envelope(pluck, feel, now);
      if (left > energy) {
        energy = left;
        strongest = pluck;
      }
    }
    if (strongest !== undefined) {
      const reach = 2.6 * pluckWidth(feel, (now - strongest.time) / 1000);
      glow.gradient.setAttribute('x1', px(strongest.x - reach));
      glow.gradient.setAttribute('x2', px(strongest.x + reach));
    }
    glow.path.setAttribute('d', d);
    glow.path.setAttribute('opacity', px(Math.min(1, energy / 2.4)));
    return true;
  }

  /** The string's path: straight where it rests, sampled every few pixels where it vibrates. */
  private curve(plucks: readonly Pluck[], string: number, y: number, now: number): string {
    const width = this.layout?.width ?? 0;
    const feel = STRING_FEEL[string] ?? STRING_FEEL[0];
    let from = width;
    let to = 0;
    for (const pluck of plucks) {
      const reach = 3 * pluckWidth(feel, (now - pluck.time) / 1000);
      from = Math.min(from, pluck.x - reach);
      to = Math.max(to, pluck.x + reach);
    }
    from = Math.max(0, Math.floor(from));
    to = Math.min(width, Math.ceil(to));
    let d = `M0 ${y}H${from}`;
    for (let x = from; x <= to; x += 4) d += `L${x} ${px(y + displacement(plucks, string, x, now))}`;
    return `${d}L${to} ${y}H${width}`;
  }

  /** Plucks every string the pointer crossed since the last event, harder for faster moves. */
  private strumTo(clientX: number, clientY: number): void {
    const layout = this.layout;
    if (layout === null) return;
    const rect = this.host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const now = performance.now();
    const previous = this.pointer;
    this.pointer = { x, y, time: now };
    if (previous === null || y === previous.y) return;
    const speed = Math.abs(y - previous.y) / Math.max(8, now - previous.time);
    let plucked = false;
    for (const [string, stringY] of layout.stringY.entries()) {
      if (stringY === previous.y || (stringY - previous.y) * (stringY - y) > 0) continue;
      if (now - (this.lastStrum[string] ?? 0) < 40) continue;
      this.lastStrum[string] = now;
      const along = (stringY - previous.y) / (y - previous.y);
      const amplitude = Math.sign(y - previous.y) * Math.min(7, 2 + speed * 5);
      this.pluck(string, previous.x + (x - previous.x) * along, amplitude, now);
      plucked = true;
    }
    if (plucked) this.wake();
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') this.strumTo(event.clientX, event.clientY);
  };

  private readonly onPointerLeave = (): void => {
    this.pointer = null;
  };

  /** Touch: a tap plucks the nearest string. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    const layout = this.layout;
    if (event.pointerType !== 'touch' || layout === null) return;
    const rect = this.host.getBoundingClientRect();
    const y = event.clientY - rect.top;
    let nearest = -1;
    let distance = layout.gap * 0.75;
    for (const [string, stringY] of layout.stringY.entries()) {
      if (Math.abs(stringY - y) < distance) {
        distance = Math.abs(stringY - y);
        nearest = string;
      }
    }
    if (nearest < 0) return;
    this.pluck(nearest, event.clientX - rect.left, 4.5, performance.now());
    this.wake();
  };

  private readonly onDragOver = (event: DragEvent): void => {
    this.strumTo(event.clientX, event.clientY);
  };
}

/* Components ---------------------------------------------------------------------------------- */

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

/** Decorative: hidden from assistive technology and never focusable. */
function Stage({ dragging }: { readonly dragging: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<TabStage | null>(null);
  const draggingRef = useRef(dragging);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const stage = new TabStage(host, !reducedMotion);
    stage.setDragging(draggingRef.current);
    stageRef.current = stage;
    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    draggingRef.current = dragging;
    stageRef.current?.setDragging(dragging);
  }, [dragging]);

  return <div ref={hostRef} className="ot-stage" aria-hidden />;
}

const demoList = new Intl.ListFormat('en', { style: 'long', type: 'disjunction' });
const LEADING_PUNCTUATION = /^[^\s\p{L}]+/u;

/** "a blues shuffle, Greensleeves, or an arpeggio study": punctuation never starts a line. */
function DemoLinks() {
  const open = useDocuments(state => state.open);
  const parts = demoList.formatToParts(DEMOS.map(demo => demo.id));
  return parts.map((part, index) => {
    if (part.type === 'literal') return part.value.replace(LEADING_PUNCTUATION, '');
    const demo = DEMOS.find(candidate => candidate.id === part.value);
    if (demo === undefined) return null;
    const punctuation = LEADING_PUNCTUATION.exec(parts[index + 1]?.value ?? '')?.[0] ?? '';
    return (
      <span key={demo.id} className="ot-demo-item">
        <button
          type="button"
          onClick={() => {
            void open([demoSource(demo)]);
          }}
          className="ot-demo"
        >
          {strings.demos[demo.id].title}
        </button>
        {punctuation}
      </span>
    );
  });
}

const DATE = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** The scores opened lately, to open again (LIB-005): kept on this device only. */
function RecentScores() {
  const list = useRecentScores(state => state.list);
  const remember = usePreferences(state => state.rememberRecent);
  const pending = useDocuments(state => state.pending.length > 0);
  useEffect(() => {
    void useRecentScores.getState().refresh();
  }, []);
  if (!remember || list.length === 0) return null;
  return (
    <section aria-labelledby="recent-title" className="ot-recent">
      <div className="ot-recent-head">
        <h2 id="recent-title" className="ot-recent-title">
          {strings.recent.heading}
        </h2>
        <button
          type="button"
          className="ot-recent-clear"
          onClick={() => {
            void useRecentScores.getState().clear();
          }}
        >
          {strings.recent.clear}
        </button>
      </div>
      <ul className="ot-recent-list">
        {list.map(score => {
          const title = score.title.length > 0 ? score.title : score.name;
          const opened = new Date(score.openedAt);
          return (
            <li key={score.fingerprint}>
              <button
                type="button"
                className="ot-recent-item"
                disabled={pending}
                aria-label={strings.recent.open(title)}
                onClick={() => {
                  // A score still open comes to the front instead of opening twice.
                  const documents = useDocuments.getState();
                  const open = documents.docs.find(doc => doc.fingerprint === score.fingerprint);
                  if (open !== undefined) documents.activate(open.key);
                  else void documents.open([recentSource(score)]);
                }}
              >
                <span className="ot-recent-name">{title}</span>
                <span className="ot-recent-meta">{strings.recent.byline(score.artist, score.name)}</span>
                <time className="ot-recent-date" dateTime={opened.toISOString()}>
                  {strings.recent.openedOn(DATE.format(opened))}
                </time>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Home({
  dragging,
  onOpenUrl,
}: {
  readonly dragging: boolean;
  readonly onOpenUrl: () => void;
}) {
  const pending = useDocuments(state => state.pending.length > 0);
  const mod = modKey();
  const [firstLine, secondLine] = strings.home.headline;

  return (
    <div className="ot-landing" data-dragging={dragging ? '' : undefined}>
      <div className="ot-landing-scroller">
        <div className="ot-landing-page">
          <main id="main" className="ot-landing-main">
            <section aria-labelledby="home-title" className="ot-hero">
              <div className="ot-hero-copy">
                <p className="ot-eyebrow">
                  <span aria-hidden className="ot-eyebrow-dot" />
                  {strings.home.eyebrow}
                </p>
                <h1 id="home-title" className="ot-title">
                  <span className="ot-title-line">{firstLine}</span>{' '}
                  <span className="ot-title-line">{secondLine}</span>
                </h1>
                <p className="ot-lede">{strings.home.lede}</p>
                <div className="ot-actions">
                  <button
                    type="button"
                    onClick={pickFiles}
                    disabled={pending}
                    aria-keyshortcuts={mod === '⌘' ? 'Meta+O' : 'Control+O'}
                    className="ot-cta"
                  >
                    {strings.home.openFile}
                    <kbd aria-hidden className="ot-cta-kbd">
                      {strings.home.openFileShortcut(mod)}
                    </kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void newScore();
                    }}
                    disabled={pending}
                    className="ot-secondary"
                  >
                    <FilePlus2 size={17} aria-hidden />
                    {strings.home.newScore}
                  </button>
                  <button type="button" onClick={onOpenUrl} className="ot-secondary">
                    <Link2 size={17} aria-hidden />
                    {strings.home.openUrl}
                  </button>
                </div>
                <p className="ot-drop-hint">{strings.home.dropHint}</p>
              </div>
              <div aria-hidden className="ot-drop-message">
                <p className="ot-drop-title">{strings.home.release}</p>
                <p className="ot-drop-detail">{strings.home.releaseDetail}</p>
              </div>
            </section>

            <Stage dragging={dragging} />

            <p className="ot-demos">
              {strings.home.demosHeading} <DemoLinks />
            </p>

            <RecentScores />
          </main>

          <footer className="ot-footer">
            <p className="ot-signature">
              <LogoMark size={20} />
              <span>
                {strings.footer.makerBefore} <strong>{strings.footer.maker}</strong>{' '}
                {strings.footer.makerAfter}
              </span>
            </p>
            <p className="ot-footer-meta">
              {strings.footer.license}
              <span aria-hidden className="ot-footer-dot" />
              {strings.footer.engine}
            </p>
            <p className="ot-footer-legal">
              {strings.home.privacy} {strings.footer.trademark}
            </p>
          </footer>
        </div>
      </div>
      <div aria-hidden className="ot-drop-frame" />
    </div>
  );
}
