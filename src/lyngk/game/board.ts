import { Colour, Coord, LyngkGameState, LyngkScore, Piece } from "./types";

/*
 * Client-side copy of the board geometry and the rule queries the table
 * needs for highlighting and previews. Keep in step with
 * functions/src/lyngk/helpers.
 */

const ROWS: [number, number, number][] = [
  [0, 4, 6],
  [1, 3, 6],
  [2, 2, 6],
  [3, 1, 6],
  [4, 0, 6],
  [5, 0, 5],
  [6, 0, 4],
  [7, 0, 3],
  [8, 0, 2],
];

export const ALL_SPOTS: Coord[] = ROWS.flatMap(([y, from, to]) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${y}`),
);
const SPOT_SET = new Set(ALL_SPOTS);
export const isSpot = (coord: Coord) => SPOT_SET.has(coord);

type Direction = [number, number];
export const DIRECTIONS: Direction[] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [0, 1],
];

export const COLOURS: Colour[] = ["RED", "BLUE", "GREEN", "BLACK", "IVORY"];
export const MAX_HEIGHT = 5;
export const CLAIMS_PER_PLAYER = 2;
export const MAX_LINKS = 3;

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

export const stackAt = (state: LyngkGameState, coord: Coord) =>
  state.stacks?.[coord];
export const topOf = (stack: Piece[] | undefined): Piece | undefined =>
  stack?.[stack.length - 1];

export function claimerOf(
  state: LyngkGameState,
  piece: Piece | undefined,
): string | undefined {
  if (!piece || piece === "JOKER") return undefined;
  return state.players.find((p) => p.colours?.includes(piece))?.email;
}

export function unclaimedColours(state: LyngkGameState): Colour[] {
  return COLOURS.filter((c) => !claimerOf(state, c));
}

export function mayMove(state: LyngkGameState, email: string, coord: Coord) {
  const top = topOf(stackAt(state, coord));
  if (!top || top === "JOKER") return false;
  const owner = claimerOf(state, top);
  return !owner || owner === email;
}

export function mayLand(
  state: LyngkGameState,
  mover: Piece[],
  target: Piece[],
) {
  if (mover.length + target.length > MAX_HEIGHT) return false;
  const colours = [...mover, ...target].filter((p) => p !== "JOKER");
  if (new Set(colours).size !== colours.length) return false;
  if (!claimerOf(state, topOf(mover))) {
    if (mover.length === 1) return target.length === 1;
    return target.length <= mover.length;
  }
  return true;
}

export function firstOccupied(
  state: LyngkGameState,
  from: Coord,
  direction: Direction,
  ignore: Coord,
): Coord | null {
  let current = step(from, direction);
  while (isSpot(current)) {
    if (current !== ignore && stackAt(state, current)?.length) return current;
    current = step(current, direction);
  }
  return null;
}

export function pathsFrom(
  state: LyngkGameState,
  email: string,
  from: Coord,
): Coord[][] {
  const stack = stackAt(state, from);
  if (!stack?.length || !mayMove(state, email, from)) return [];
  const top = topOf(stack) as Piece;
  const linking = claimerOf(state, top) === email;
  const paths: Coord[][] = [];
  const extend = (current: Coord, path: Coord[], used: Set<Coord>) => {
    for (const direction of DIRECTIONS) {
      const next = firstOccupied(state, current, direction, from);
      if (!next || used.has(next)) continue;
      const target = stackAt(state, next) as Piece[];
      if (linking && topOf(target) === top) {
        if (path.length - 1 < MAX_LINKS)
          extend(next, [...path, next], new Set([...used, next]));
        continue;
      }
      if (mayLand(state, stack, target)) paths.push([...path, next]);
    }
  };
  extend(from, [from], new Set([from]));
  return paths;
}

export function movableStacks(state: LyngkGameState, email: string): Coord[] {
  return Object.keys(state.stacks || {}).filter(
    (c) => pathsFrom(state, email, c).length > 0,
  );
}

export function scoreOf(state: LyngkGameState, email: string): LyngkScore {
  const player = state.players.find((p) => p.email === email);
  const score: LyngkScore = [player?.scored ?? 0, 0, 0, 0, 0];
  for (const stack of Object.values(state.stacks || {})) {
    if (claimerOf(state, topOf(stack)) !== email) continue;
    if (stack.length >= 1 && stack.length <= 4) score[5 - stack.length] += 1;
  }
  return score;
}

// ------------------------------------------------------------- optimistic

export function applyClaim(
  state: LyngkGameState,
  email: string,
  colour: Colour,
): LyngkGameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.email === email
        ? {
            ...p,
            colours: [...(p.colours || []), colour],
            claimedThisTurn: true,
          }
        : p,
    ),
    lastMove: { claimed: colour },
  };
}

export function applyMove(
  state: LyngkGameState,
  path: Coord[],
): LyngkGameState {
  const from = path[0];
  const to = path[path.length - 1];
  const mover = stackAt(state, from);
  const target = stackAt(state, to);
  if (!mover || !target) return state;
  const stacks = { ...(state.stacks || {}) };
  const landed = [...target, ...mover];
  stacks[to] = landed;
  delete stacks[from];
  let players = state.players;
  let lastMove: LyngkGameState["lastMove"] = { path };
  if (landed.length === MAX_HEIGHT) {
    const owner = claimerOf(state, topOf(landed));
    if (owner) {
      delete stacks[to];
      players = players.map((p) =>
        p.email === owner ? { ...p, scored: p.scored + 1 } : p,
      );
      lastMove = { path, removed: to, removedPieces: landed };
    }
  }
  return { ...state, stacks, players, lastMove };
}

// --------------------------------------------------------------- geometry

export const SPACING = 58;
const ROW_HEIGHT = SPACING * 0.866;
const PAD = 34;

export function position(coord: Coord): { x: number; y: number } {
  const [x, y] = parse(coord);
  return { x: SPACING * (x + y / 2), y: ROW_HEIGHT * y };
}

export function viewBox() {
  const xs = ALL_SPOTS.map((c) => position(c).x);
  const ys = ALL_SPOTS.map((c) => position(c).y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  return {
    minX,
    minY,
    width: Math.max(...xs) + PAD - minX,
    height: Math.max(...ys) + PAD - minY,
  };
}
