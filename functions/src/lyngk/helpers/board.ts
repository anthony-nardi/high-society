import { Coord } from "../types";

/*
 * The 43-spot LYNGK board on the skewed grid shared by the other GIPF
 * games: rows y = 0..8 of 3, 4, 5, 6, 7, 6, 5, 4 and 3 spots. Neighbours
 * are W (x-1,y), E (x+1,y), NW (x,y-1), NE (x+1,y-1), SW (x-1,y+1), SE (x,y+1).
 */

const ROWS: [number, number, number][] = [
  // [y, firstX, lastX]
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

export type Direction = [number, number];

export const DIRECTIONS: Direction[] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [0, 1],
];

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}
