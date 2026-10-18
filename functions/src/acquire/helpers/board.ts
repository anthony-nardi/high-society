import { Chain, Mode, Tile } from "../types";

/*
 * The Acquire board: twelve columns by nine rows, and the seven hotel
 * chains in their three price tiers.
 */

export const COLUMNS = 12;
export const ROWS = "ABCDEFGHI";

export const CHAINS: Chain[] = [
  "LUXOR",
  "TOWER",
  "AMERICAN",
  "FESTIVAL",
  "WORLDWIDE",
  "CONTINENTAL",
  "IMPERIAL",
];

/** 0 cheap, 1 medium, 2 expensive: each tier adds $100 to the share price. */
export const TIER: { [chain in Chain]: number } = {
  LUXOR: 0,
  TOWER: 0,
  AMERICAN: 1,
  FESTIVAL: 1,
  WORLDWIDE: 1,
  CONTINENTAL: 2,
  IMPERIAL: 2,
};

export const ALL_TILES: Tile[] = [];
for (const row of ROWS) {
  for (let col = 1; col <= COLUMNS; col++) ALL_TILES.push(`${col}${row}`);
}

export function parseTile(tile: Tile): [number, number] {
  const col = Number(tile.slice(0, -1));
  const row = ROWS.indexOf(tile.slice(-1));
  return [col, row];
}

export function isTile(tile: Tile) {
  const [col, row] = parseTile(tile);
  return Number.isInteger(col) && col >= 1 && col <= COLUMNS && row >= 0;
}

export function neighbours(tile: Tile): Tile[] {
  const [col, row] = parseTile(tile);
  const out: Tile[] = [];
  if (col > 1) out.push(`${col - 1}${ROWS[row]}`);
  if (col < COLUMNS) out.push(`${col + 1}${ROWS[row]}`);
  if (row > 0) out.push(`${col}${ROWS[row - 1]}`);
  if (row < ROWS.length - 1) out.push(`${col}${ROWS[row + 1]}`);
  return out;
}

/** Share price by chain size and tier. */
export function priceOf(chain: Chain, size: number) {
  if (size < 2) return 0;
  const base =
    size <= 5
      ? size * 100
      : size <= 10
        ? 600
        : size <= 20
          ? 700
          : size <= 30
            ? 800
            : size <= 40
              ? 900
              : 1000;
  return base + TIER[chain] * 100;
}

/**
 * Tycoon Mode's secondary bonus is a printed column rather than a multiple
 * of the price (Renegade rulebook, page 10).
 */
const TYCOON_SECONDARY: { [price: number]: number } = {
  200: 1500,
  300: 2200,
  400: 3000,
  500: 3700,
  600: 4200,
  700: 5000,
  800: 5700,
  900: 6200,
  1000: 7000,
  1100: 7700,
  1200: 8200,
};

export type BonusLevels = {
  primary: number;
  secondary: number;
  /** Only in Tycoon Mode. */
  tertiary?: number;
};

/** The stockholder bonuses for a chain at a share price, per the info card. */
export function bonusLevels(price: number, mode: Mode): BonusLevels {
  if (mode === "TYCOON")
    return {
      primary: price * 10,
      secondary: TYCOON_SECONDARY[price] ?? Math.round((price * 7) / 100) * 100,
      tertiary: price * 5,
    };
  return { primary: price * 10, secondary: price * 5 };
}

/** Sorting order for drawing and tie-breaks: left to right, top to bottom. */
export function compareTiles(a: Tile, b: Tile) {
  const [ca, ra] = parseTile(a);
  const [cb, rb] = parseTile(b);
  return ra - rb || ca - cb;
}
