import { Card, CondottiereGameState, Season } from "./types";

/*
 * Client-side copy of the map, the deck and the rule queries the table
 * needs. Keep in step with functions/src/condottiere/helpers.
 */

export type RegionInfo = { name: string; x: number; y: number };

export const REGIONS: RegionInfo[] = [
  { name: "Torino", x: 18, y: 18 },
  { name: "Milano", x: 34, y: 12 },
  { name: "Venezia", x: 60, y: 16 },
  { name: "Genova", x: 24, y: 32 },
  { name: "Mantova", x: 46, y: 22 },
  { name: "Bologna", x: 54, y: 32 },
  { name: "Pisa", x: 36, y: 42 },
  { name: "Firenze", x: 46, y: 44 },
  { name: "Urbino", x: 62, y: 42 },
  { name: "Siena", x: 40, y: 54 },
  { name: "Ancona", x: 72, y: 50 },
  { name: "Perugia", x: 54, y: 56 },
  { name: "Roma", x: 50, y: 68 },
  { name: "L'Aquila", x: 66, y: 64 },
  { name: "Napoli", x: 62, y: 80 },
  { name: "Bari", x: 86, y: 86 },
  { name: "Cosenza", x: 58, y: 100 },
];

export const BORDERS: [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [2, 8],
  [3, 4],
  [3, 6],
  [4, 5],
  [4, 6],
  [5, 7],
  [5, 8],
  [6, 7],
  [6, 9],
  [7, 8],
  [7, 9],
  [7, 11],
  [8, 10],
  [8, 11],
  [9, 11],
  [9, 12],
  [10, 11],
  [10, 13],
  [10, 15],
  [11, 12],
  [11, 13],
  [12, 13],
  [12, 14],
  [13, 14],
  [13, 15],
  [14, 15],
  [14, 16],
];

/** The coastline and borders of the whole map. */
export const OUTLINE: [number, number][] = [
  [10, 14],
  [24, 6],
  [44, 4],
  [62, 8],
  [74, 16],
  [78, 30],
  [70, 36],
  [74, 44],
  [84, 56],
  [94, 70],
  [102, 84],
  [98, 96],
  [88, 92],
  [78, 84],
  [70, 80],
  [66, 92],
  [62, 106],
  [54, 116],
  [44, 114],
  [46, 100],
  [54, 88],
  [48, 78],
  [40, 66],
  [30, 54],
  [22, 44],
  [12, 34],
  [6, 24],
];

/** Each region's cell, as polygon points on the same canvas. */
export const CELLS: [number, number][][] = [
  [
    [10, 14],
    [22.9, 6.6],
    [28.5, 21.8],
    [9.5, 29.9],
    [6, 24],
  ],
  [
    [22.9, 6.6],
    [24, 6],
    [44, 4],
    [48.4, 5.0],
    [48.0, 7.4],
    [33.8, 24.4],
    [28.5, 21.8],
  ],
  [
    [48.4, 5.0],
    [62, 8],
    [74, 16],
    [77.4, 27.7],
    [68.7, 28.4],
    [54.8, 23.2],
    [48.0, 7.4],
  ],
  [
    [23.1, 45.3],
    [22, 44],
    [12, 34],
    [9.5, 29.9],
    [28.5, 21.8],
    [33.8, 24.4],
    [36.2, 29.6],
  ],
  [
    [36.2, 29.6],
    [33.8, 24.4],
    [48.0, 7.4],
    [54.8, 23.2],
    [42.7, 32.8],
  ],
  [
    [53.7, 40.5],
    [42.9, 33.3],
    [42.7, 32.8],
    [54.8, 23.2],
    [68.7, 28.4],
  ],
  [
    [27.9, 51.4],
    [23.1, 45.3],
    [36.2, 29.6],
    [42.7, 32.8],
    [42.9, 33.3],
    [40.1, 47.3],
  ],
  [
    [40.1, 47.3],
    [42.9, 33.3],
    [53.7, 40.5],
    [54.5, 47.0],
    [47.5, 51.7],
  ],
  [
    [77.4, 27.7],
    [78, 30],
    [70, 36],
    [71.9, 39.8],
    [62.5, 51.6],
    [54.5, 47.0],
    [53.7, 40.5],
    [68.7, 28.4],
  ],
  [
    [39.3, 65.1],
    [30, 54],
    [27.9, 51.4],
    [40.1, 47.3],
    [47.5, 51.7],
    [46.3, 60.1],
  ],
  [
    [71.9, 39.8],
    [74, 44],
    [84, 56],
    [89.6, 63.9],
    [87.2, 64.8],
    [63.6, 54.7],
    [62.5, 51.6],
  ],
  [
    [46.3, 60.1],
    [47.5, 51.7],
    [54.5, 47.0],
    [62.5, 51.6],
    [63.6, 54.7],
    [57.5, 63.8],
  ],
  [
    [49.5, 80.5],
    [48, 78],
    [40, 66],
    [39.3, 65.1],
    [46.3, 60.1],
    [57.5, 63.8],
    [59.2, 70.8],
  ],
  [
    [76.0, 75.0],
    [59.2, 70.8],
    [57.5, 63.8],
    [63.6, 54.7],
    [87.2, 64.8],
  ],
  [
    [74.2, 82.1],
    [70, 80],
    [66.2, 91.2],
    [53.5, 88.7],
    [54, 88],
    [49.5, 80.5],
    [59.2, 70.8],
    [76.0, 75.0],
  ],
  [
    [89.6, 63.9],
    [94, 70],
    [102, 84],
    [98, 96],
    [88, 92],
    [78, 84],
    [74.2, 82.1],
    [76.0, 75.0],
    [87.2, 64.8],
  ],
  [
    [66.2, 91.2],
    [66, 92],
    [62, 106],
    [54, 116],
    [44, 114],
    [46, 100],
    [53.5, 88.7],
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
