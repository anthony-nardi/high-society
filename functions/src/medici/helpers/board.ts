import type { Card, Commodity } from "../types";

/*
 * The fixed facts of Medici, after the 2023 Steamforged rulebook: the
 * deck, the ships, the money and the three payout tables. Pure and free of
 * runtime imports: the client bundles this file directly.
 */

export const COMMODITIES: Commodity[] = [
  "CLOTH",
  "SPICE",
  "GRAIN",
  "DYE",
  "FUR",
];

/** Each commodity has seven cards. */
export const VALUES = [0, 1, 2, 3, 4, 5, 5];

export const GOLD: Card = "GOLD_10";

/** A lot is one, two or three cards. */
export const MAX_LOT = 3;

/** The tracks run from the gold frame (0) to the top (7). */
export const TOP_LEVEL = 7;

/** Reaching the top three levels pays this every day. */
export const TRACK_BONUS: { [level: number]: number } = { 5: 5, 6: 10, 7: 20 };

export const DAYS = 3;

/** The 36 cards: five commodities of seven, and the gold. */
export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const c of COMMODITIES) for (const v of VALUES) deck.push(`${c}_${v}`);
  deck.push(GOLD);
  return deck;
}

/** Cards drawn for each day's deck; the rest are set aside unseen. */
export function cardsPerDay(players: number) {
  return players <= 3 ? 18 : players * 6;
}

export function startingFlorins(players: number) {
  return players <= 4 ? 40 : 30;
}

export function capacityFor(players: number) {
  return players === 2 ? 7 : 5;
}

/** The highest and second highest position on a track. */
export function trackAwards(players: number) {
  return players === 2 ? [10, 0] : [10, 5];
}

/** What the most valuable ships earn, by player count. */
export const PAYMENTS: { [players: number]: number[] } = {
  2: [20, 0],
  3: [30, 15, 0],
  4: [30, 20, 10, 0],
  5: [30, 20, 10, 5, 0],
  6: [30, 20, 15, 10, 5, 0],
};

export function commodityOf(card: Card): Commodity | "GOLD" {
  return card.split("_")[0] as Commodity | "GOLD";
}

export function valueOf(card: Card) {
  return Number(card.split("_")[1]);
}

export function isGold(card: Card) {
  return commodityOf(card) === "GOLD";
}

export function shipValue(cards: Card[]) {
  return cards.reduce((s, c) => s + valueOf(c), 0);
}

export function countOf(cards: Card[], commodity: Commodity) {
  return cards.filter((c) => commodityOf(c) === commodity).length;
}

const NAMES: { [c in Commodity | "GOLD"]: string } = {
  CLOTH: "Cloth",
  SPICE: "Spice",
  GRAIN: "Grain",
  DYE: "Dye",
  FUR: "Fur",
  GOLD: "Gold",
};

export function commodityName(commodity: Commodity | "GOLD") {
  return NAMES[commodity];
}

export function cardLabel(card: Card) {
  return `${commodityName(commodityOf(card))} ${valueOf(card)}`;
}

export function lotLabel(cards: Card[]) {
  return cards.map(cardLabel).join(", ");
}

export function bonusFor(level: number) {
  return TRACK_BONUS[level] || 0;
}

/**
 * Hands out prizes by rank, highest score first. Tied players add the
 * prizes of the ranks they span together and share them, rounded down.
 */
export function rankPrizes(
  scores: { email: string; score: number }[],
  prizes: number[],
): { [email: string]: number } {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const out: { [email: string]: number } = {};
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score)
      j++;
    let pot = 0;
    for (let r = i; r <= j; r++) pot += prizes[r] || 0;
    const share = Math.floor(pot / (j - i + 1));
    for (let r = i; r <= j; r++) out[sorted[r].email] = share;
    i = j + 1;
  }
  return out;
}

/** The end-of-day payments for the ships' values. */
export function shipPayouts(ships: { email: string; value: number }[]): {
  [email: string]: number;
} {
  return rankPrizes(
    ships.map((s) => ({ email: s.email, score: s.value })),
    PAYMENTS[ships.length] || PAYMENTS[6],
  );
}

/** The awards for the highest positions on one track, bonuses apart. */
export function trackPayouts(rows: { email: string; level: number }[]): {
  [email: string]: number;
} {
  return rankPrizes(
    rows.map((r) => ({ email: r.email, score: r.level })),
    trackAwards(rows.length),
  );
}
