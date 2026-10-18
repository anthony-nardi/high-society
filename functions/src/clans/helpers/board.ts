import { Colour, Huts } from "../types";
import { LAKES, Terrain, TERRITORIES, TerritoryInfo } from "./map";

export { LAKES, TERRITORIES };
export type { Terrain, TerritoryInfo };

/*
 * Fixed facts about the Clans board and the epoch chart.
 */

export const COLOURS: Colour[] = ["RED", "BLUE", "YELLOW", "GREEN", "BLACK"];
export const TERRAINS: Terrain[] = [
  "GRASSLAND",
  "FOREST",
  "MOUNTAIN",
  "STEPPE",
];

export const HUTS_PER_COLOUR = 12;
export const VILLAGE_COUNT = 12;
/** A territory holding this many huts can no longer be moved. */
export const FROZEN_AT = 7;

export type Epoch = {
  /** Villages founded during it. */
  villages: number;
  favoured?: Terrain;
  forbidden?: Terrain;
  bonus: number;
};

/**
 * The five epochs: 4, 3, 2, 2 and 1 villages. Each but the last favours
 * one terrain with a growing bonus and forbids another. The printed chart
 * is not reproduced online; these pairings are this app's own.
 */
export const EPOCHS: Epoch[] = [
  { villages: 4, favoured: "GRASSLAND", forbidden: "MOUNTAIN", bonus: 1 },
  { villages: 3, favoured: "FOREST", forbidden: "STEPPE", bonus: 2 },
  { villages: 2, favoured: "MOUNTAIN", forbidden: "GRASSLAND", bonus: 3 },
  { villages: 2, favoured: "STEPPE", forbidden: "FOREST", bonus: 4 },
  { villages: 1, bonus: 0 },
];

/** The epoch (0 to 4) the next village falls in, given how many stand. */
export function epochOf(villagesSoFar: number) {
  let left = villagesSoFar;
  for (let i = 0; i < EPOCHS.length; i++) {
    if (left < EPOCHS[i].villages) return i;
    left -= EPOCHS[i].villages;
  }
  return EPOCHS.length - 1;
}

export const label = (word: string) =>
  word.charAt(0) + word.slice(1).toLowerCase();

export const isTerritory = (t: unknown): t is number =>
  Number.isInteger(t) &&
  (t as number) >= 0 &&
  (t as number) < TERRITORIES.length;

export const neighbours = (t: number): number[] =>
  isTerritory(t) ? TERRITORIES[t].adjacent : [];

export const terrainOf = (t: number) => TERRITORIES[t].terrain;

export const countHuts = (huts: Huts | undefined) =>
  COLOURS.reduce((n, c) => n + (huts?.[c] ?? 0), 0);

export const coloursIn = (huts: Huts | undefined) =>
  COLOURS.filter((c) => (huts?.[c] ?? 0) > 0);

/** Centre of a territory on a canvas where a hex is one unit wide. */
export function centreOf(t: number) {
  const { col, row } = TERRITORIES[t];
  return { x: col + (row % 2 ? 0.5 : 0) + 0.5, y: row * 0.866 + 0.5 };
}
