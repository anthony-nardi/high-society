/*
 * The Coral Reef deck, the grid and the scoring of one reef, from the
 * Genius Games rulebook. The plankton placing compares players, so it
 * lives in rules.ts; everything here is about a single grid. No imports
 * beyond types: the client bundles this file.
 */

import type { CardType, FoodWebGroup, Grid } from "../types";

export const ROWS = 4;
export const COLS = 5;
export const HAND_SIZE = 10;
export const ROUNDS = 2;

export const CARD_TYPES: CardType[] = [
  "CORAL",
  "KRILL",
  "PLANKTON",
  "GROUPER",
  "CLOWNFISH",
  "CRAB",
  "EEL",
  "SHARK",
  "WHALE",
  "TURTLE",
  "OCTOPUS",
];

/** 130 cards in all. */
export const DECK_COUNTS: { [type in CardType]: number } = {
  CORAL: 12,
  KRILL: 20,
  PLANKTON: 20,
  GROUPER: 10,
  CLOWNFISH: 14,
  CRAB: 12,
  EEL: 8,
  SHARK: 8,
  WHALE: 6,
  TURTLE: 12,
  OCTOPUS: 8,
};

/** Turtles and octopuses belong to no group. */
export const GROUP_OF: { [type in CardType]?: FoodWebGroup } = {
  CORAL: "PRODUCERS",
  KRILL: "PRODUCERS",
  PLANKTON: "PRODUCERS",
  GROUPER: "PREY",
  CLOWNFISH: "PREY",
  CRAB: "PREY",
  EEL: "PREDATORS",
  SHARK: "PREDATORS",
  WHALE: "PREDATORS",
};

export const PREY: CardType[] = ["GROUPER", "CLOWNFISH", "CRAB"];

export const fullDeck = (): CardType[] =>
  CARD_TYPES.flatMap((t) => Array.from({ length: DECK_COUNTS[t] }, () => t));

export const label = (type: CardType) =>
  type.charAt(0) + type.slice(1).toLowerCase();

export const cellKey = (row: number, col: number) => `${row}_${col}`;
export function parseCell(key: string): [number, number] {
  const [r, c] = key.split("_").map(Number);
  return [r, c];
}

const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const neighbours = (key: string): string[] => {
  const [r, c] = parseCell(key);
  return ORTHO.map(([dr, dc]) => cellKey(r + dr, c + dc));
};

export function bounds(grid: Grid) {
  const cells = Object.keys(grid).map(parseCell);
  if (!cells.length) return null;
  return {
    minRow: Math.min(...cells.map(([r]) => r)),
    maxRow: Math.max(...cells.map(([r]) => r)),
    minCol: Math.min(...cells.map(([, c]) => c)),
    maxCol: Math.max(...cells.map(([, c]) => c)),
  };
}

/** Whether a card may go in this cell: empty, adjacent to the reef, and within 4 by 5. */
export function canPlace(grid: Grid, row: number, col: number) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  const key = cellKey(row, col);
  if (grid[key]) return false;
  const b = bounds(grid);
  if (!b) return row === 0 && col === 0;
  if (!neighbours(key).some((n) => grid[n])) return false;
  const rows = Math.max(b.maxRow, row) - Math.min(b.minRow, row) + 1;
  const cols = Math.max(b.maxCol, col) - Math.min(b.minCol, col) + 1;
  return rows <= ROWS && cols <= COLS;
}

/** Every cell a card could go in. */
export function openCells(grid: Grid): string[] {
  if (!Object.keys(grid).length) return [cellKey(0, 0)];
  const seen = new Set<string>();
  for (const key of Object.keys(grid))
    for (const n of neighbours(key)) {
      const [r, c] = parseCell(n);
      if (!seen.has(n) && canPlace(grid, r, c)) seen.add(n);
    }
  return [...seen];
}

/** Whether every card touches the rest. */
export function connected(grid: Grid) {
  const keys = Object.keys(grid);
  if (keys.length <= 1) return true;
  const seen = new Set<string>([keys[0]]);
  const queue = [keys[0]];
  while (queue.length) {
    const k = queue.shift() as string;
    for (const n of neighbours(k))
      if (grid[n] && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
  }
  return seen.size === keys.length;
}

/** An Octopus may move one card to an empty cell, as long as the reef stays whole and within 4 by 5. */
export function canMove(grid: Grid, from: string, to: string) {
  if (!grid[from] || grid[to] || from === to) return false;
  const next: Grid = { ...grid };
  delete next[from];
  const [r, c] = parseCell(to);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
  next[to] = grid[from];
  const b = bounds(next);
  if (!b) return false;
  if (b.maxRow - b.minRow + 1 > ROWS || b.maxCol - b.minCol + 1 > COLS)
    return false;
  return connected(next);
}

/** Where a card could be moved to. */
export function moveTargets(grid: Grid, from: string): string[] {
  const rest: Grid = { ...grid };
  delete rest[from];
  const candidates = new Set<string>();
  for (const key of Object.keys(rest))
    for (const n of neighbours(key)) candidates.add(n);
  return [...candidates].filter((to) => canMove(grid, from, to));
}

/** Connected groups of one card type, as lists of cells. */
export function groups(grid: Grid, type: CardType): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const key of Object.keys(grid)) {
    if (grid[key] !== type || seen.has(key)) continue;
    const group: string[] = [];
    const queue = [key];
    seen.add(key);
    while (queue.length) {
      const k = queue.shift() as string;
      group.push(k);
      for (const n of neighbours(k))
        if (grid[n] === type && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    }
    out.push(group);
  }
  return out;
}

export const KRILL_POINTS = [0, 1, 4, 9];
export const krillPoints = (size: number) => KRILL_POINTS[Math.min(size, 3)];

export const countOf = (grid: Grid, type: CardType) =>
  Object.values(grid).filter((t) => t === type).length;

/** The grid with the flipped cells left out: a facedown card counts for nothing. */
export function faceUp(grid: Grid, flipped: string[] = []): Grid {
  if (!flipped.length) return grid;
  const out: Grid = { ...grid };
  for (const f of flipped) delete out[f];
  return out;
}

/**
 * Points of every card in one reef, by type, without the plankton
 * placing. The bottom row is the lowest row the whole reef reaches,
 * flipped cards included.
 */
export function scoreGrid(
  fullGrid: Grid,
  flipped: string[] = [],
): { [type in CardType]?: number } {
  const grid = faceUp(fullGrid, flipped);
  const points: { [type in CardType]?: number } = {};
  const add = (type: CardType, n: number) => {
    if (n) points[type] = (points[type] ?? 0) + n;
  };
  const b = bounds(fullGrid);
  const bottom = b ? b.maxRow : 0;
  const krill = countOf(grid, "KRILL");
  const turtleRows = new Set<number>();
  const turtleCols = new Set<number>();
  const isPrey = (t: CardType | undefined) => !!t && PREY.includes(t);

  for (const [key, type] of Object.entries(grid)) {
    const [r, c] = parseCell(key);
    const around = neighbours(key).map((n) => grid[n]);
    const count = (t: CardType) => around.filter((x) => x === t).length;
    const inRow = (t: (x: CardType) => boolean) =>
      Object.entries(grid).filter(
        ([k, x]) => k !== key && parseCell(k)[0] === r && t(x),
      ).length;
    const inCol = (t: (x: CardType) => boolean) =>
      Object.entries(grid).filter(
        ([k, x]) => k !== key && parseCell(k)[1] === c && t(x),
      ).length;
    switch (type) {
      case "CORAL":
        if (r === bottom) add("CORAL", 3);
        break;
      case "GROUPER":
        add("GROUPER", 3 * count("KRILL"));
        break;
      case "CLOWNFISH":
        add("CLOWNFISH", 2 * (count("PLANKTON") + count("CORAL")));
        break;
      case "CRAB":
        add("CRAB", 2 * inRow((x) => x === "PLANKTON"));
        break;
      case "EEL":
        if (count("CORAL") > 0) add("EEL", 4 * around.filter(isPrey).length);
        break;
      case "SHARK":
        add("SHARK", 2 * (inRow(isPrey) + inCol(isPrey)));
        break;
      case "WHALE":
        add("WHALE", 2 * krill);
        break;
      case "TURTLE":
        turtleRows.add(r);
        turtleCols.add(c);
        break;
      case "OCTOPUS":
        add("OCTOPUS", 3);
        break;
      case "KRILL":
      case "PLANKTON":
        break;
    }
  }
  add("TURTLE", 2 * (turtleRows.size + turtleCols.size));
  for (const g of groups(grid, "KRILL")) add("KRILL", krillPoints(g.length));
  return points;
}

export const PLANKTON_PLACES = [12, 8, 4];

/**
 * Points for a ranking: ties all earn the place, and a tie for a place
 * means nobody earns the places it swallows.
 */
export function placings(values: number[], prizes: number[]): number[] {
  const out = values.map(() => 0);
  const distinct = [...new Set(values.filter((v) => v > 0))].sort(
    (a, b) => b - a,
  );
  let place = 0;
  for (const v of distinct) {
    if (place >= prizes.length) break;
    const holders = values
      .map((x, i) => (x === v ? i : -1))
      .filter((i) => i >= 0);
    for (const i of holders) out[i] = prizes[place];
    place += holders.length;
  }
  return out;
}

/** Group totals and the food web bonus for a set of card points. */
export function foodWeb(byType: { [type in CardType]?: number }) {
  const sum = (group: FoodWebGroup) =>
    CARD_TYPES.filter((t) => GROUP_OF[t] === group).reduce(
      (s, t) => s + (byType[t] ?? 0),
      0,
    );
  const producers = sum("PRODUCERS");
  const prey = sum("PREY");
  const predators = sum("PREDATORS");
  const bonus = Math.min(producers, prey, predators);
  const other = (byType.TURTLE ?? 0) + (byType.OCTOPUS ?? 0);
  return {
    producers,
    prey,
    predators,
    foodWeb: bonus,
    other,
    total: producers + prey + predators + bonus + other,
  };
}

/**
 * Which adjacent card each whale turns facedown, chosen greedily for the
 * reef's own points with plankton counted at two apiece. Whales flip in
 * reading order; a whale with nothing faceup beside it flips nothing.
 */
export function chooseFlips(grid: Grid): string[] {
  const whales = Object.keys(grid)
    .filter((k) => grid[k] === "WHALE")
    .sort((a, b) => {
      const [ra, ca] = parseCell(a);
      const [rb, cb] = parseCell(b);
      return ra - rb || ca - cb;
    });
  const flipped: string[] = [];
  const worth = (flips: string[]) => {
    const byType = scoreGrid(grid, flips);
    return foodWeb(byType).total + 2 * countOf(faceUp(grid, flips), "PLANKTON");
  };
  for (const whale of whales) {
    if (flipped.includes(whale)) continue;
    const options = neighbours(whale).filter(
      (n) => grid[n] && !flipped.includes(n),
    );
    if (!options.length) continue;
    let best = options[0];
    let bestWorth = -Infinity;
    for (const o of options) {
      const w = worth([...flipped, o]);
      if (w > bestWorth) {
        bestWorth = w;
        best = o;
      }
    }
    flipped.push(best);
  }
  return flipped;
}
