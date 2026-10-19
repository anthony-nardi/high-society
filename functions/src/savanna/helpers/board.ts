/*
 * The Savanna deck, the grid and the scoring of one ecosystem, from the
 * Genius Games rulebook. The gazelle bonus compares players, so it lives
 * in rules.ts; everything here is about a single grid. No imports beyond
 * types: the client bundles this file.
 */

import type { CardType, Grid } from "../types";

export const ROWS = 4;
export const COLS = 5;
/** Eleven dealt, ten placed; the last is set aside. */
export const HAND_SIZE = 11;
export const PICKS = 10;
export const ROUNDS = 2;

export const CARD_TYPES: CardType[] = [
  "WATERING_HOLE",
  "GRASSLAND",
  "TREE",
  "GAZELLE",
  "ZEBRA",
  "GIRAFFE",
  "CHEETAH",
  "LION",
  "ELEPHANT",
  "HYENA",
  "VULTURE",
];

export const LANDFORMS: CardType[] = ["WATERING_HOLE", "GRASSLAND", "TREE"];
export const isAnimal = (t: CardType | undefined) =>
  !!t && !LANDFORMS.includes(t);

/**
 * 132 cards in all. The rulebook does not print the split, and no
 * published source does; these follow the pattern of the Ecosystem and
 * Coral Reef decks and are the one estimate in this game.
 */
export const DECK_COUNTS: { [type in CardType]: number } = {
  WATERING_HOLE: 12,
  GRASSLAND: 20,
  TREE: 12,
  GAZELLE: 20,
  ZEBRA: 12,
  GIRAFFE: 12,
  CHEETAH: 8,
  LION: 8,
  ELEPHANT: 12,
  HYENA: 8,
  VULTURE: 8,
};

export const fullDeck = (): CardType[] =>
  CARD_TYPES.flatMap((t) => Array.from({ length: DECK_COUNTS[t] }, () => t));

export const label = (type: CardType) =>
  type === "WATERING_HOLE"
    ? "Watering hole"
    : type.charAt(0) + type.slice(1).toLowerCase();

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

/** Whether a card may go in this cell: empty, adjacent to the grid, and within 4 by 5. */
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

export const GRASSLAND_POINTS = [0, 1, 4, 9, 16];
export const grasslandPoints = (size: number) =>
  GRASSLAND_POINTS[Math.min(size, 4)];

export const countOf = (grid: Grid, type: CardType) =>
  Object.values(grid).filter((t) => t === type).length;

export const GAZELLE_PLACES = [5, 2];

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

/** The scavengers' points for a set of flipped cells. */
function scavengerPoints(grid: Grid, flipped: Set<string>) {
  let hyena = 0;
  let vulture = 0;
  for (const [key, type] of Object.entries(grid)) {
    if (flipped.has(key)) continue;
    const [r, c] = parseCell(key);
    if (type === "HYENA") {
      for (const f of flipped) {
        const [fr, fc] = parseCell(f);
        if (Math.abs(fr - r) <= 2 && Math.abs(fc - c) <= 2) hyena += 3;
      }
    } else if (type === "VULTURE") {
      for (const f of flipped) {
        const [fr, fc] = parseCell(f);
        if (fc === c && fr > r) vulture += 4;
      }
    }
  }
  return { hyena, vulture };
}

export type Scored = {
  byType: { [type in CardType]?: number };
  /** Cells turned facedown, cheetahs' prey first, then the lions'. */
  flipped: string[];
  gazelles: number;
};

const byReading = (a: string, b: string) => {
  const [ra, ca] = parseCell(a);
  const [rb, cb] = parseCell(b);
  return ra - rb || ca - cb;
};

/** The gazelles the cheetahs flip: every one on a cheetah's diagonals. */
export function cheetahFlips(grid: Grid): string[] {
  const flipped = new Set<string>();
  for (const [key, type] of Object.entries(grid)) {
    if (type !== "CHEETAH") continue;
    const [r, c] = parseCell(key);
    for (const [k, t] of Object.entries(grid)) {
      if (t !== "GAZELLE") continue;
      const [r2, c2] = parseCell(k);
      const dr = r2 - r;
      const dc = c2 - c;
      if (dr !== 0 && Math.abs(dr) === Math.abs(dc)) flipped.add(k);
    }
  }
  return [...flipped].sort(byReading);
}

/** The lions that may hunt, and the faceup gazelles and zebras they may flip. */
export function lionOptions(grid: Grid): { lions: number; prey: string[] } {
  const taken = new Set(cheetahFlips(grid));
  const lions = Object.keys(grid).filter(
    (k) =>
      grid[k] === "LION" && neighbours(k).some((n) => grid[n] === "GRASSLAND"),
  ).length;
  const prey = Object.keys(grid)
    .filter(
      (k) => (grid[k] === "GAZELLE" || grid[k] === "ZEBRA") && !taken.has(k),
    )
    .sort(byReading);
  return { lions, prey };
}

/** How many prey the lions flip: one each, while there are any. */
export const lionFlipCount = (grid: Grid) => {
  const { lions, prey } = lionOptions(grid);
  return Math.min(lions, prey.length);
};

/**
 * Points of every card in one ecosystem, by type, in the rulebook's
 * order, without the gazelle bonus, with the lions flipping the given
 * cells. Gazelles and zebras score before they are flipped, so a flip
 * costs nothing but counts for the scavengers and spares the elephants.
 */
function scoreWithFlips(grid: Grid, lionFlips: string[]): Scored {
  const points: { [type in CardType]?: number } = {};
  const add = (type: CardType, n: number) => {
    if (n) points[type] = (points[type] ?? 0) + n;
  };
  const treeRows = new Set<number>();
  const treeCols = new Set<number>();
  const cheetah = cheetahFlips(grid);
  const flipped = new Set(cheetah);

  for (const [key, type] of Object.entries(grid)) {
    const [r, c] = parseCell(key);
    const around = neighbours(key).map((n) => grid[n]);
    const count = (t: CardType) => around.filter((x) => x === t).length;
    switch (type) {
      case "WATERING_HOLE":
        add("WATERING_HOLE", 2 * new Set(around.filter(isAnimal)).size);
        break;
      case "TREE":
        treeRows.add(r);
        treeCols.add(c);
        break;
      case "GAZELLE":
        add("GAZELLE", 2);
        break;
      case "ZEBRA":
        add("ZEBRA", 3 * count("GRASSLAND"));
        break;
      case "GIRAFFE":
        if (count("TREE") > 0) add("GIRAFFE", 5);
        break;
      case "CHEETAH": {
        let prey = 0;
        for (const [k, t] of Object.entries(grid)) {
          if (t !== "GAZELLE") continue;
          const [r2, c2] = parseCell(k);
          const dr = r2 - r;
          const dc = c2 - c;
          if (dr !== 0 && Math.abs(dr) === Math.abs(dc)) prey += 1;
        }
        add("CHEETAH", 3 * prey);
        break;
      }
      default:
        break;
    }
  }
  add("TREE", 2 * (treeRows.size + treeCols.size));
  for (const g of groups(grid, "GRASSLAND"))
    add("GRASSLAND", grasslandPoints(g.length));

  for (const cell of lionFlips) {
    flipped.add(cell);
    add("LION", 4);
  }

  for (const [key, type] of Object.entries(grid)) {
    if (type !== "ELEPHANT") continue;
    const animals = neighbours(key).filter(
      (n) => isAnimal(grid[n]) && grid[n] !== "ELEPHANT" && !flipped.has(n),
    ).length;
    add("ELEPHANT", 6 - 2 * animals);
  }
  const { hyena, vulture } = scavengerPoints(grid, flipped);
  add("HYENA", hyena);
  add("VULTURE", vulture);

  return {
    byType: points,
    flipped: [...cheetah, ...lionFlips],
    gazelles: countOf(grid, "GAZELLE"),
  };
}

/** Every way to pick k of the items, in order. */
function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items;
  return [
    ...combinations(rest, k - 1).map((c) => [head, ...c]),
    ...combinations(rest, k),
  ];
}

/** The prey the lions should flip to score the ecosystem best. */
export function bestLionFlips(grid: Grid): string[] {
  const { prey } = lionOptions(grid);
  const k = lionFlipCount(grid);
  if (!k) return [];
  let best: string[] = prey.slice(0, k);
  let bestTotal = -Infinity;
  for (const combo of combinations(prey, k)) {
    const total = totalOf(scoreWithFlips(grid, combo).byType);
    if (total > bestTotal) {
      bestTotal = total;
      best = combo;
    }
  }
  return best;
}

/** Whether these cells are a legal choice for the lions: distinct prey, one each. */
export function validLionFlips(grid: Grid, flips: string[]) {
  const { prey } = lionOptions(grid);
  return (
    flips.length === lionFlipCount(grid) &&
    new Set(flips).size === flips.length &&
    flips.every((f) => prey.includes(f))
  );
}

/**
 * Points of every card in one ecosystem, in the rulebook's order, without
 * the gazelle bonus. The cheetahs flip the gazelles they score; each lion
 * beside a grassland then flips a faceup gazelle or zebra: the cells
 * given, or, when none are, whichever score the ecosystem best.
 */
export function scoreGrid(grid: Grid, lionFlips?: string[]): Scored {
  return scoreWithFlips(
    grid,
    lionFlips && validLionFlips(grid, lionFlips)
      ? lionFlips
      : bestLionFlips(grid),
  );
}

export const totalOf = (byType: { [type in CardType]?: number }) =>
  CARD_TYPES.reduce((s, t) => s + (byType[t] ?? 0), 0);
