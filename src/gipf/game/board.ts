import { Coord, GipfGameState, Side } from "./types";

/*
 * Client-side copy of the board geometry and the rule queries the table
 * needs for highlighting and previews. Keep in step with
 * functions/src/gipf/helpers.
 */

export const CENTRE: [number, number] = [4, 4];
export const RADIUS = 3;

export type Direction = [number, number];
export const DIRECTIONS: Direction[] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [0, 1],
];
const AXES: Direction[] = [
  [1, 0],
  [0, 1],
  [1, -1],
];

export const ROW_LENGTH = 4;
export const PIECES_PER_PLAYER = 15;

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

export function ringOf(coord: Coord): number {
  const [x, y] = parse(coord);
  const dq = x - CENTRE[0];
  const dr = y - CENTRE[1];
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

const all: Coord[] = [];
for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) all.push(`${x},${y}`);

export const ALL_SPOTS: Coord[] = all.filter((c) => ringOf(c) <= RADIUS);
export const DOTS: Coord[] = all.filter((c) => ringOf(c) === RADIUS + 1);
const SPOT_SET = new Set(ALL_SPOTS);
const DOT_SET = new Set(DOTS);
export const isSpot = (coord: Coord) => SPOT_SET.has(coord);
export const isDot = (coord: Coord) => DOT_SET.has(coord);

export const ENTRIES: [Coord, Direction][] = DOTS.flatMap((dot) =>
  DIRECTIONS.filter((d) => isSpot(step(dot, d))).map(
    (d) => [dot, d] as [Coord, Direction],
  ),
);

export function lineFrom(dot: Coord, direction: Direction): Coord[] {
  const spots: Coord[] = [];
  let current = step(dot, direction);
  while (isSpot(current)) {
    spots.push(current);
    current = step(current, direction);
  }
  return spots;
}

export function directionTo(from: Coord, to: Coord): Direction | null {
  return DIRECTIONS.find((d) => step(from, d) === to) ?? null;
}

/** The 21 lines of spots, with the dot at each end. */
export const LINES: { spots: Coord[]; ends: [Coord, Coord] }[] = (() => {
  const lines: { spots: Coord[]; ends: [Coord, Coord] }[] = [];
  for (const axis of AXES) {
    const back: Direction = [-axis[0], -axis[1]];
    for (const spot of ALL_SPOTS) {
      if (isSpot(step(spot, back))) continue;
      const spots = [spot];
      let c = step(spot, axis);
      while (isSpot(c)) {
        spots.push(c);
        c = step(c, axis);
      }
      lines.push({ spots, ends: [step(spot, back), c] });
    }
  }
  return lines;
})();

export const pieceAt = (state: GipfGameState, coord: Coord) =>
  state.pieces?.[coord];

export function piecesOf(state: GipfGameState, side: Side) {
  return Object.values(state.pieces || {}).filter((s) => s === side).length;
}

const firstVacant = (state: GipfGameState, spots: Coord[]) =>
  spots.findIndex((c) => !pieceAt(state, c));

export function canPush(
  state: GipfGameState,
  dot: Coord,
  direction: Direction,
) {
  return firstVacant(state, lineFrom(dot, direction)) !== -1;
}

/** Legal pushes as [dot, landing spot]. */
export function legalPushes(state: GipfGameState): [Coord, Coord][] {
  return ENTRIES.filter(([dot, d]) => canPush(state, dot, d)).map(
    ([dot, d]) => [dot, step(dot, d)],
  );
}

export type Row = { side: Side; cells: Coord[] };

export function rows(state: GipfGameState): Row[] {
  const found = new Map<string, Row>();
  for (const { spots: line } of LINES) {
    let start = 0;
    while (start < line.length) {
      if (!pieceAt(state, line[start])) {
        start++;
        continue;
      }
      let end = start;
      while (end + 1 < line.length && pieceAt(state, line[end + 1])) end++;
      const group = line.slice(start, end + 1);
      let run = 1;
      for (let i = 1; i <= group.length; i++) {
        const same =
          i < group.length &&
          pieceAt(state, group[i]) === pieceAt(state, group[i - 1]);
        if (same) {
          run++;
          continue;
        }
        if (run >= ROW_LENGTH) {
          const side = pieceAt(state, group[i - 1]) as Side;
          found.set(`${side}:${group.join("|")}`, { side, cells: group });
        }
        run = 1;
      }
      start = end + 1;
    }
  }
  return [...found.values()];
}

export function rowsFor(state: GipfGameState, side: Side): Row[] {
  return rows(state).filter((r) => r.side === side);
}

export function sideOf(
  state: GipfGameState,
  email: string | undefined,
): Side | undefined {
  return state.players.find((p) => p.email === email)?.side;
}

// ------------------------------------------------------------- optimistic

export function applyPush(
  state: GipfGameState,
  dot: Coord,
  to: Coord,
  side: Side,
): GipfGameState {
  const direction = directionTo(dot, to);
  if (!direction) return state;
  const spots = lineFrom(dot, direction);
  const vacant = firstVacant(state, spots);
  if (vacant === -1) return state;
  const pieces = { ...(state.pieces || {}) };
  for (let i = vacant; i > 0; i--) pieces[spots[i]] = pieces[spots[i - 1]];
  pieces[spots[0]] = side;
  const players = state.players.map((p) =>
    p.side === side ? { ...p, reserve: p.reserve - 1 } : p,
  );
  return {
    ...state,
    pieces,
    players,
    lastMove: { from: dot, to: spots[0], shifted: spots.slice(1, vacant + 1) },
  };
}

export function applyRemoveRow(
  state: GipfGameState,
  coord: Coord,
  side: Side,
): GipfGameState {
  const candidates = rowsFor(state, side).filter((r) =>
    r.cells.includes(coord),
  );
  if (candidates.length !== 1) return state;
  const pieces = { ...(state.pieces || {}) };
  const colours: Side[] = [];
  for (const cell of candidates[0].cells) {
    colours.push(pieces[cell]);
    delete pieces[cell];
  }
  return {
    ...state,
    pieces,
    lastMove: {
      ...state.lastMove,
      removed: [...(state.lastMove?.removed || []), ...candidates[0].cells],
      removedColours: [...(state.lastMove?.removedColours || []), ...colours],
    },
  };
}

// --------------------------------------------------------------- geometry

export const SPACING = 54;
const ROW_HEIGHT = SPACING * 0.866;
const PAD = 26;

export function position(coord: Coord): { x: number; y: number } {
  const [x, y] = parse(coord);
  return { x: SPACING * (x + y / 2), y: ROW_HEIGHT * y };
}

export function viewBox() {
  const points = [...ALL_SPOTS, ...DOTS];
  const xs = points.map((c) => position(c).x);
  const ys = points.map((c) => position(c).y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  return {
    minX,
    minY,
    width: Math.max(...xs) + PAD - minX,
    height: Math.max(...ys) + PAD - minY,
  };
}
