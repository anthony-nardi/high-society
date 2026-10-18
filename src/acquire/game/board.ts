import {
  AcquireGameState,
  AcquirePlayerState,
  Chain,
  Mode,
  Tile,
} from "./types";

/*
 * Client-side copy of the board, the price table and the rule queries the
 * table needs. Keep in step with functions/src/acquire/helpers.
 */

export const COLUMNS = 12;
export const ROWS = "ABCDEFGHI";
export const SAFE_SIZE = 11;
export const END_SIZE = 41;
export const MAX_BUY = 3;

export const CHAINS: Chain[] = [
  "LUXOR",
  "TOWER",
  "AMERICAN",
  "FESTIVAL",
  "WORLDWIDE",
  "CONTINENTAL",
  "IMPERIAL",
];

export const TIER: { [chain in Chain]: number } = {
  LUXOR: 0,
  TOWER: 0,
  AMERICAN: 1,
  FESTIVAL: 1,
  WORLDWIDE: 1,
  CONTINENTAL: 2,
  IMPERIAL: 2,
};

export const CHAIN_COLOUR: { [chain in Chain]: string } = {
  LUXOR: "#d9342b",
  TOWER: "#e8c23a",
  AMERICAN: "#2f6fd6",
  FESTIVAL: "#2e9e5b",
  WORLDWIDE: "#8e5ad6",
  CONTINENTAL: "#1fb6c9",
  IMPERIAL: "#e8792f",
};

export const label = (chain: Chain) =>
  chain.charAt(0) + chain.slice(1).toLowerCase();
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export const ALL_TILES: Tile[] = [];
for (const row of ROWS)
  for (let col = 1; col <= COLUMNS; col++) ALL_TILES.push(`${col}${row}`);

export function parseTile(tile: Tile): [number, number] {
  return [Number(tile.slice(0, -1)), ROWS.indexOf(tile.slice(-1))];
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

export const currentPrice = (state: AcquireGameState, chain: Chain) =>
  priceOf(chain, state.chains[chain].size);
export const isActive = (state: AcquireGameState, chain: Chain) =>
  state.chains[chain].size > 0;
export const isSafe = (state: AcquireGameState, chain: Chain) =>
  state.chains[chain].size >= SAFE_SIZE;
export const stockOf = (player: AcquirePlayerState, chain: Chain) =>
  player.stocks?.[chain] ?? 0;
export const activeChains = (state: AcquireGameState) =>
  CHAINS.filter((c) => isActive(state, c));
export const availableChains = (state: AcquireGameState) =>
  CHAINS.filter((c) => !isActive(state, c));

export type Placement =
  | { kind: "lone" }
  | { kind: "found" }
  | { kind: "extend"; chain: Chain }
  | { kind: "merge"; chains: Chain[]; survivors: Chain[] }
  | { kind: "blocked" }
  | { kind: "dead" };

export function analyse(state: AcquireGameState, tile: Tile): Placement {
  const around = neighbours(tile).map((t) => state.board?.[t]);
  const chains = [
    ...new Set(around.filter((c): c is Chain => !!c && c !== "NONE")),
  ];
  const loose = around.some((c) => c === "NONE");
  if (chains.length === 0) {
    if (!loose) return { kind: "lone" };
    return availableChains(state).length
      ? { kind: "found" }
      : { kind: "blocked" };
  }
  if (chains.length === 1) return { kind: "extend", chain: chains[0] };
  if (chains.filter((c) => isSafe(state, c)).length >= 2)
    return { kind: "dead" };
  const largest = Math.max(...chains.map((c) => state.chains[c].size));
  return {
    kind: "merge",
    chains,
    survivors: chains.filter((c) => state.chains[c].size === largest),
  };
}

export function isPlayable(state: AcquireGameState, tile: Tile) {
  if (state.board?.[tile]) return false;
  const kind = analyse(state, tile).kind;
  return kind !== "blocked" && kind !== "dead";
}

export function canDeclare(state: AcquireGameState) {
  const active = activeChains(state);
  if (!active.length) return false;
  return (
    active.some((c) => state.chains[c].size >= END_SIZE) ||
    active.every((c) => isSafe(state, c))
  );
}

/** Tycoon Mode's secondary bonus is a printed column, not a multiple of the price. */
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
  tertiary?: number;
};

export function bonusLevels(price: number, mode: Mode): BonusLevels {
  if (mode === "TYCOON")
    return {
      primary: price * 10,
      secondary: TYCOON_SECONDARY[price] ?? Math.round((price * 7) / 100) * 100,
      tertiary: price * 5,
    };
  return { primary: price * 10, secondary: price * 5 };
}

export const modeLabel = (mode: Mode | undefined) =>
  mode === "CLASSIC" ? "Classic" : "Tycoon";

const roundUp = (n: number) => Math.ceil(n / 100) * 100;

/**
 * Bonuses for a chain at its current price, as the server pays them. In a
 * two-player game the server also draws a random stake for the stock
 * market, which this preview cannot know.
 */
export function bonuses(
  state: AcquireGameState,
  chain: Chain,
): [string, number][] {
  const price = currentPrice(state, chain);
  const { primary, secondary, tertiary } = bonusLevels(price, state.mode);
  const holders = state.players
    .map((p) => [p.email, stockOf(p, chain)] as [string, number])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!holders.length) return [];
  const ranks: string[][] = [];
  let lastCount = -1;
  for (const [email, n] of holders) {
    if (n === lastCount) ranks[ranks.length - 1].push(email);
    else ranks.push([email]);
    lastCount = n;
  }
  const out: [string, number][] = [];
  const pay = (emails: string[], total: number) => {
    const each = roundUp(total / emails.length);
    for (const email of emails) out.push([email, each]);
  };
  if (holders.length === 1)
    return [[holders[0][0], primary + (tertiary ?? secondary)]];
  if (tertiary === undefined) {
    if (ranks[0].length > 1) pay(ranks[0], primary + secondary);
    else {
      out.push([ranks[0][0], primary]);
      pay(ranks[1], secondary);
    }
    return out;
  }
  const third = holders.length >= 3 ? tertiary : 0;
  if (ranks[0].length > 1) {
    pay(ranks[0], primary + secondary);
    if (ranks[1] && third && ranks[0].length === 2) pay(ranks[1], third);
  } else {
    out.push([ranks[0][0], primary]);
    if (ranks[1].length > 1) pay(ranks[1], secondary + third);
    else {
      out.push([ranks[1][0], secondary]);
      if (ranks[2] && third) pay(ranks[2], third);
    }
  }
  return out;
}

export function netWorth(state: AcquireGameState, player: AcquirePlayerState) {
  return (
    player.money +
    CHAINS.reduce((s, c) => s + stockOf(player, c) * currentPrice(state, c), 0)
  );
}

/** Plain-language account of what a tile would do. */
export function describe(state: AcquireGameState, tile: Tile): string {
  const p = analyse(state, tile);
  switch (p.kind) {
    case "lone":
      return "a lone tile";
    case "found":
      return "founds a chain";
    case "extend":
      return `grows ${label(p.chain)}`;
    case "merge":
      return `merges ${p.chains.map(label).join(" and ")}`;
    case "blocked":
      return "cannot be played while all seven chains are out";
    case "dead":
      return "can never be played: two safe chains";
  }
}
