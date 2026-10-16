import {
  CardCategory,
  LootCards,
  PlayerCards,
  RazziaPlayerState,
} from "./types";
import cardInfo from "./cardInfo";

/*
 * Client-side copy of the server's scoring, used to tell a player what the
 * loot on the table would be worth to them. Keep in step with
 * functions/src/razzia/helpers/rules.ts.
 */

const JEWELS: LootCards[] = ["SCARAB", "CROSS", "BRACELET", "TIARA", "RING"];
const BUSINESSES: LootCards[] = [
  "CASINO",
  "TRANSPORTATION",
  "MOVIE_THEATER",
  "RACING",
  "REAL_ESTATE",
  "NIGHTCLUB",
  "RESTAURANT",
];

export function categoryOf(card: LootCards): CardCategory | null {
  if (JEWELS.includes(card)) return "jewels";
  if (BUSINESSES.includes(card)) return "businesses";
  switch (card) {
    case "BODYGUARDS":
      return "bodyguards";
    case "COINS":
      return "coins";
    case "THIEF":
      return "theives";
    case "CARS":
      return "cars";
    case "DRIVERS":
      return "drivers";
    default:
      return null;
  }
}

const count = (cards: LootCards[] | undefined) => (cards || []).length;

export type RoundPoints = {
  jewels: number;
  bodyguards: number;
  coins: number;
  cars: number;
  drivers: number;
  thieves: number;
};

/** Points scored at the end of every round. */
export function roundPoints(
  cards: PlayerCards,
  everyoneBodyguards: number[],
): RoundPoints {
  const jewelKinds = new Set(cards.jewels || []).size;
  let jewels = 0;
  if (jewelKinds === 0) jewels = -5;
  else if (jewelKinds >= 5) jewels = 15;
  else if (jewelKinds === 4) jewels = 10;
  else if (jewelKinds === 3) jewels = 5;

  const most = Math.max(...everyoneBodyguards);
  const fewest = Math.min(...everyoneBodyguards);
  const mine = count(cards.bodyguards);
  let bodyguards = 0;
  if (most !== fewest) {
    if (mine === most) bodyguards = 5;
    else if (mine === fewest) bodyguards = -2;
  }

  const drivers = count(cards.drivers);
  return {
    jewels,
    bodyguards,
    coins: count(cards.coins) * 3,
    cars: drivers > 0 ? count(cards.cars) : 0,
    drivers,
    thieves: count(cards.theives) * 2,
  };
}

/** Points businesses score at the end of the game. */
export function businessPoints(businesses: LootCards[] | undefined) {
  const held = businesses || [];
  const kinds = new Set(held).size;
  let points = kinds >= 7 ? 10 : kinds;
  const perKind: { [kind: string]: number } = {};
  for (const business of held) perKind[business] = (perKind[business] || 0) + 1;
  for (const n of Object.values(perKind)) {
    if (n >= 4) points += 10;
    else if (n === 3) points += 5;
  }
  return points;
}

function withCards(cards: PlayerCards, extra: LootCards[]): PlayerCards {
  const next: PlayerCards = {};
  for (const key of Object.keys(cards) as CardCategory[]) {
    next[key] = [...(cards[key] || [])];
  }
  for (const card of extra) {
    const category = categoryOf(card);
    if (!category) continue;
    next[category] = [...(next[category] || []), card];
  }
  return next;
}

export type TableLine = {
  category: CardCategory;
  label: string;
  /** Loot of this category on the table, e.g. "Ring, Tiara" or "×2". */
  what: string;
  /** Change in points if the viewer won the table now. */
  delta: number;
  /** When the points come: this round, or at the end for businesses. */
  when: "round" | "end";
  note?: string;
};

export type TableValue = {
  lines: TableLine[];
  total: number;
};

const LABELS: { [key in CardCategory]: string } = {
  jewels: "Jewels",
  bodyguards: "Bodyguards",
  coins: "Coins",
  cars: "Cars",
  drivers: "Drivers",
  businesses: "Businesses",
  theives: "Thieves",
};

/** What winning the current table would do to one player's score. */
export function tableValue(
  table: LootCards[],
  viewer: RazziaPlayerState,
  players: RazziaPlayerState[],
): TableValue {
  const loot = table.filter((card) => card !== "POLICE_RAIDS");
  const before = viewer.cards || {};
  const after = withCards(before, loot);

  const guardsBefore = players.map((p) =>
    p.email === viewer.email
      ? count(before.bodyguards)
      : count(p.cards?.bodyguards),
  );
  const guardsAfter = players.map((p) =>
    p.email === viewer.email
      ? count(after.bodyguards)
      : count(p.cards?.bodyguards),
  );
  const pointsBefore = roundPoints(before, guardsBefore);
  const pointsAfter = roundPoints(after, guardsAfter);

  const lines: TableLine[] = [];
  const present = new Set(
    loot.map(categoryOf).filter(Boolean) as CardCategory[],
  );

  const names = (cards: LootCards[]) =>
    [...new Set(cards)].map((card) => cardInfo(card).name).join(", ");

  if (present.has("jewels")) {
    const onTable = loot.filter((c) => categoryOf(c) === "jewels");
    const kinds = new Set(after.jewels).size;
    lines.push({
      category: "jewels",
      label: LABELS.jewels,
      what: names(onTable),
      delta: pointsAfter.jewels - pointsBefore.jewels,
      when: "round",
      note: `${kinds} kind${kinds === 1 ? "" : "s"} after`,
    });
  }
  if (present.has("bodyguards")) {
    const n = loot.filter((c) => c === "BODYGUARDS").length;
    const delta = pointsAfter.bodyguards - pointsBefore.bodyguards;
    lines.push({
      category: "bodyguards",
      label: LABELS.bodyguards,
      what: `×${n}`,
      delta,
      when: "round",
      note:
        pointsAfter.bodyguards === 5
          ? "most at the table"
          : pointsAfter.bodyguards === -2
            ? "still the fewest"
            : undefined,
    });
  }
  if (present.has("coins")) {
    const n = loot.filter((c) => c === "COINS").length;
    lines.push({
      category: "coins",
      label: LABELS.coins,
      what: `×${n}`,
      delta: pointsAfter.coins - pointsBefore.coins,
      when: "round",
    });
  }
  if (present.has("cars") || present.has("drivers")) {
    const cars = loot.filter((c) => c === "CARS").length;
    const drivers = loot.filter((c) => c === "DRIVERS").length;
    const delta =
      pointsAfter.cars +
      pointsAfter.drivers -
      pointsBefore.cars -
      pointsBefore.drivers;
    const parts = [];
    if (cars) parts.push(`${cars} car${cars === 1 ? "" : "s"}`);
    if (drivers) parts.push(`${drivers} driver${drivers === 1 ? "" : "s"}`);
    lines.push({
      category: cars ? "cars" : "drivers",
      label: "Cars & drivers",
      what: parts.join(", "),
      delta,
      when: "round",
      note:
        count(after.drivers) === 0 && count(after.cars) > 0
          ? "cars need a driver to score"
          : undefined,
    });
  }
  if (present.has("theives")) {
    const n = loot.filter((c) => c === "THIEF").length;
    lines.push({
      category: "theives",
      label: LABELS.theives,
      what: `×${n}`,
      delta: pointsAfter.thieves - pointsBefore.thieves,
      when: "round",
      note: "or steal from the table",
    });
  }
  if (present.has("businesses")) {
    const onTable = loot.filter((c) => categoryOf(c) === "businesses");
    lines.push({
      category: "businesses",
      label: LABELS.businesses,
      what: names(onTable),
      delta:
        businessPoints(after.businesses) - businessPoints(before.businesses),
      when: "end",
    });
  }

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.delta, 0),
  };
}
