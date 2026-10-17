import { Railroad } from "../types";
import { CityKind, HEXES, HexInfo, MAP_HEIGHT, MAP_WIDTH } from "./map";

export { HEXES, MAP_HEIGHT, MAP_WIDTH };
export type { CityKind, HexInfo };

/*
 * Geometry and fixed facts about the map. The grid is "odd-r": odd rows
 * are shifted half a hex to the right.
 */

export const RAILROADS: Railroad[] = [
  "RED",
  "BLUE",
  "ORANGE",
  "YELLOW",
  "PURPLE",
  "BLACK",
];

/** The round each railroad opens in. */
export const OPENS: { [railroad in Railroad]: number } = {
  RED: 1,
  BLUE: 1,
  ORANGE: 2,
  YELLOW: 3,
  PURPLE: 4,
  BLACK: 5,
};

export const ROUNDS = 6;
export const LOCOMOTIVES_PER_RAILROAD = 27;
export const CHICAGO_BONUS = 2;
export const CITY_BONUS = 5;
export const TRANSCONTINENTAL_CITY_BONUS = 12;
export const TRANSCONTINENTAL_BONUS = 8;
export const HEX_CAPACITY = 2;

export const label = (railroad: Railroad) =>
  railroad.charAt(0) + railroad.slice(1).toLowerCase();

export const railroadsOpen = (round: number) =>
  RAILROADS.filter((r) => OPENS[r] <= round);

/** Locomotives a player may lay in one build turn. */
export function buildLimit(playerCount: number) {
  if (playerCount <= 3) return 8;
  if (playerCount === 4) return 5;
  return 4;
}

export const hexIndex = (col: number, row: number) => row * MAP_WIDTH + col;
export const colOf = (hex: number) => hex % MAP_WIDTH;
export const rowOf = (hex: number) => Math.floor(hex / MAP_WIDTH);

export const isHex = (hex: unknown): hex is number =>
  Number.isInteger(hex) &&
  (hex as number) >= 0 &&
  (hex as number) < HEXES.length;

export const isLand = (hex: number) => isHex(hex) && HEXES[hex].land;
export const isMountain = (hex: number) => isHex(hex) && HEXES[hex].mountain;
export const isCity = (hex: number) => isHex(hex) && !!HEXES[hex].city;
export const cityName = (hex: number) => HEXES[hex]?.city ?? `hex ${hex}`;
export const kindOf = (hex: number) => HEXES[hex]?.kind;
export const isChicago = (hex: number) => kindOf(hex) === "CHICAGO";

export const CITIES: number[] = HEXES.map((h, i) => (h.city ? i : -1)).filter(
  (i) => i >= 0,
);
export const CHICAGO = CITIES.find((c) => isChicago(c)) as number;
export const EAST_CITIES = CITIES.filter((c) => kindOf(c) === "EAST");
export const WEST_CITIES = CITIES.filter((c) => kindOf(c) === "WEST");
export const BONUS_CITIES = CITIES.filter((c) => kindOf(c) === "BONUS");

const EVEN_ROW = [
  [-1, -1],
  [0, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
];
const ODD_ROW = [
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

const NEIGHBOURS: number[][] = HEXES.map((_, hex) => {
  const col = colOf(hex);
  const row = rowOf(hex);
  const deltas = row % 2 ? ODD_ROW : EVEN_ROW;
  const out: number[] = [];
  for (const [dc, dr] of deltas) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || c >= MAP_WIDTH || r < 0 || r >= MAP_HEIGHT) continue;
    const n = hexIndex(c, r);
    if (HEXES[n].land) out.push(n);
  }
  return out;
});

/** Land hexes touching this one, in a fixed order. */
export const neighbours = (hex: number): number[] =>
  isHex(hex) ? NEIGHBOURS[hex] : [];

/** Centre of a hex on a canvas where a hex is one unit wide. */
export function centreOf(hex: number) {
  const row = rowOf(hex);
  return { x: colOf(hex) + (row % 2 ? 0.5 : 0) + 0.5, y: row * 0.866 + 0.5 };
}

/** Straight-line distance in hex widths. */
export function distance(a: number, b: number) {
  const p = centreOf(a);
  const q = centreOf(b);
  return Math.hypot(p.x - q.x, p.y - q.y);
}
