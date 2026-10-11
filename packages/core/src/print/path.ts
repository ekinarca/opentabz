/**
 * SVG path data, read into absolute moves, lines and cubic curves: every command of the SVG
 * path grammar (relative or absolute, shorthand curves, quadratic curves and elliptical arcs) is
 * turned into these four, which PDF content streams draw directly.
 */

export type Segment =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

const COMMAND = /[MmLlHhVvCcSsQqTtAaZz]/;
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;

/** Reads path data the way browsers do, stopping quietly at the first error. */
export function parsePath(d: string): Segment[] {
  const segments: Segment[] = [];
  let at = 0;
  const skip = () => {
    while (at < d.length && /[\s,]/.test(d.charAt(at))) at++;
  };
  const number = (): number | null => {
    skip();
    const match = NUMBER.exec(d.slice(at, at + 64));
    if (match === null) return null;
    at += match[0].length;
    return Number(match[0]);
  };
  // Arc flags are single digits that may be written without separators ("a1,1 0 01 5,5").
  const flag = (): number | null => {
    skip();
    const char = d.charAt(at);
    if (char !== '0' && char !== '1') return null;
    at++;
    return Number(char);
  };
  const numbers = (count: number): number[] | null => {
    const values: number[] = [];
    for (let index = 0; index < count; index++) {
      const value = number();
      if (value === null) return null;
      values.push(value);
    }
    return values;
  };

  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // The last control point, for the shorthand curves S and T.
  let cubicX = 0;
  let cubicY = 0;
  let quadX = 0;
  let quadY = 0;
  let previous = '';

  const cubic = (x1: number, y1: number, x2: number, y2: number, toX: number, toY: number) => {
    segments.push(['C', x1, y1, x2, y2, toX, toY]);
    cubicX = x2;
    cubicY = y2;
    x = toX;
    y = toY;
  };
  const quadratic = (qx: number, qy: number, toX: number, toY: number) => {
    cubic(
      x + (2 / 3) * (qx - x),
      y + (2 / 3) * (qy - y),
      toX + (2 / 3) * (qx - toX),
      toY + (2 / 3) * (qy - toY),
      toX,
      toY,
    );
    quadX = qx;
    quadY = qy;
  };

  skip();
  while (at < d.length) {
    const char = d.charAt(at);
    let command: string;
    if (COMMAND.test(char)) {
      command = char;
      at++;
    } else if (previous !== '' && previous !== 'Z' && previous !== 'z') {
      // Repeated parameters repeat the command; extra pairs after a move are lines.
      command = previous === 'M' ? 'L' : previous === 'm' ? 'l' : previous;
    } else {
      break;
    }
    const relative = command === command.toLowerCase();
    const dx = relative ? x : 0;
    const dy = relative ? y : 0;
    switch (command.toUpperCase()) {
      case 'M': {
        const values = numbers(2);
        if (values === null) return segments;
        const [toX = 0, toY = 0] = values;
        x = toX + dx;
        y = toY + dy;
        startX = x;
        startY = y;
        segments.push(['M', x, y]);
        break;
      }
      case 'L': {
        const values = numbers(2);
        if (values === null) return segments;
        const [toX = 0, toY = 0] = values;
        x = toX + dx;
        y = toY + dy;
        segments.push(['L', x, y]);
        break;
      }
      case 'H': {
        const value = number();
        if (value === null) return segments;
        x = value + dx;
        segments.push(['L', x, y]);
        break;
      }
      case 'V': {
        const value = number();
        if (value === null) return segments;
        y = value + dy;
        segments.push(['L', x, y]);
        break;
      }
      case 'C': {
        const values = numbers(6);
        if (values === null) return segments;
        const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, toX = 0, toY = 0] = values;
        cubic(x1 + dx, y1 + dy, x2 + dx, y2 + dy, toX + dx, toY + dy);
        break;
      }
      case 'S': {
        const values = numbers(4);
        if (values === null) return segments;
        const [x2 = 0, y2 = 0, toX = 0, toY = 0] = values;
        const smooth = /[CcSs]/.test(previous);
        cubic(smooth ? 2 * x - cubicX : x, smooth ? 2 * y - cubicY : y, x2 + dx, y2 + dy, toX + dx, toY + dy);
        break;
      }
      case 'Q': {
        const values = numbers(4);
        if (values === null) return segments;
        const [qx = 0, qy = 0, toX = 0, toY = 0] = values;
        quadratic(qx + dx, qy + dy, toX + dx, toY + dy);
        break;
      }
      case 'T': {
        const values = numbers(2);
        if (values === null) return segments;
        const [toX = 0, toY = 0] = values;
        const smooth = /[QqTt]/.test(previous);
        quadratic(smooth ? 2 * x - quadX : x, smooth ? 2 * y - quadY : y, toX + dx, toY + dy);
        break;
      }
      case 'A': {
        const radii = numbers(3);
        const large = flag();
        const sweep = flag();
        const end = numbers(2);
        if (radii === null || large === null || sweep === null || end === null) return segments;
        const [rx = 0, ry = 0, rotation = 0] = radii;
        const [toX = 0, toY = 0] = end;
        for (const curve of arcToCubics(
          x,
          y,
          rx,
          ry,
          rotation,
          large === 1,
          sweep === 1,
          toX + dx,
          toY + dy,
        )) {
          cubic(...curve);
        }
        x = toX + dx;
        y = toY + dy;
        break;
      }
      case 'Z':
        segments.push(['Z']);
        x = startX;
        y = startY;
        break;
    }
    if (!/[CcSs]/.test(command)) {
      cubicX = x;
      cubicY = y;
    }
    if (!/[QqTt]/.test(command)) {
      quadX = x;
      quadY = y;
    }
    previous = command;
    skip();
  }
  return segments;
}

type Cubic = [number, number, number, number, number, number];

/**
 * An elliptical arc as cubic curves of at most a quarter turn each (SVG 1.1 implementation notes
 * F.6: radii too small to reach the end point are scaled up).
 */
function arcToCubics(
  fromX: number,
  fromY: number,
  rxIn: number,
  ryIn: number,
  rotationDegrees: number,
  large: boolean,
  sweep: boolean,
  toX: number,
  toY: number,
): Cubic[] {
  if (fromX === toX && fromY === toY) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[fromX, fromY, toX, toY, toX, toY]];
  const phi = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const halfX = (fromX - toX) / 2;
  const halfY = (fromY - toY) / 2;
  const x1 = cos * halfX + sin * halfY;
  const y1 = -sin * halfX + cos * halfY;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const root = Math.sqrt(Math.max(0, numerator / denominator)) * (large === sweep ? -1 : 1);
  const cx1 = (root * rx * y1) / ry;
  const cy1 = (-root * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (fromX + toX) / 2;
  const cy = sin * cx1 + cos * cy1 + (fromY + toY) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;

  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / count;
  const handle = (4 / 3) * Math.tan(step / 4);
  const point = (theta: number) => ({
    x: cx + rx * Math.cos(theta) * cos - ry * Math.sin(theta) * sin,
    y: cy + rx * Math.cos(theta) * sin + ry * Math.sin(theta) * cos,
  });
  const derivative = (theta: number) => ({
    x: -rx * Math.sin(theta) * cos - ry * Math.cos(theta) * sin,
    y: -rx * Math.sin(theta) * sin + ry * Math.cos(theta) * cos,
  });
  const curves: Cubic[] = [];
  for (let index = 0; index < count; index++) {
    const a = start + index * step;
    const b = a + step;
    const p0 = point(a);
    const p1 = point(b);
    const d0 = derivative(a);
    const d1 = derivative(b);
    curves.push([
      p0.x + handle * d0.x,
      p0.y + handle * d0.y,
      p1.x - handle * d1.x,
      p1.y - handle * d1.y,
      index === count - 1 ? toX : p1.x,
      index === count - 1 ? toY : p1.y,
    ]);
  }
  return curves;
}

/** The box around a path's points and control points. */
export function pathBounds(segments: readonly Segment[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (px: number, py: number) => {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  };
  for (const segment of segments) {
    switch (segment[0]) {
      case 'M':
      case 'L':
        add(segment[1], segment[2]);
        break;
      case 'C':
        add(segment[1], segment[2]);
        add(segment[3], segment[4]);
        add(segment[5], segment[6]);
        break;
      case 'Z':
        break;
    }
  }
  if (minX > maxX) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}
