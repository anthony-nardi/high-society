import { Card, CondottiereGameState, Season } from "./types";

/*
 * Client-side copy of the map, the deck and the rule queries the table
 * needs. Keep in step with functions/src/condottiere/helpers.
 */

export type RegionInfo = { name: string; x: number; y: number };

export const REGIONS: RegionInfo[] = [
  { name: "Torino", x: 9, y: 14 },
  { name: "Milano", x: 30, y: 10 },
  { name: "Venezia", x: 72, y: 19 },
  { name: "Genova", x: 15, y: 29 },
  { name: "Mantova", x: 49, y: 28 },
  { name: "Ferrara", x: 61, y: 34 },
  { name: "Parma", x: 30, y: 42 },
  { name: "Modena", x: 44, y: 34 },
  { name: "Bologna", x: 54, y: 41 },
  { name: "Lucca", x: 29, y: 50 },
  { name: "Firenze", x: 51, y: 53 },
  { name: "Urbino", x: 73, y: 60 },
  { name: "Siena", x: 38, y: 66 },
  { name: "Ancona", x: 88, y: 67 },
  { name: "Spoleto", x: 64, y: 73 },
  { name: "Roma", x: 61, y: 93 },
  { name: "Napoli", x: 88, y: 112 },
];

export const BORDERS: [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 7],
  [2, 4],
  [2, 5],
  [3, 6],
  [3, 7],
  [3, 9],
  [4, 5],
  [4, 7],
  [4, 8],
  [5, 8],
  [5, 11],
  [6, 7],
  [6, 9],
  [6, 10],
  [7, 8],
  [7, 10],
  [8, 10],
  [8, 11],
  [9, 10],
  [9, 12],
  [10, 11],
  [10, 12],
  [10, 14],
  [11, 13],
  [11, 14],
  [12, 14],
  [12, 15],
  [13, 14],
  [13, 15],
  [13, 16],
  [14, 15],
  [15, 16],
];

/** The coastline and borders of the whole map. */
export const OUTLINE: [number, number][] = [
  [4, 8],
  [18, 2],
  [40, 2],
  [62, 4],
  [80, 8],
  [92, 16],
  [84, 28],
  [84, 40],
  [90, 52],
  [96, 64],
  [100, 78],
  [100, 96],
  [102, 112],
  [100, 120],
  [90, 120],
  [78, 116],
  [68, 106],
  [58, 96],
  [48, 86],
  [40, 76],
  [30, 66],
  [22, 56],
  [14, 44],
  [6, 34],
  [2, 22],
];

/** Each region's cell, as polygon points on the same canvas. */
export const CELLS: [number, number][][] = [
  [
    [4, 8],
    [17.6, 2.2],
    [20.7, 18.0],
    [3.0, 25.1],
    [2, 22],
  ],
  [
    [17.6, 2.2],
    [18, 2],
    [40, 2],
    [53.4, 3.2],
    [53.1, 4.6],
    [36.2, 22.4],
    [30.5, 25.8],
    [20.7, 18.0],
  ],
  [
    [53.4, 3.2],
    [62, 4],
    [80, 8],
    [92, 16],
    [84, 28],
    [84.0, 39.2],
    [83.8, 39.2],
    [59.7, 21.5],
    [53.1, 4.6],
  ],
  [
    [14.4, 44.6],
    [14, 44],
    [6, 34],
    [3.0, 25.1],
    [20.7, 18.0],
    [30.5, 25.8],
    [30.4, 26.4],
    [15.0, 44.2],
  ],
  [
    [36.2, 22.4],
    [53.1, 4.6],
    [59.7, 21.5],
    [53.7, 33.7],
    [51.0, 34.7],
  ],
  [
    [67.0, 47.0],
    [53.7, 33.7],
    [59.7, 21.5],
    [83.8, 39.2],
  ],
  [
    [15.0, 44.2],
    [30.4, 26.4],
    [41.4, 45.7],
    [40.6, 47.4],
  ],
  [
    [30.4, 26.4],
    [30.5, 25.8],
    [36.2, 22.4],
    [51.0, 34.7],
    [43.9, 44.8],
    [41.4, 45.7],
  ],
  [
    [43.9, 44.8],
    [51.0, 34.7],
    [53.7, 33.7],
    [67.0, 47.0],
    [64.1, 49.9],
  ],
  [
    [26.7, 61.8],
    [22, 56],
    [14.4, 44.6],
    [15.0, 44.2],
    [40.6, 47.4],
    [39.6, 54.6],
  ],
  [
    [39.6, 54.6],
    [40.6, 47.4],
    [41.4, 45.7],
    [43.9, 44.8],
    [64.1, 49.9],
    [60.6, 61.0],
    [51.7, 66.7],
  ],
  [
    [84.0, 39.2],
    [84, 40],
    [87.9, 47.7],
    [76.5, 72.0],
    [60.6, 61.0],
    [64.1, 49.9],
    [67.0, 47.0],
    [83.8, 39.2],
  ],
  [
    [45.5, 82.9],
    [40, 76],
    [30, 66],
    [26.7, 61.8],
    [39.6, 54.6],
    [51.7, 66.7],
    [48.0, 80.8],
  ],
  [
    [87.9, 47.7],
    [90, 52],
    [96, 64],
    [100, 78],
    [100.0, 89.5],
    [83.6, 89.5],
    [79.9, 85.6],
    [76.5, 72.0],
  ],
  [
    [48.0, 80.8],
    [51.7, 66.7],
    [60.6, 61.0],
    [76.5, 72.0],
    [79.9, 85.6],
  ],
  [
    [70.4, 108.4],
    [68, 106],
    [58, 96],
    [48, 86],
    [45.5, 82.9],
    [48.0, 80.8],
    [79.9, 85.6],
    [83.6, 89.5],
  ],
  [
    [100.0, 89.5],
    [100, 96],
    [102, 112],
    [100, 120],
    [90, 120],
    [78, 116],
    [70.4, 108.4],
    [83.6, 89.5],
  ],
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
