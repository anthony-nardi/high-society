import { Colour, COLOURS, Coord, MarbleCounts, ZertzGameState } from "./types";

/*
 * Client-side copy of the board geometry and the rule queries the table
 * needs for highlighting. Keep in step with functions/src/zertz/helpers.
 */

export const ALL_RINGS: Coord[] = [
  "4,0", "5,0", "6,0", "7,0",
  "3,1", "4,1", "5,1", "6,1", "7,1",
  "2,2", "3,2", "4,2", "5,2", "6,2", "7,2",
  "1,3", "2,3", "3,3", "4,3", "5,3", "6,3", "7,3",
  "1,4", "2,4", "3,4", "4,4", "5,4", "6,4",
  "1,5", "2,5", "3,5", "4,5", "5,5",
  "1,6", "2,6", "3,6", "4,6",
];

type Direction = [number, number];

/** Clockwise from north-west, so consecutive pairs share a corner. */
export const DIRECTIONS: Direction[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export const WIN_OF_EACH = 3;
export const WIN_OF_ONE: { [colour in Colour]: number } = {
  WHITE: 4,
  GRAY: 5,
  BLACK: 6,
};

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

export function neighbours(coord: Coord): Coord[] {
  return DIRECTIONS.map((d) => step(coord, d));
}

export const count = (counts: MarbleCounts | undefined, colour: Colour) =>
  counts?.[colour] || 0;

export const hasRing = (state: ZertzGameState, coord: Coord) =>
  state.rings.includes(coord);

export const marbleAt = (state: ZertzGameState, coord: Coord) =>
  state.marbles?.[coord];

export const isVacant = (state: ZertzGameState, coord: Coord) =>
  hasRing(state, coord) && !marbleAt(state, coord);

export function jumpsFrom(state: ZertzGameState, from: Coord): Coord[] {
  if (!marbleAt(state, from)) return [];
  const targets: Coord[] = [];
  for (const d of DIRECTIONS) {
    if (marbleAt(state, step(from, d)) && isVacant(state, step(from, d, 2))) {
      targets.push(step(from, d, 2));
    }
  }
  return targets;
}

/** Marbles that can capture right now. */
export function capturers(state: ZertzGameState): Coord[] {
  return Object.keys(state.marbles || {}).filter(
    (from) => jumpsFrom(state, from).length > 0
  );
}

/** The marble jumped over between two coords two steps apart. */
export function jumpedOver(from: Coord, to: Coord): Coord | null {
  for (const d of DIRECTIONS) {
    if (step(from, d, 2) === to) return step(from, d);
  }
  return null;
}

export function isRemovable(state: ZertzGameState, coord: Coord) {
  if (!isVacant(state, coord)) return false;
  const around = neighbours(coord).map((n) => hasRing(state, n));
  for (let i = 0; i < around.length; i++) {
    if (!around[i] && !around[(i + 1) % around.length]) return true;
  }
  return false;
}

export function removableRings(state: ZertzGameState) {
  return state.rings.filter((c) => isRemovable(state, c));
}

/** Colours the active player may place: from the pool, or their captures once it is empty. */
export function placeableColours(state: ZertzGameState): Colour[] {
  const fromPool = COLOURS.filter((c) => count(state.pool, c) > 0);
  if (fromPool.length) return fromPool;
  const player = state.players.find((p) => p.email === state.activePlayer);
  return COLOURS.filter((c) => count(player?.captured, c) > 0);
}

/** How close a set of captures is to any winning condition, 0 to 1. */
export function winProgress(captured: MarbleCounts | undefined) {
  const each = Math.min(...COLOURS.map((c) => count(captured, c) / WIN_OF_EACH));
  const single = Math.max(...COLOURS.map((c) => count(captured, c) / WIN_OF_ONE[c]));
  return Math.min(1, Math.max(each, single));
}

/** The shortest route to a win, as "2 more white" or "1 more of each". */
export function winHint(captured: MarbleCounts | undefined) {
  const options: { label: string; needed: number }[] = [];
  const eachNeeded = COLOURS.reduce(
    (sum, c) => sum + Math.max(0, WIN_OF_EACH - count(captured, c)),
    0
  );
  options.push({ label: eachNeeded === 1 ? "1 more for three of each" : `${eachNeeded} more for three of each`, needed: eachNeeded });
  for (const c of COLOURS) {
    const needed = Math.max(0, WIN_OF_ONE[c] - count(captured, c));
    options.push({ label: `${needed} more ${c.toLowerCase()}`, needed });
  }
  options.sort((a, b) => a.needed - b.needed);
  return options[0];
}

// --------------------------------------------------------------- geometry

/** Ring spacing in SVG units. */
export const SPACING = 56;
export const RING_RADIUS = 22;
const ROW_HEIGHT = SPACING * 0.866;
const PAD = RING_RADIUS + 10;

export function position(coord: Coord): { x: number; y: number } {
  const [x, y] = parse(coord);
  return { x: SPACING * (x + y / 2), y: ROW_HEIGHT * y };
}

/** The SVG viewBox that fits every ring, with padding. */
export function viewBox() {
  const xs = ALL_RINGS.map((c) => position(c).x);
  const ys = ALL_RINGS.map((c) => position(c).y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs) + PAD;
  const maxY = Math.max(...ys) + PAD;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
