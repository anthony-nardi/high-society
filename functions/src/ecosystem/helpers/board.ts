import { CardType, Grid } from "../types";

/*
 * The Ecosystem deck, the grid and the scoring of one ecosystem, from the
 * Genius Games rulebook. Stream and wolf placings compare players, so
 * they live in rules.ts; everything here is about a single grid.
 */

export const ROWS = 4;
export const COLS = 5;
export const HAND_SIZE = 10;
export const ROUNDS = 2;

export const CARD_TYPES: CardType[] = [
  "BEAR",
  "BEE",
  "DEER",
  "DRAGONFLY",
  "EAGLE",
  "FOX",
  "MEADOW",
  "RABBIT",
  "STREAM",
  "TROUT",
  "WOLF",
];

/** 130 cards in all. */
export const DECK_COUNTS: { [type in CardType]: number } = {
  BEAR: 12,
  BEE: 8,
  DEER: 12,
  DRAGONFLY: 8,
  EAGLE: 8,
  FOX: 12,
  MEADOW: 20,
  RABBIT: 8,
  STREAM: 20,
  TROUT: 10,
  WOLF: 12,
};

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

export const MEADOW_POINTS = [0, 0, 3, 6, 10, 15];
export const meadowPoints = (size: number) => MEADOW_POINTS[Math.min(size, 5)];

export const longestStream = (grid: Grid) =>
  Math.max(0, ...groups(grid, "STREAM").map((g) => g.length));

export const countOf = (grid: Grid, type: CardType) =>
  Object.values(grid).filter((t) => t === type).length;

/** Points of every card in one grid, by type, without the stream and wolf placings. */
export function scoreGrid(grid: Grid): { [type in CardType]?: number } {
  const points: { [type in CardType]?: number } = {};
  const add = (type: CardType, n: number) => {
    if (n) points[type] = (points[type] ?? 0) + n;
  };
  const streamGroupOf = new Map<string, number>();
  for (const g of groups(grid, "STREAM"))
    for (const k of g) streamGroupOf.set(k, g.length);
  const deerRows = new Set<number>();
  const deerCols = new Set<number>();

  for (const [key, type] of Object.entries(grid)) {
    const around = neighbours(key).map((n) => grid[n]);
    const count = (t: CardType) => around.filter((x) => x === t).length;
    switch (type) {
      case "BEE":
        add("BEE", 3 * count("MEADOW"));
        break;
      case "BEAR":
        add("BEAR", 2 * (count("BEE") + count("TROUT")));
        break;
      case "TROUT":
        add("TROUT", 2 * (count("STREAM") + count("DRAGONFLY")));
        break;
      case "FOX":
        if (!count("WOLF") && !count("BEAR")) add("FOX", 3);
        break;
      case "EAGLE": {
        const [r, c] = parseCell(key);
        let prey = 0;
        for (const [k, t] of Object.entries(grid)) {
          if (t !== "RABBIT" && t !== "TROUT") continue;
          const [r2, c2] = parseCell(k);
          if (Math.abs(r2 - r) <= 2 && Math.abs(c2 - c) <= 2) prey += 1;
        }
        add("EAGLE", 2 * prey);
        break;
      }
      case "DRAGONFLY": {
        // Each adjacent stream counts once, by its whole length.
        const seen = new Set<string>();
        let length = 0;
        for (const n of neighbours(key)) {
          if (grid[n] !== "STREAM") continue;
          const group = groups(grid, "STREAM").find((g) =>
            g.includes(n),
          ) as string[];
          const id = group[0];
          if (seen.has(id)) continue;
          seen.add(id);
          length += group.length;
        }
        add("DRAGONFLY", length);
        break;
      }
      case "DEER": {
        const [r, c] = parseCell(key);
        deerRows.add(r);
        deerCols.add(c);
        break;
      }
      case "RABBIT":
        add("RABBIT", 1);
        break;
      case "MEADOW":
      case "STREAM":
      case "WOLF":
        break;
    }
  }
  add("DEER", 2 * (deerRows.size + deerCols.size));
  for (const g of groups(grid, "MEADOW")) add("MEADOW", meadowPoints(g.length));
  void streamGroupOf;
  return points;
}

export const DIVERSITY = (scoringTypes: number) =>
  scoringTypes <= 5
    ? -5
    : scoringTypes === 6
      ? 0
      : scoringTypes === 7
        ? 3
        : scoringTypes === 8
          ? 7
          : 12;

export const STREAM_PLACES = [8, 5];
export const WOLF_PLACES = [12, 8, 4];

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
