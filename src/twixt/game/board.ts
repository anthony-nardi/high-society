import { Link, Side, TwixtGameState } from "./types";

/*
 * Client-side copy of the TwixT board and the rule queries the table
 * needs. Keep in step with functions/src/twixt/helpers.
 */

export const SIZE = 24;
export const HOLES = SIZE * SIZE;

export const SIDE_COLOUR: { [side in Side]: string } = {
  RED: "#d64545",
  BLACK: "#2b2b2b",
};

export const holeOf = (col: number, row: number) => row * SIZE + col;
export const colOf = (hole: number) => hole % SIZE;
export const rowOf = (hole: number) => Math.floor(hole / SIZE);

export function isHole(hole: number) {
  if (!Number.isInteger(hole) || hole < 0 || hole >= HOLES) return false;
  const c = colOf(hole);
  const r = rowOf(hole);
  return !((c === 0 || c === SIZE - 1) && (r === 0 || r === SIZE - 1));
}

export function inBorder(hole: number, side: Side) {
  const c = colOf(hole);
  const r = rowOf(hole);
  return side === "RED" ? r === 0 || r === SIZE - 1 : c === 0 || c === SIZE - 1;
}

export const other = (side: Side): Side => (side === "RED" ? "BLACK" : "RED");

const KNIGHT = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

export function reach(hole: number): number[] {
  const c = colOf(hole);
  const r = rowOf(hole);
  const out: number[] = [];
  for (const [dc, dr] of KNIGHT) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nc >= SIZE || nr < 0 || nr >= SIZE) continue;
    const h = holeOf(nc, nr);
    if (isHole(h)) out.push(h);
  }
  return out;
}

export const linkOf = (a: number, b: number): Link => (a < b ? [a, b] : [b, a]);
export const sameLink = (x: Link, y: Link) => x[0] === y[0] && x[1] === y[1];

export function crosses(x: Link, y: Link) {
  if (x[0] === y[0] || x[0] === y[1] || x[1] === y[0] || x[1] === y[1])
    return false;
  const ax = colOf(x[0]);
  const ay = rowOf(x[0]);
  const bx = colOf(x[1]);
  const by = rowOf(x[1]);
  const cx = colOf(y[0]);
  const cy = rowOf(y[0]);
  const dx = colOf(y[1]);
  const dy = rowOf(y[1]);
  const orient = (
    px: number,
    py: number,
    qx: number,
    qy: number,
    rx: number,
    ry: number,
  ) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

export const pegAt = (state: TwixtGameState, hole: number): Side | undefined =>
  state.pegs?.[String(hole)];
export const linksOf = (state: TwixtGameState): Link[] => state.links || [];

export function placementProblem(
  state: TwixtGameState,
  side: Side,
  hole: number,
): string | null {
  if (!isHole(hole)) return "That is not a hole on the board.";
  if (pegAt(state, hole)) return "That hole already holds a peg.";
  if (inBorder(hole, other(side)))
    return "Only the other player may peg their own border rows.";
  return null;
}

export function linksFor(
  state: TwixtGameState,
  side: Side,
  hole: number,
): Link[] {
  const existing = linksOf(state);
  const out: Link[] = [];
  for (const n of reach(hole)) {
    if (pegAt(state, n) !== side) continue;
    const link = linkOf(hole, n);
    if (existing.some((l) => sameLink(l, link))) continue;
    if (existing.some((l) => crosses(l, link))) continue;
    if (out.some((l) => crosses(l, link))) continue;
    out.push(link);
  }
  return out;
}

/** Shows the peg and its links at once while the server is asked. */
export function applyPlace(
  state: TwixtGameState,
  side: Side,
  hole: number,
  email: string,
): TwixtGameState {
  const added = linksFor(state, side, hole);
  return {
    ...state,
    pegs: { ...(state.pegs || {}), [String(hole)]: side },
    links: [...linksOf(state), ...added],
    moves: state.moves + 1,
    lastMove: { type: "peg", email, hole, ...(added.length ? { added } : {}) },
  };
}

export const label = (hole: number) =>
  `${String.fromCharCode(65 + colOf(hole))}${rowOf(hole) + 1}`;

export const swapAvailable = (state: TwixtGameState) =>
  state.moves === 1 && !state.swapOffered;
