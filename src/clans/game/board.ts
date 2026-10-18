import { ClansGameState, Colour, Huts, Terrain, Village } from "./types";
import { LAKES, TERRITORIES } from "./map";

/*
 * Client-side copy of the board, the epoch chart and the rule queries the
 * table needs. Keep in step with functions/src/clans/helpers.
 */

export { LAKES, TERRITORIES };

export const COLOURS: Colour[] = ["RED", "BLUE", "YELLOW", "GREEN", "BLACK"];
export const TERRAINS: Terrain[] = [
  "GRASSLAND",
  "FOREST",
  "MOUNTAIN",
  "STEPPE",
];
export const VILLAGE_COUNT = 12;
export const FROZEN_AT = 7;

export const COLOUR_HEX: { [colour in Colour]: string } = {
  RED: "#d64545",
  BLUE: "#3b7dd8",
  YELLOW: "#e9c832",
  GREEN: "#3f9b4f",
  BLACK: "#2b2b2b",
};

export const TERRAIN_FILL: { [terrain in Terrain]: string } = {
  GRASSLAND: "#b9d98a",
  FOREST: "#5f8f52",
  MOUNTAIN: "#b7aa9a",
  STEPPE: "#e2cf9a",
};

export type Epoch = {
  villages: number;
  favoured?: Terrain;
  forbidden?: Terrain;
  bonus: number;
};

export const EPOCHS: Epoch[] = [
  { villages: 4, favoured: "GRASSLAND", forbidden: "MOUNTAIN", bonus: 1 },
  { villages: 3, favoured: "FOREST", forbidden: "STEPPE", bonus: 2 },
  { villages: 2, favoured: "MOUNTAIN", forbidden: "GRASSLAND", bonus: 3 },
  { villages: 2, favoured: "STEPPE", forbidden: "FOREST", bonus: 4 },
  { villages: 1, bonus: 0 },
];

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

export const isTerritory = (t: number) =>
  Number.isInteger(t) && t >= 0 && t < TERRITORIES.length;
export const neighbours = (t: number): number[] =>
  isTerritory(t) ? TERRITORIES[t].adjacent : [];
export const terrainOf = (t: number) => TERRITORIES[t].terrain;

export const countHuts = (huts: Huts | undefined) =>
  COLOURS.reduce((n, c) => n + (huts?.[c] ?? 0), 0);
export const coloursIn = (huts: Huts | undefined) =>
  COLOURS.filter((c) => (huts?.[c] ?? 0) > 0);

export function centreOf(t: number) {
  const { col, row } = TERRITORIES[t];
  return { x: col + (row % 2 ? 0.5 : 0) + 0.5, y: row * 0.866 + 0.5 };
}

export const hutsAt = (state: ClansGameState, t: number): Huts =>
  state.huts?.[String(t)] || {};
export const sizeAt = (state: ClansGameState, t: number) =>
  countHuts(hutsAt(state, t));
export const villagesFounded = (state: ClansGameState) =>
  (state.villages || []).length;
export const currentEpoch = (state: ClansGameState) =>
  epochOf(villagesFounded(state));

export function moveProblem(
  state: ClansGameState,
  from: number,
  to: number,
): string | null {
  if (!isTerritory(from) || !isTerritory(to))
    return "That is not on the board.";
  const size = sizeAt(state, from);
  if (size === 0) return "There are no huts there to move.";
  if (size >= FROZEN_AT)
    return `A group of ${FROZEN_AT} or more huts can no longer move.`;
  if (!neighbours(from).includes(to))
    return "Huts only move to a neighbouring territory across a river.";
  if (sizeAt(state, to) === 0)
    return "Huts may only move to a territory that already holds huts.";
  return null;
}

/** Territories whose huts could move somewhere. */
export function movableFrom(state: ClansGameState): number[] {
  return Object.keys(state.huts || {})
    .map(Number)
    .filter((from) =>
      neighbours(from).some((to) => !moveProblem(state, from, to)),
    );
}

export function destinationsOf(state: ClansGameState, from: number): number[] {
  return neighbours(from).filter((to) => !moveProblem(state, from, to));
}

export function isIsolated(state: ClansGameState, t: number) {
  return (
    sizeAt(state, t) > 0 && neighbours(t).every((n) => sizeAt(state, n) === 0)
  );
}

/** What a village here would be worth with the huts given, before it happens. */
export function appraiseHuts(
  t: number,
  before: Huts,
  villagesSoFar: number,
): Omit<Village, "founder"> {
  const epoch = epochOf(villagesSoFar);
  const chart = EPOCHS[epoch];
  const terrain = terrainOf(t);
  const strife = coloursIn(before).length === COLOURS.length;
  const huts: Huts = {};
  for (const c of COLOURS) {
    const n = before[c] ?? 0;
    if (n > 0 && !(strife && n === 1)) huts[c] = n;
  }
  const destroyed = chart.forbidden === terrain;
  const bonus = chart.favoured === terrain ? chart.bonus : 0;
  const value = destroyed ? 0 : countHuts(huts);
  return {
    territory: t,
    terrain,
    epoch,
    huts,
    colours: coloursIn(huts),
    points: destroyed ? 0 : value + bonus,
    bonus: destroyed ? 0 : bonus,
    strife,
    destroyed,
  };
}

/** The villages a move would found, in the order the server founds them. */
export function preview(
  state: ClansGameState,
  from: number,
  to: number,
): Omit<Village, "founder">[] {
  if (moveProblem(state, from, to)) return [];
  const huts: { [t: string]: Huts } = { ...(state.huts || {}) };
  const merged: Huts = { ...huts[String(to)] };
  for (const c of COLOURS) {
    const n = huts[String(from)]?.[c] ?? 0;
    if (n) merged[c] = (merged[c] ?? 0) + n;
  }
  delete huts[String(from)];
  huts[String(to)] = merged;
  const size = (t: number) => countHuts(huts[String(t)]);
  const isolated = (t: number) =>
    size(t) > 0 && neighbours(t).every((n) => size(n) === 0);
  const out: Omit<Village, "founder">[] = [];
  let count = villagesFounded(state);
  for (const t of [to, ...neighbours(from).filter((n) => n !== to)]) {
    if (count >= VILLAGE_COUNT) break;
    if (isolated(t)) {
      out.push(appraiseHuts(t, huts[String(t)], count));
      delete huts[String(t)];
      count += 1;
    }
  }
  return out;
}
