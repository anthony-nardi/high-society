import { Card, Colour, PushGameState, PushPlayerState } from "../types";
import type { ActionResult } from "../../shared/game";
import {
  COLOURS,
  colourOf,
  fullDeck,
  isDice,
  isSwitch,
  ofColour,
  placements,
  points,
  valueOf,
} from "./board";
import {
  bankColour,
  drawCard,
  getActivePlayer,
  placeCard,
  takeColumn,
} from "./rules";

/*
 * The bot's judgement. Everything but the order of the deck is on the
 * table, so the bot knows exactly which cards are still to come. A column
 * is worth its points less what a dice card in it would be expected to
 * cost; stopping is worth the best column less a share of what the others
 * will take; one more card is worth the average, over the deck, of the
 * best stop after it, with a bust costing the zone's expected loss and
 * handing every column to the others. The bot draws while that average
 * beats stopping, and protects a colour when the die is likely to reach
 * it before the game ends.
 */

export type BotMove =
  | { type: "draw" }
  | { type: "place"; column: number }
  | { type: "take"; column: number }
  | { type: "bank"; colour: Colour };

export function turnMoves(gameState: PushGameState): BotMove[] {
  const pub = gameState.public;
  if (pub.status !== "IN_PROGRESS") return [];
  const me = getActivePlayer(gameState);
  if (!me) return [];
  const columns = pub.columns || [];
  if (pub.phase === "CHOOSE")
    return columns.map((_, column) => ({ type: "take", column }) as BotMove);
  if (pub.pending)
    return placements(columns, pub.pending).map(
      (column) => ({ type: "place", column }) as BotMove,
    );
  const moves: BotMove[] = [];
  if (pub.deckCount > 0) moves.push({ type: "draw" });
  columns.forEach((_, column) => moves.push({ type: "take", column }));
  if (pub.drawn === 0)
    for (const colour of COLOURS)
      if (ofColour(me.bench || [], colour).length)
        moves.push({ type: "bank", colour });
  return moves;
}

export function applyMove(
  gameState: PushGameState,
  move: BotMove,
): ActionResult {
  switch (move.type) {
    case "draw":
      return drawCard(gameState);
    case "place":
      return placeCard(gameState, move.column);
    case "take":
      return takeColumn(gameState, move.column);
    case "bank":
      return bankColour(gameState, move.colour);
  }
}

// ---------------------------------------------------------------------------
// What things are worth
// ---------------------------------------------------------------------------

/** The cards still in the deck: the full deck less everything on the table. */
export function unseenCards(gameState: PushGameState): Card[] {
  const pub = gameState.public;
  const seen = new Map<Card, number>();
  const note = (c: Card) => seen.set(c, (seen.get(c) || 0) + 1);
  for (const p of pub.players) {
    for (const c of p.bench || []) note(c);
    for (const c of p.bank || []) note(c);
  }
  for (const col of pub.columns || []) for (const c of col) note(c);
  if (pub.pending) note(pub.pending);
  for (const c of gameState.private.discard || []) note(c);
  const out: Card[] = [];
  for (const c of fullDeck(pub.players.length)) {
    const n = seen.get(c) || 0;
    if (n > 0) seen.set(c, n - 1);
    else out.push(c);
  }
  return out;
}

/** Points by colour in a set of cards. */
function byColour(cards: Card[]): { [c in Colour]: number } {
  const out = { RED: 0, BLUE: 0, YELLOW: 0, GREEN: 0, PURPLE: 0 };
  for (const c of cards) {
    const colour = colourOf(c);
    if (colour) out[colour] += valueOf(c);
  }
  return out;
}

/** What a die roll is expected to cost a zone: a sixth of every colour. */
function expectedRollLoss(bench: Card[]) {
  return points(bench) / 6;
}

/** A column's worth to a player: its points, less what its dice card would be expected to cost. */
export function columnWorth(column: Card[], bench: Card[]) {
  const value = points(column);
  if (!column.some(isDice)) return value;
  return value - expectedRollLoss([...bench, ...column]);
}

/** Share of a point handed to one opponent that counts against the bot. */
function rivalWeight(gameState: PushGameState) {
  return 1 / Math.max(1, gameState.public.players.length - 1);
}

/**
 * What stopping is worth: the best column for the bot, less a share of
 * what the others will take from the rest. With no column to take (a bust)
 * the others take from them all.
 */
export function stopValue(
  gameState: PushGameState,
  me: PushPlayerState,
  columns: Card[][],
  busted = false,
): number {
  const w = rivalWeight(gameState);
  const rivals = gameState.public.players.length - 1;
  const bench = me.bench || [];
  const givenAway = (rest: Card[][]) =>
    rest
      .map((c) => Math.max(0, columnWorth(c, [])))
      .sort((a, b) => b - a)
      .slice(0, rivals)
      .reduce((s, v) => s + v, 0);
  if (busted) return -expectedRollLoss(bench) - w * givenAway(columns);
  let best = -Infinity;
  columns.forEach((col, i) => {
    const mine = columnWorth(col, bench);
    const rest = columns.filter((_, j) => j !== i);
    best = Math.max(best, mine - w * givenAway(rest));
  });
  return best;
}

/** What one more card is expected to be worth, stopping as well as possible after it. */
export function drawValue(
  gameState: PushGameState,
  me: PushPlayerState,
  columns: Card[][],
  unseen: Card[] = unseenCards(gameState),
): number {
  if (!unseen.length) return stopValue(gameState, me, columns);
  const counts = new Map<Card, number>();
  for (const c of unseen) counts.set(c, (counts.get(c) || 0) + 1);
  let total = 0;
  for (const [card, n] of counts) {
    let value: number;
    if (isSwitch(card)) value = stopValue(gameState, me, columns);
    else {
      const options = placements(columns, card);
      if (!options.length) value = stopValue(gameState, me, columns, true);
      else
        value = Math.max(
          ...options.map((o) =>
            stopValue(gameState, me, placed(columns, card, o)),
          ),
        );
    }
    total += n * value;
  }
  return total / unseen.length;
}

function placed(columns: Card[][], card: Card, column: number): Card[][] {
  const out = columns.map((c) => [...c]);
  if (column >= out.length) out.push([card]);
  else out[column].push(card);
  return out;
}

// ---------------------------------------------------------------------------
// Choosing
// ---------------------------------------------------------------------------

/** Die rolls the bot can expect to face before the game ends. */
function rollsAhead(gameState: PushGameState) {
  const pub = gameState.public;
  const n = pub.players.length;
  // A turn uses about five cards; each full round, a player takes about two columns,
  // and a column of three holds a dice card roughly half the time.
  const roundsLeft = pub.deckCount / (5 * n);
  return roundsLeft * 1.0;
}

export function chooseBotMove(
  gameState: PushGameState,
  random: () => number = Math.random,
): BotMove {
  const pub = gameState.public;
  const me = getActivePlayer(gameState);
  if (!me) return { type: "draw" };
  const columns = pub.columns || [];
  const bench = me.bench || [];

  if (pub.phase === "CHOOSE") {
    let best = 0;
    let bestWorth = -Infinity;
    columns.forEach((col, i) => {
      const worth = columnWorth(col, bench) + random() * 0.01;
      if (worth > bestWorth) {
        bestWorth = worth;
        best = i;
      }
    });
    return { type: "take", column: best };
  }

  if (pub.pending) {
    const card = pub.pending;
    const unseen = unseenCards(gameState);
    let best = -1;
    let bestValue = -Infinity;
    for (const o of placements(columns, card)) {
      const after = placed(columns, card, o);
      // Keep the door open: the better of stopping here and drawing on.
      const value =
        Math.max(
          stopValue(gameState, me, after),
          drawValue(gameState, me, after, unseen),
        ) +
        random() * 0.01;
      if (value > bestValue) {
        bestValue = value;
        best = o;
      }
    }
    return { type: "place", column: best };
  }

  // Before the first card: protect a colour the die is likely to reach.
  if (pub.drawn === 0 && bench.length) {
    const values = byColour(bench);
    const rolls = rollsAhead(gameState);
    let bestColour: Colour | null = null;
    let bestRisk = 0;
    for (const colour of COLOURS) {
      const risk = values[colour] * Math.min(1, rolls / 6);
      if (values[colour] > 0 && risk > bestRisk) {
        bestRisk = risk;
        bestColour = colour;
      }
    }
    // A push turn is worth a few points; protecting must save more than that.
    const pushWorth = Math.max(3, drawValue(gameState, me, []));
    if (bestColour && bestRisk > pushWorth && values[bestColour] >= 6)
      return { type: "bank", colour: bestColour };
  }

  if (!columns.length) return { type: "draw" };
  const stop = stopValue(gameState, me, columns);
  const draw =
    pub.deckCount > 0 ? drawValue(gameState, me, columns) : -Infinity;
  if (draw > stop + 0.1) return { type: "draw" };
  let best = 0;
  let bestValue = -Infinity;
  columns.forEach((_, i) => {
    const rest = columns.filter((_, j) => j !== i);
    const value =
      columnWorth(columns[i], bench) -
      rivalWeight(gameState) *
        (rest.length ? Math.max(...rest.map((c) => columnWorth(c, []))) : 0);
    if (value > bestValue) {
      bestValue = value;
      best = i;
    }
  });
  return { type: "take", column: best };
}
