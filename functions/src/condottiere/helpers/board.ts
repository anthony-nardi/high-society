import { Card } from "../types";

/*
 * The map: seventeen regions of Renaissance Italy, laid out for this app
 * (the printed board's borders are not reproduced). Positions are on a
 * 100 by 100 canvas for the table and for the bot's sense of geography.
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
