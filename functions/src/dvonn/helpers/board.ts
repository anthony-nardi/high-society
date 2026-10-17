import { Coord } from "../types";

/*
 * The 49-space DVONN board on the same skewed grid as ZÈRTZ and YINSH:
 * rows y = 0..4 of 9, 10, 11, 10 and 9 spaces. Neighbours are W (x-1,y),
 * E (x+1,y), NW (x,y-1), NE (x+1,y-1), SW (x-1,y+1) and SE (x,y+1).
 */

const ROWS: [number, number, number][] = [
  // [y, firstX, lastX]
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

/** Adjacent spaces that are on the board. */
export function neighbours(coord: Coord): Coord[] {
  return DIRECTIONS.map((d) => step(coord, d)).filter(isSpace);
}
