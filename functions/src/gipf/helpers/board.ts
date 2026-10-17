import { Coord } from "../types";

/*
 * The GIPF board on the skewed grid shared by the other GIPF games: a
 * hexagon of 37 spots within three steps of the centre (4,4), ringed by 24
 * dots four steps out from which pieces are pushed in. Neighbours are
 * W (x-1,y), E (x+1,y), NW (x,y-1), NE (x+1,y-1), SW (x-1,y+1), SE (x,y+1).
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

/** The three axes, one direction each, for walking lines. */
export const AXES: Direction[] = [
  [1, 0],
  [0, 1],
  [1, -1],
];

export function parse(coord: Coord): [number, number] {
  const [x, y] = coord.split(",").map(Number);
  return [x, y];
}

export function step(coord: Coord, [dx, dy]: Direction, times = 1): Coord {
  const [x, y] = parse(coord);
  return `${x + dx * times},${y + dy * times}`;
}

/** Hex distance from the centre. */
export function ringOf(coord: Coord): number {
  const [x, y] = parse(coord);
  const dq = x - CENTRE[0];
  const dr = y - CENTRE[1];
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

const all: Coord[] = [];
for (let y = 0; y <= 8; y++) {
  for (let x = 0; x <= 8; x++) all.push(`${x},${y}`);
}

/** The 37 playing spots. */
export const ALL_SPOTS: Coord[] = all.filter((c) => ringOf(c) <= RADIUS);
/** The 24 outer dots. */
export const DOTS: Coord[] = all.filter((c) => ringOf(c) === RADIUS + 1);

const SPOT_SET = new Set(ALL_SPOTS);
const DOT_SET = new Set(DOTS);

export const isSpot = (coord: Coord) => SPOT_SET.has(coord);
export const isDot = (coord: Coord) => DOT_SET.has(coord);

/** The six corner spots, in order around the board. */
export const CORNERS: Coord[] = ["7,1", "7,4", "4,7", "1,7", "1,4", "4,1"];

/** Every way in: a dot and the direction that leads onto the board. */
export const ENTRIES: [Coord, Direction][] = DOTS.flatMap((dot) =>
  DIRECTIONS.filter((d) => isSpot(step(dot, d))).map(
    (d) => [dot, d] as [Coord, Direction],
  ),
);

/** The spots along a line from a dot inwards, in order, until the far edge. */
export function lineFrom(dot: Coord, direction: Direction): Coord[] {
  const spots: Coord[] = [];
  let current = step(dot, direction);
  while (isSpot(current)) {
    spots.push(current);
    current = step(current, direction);
  }
  return spots;
}

/** The direction from a dot to an adjacent spot, if there is one. */
export function directionTo(dot: Coord, spot: Coord): Direction | null {
  return DIRECTIONS.find((d) => step(dot, d) === spot) ?? null;
}

/** The 21 lines of spots along the three axes. */
export const LINES: Coord[][] = (() => {
  const lines: Coord[][] = [];
  for (const axis of AXES) {
    const back: Direction = [-axis[0], -axis[1]];
    for (const spot of ALL_SPOTS) {
      if (isSpot(step(spot, back))) continue;
      const line = [spot];
      let c = step(spot, axis);
      while (isSpot(c)) {
        line.push(c);
        c = step(c, axis);
      }
      lines.push(line);
    }
  }
  return lines;
})();
