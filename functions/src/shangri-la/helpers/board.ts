import { Master } from "../types";

/*
 * The map: thirteen villages and twenty-three bridges, laid out for this
 * app (the printed board's artwork is not reproduced). The village on the
 * eastern edge has three bridges and sits out of a three-player game, as
 * the red village does on the printed board.
 */

export const MASTERS: Master[] = [
  "RAINMAKER",
  "PRIEST",
  "YETI_WHISPERER",
  "ASTROLOGER",
  "DRAGONBREEDER",
  "HEALER",
  "FIREKEEPER",
];

export type VillageInfo = { name: string; x: number; y: number };

/** Positions on a 100 by 100 canvas, for the table and for the bot's sense of the middle. */
export const VILLAGES: VillageInfo[] = [
  { name: "Tashi", x: 50, y: 8 },
  { name: "Nyima", x: 28, y: 22 },
  { name: "Dawa", x: 72, y: 22 },
  { name: "Pema", x: 10, y: 40 },
  { name: "Dorje", x: 37, y: 38 },
  { name: "Sonam", x: 63, y: 38 },
  { name: "Karma", x: 91, y: 40 },
  { name: "Norbu", x: 22, y: 58 },
  { name: "Rinchen", x: 50, y: 56 },
  { name: "Lhamo", x: 78, y: 58 },
  { name: "Yeshe", x: 32, y: 77 },
  { name: "Tenzin", x: 68, y: 77 },
  { name: "Dechen", x: 50, y: 93 },
];

/** The village that sits out with three players. */
export const RED_VILLAGE = 6;

export const ALL_BRIDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
  [3, 4],
  [4, 5],
  [5, 6],
  [3, 7],
  [4, 7],
  [4, 8],
  [5, 8],
  [5, 9],
  [6, 9],
  [7, 8],
  [7, 10],
  [8, 10],
  [8, 11],
  [9, 11],
  [10, 11],
  [10, 12],
  [11, 12],
];

export function bridgesFor(playerCount: number): [number, number][] {
  return playerCount <= 3
    ? ALL_BRIDGES.filter(([a, b]) => a !== RED_VILLAGE && b !== RED_VILLAGE)
    : [...ALL_BRIDGES];
}

export function neighbours(
  bridges: [number, number][],
  village: number,
): number[] {
  return bridges
    .filter(([a, b]) => a === village || b === village)
    .map(([a, b]) => (a === village ? b : a));
}

export function hasBridge(bridges: [number, number][], a: number, b: number) {
  return bridges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
