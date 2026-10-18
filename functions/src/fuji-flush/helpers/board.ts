/*
 * The deck and the arithmetic of the table. No imports: the client bundles
 * this file to preview a play before sending it.
 */

/** How many of each card the 90-card deck holds. */
export const DISTRIBUTION: { [card: number]: number } = {
  2: 16,
  3: 12,
  4: 9,
  5: 8,
  6: 6,
  7: 6,
  8: 5,
  9: 4,
  10: 4,
  11: 4,
  12: 3,
  13: 3,
  14: 3,
  15: 2,
  16: 1,
  17: 1,
  18: 1,
  19: 1,
  20: 1,
};

export const LOWEST = 2;
export const HIGHEST = 20;
export const DECK_SIZE = 90;

export function fullDeck(): number[] {
  const deck: number[] = [];
  for (let card = LOWEST; card <= HIGHEST; card++)
    for (let i = 0; i < DISTRIBUTION[card]; i++) deck.push(card);
  return deck;
}

/** Six cards each, five at a table of seven or eight. */
export const handSize = (players: number) => (players >= 7 ? 5 : 6);

export type PlayerLike = { email: string; played?: number };

/** How many cards of this number lie on the table. */
export function countOnTable(players: PlayerLike[], card: number) {
  return players.filter((p) => p.played === card).length;
}

/** A card's value on the table: its number times the cards of that number. */
export function tableValue(players: PlayerLike[], card: number) {
  return card * countOnTable(players, card);
}

/** The value of the card in front of a player, or null without one. */
export function valueOf(players: PlayerLike[], player: PlayerLike) {
  return player.played === undefined
    ? null
    : tableValue(players, player.played);
}

export type Outcome = {
  card: number;
  /** What the card is worth once it lies on the table. */
  value: number;
  /** Players whose matching cards it joins. */
  joined: string[];
  /** Players it beats: their cards go down the drain. */
  flushed: { email: string; card: number; value: number }[];
  /** Players whose cards stay above it. */
  above: { email: string; card: number; value: number }[];
  /** Players whose cards tie it exactly, neither joining nor flushed. */
  level: { email: string; card: number; value: number }[];
};

/**
 * What playing a card does: who it joins, who it flushes, who stays on top.
 * A player never has a card in front while playing, so only the others count.
 */
export function outcomeOf(
  players: PlayerLike[],
  email: string,
  card: number,
): Outcome {
  const others = players.filter(
    (p) => p.email !== email && p.played !== undefined,
  );
  const joined = others.filter((p) => p.played === card).map((p) => p.email);
  const value = card * (joined.length + 1);
  const flushed: Outcome["flushed"] = [];
  const above: Outcome["above"] = [];
  const level: Outcome["level"] = [];
  for (const p of others) {
    if (p.played === card || p.played === undefined) continue;
    const theirs = tableValue(others, p.played);
    const entry = { email: p.email, card: p.played, value: theirs };
    if (theirs < value) flushed.push(entry);
    else if (theirs > value) above.push(entry);
    else level.push(entry);
  }
  return { card, value, joined, flushed, above, level };
}
