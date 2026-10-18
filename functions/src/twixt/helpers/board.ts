import { Link, Side } from "../types";

/*
 * The TwixT board: 24 by 24 holes with the four corners missing. A hole
 * is numbered row * 24 + col. Red's borders are the top and bottom rows,
 * Black's the left and right columns; a player may not peg the other's
 * borders. Links join pegs a knight's move apart and may not cross.
 */

export const SIZE = 24;
export const HOLES = SIZE * SIZE;

export const holeOf = (col: number, row: number) => row * SIZE + col;
export const colOf = (hole: number) => hole % SIZE;
export const rowOf = (hole: number) => Math.floor(hole / SIZE);

export function isHole(hole: unknown): hole is number {
  if (!Number.isInteger(hole)) return false;
  const h = hole as number;
  if (h < 0 || h >= HOLES) return false;
  const c = colOf(h);
  const r = rowOf(h);
  const edgeC = c === 0 || c === SIZE - 1;
  const edgeR = r === 0 || r === SIZE - 1;
  return !(edgeC && edgeR);
}

/** The border rows or columns a side must join, as hole indices. */
export function borders(side: Side): [number[], number[]] {
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 1; i < SIZE - 1; i++) {
    if (side === "RED") {
      a.push(holeOf(i, 0));
      b.push(holeOf(i, SIZE - 1));
    } else {
      a.push(holeOf(0, i));
      b.push(holeOf(SIZE - 1, i));
    }
  }
  return [a, b];
}

/** Whether a hole lies in the given side's border, which only that side may use. */
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

/** Holes a knight's move away. */
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

/** Whether two links cross. Links sharing a peg never cross. */
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
  // Knight-move segments never run collinear with a shared interior point, so proper crossing is enough.
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}
