import { Coord } from "../types";

/*
 * The 85-point YINSH board on the same skewed grid as ZÈRTZ: rows y = 0..10,
 * neighbours W (x-1,y), E (x+1,y), NW (x,y-1), NE (x+1,y-1), SW (x-1,y+1),
 * SE (x,y+1). Lines run along the three axes. Layout from the 2023 branch.
 */

const ROWS: [number, number, number][] = [
  // [y, firstX, lastX]
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

export type Direction = [number, number];

/** The three axes, each with its opposite. */
export const AXES: Direction[] = [
  [1, 0], // E-W
  [0, 1], // SE-NW
  [1, -1], // NE-SW
];

export const DIRECTIONS: Direction[] = AXES.flatMap(([dx, dy]) => [
  [dx, dy],
  [-dx, -dy],
]);

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

/** Every point from `from` (exclusive) walking `direction` while on the board. */
export function ray(from: Coord, direction: Direction): Coord[] {
  const points: Coord[] = [];
  let current = step(from, direction);
  while (isPoint(current)) {
    points.push(current);
    current = step(current, direction);
  }
  return points;
}

/** All maximal lines of the board along each axis, as ordered point lists. */
export function allLines(): Coord[][] {
  const lines: Coord[][] = [];
  for (const axis of AXES) {
    const back: Direction = [-axis[0], -axis[1]];
    for (const point of ALL_POINTS) {
      // Only start a line from its first point.
      if (isPoint(step(point, back))) continue;
      lines.push([point, ...ray(point, axis)]);
    }
  }
  return lines;
}

export const LINES = allLines();
