import { Coord, DvonnGameState, Piece, Side } from "./types";

/*
 * Client-side copy of the board geometry and the rule queries the table
 * needs for highlighting and previews. Keep in step with
 * functions/src/dvonn/helpers.
 */

const ROWS: [number, number, number][] = [
  [0, 2, 10],
  [1, 1, 10],
  [2, 0, 10],
  [3, 0, 9],
  [4, 0, 8],
];

export const ALL_SPACES: Coord[] = ROWS.flatMap(([y, from, to]) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${y}`),
);
const SPACE_SET = new Set(ALL_SPACES);
export const isSpace = (coord: Coord) => SPACE_SET.has(coord);

type Direction = [number, number];
export const DIRECTIONS: Direction[] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [0, 1],
];

export const PIECES_PER_PLAYER = 23;

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

export function neighbours(coord: Coord): Coord[] {
  return DIRECTIONS.map((d) => step(coord, d)).filter(isSpace);
}

export const stackAt = (state: DvonnGameState, coord: Coord) =>
  state.stacks?.[coord];
export const isOccupied = (state: DvonnGameState, coord: Coord) =>
  !!stackAt(state, coord)?.length;
export const isEmpty = (state: DvonnGameState, coord: Coord) =>
  isSpace(coord) && !isOccupied(state, coord);
export const topOf = (
  state: DvonnGameState,
  coord: Coord,
): Piece | undefined => {
  const stack = stackAt(state, coord);
  return stack?.[stack.length - 1];
};
export const hasDvonn = (stack: Piece[] | undefined) =>
  !!stack?.includes("DVONN");

export function isSurrounded(state: DvonnGameState, coord: Coord) {
  const around = neighbours(coord);
  return around.length === 6 && around.every((c) => isOccupied(state, c));
}

export function movesFrom(state: DvonnGameState, from: Coord): Coord[] {
  const stack = stackAt(state, from);
  if (!stack?.length || stack[stack.length - 1] === "DVONN") return [];
  if (isSurrounded(state, from)) return [];
  const targets: Coord[] = [];
  for (const d of DIRECTIONS) {
    const to = step(from, d, stack.length);
    if (isSpace(to) && isOccupied(state, to)) targets.push(to);
  }
  return targets;
}

export function stacksOf(state: DvonnGameState, side: Side): Coord[] {
  return Object.keys(state.stacks || {}).filter(
    (c) => topOf(state, c) === side,
  );
}

export function movableStacks(state: DvonnGameState, side: Side): Coord[] {
  return stacksOf(state, side).filter((c) => movesFrom(state, c).length > 0);
}

export function connectedToDvonn(state: DvonnGameState): Set<Coord> {
  const stacks = state.stacks || {};
  const seen = new Set<Coord>();
  const queue = Object.keys(stacks).filter((c) => hasDvonn(stacks[c]));
  for (const c of queue) seen.add(c);
  while (queue.length) {
    const current = queue.pop() as Coord;
    for (const next of neighbours(current)) {
      if (stacks[next]?.length && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function scores(state: DvonnGameState): {
  WHITE: number;
  BLACK: number;
} {
  const totals = { WHITE: 0, BLACK: 0 };
  for (const [coord, stack] of Object.entries(state.stacks || {})) {
    const top = topOf(state, coord);
    if (top === "WHITE" || top === "BLACK") totals[top] += stack.length;
  }
  return totals;
}

export function sideOf(
  state: DvonnGameState,
  email: string | undefined,
): Side | undefined {
  return state.players.find((p) => p.email === email)?.side;
}

// ------------------------------------------------------------- optimistic
// Previews shown until the server's state arrives. Turn order is left to
// the server; the pieces move the way the rules say.

export function applyPlace(
  state: DvonnGameState,
  coord: Coord,
  piece: Piece,
): DvonnGameState {
  return {
    ...state,
    stacks: { ...(state.stacks || {}), [coord]: [piece] },
    lastMove: { placed: coord },
  };
}

export function applyMove(
  state: DvonnGameState,
  from: Coord,
  to: Coord,
): DvonnGameState {
  const stack = stackAt(state, from);
  if (!stack) return state;
  const stacks = { ...(state.stacks || {}) };
  stacks[to] = [...(stacks[to] || []), ...stack];
  delete stacks[from];
  const next: DvonnGameState = { ...state, stacks, lastMove: { from, to } };
  const linked = connectedToDvonn(next);
  const removed: Coord[] = [];
  const removedTops: Piece[] = [];
  for (const coord of Object.keys(stacks)) {
    if (!linked.has(coord)) {
      removed.push(coord);
      removedTops.push(stacks[coord][stacks[coord].length - 1]);
      delete stacks[coord];
    }
  }
  if (removed.length) next.lastMove = { from, to, removed, removedTops };
  return next;
}

// --------------------------------------------------------------- geometry

export const SPACING = 60;
const ROW_HEIGHT = SPACING * 0.866;
const PAD = 36;

export function position(coord: Coord): { x: number; y: number } {
  const [x, y] = parse(coord);
  return { x: SPACING * (x + y / 2), y: ROW_HEIGHT * y };
}

export function viewBox() {
  const xs = ALL_SPACES.map((c) => position(c).x);
  const ys = ALL_SPACES.map((c) => position(c).y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  return {
    minX,
    minY,
    width: Math.max(...xs) + PAD - minX,
    height: Math.max(...ys) + PAD - minY,
  };
}

/** A pointy-top hexagon around (x, y), as an SVG points string. */
export function hexagon(x: number, y: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${(x + r * Math.cos(angle)).toFixed(1)},${(y + r * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}
