import { Card } from "../types";

/*
 * The map: the seventeen regions of the Fantasy Flight board, cities placed
 * as printed and borders carved around them for this app. Positions are on a
 * 100 by 100 canvas for the table and for the bot's sense of geography.
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

export function neighbours(region: number): number[] {
  return BORDERS.filter(([a, b]) => a === region || b === region).map(
    ([a, b]) => (a === region ? b : a),
  );
}

/** The largest group of mutually connected regions in a set. */
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

export const MERCENARIES: Card[] = ["M1", "M2", "M3", "M4", "M5", "M6", "M10"];

/** The 110-card deck of the Fantasy Flight edition. */
export const DECK: { card: Card; count: number }[] = [
  { card: "M1", count: 10 },
  { card: "M2", count: 8 },
  { card: "M3", count: 8 },
  { card: "M4", count: 8 },
  { card: "M5", count: 8 },
  { card: "M6", count: 8 },
  { card: "M10", count: 8 },
  { card: "DRUMMER", count: 6 },
  { card: "HEROINE", count: 3 },
  { card: "SPRING", count: 3 },
  { card: "WINTER", count: 3 },
  { card: "SURRENDER", count: 3 },
  { card: "BISHOP", count: 6 },
  { card: "SCARECROW", count: 16 },
  { card: "COURTESAN", count: 12 },
];

export function fullDeck(): Card[] {
  return DECK.flatMap(({ card, count }) =>
    Array.from({ length: count }, () => card),
  );
}

export const isMercenary = (card: Card) => card.startsWith("M");
export const mercenaryValue = (card: Card) =>
  isMercenary(card) ? Number(card.slice(1)) : 0;
