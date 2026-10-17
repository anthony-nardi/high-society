import { Card, CondottiereGameState, Season } from "./types";

/*
 * Client-side copy of the map, the deck and the rule queries the table
 * needs. Keep in step with functions/src/condottiere/helpers.
 */

export type RegionInfo = { name: string; x: number; y: number };

export const REGIONS: RegionInfo[] = [
  { name: "Torino", x: 16, y: 14 },
  { name: "Milano", x: 32, y: 12 },
  { name: "Venezia", x: 56, y: 11 },
  { name: "Genova", x: 24, y: 27 },
  { name: "Mantova", x: 44, y: 22 },
  { name: "Bologna", x: 50, y: 31 },
  { name: "Pisa", x: 35, y: 38 },
  { name: "Firenze", x: 46, y: 42 },
  { name: "Urbino", x: 59, y: 39 },
  { name: "Siena", x: 43, y: 52 },
  { name: "Ancona", x: 68, y: 47 },
  { name: "Perugia", x: 56, y: 53 },
  { name: "Roma", x: 53, y: 65 },
  { name: "L'Aquila", x: 66, y: 61 },
  { name: "Napoli", x: 67, y: 75 },
  { name: "Bari", x: 86, y: 70 },
  { name: "Taranto", x: 84, y: 85 },
];

export const BORDERS: [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 3],
  [1, 4],
  [1, 2],
  [2, 4],
  [2, 5],
  [4, 5],
  [3, 5],
  [3, 6],
  [5, 7],
  [5, 8],
  [6, 7],
  [6, 9],
  [7, 9],
  [7, 8],
  [8, 10],
  [8, 11],
  [9, 11],
  [9, 12],
  [11, 12],
  [11, 10],
  [10, 13],
  [11, 13],
  [12, 13],
  [12, 14],
  [13, 14],
  [13, 15],
  [14, 15],
  [14, 16],
  [15, 16],
];

export function neighbours(region: number): number[] {
  return BORDERS.filter(([a, b]) => a === region || b === region).map(
    ([a, b]) => (a === region ? b : a),
  );
}

export function largestConnected(regions: number[]): number {
  const left = new Set(regions);
  let best = 0;
  while (left.size) {
    const start = left.values().next().value as number;
    const queue = [start];
    left.delete(start);
    let size = 0;
    while (queue.length) {
      const r = queue.pop() as number;
      size += 1;
      for (const n of neighbours(r)) {
        if (left.has(n)) {
          left.delete(n);
          queue.push(n);
        }
      }
    }
    best = Math.max(best, size);
  }
  return best;
}

export const PLAYER_COLOURS = [
  "#d9342b",
  "#2f6fd6",
  "#e8c23a",
  "#2e9e5b",
  "#8e5ad6",
  "#e8792f",
];

export const isMercenary = (card: Card) => card.startsWith("M");
export const mercenaryValue = (card: Card) =>
  isMercenary(card) ? Number(card.slice(1)) : 0;

export const CARD_LABEL: { [card in Card]: string } = {
  M1: "Mercenary 1",
  M2: "Mercenary 2",
  M3: "Mercenary 3",
  M4: "Mercenary 4",
  M5: "Mercenary 5",
  M6: "Mercenary 6",
  M10: "Mercenary 10",
  DRUMMER: "Drummer",
  HEROINE: "Heroine",
  SPRING: "Spring",
  WINTER: "Winter",
  SURRENDER: "Surrender",
  BISHOP: "Bishop",
  SCARECROW: "Scarecrow",
  COURTESAN: "Courtesan",
};

export const CARD_HELP: { [card in Card]: string } = {
  M1: "Strength 1.",
  M2: "Strength 2.",
  M3: "Strength 3.",
  M4: "Strength 4.",
  M5: "Strength 5.",
  M6: "Strength 6.",
  M10: "Strength 10.",
  DRUMMER: "Doubles every mercenary in your line. Several do not stack.",
  HEROINE:
    "Strength 10. Not a mercenary: untouched by seasons, drummers, bishops and scarecrows.",
  SPRING: "Each player's strongest mercenaries gain 3. Replaces Winter.",
  WINTER: "Every mercenary counts 1. Replaces Spring.",
  SURRENDER: "The battle ends at once; the strongest line wins.",
  BISHOP:
    "Every copy of the highest mercenary on the table is discarded, and you move the Pope to an unclaimed region, where no battle may be fought.",
  SCARECROW: "Take one of your mercenaries back from your line into your hand.",
  COURTESAN:
    "Strength 1. Whoever has the most Courtesans at the end takes the Condottiere and chooses the next battlefield.",
};

export function strengthOf(
  line: Card[] | undefined,
  season: Season | undefined,
) {
  const cards = line || [];
  const drummer = cards.includes("DRUMMER");
  const mercenaries = cards.filter(isMercenary).map((c) => {
    const printed = season === "WINTER" ? 1 : mercenaryValue(c);
    return drummer ? printed * 2 : printed;
  });
  let total = mercenaries.reduce((s, v) => s + v, 0);
  if (season === "SPRING" && mercenaries.length) {
    const top = Math.max(...mercenaries);
    total += 3 * mercenaries.filter((v) => v === top).length;
  }
  total += cards.filter((c) => c === "HEROINE").length * 10;
  total += cards.filter((c) => c === "COURTESAN").length;
  return total;
}

export function controllerOf(state: CondottiereGameState, region: number) {
  return state.players.find((p) => (p.regions || []).includes(region))?.email;
}

export function battlefields(state: CondottiereGameState): number[] {
  return REGIONS.map((_, i) => i).filter(
    (r) => !controllerOf(state, r) && state.pope !== r,
  );
}

export function popeTargets(state: CondottiereGameState): number[] {
  return REGIONS.map((_, i) => i).filter(
    (r) => !controllerOf(state, r) && state.battlefield !== r,
  );
}

export function colourOf(
  state: CondottiereGameState,
  email: string | undefined,
) {
  const i = state.players.findIndex((p) => p.email === email);
  return i >= 0 ? PLAYER_COLOURS[i % PLAYER_COLOURS.length] : "#777";
}
