import { CardCategory, LootCards, PlayerCards } from "./types";

export type LootInfo = {
  name: string;
  category: CardCategory | "police";
  /** Plain-language kind, e.g. "jewel" or "business". */
  kind: string;
  /** How the card scores, shown on hover and in the rules. */
  effect: string;
};

export const JEWEL_EFFECT =
  "Each round, different jewels score: 3 kinds +5, 4 kinds +10, all 5 kinds +15. No jewels at all −5. Discarded after scoring.";
export const BODYGUARD_EFFECT =
  "Each round the player with the most bodyguards scores +5 and the fewest −2. Kept between rounds.";
export const COIN_EFFECT = "+3 points each round. Discarded after scoring.";
export const CAR_EFFECT =
  "+1 each round, but only if you also hold at least one driver. Kept between rounds.";
export const DRIVER_EFFECT =
  "+1 each round and unlocks your cars. Discarded after scoring.";
export const THIEF_EFFECT =
  "On your turn, spend it to take any one card from the table. Unused thieves score +2 at round end, then are discarded.";
export const BUSINESS_EFFECT =
  "Scored once at the end of the game: 1 point per different business up to 6, all 7 kinds 10, plus 3 of a kind +5 and 4 of a kind +10. Kept between rounds.";
export const POLICE_EFFECT =
  "Not loot. When a police raid is revealed the game stops for a normal auction of the loot on the table. The seventh police raid of the round ends the round at once.";

const jewel = (name: string): LootInfo => ({
  name,
  category: "jewels",
  kind: "jewel",
  effect: JEWEL_EFFECT,
});
const business = (name: string): LootInfo => ({
  name,
  category: "businesses",
  kind: "business",
  effect: BUSINESS_EFFECT,
});

export default function cardInfo(card: LootCards): LootInfo {
  switch (card) {
    case "SCARAB":
      return jewel("Scarab");
    case "CROSS":
      return jewel("Cross");
    case "BRACELET":
      return jewel("Bracelet");
    case "TIARA":
      return jewel("Tiara");
    case "RING":
      return jewel("Ring");
    case "BODYGUARDS":
      return {
        name: "Bodyguard",
        category: "bodyguards",
        kind: "bodyguard",
        effect: BODYGUARD_EFFECT,
      };
    case "COINS":
      return {
        name: "Gold coins",
        category: "coins",
        kind: "gold coins",
        effect: COIN_EFFECT,
      };
    case "CARS":
      return { name: "Car", category: "cars", kind: "car", effect: CAR_EFFECT };
    case "DRIVERS":
      return {
        name: "Driver",
        category: "drivers",
        kind: "driver",
        effect: DRIVER_EFFECT,
      };
    case "THIEF":
      return {
        name: "Thief",
        category: "theives",
        kind: "thief",
        effect: THIEF_EFFECT,
      };
    case "POLICE_RAIDS":
      return {
        name: "Police raid",
        category: "police",
        kind: "police",
        effect: POLICE_EFFECT,
      };
    case "CASINO":
      return business("Casino");
    case "TRANSPORTATION":
      return business("Transportation");
    case "MOVIE_THEATER":
      return business("Movie theatre");
    case "RACING":
      return business("Racing");
    case "REAL_ESTATE":
      return business("Real estate");
    case "NIGHTCLUB":
      return business("Nightclub");
    case "RESTAURANT":
      return business("Restaurant");
  }
}

export const CATEGORY_LABELS: { [key in CardCategory]: string } = {
  jewels: "Jewels",
  bodyguards: "Bodyguards",
  coins: "Gold coins",
  theives: "Thieves",
  cars: "Cars",
  drivers: "Drivers",
  businesses: "Businesses",
};

export const CATEGORY_ORDER: CardCategory[] = [
  "jewels",
  "bodyguards",
  "coins",
  "cars",
  "drivers",
  "businesses",
  "theives",
];

/** The cards that make up each category, for legends. */
export const CATEGORY_CARDS: { [key in CardCategory]: LootCards[] } = {
  jewels: ["SCARAB", "CROSS", "BRACELET", "TIARA", "RING"],
  bodyguards: ["BODYGUARDS"],
  coins: ["COINS"],
  cars: ["CARS"],
  drivers: ["DRIVERS"],
  businesses: [
    "CASINO",
    "TRANSPORTATION",
    "MOVIE_THEATER",
    "RACING",
    "REAL_ESTATE",
    "NIGHTCLUB",
    "RESTAURANT",
  ],
  theives: ["THIEF"],
};

export function totalCards(cards: PlayerCards | undefined) {
  return CATEGORY_ORDER.reduce(
    (count, category) => count + (cards?.[category] || []).length,
    0,
  );
}
