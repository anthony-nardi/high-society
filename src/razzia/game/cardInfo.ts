import { CardCategory, LootCards, PlayerCards } from "./types";

export type LootInfo = {
  name: string;
  category: CardCategory | "police";
  /** Short scoring rule shown on hover and in the rules. */
  effect: string;
};

const JEWEL_EFFECT =
  "Jewels: 3 kinds +5, 4 kinds +10, all 5 +15. None at all −5.";
const BUSINESS_EFFECT =
  "Businesses score at the end: 1 per kind up to 6, all 7 kinds 10, plus 3 of a kind +5 and 4 of a kind +10.";

export default function cardInfo(card: LootCards): LootInfo {
  switch (card) {
    case "SCARAB":
      return { name: "Scarab", category: "jewels", effect: JEWEL_EFFECT };
    case "CROSS":
      return { name: "Cross", category: "jewels", effect: JEWEL_EFFECT };
    case "BRACELET":
      return { name: "Bracelet", category: "jewels", effect: JEWEL_EFFECT };
    case "TIARA":
      return { name: "Tiara", category: "jewels", effect: JEWEL_EFFECT };
    case "RING":
      return { name: "Ring", category: "jewels", effect: JEWEL_EFFECT };
    case "BODYGUARDS":
      return {
        name: "Bodyguard",
        category: "bodyguards",
        effect:
          "Most bodyguards +5, fewest −2 each round. Kept between rounds.",
      };
    case "COINS":
      return { name: "Coins", category: "coins", effect: "+3 each round." };
    case "CARS":
      return {
        name: "Car",
        category: "cars",
        effect:
          "+1 per car each round, but only if you hold a driver. Kept between rounds.",
      };
    case "DRIVERS":
      return {
        name: "Driver",
        category: "drivers",
        effect:
          "+1 each round and unlocks your cars. Discarded after the round.",
      };
    case "THIEF":
      return {
        name: "Thief",
        category: "theives",
        effect:
          "Spend it to take any one card from the table, or keep it for +2 at round end.",
      };
    case "POLICE_RAIDS":
      return {
        name: "Police raid",
        category: "police",
        effect:
          "Forces an auction. The seventh police card of the round ends it at once.",
      };
    case "CASINO":
      return {
        name: "Casino",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "TRANSPORTATION":
      return {
        name: "Transport",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "MOVIE_THEATER":
      return {
        name: "Movie theater",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "RACING":
      return {
        name: "Racing",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "REAL_ESTATE":
      return {
        name: "Real estate",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "NIGHTCLUB":
      return {
        name: "Nightclub",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
    case "RESTAURANT":
      return {
        name: "Restaurant",
        category: "businesses",
        effect: BUSINESS_EFFECT,
      };
  }
}

export const CATEGORY_LABELS: { [key in CardCategory]: string } = {
  jewels: "Jewels",
  bodyguards: "Bodyguards",
  coins: "Coins",
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

export function totalCards(cards: PlayerCards | undefined) {
  return CATEGORY_ORDER.reduce(
    (count, category) => count + (cards?.[category] || []).length,
    0,
  );
}
