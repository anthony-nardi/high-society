import { Coord, Side, YinshGameState } from "./types";

/*
 * Client-side copy of the board geometry and the rule queries the table
 * needs for highlighting. Keep in step with functions/src/yinsh/helpers.
 */

const ROWS: [number, number, number][] = [
  [0, 6, 9],
  [1, 4, 10],
  [2, 3, 10],
  [3, 2, 10],
  [4, 1, 10],
  [5, 1, 9],
  [6, 0, 9],
  [7, 0, 8],
  [8, 0, 7],
  [9, 0, 6],
  [10, 1, 4],
];

export const ALL_POINTS: Coord[] = ROWS.flatMap(([y, from, to]) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${y}`),
);
const POINT_SET = new Set(ALL_POINTS);
export const isPoint = (coord: Coord) => POINT_SET.has(coord);

type Direction = [number, number];
export const AXES: Direction[] = [
  [1, 0],
  [0, 1],
  [1, -1],
];
export const DIRECTIONS: Direction[] = AXES.flatMap(([dx, dy]) => [
  [dx, dy],
  [-dx, -dy],
]);

export const ROW_LENGTH = 5;
export const RINGS_TO_WIN = 3;

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

/** Maximal lines along each axis, for drawing and for rows. */
export const LINES: Coord[][] = (() => {
  const lines: Coord[][] = [];
  for (const axis of AXES) {
    const back: Direction = [-axis[0], -axis[1]];
    for (const point of ALL_POINTS) {
      if (isPoint(step(point, back))) continue;
      const line = [point];
      let c = step(point, axis);
      while (isPoint(c)) {
        line.push(c);
        c = step(c, axis);
      }
      lines.push(line);
    }
  }
  return lines;
})();

export const ringAt = (state: YinshGameState, coord: Coord) =>
  state.rings?.[coord];
export const markerAt = (state: YinshGameState, coord: Coord) =>
  state.markers?.[coord];
export const isEmpty = (state: YinshGameState, coord: Coord) =>
  isPoint(coord) && !ringAt(state, coord) && !markerAt(state, coord);

export function ringsOf(state: YinshGameState, side: Side): Coord[] {
  return Object.entries(state.rings || {})
    .filter(([, s]) => s === side)
    .map(([coord]) => coord);
}

export function movesFrom(state: YinshGameState, from: Coord): Coord[] {
  const targets: Coord[] = [];
  for (const d of DIRECTIONS) {
    let c = step(from, d);
    let jumped = false;
    while (isPoint(c)) {
      if (ringAt(state, c)) break;
      if (markerAt(state, c)) {
        jumped = true;
      } else {
        targets.push(c);
        if (jumped) break;
      }
      c = step(c, d);
    }
  }
  return targets;
}

/** Removable windows of five for a side, as [first, last]. */
export function rowWindows(
  state: YinshGameState,
  side: Side,
): [Coord, Coord][] {
  const windows: [Coord, Coord][] = [];
  for (const line of LINES) {
    let run: Coord[] = [];
    const flush = () => {
      for (let i = 0; i + ROW_LENGTH <= run.length; i++) {
        windows.push([run[i], run[i + ROW_LENGTH - 1]]);
      }
      run = [];
    };
    for (const c of line) {
      if (markerAt(state, c) === side) run.push(c);
      else flush();
    }
    flush();
  }
  return windows;
}

/** The five cells of a window. */
export function windowCells(from: Coord, to: Coord): Coord[] {
  for (const d of DIRECTIONS) {
    if (step(from, d, ROW_LENGTH - 1) === to) {
      return Array.from({ length: ROW_LENGTH }, (_, i) => step(from, d, i));
    }
  }
  return [];
}

export function sideOf(
  state: YinshGameState,
  email: string | undefined,
): Side | undefined {
  return state.players.find((p) => p.email === email)?.side;
}

// --------------------------------------------------------------- geometry

export const SPACING = 52;
const ROW_HEIGHT = SPACING * 0.866;
const PAD = 30;

export function position(coord: Coord): { x: number; y: number } {
  const [x, y] = parse(coord);
  return { x: SPACING * (x + y / 2), y: ROW_HEIGHT * y };
}

export function viewBox() {
  const xs = ALL_POINTS.map((c) => position(c).x);
  const ys = ALL_POINTS.map((c) => position(c).y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  return {
    minX,
    minY,
    width: Math.max(...xs) + PAD - minX,
    height: Math.max(...ys) + PAD - minY,
  };
}

// ------------------------------------------------------------- optimistic
// Client-side previews of a move, shown until the server's state arrives.
// They mirror the server rules closely enough for the board to look right;
// turn order and row resolution are left to the server.

const flip = (side: Side): Side => (side === "WHITE" ? "BLACK" : "WHITE");

export function applyPlaceRing(
  state: YinshGameState,
  coord: Coord,
  side: Side,
): YinshGameState {
  return {
    ...state,
    rings: { ...(state.rings || {}), [coord]: side },
    lastMove: { to: coord },
  };
}

export function applyMoveRing(
  state: YinshGameState,
  from: Coord,
  to: Coord,
): YinshGameState {
  const side = ringAt(state, from);
  if (!side) return state;
  const direction = DIRECTIONS.find((d) => {
    let c = step(from, d);
    while (isPoint(c)) {
      if (c === to) return true;
      c = step(c, d);
    }
    return false;
  });
  if (!direction) return state;
  const rings = { ...(state.rings || {}) };
  const markers = { ...(state.markers || {}) };
  delete rings[from];
  rings[to] = side;
  markers[from] = side;
  const flipped: Coord[] = [];
  let c = step(from, direction);
  while (c !== to) {
    if (markers[c]) {
      markers[c] = flip(markers[c]);
      flipped.push(c);
    }
    c = step(c, direction);
  }
  return {
    ...state,
    rings,
    markers,
    pool: state.pool - 1,
    lastMove: { from, to, flipped },
  };
}

export function applyRemoveRow(
  state: YinshGameState,
  from: Coord,
  to: Coord,
  side: Side,
): YinshGameState {
  const cells = windowCells(from, to);
  const markers = { ...(state.markers || {}) };
  for (const cell of cells) delete markers[cell];
  return {
    ...state,
    markers,
    pool: state.pool + cells.length,
    lastMove: { ...state.lastMove, removed: cells, removedBy: side },
  };
}

export function applyRemoveRing(
  state: YinshGameState,
  coord: Coord,
): YinshGameState {
  const rings = { ...(state.rings || {}) };
  delete rings[coord];
  return {
    ...state,
    rings,
    lastMove: { ...state.lastMove, removedRing: coord },
  };
}
