import {
  CardType,
  EcosystemGameState,
  EcosystemPlayerState,
  Grid,
} from "./types";

/*
 * Client-side copy of the grid rules and the scoring of one ecosystem.
 * Keep in step with functions/src/ecosystem/helpers/board.ts.
 */

export const ROWS = 4;
export const COLS = 5;
export const HAND_SIZE = 10;

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

export const CARD_INFO: {
  [type in CardType]: { emoji: string; colour: string; rule: string };
} = {
  BEAR: {
    emoji: "🐻",
    colour: "#8d6e4a",
    rule: "2 for each adjacent bee and trout.",
  },
  BEE: { emoji: "🐝", colour: "#e4b63a", rule: "3 for each adjacent meadow." },
  DEER: {
    emoji: "🦌",
    colour: "#c48b5a",
    rule: "2 for each row and column with a deer.",
  },
  DRAGONFLY: {
    emoji: "🪰",
    colour: "#6fb7c9",
    rule: "The total length of every adjacent stream.",
  },
  EAGLE: {
    emoji: "🦅",
    colour: "#7a6a8c",
    rule: "2 for each rabbit and trout within 2 spaces.",
  },
  FOX: {
    emoji: "🦊",
    colour: "#e07b39",
    rule: "3, unless a wolf or bear is adjacent.",
  },
  MEADOW: {
    emoji: "🌼",
    colour: "#a7cf6b",
    rule: "0/3/6/10/15 for connected groups of 1/2/3/4/5+.",
  },
  RABBIT: {
    emoji: "🐇",
    colour: "#d9c7b0",
    rule: "1, and swap any two of your cards when played.",
  },
  STREAM: {
    emoji: "🌊",
    colour: "#5b9bd5",
    rule: "Longest stream at the end: 8, second 5.",
  },
  TROUT: {
    emoji: "🐟",
    colour: "#79a8b8",
    rule: "2 for each adjacent stream and dragonfly.",
  },
  WOLF: {
    emoji: "🐺",
    colour: "#6c6f73",
    rule: "Most wolves at the end: 12, second 8, third 4.",
  },
};

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

export function canPlace(grid: Grid, row: number, col: number) {
  const key = cellKey(row, col);
  if (grid[key]) return false;
  const b = bounds(grid);
  if (!b) return row === 0 && col === 0;
  if (!neighbours(key).some((n) => grid[n])) return false;
  const rows = Math.max(b.maxRow, row) - Math.min(b.minRow, row) + 1;
  const cols = Math.max(b.maxCol, col) - Math.min(b.minCol, col) + 1;
  return rows <= ROWS && cols <= COLS;
}

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
  const deerRows = new Set<number>();
  const deerCols = new Set<number>();
  const streamGroups = groups(grid, "STREAM");
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
        const seen = new Set<string>();
        let length = 0;
        for (const n of neighbours(key)) {
          if (grid[n] !== "STREAM") continue;
          const group = streamGroups.find((g) => g.includes(n)) as string[];
          if (seen.has(group[0])) continue;
          seen.add(group[0]);
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
      default:
        break;
    }
  }
  add("DEER", 2 * (deerRows.size + deerCols.size));
  for (const g of groups(grid, "MEADOW"))
    add("MEADOW", MEADOW_POINTS[Math.min(g.length, 5)]);
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

/** A running total for the table: card points only, placings unknown until the end. */
export function runningScore(grid: Grid) {
  const byType = scoreGrid(grid);
  const total = CARD_TYPES.reduce((s, t) => s + (byType[t] ?? 0), 0);
  const scoring = CARD_TYPES.filter((t) => (byType[t] ?? 0) > 0).length;
  return { byType, total, scoring };
}

export const gridOf = (player: EcosystemPlayerState): Grid => player.grid || {};
export const hasChosen = (state: EcosystemGameState, email: string) =>
  (state.chosen || []).includes(email);
