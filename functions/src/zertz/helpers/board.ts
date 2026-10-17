import { Coord } from "../types";

/*
 * The 37-ring hexagonal board on a skewed grid: rows y = 0..6, with x
 * shifted so that the six neighbours of (x, y) are
 *   W (x-1, y)   E (x+1, y)
 *   NW (x, y-1)  NE (x+1, y-1)
 *   SW (x-1, y+1) SE (x, y+1)
 * This is the layout the 2019 implementation used.
 */

export const ALL_RINGS: Coord[] = [
  "4,0",
  "5,0",
  "6,0",
  "7,0",
  "3,1",
  "4,1",
  "5,1",
  "6,1",
  "7,1",
  "2,2",
  "3,2",
  "4,2",
  "5,2",
  "6,2",
  "7,2",
  "1,3",
  "2,3",
  "3,3",
  "4,3",
  "5,3",
  "6,3",
  "7,3",
  "1,4",
  "2,4",
  "3,4",
  "4,4",
  "5,4",
  "6,4",
  "1,5",
  "2,5",
  "3,5",
  "4,5",
  "5,5",
  "1,6",
  "2,6",
  "3,6",
  "4,6",
];

export type Direction = [number, number];

/** Clockwise from north-west, so consecutive pairs share a corner. */
export const DIRECTIONS: Direction[] = [
  [0, -1], // NW
  [1, -1], // NE
  [1, 0], // E
  [0, 1], // SE
  [-1, 1], // SW
  [-1, 0], // W
];

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

export function neighbours(coord: Coord): Coord[] {
  return DIRECTIONS.map((direction) => step(coord, direction));
}

/** Connected groups of rings, each as a list of coords. */
export function components(rings: Coord[]): Coord[][] {
  const left = new Set(rings);
  const groups: Coord[][] = [];
  while (left.size) {
    const start = left.values().next().value as Coord;
    const group: Coord[] = [];
    const queue = [start];
    left.delete(start);
    while (queue.length) {
      const coord = queue.pop() as Coord;
      group.push(coord);
      for (const next of neighbours(coord)) {
        if (left.has(next)) {
          left.delete(next);
          queue.push(next);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
