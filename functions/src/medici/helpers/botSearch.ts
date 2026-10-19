import { Card, Commodity, MediciGameState, MediciPlayerState } from "../types";
import type { ActionResult } from "../../shared/game";
import {
  bonusFor,
  COMMODITIES,
  countOf,
  DAYS,
  fullDeck,
  PAYMENTS,
  shipValue,
  TOP_LEVEL,
  trackPayouts,
  valueOf,
} from "./board";
import {
  bid,
  canBid,
  drawCard,
  freeSpace,
  getActivePlayer,
  mayDraw,
  offerLot,
  pass,
} from "./rules";

/*
 * The bot's judgement. A lot is worth, in florins, what it changes in the
 * day's payouts: the ship's expected place among the others (smoothed, as
 * the rest of the holds will still be filled), the commodity tracks'
 * awards today and on the days to come, and the climb towards the bonus
 * levels. Money spent is score lost, so a bid never goes above most of
 * that worth. The auctioneer keeps turning over cards while the lot's
 * worth to them, less what it will cost against the keenest rival, is
 * expected to grow.
 */

/** The judgement's dials, exposed so the arena can tune them. */
export type Tuning = {
  ceiling: number;
  bidLow: number;
  bidSpread: number;
  carryNext: number;
  carryLater: number;
  climb: number;
  climbBehind: number;
  rival: number;
};

export const TUNING: Tuning = {
  /** Share of the worth a bid may reach. Low: florins are the score, and the arena punished paying more. */
  ceiling: 0.3,
  /** Range of the ceiling bid when not speaking last. */
  bidLow: 0.3,
  bidSpread: 0.3,
  /** Weight of a track award on the next day and the day after. */
  carryNext: 0.3,
  carryLater: 0.2,
  /** Worth of a step up a track per day left, when in the race and when not. */
  climb: 0.6,
  climbBehind: 0.2,
  /** Discount on the keenest rival's worth when weighing another draw. */
  rival: 0.6,
};

export type BotMove =
  | { type: "draw" }
  | { type: "offer" }
  | { type: "bid"; amount: number }
  | { type: "pass" };

export function turnMoves(gameState: MediciGameState): BotMove[] {
  const pub = gameState.public;
  if (pub.status !== "IN_PROGRESS") return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  if (pub.phase === "DRAW") {
    const moves: BotMove[] = [];
    if (mayDraw(gameState)) moves.push({ type: "draw" });
    if ((pub.lot || []).length) moves.push({ type: "offer" });
    return moves;
  }
  const moves: BotMove[] = [{ type: "pass" }];
  if (canBid(gameState, player)) {
    const low = (pub.highBid || 0) + 1;
    moves.push({ type: "bid", amount: low });
    const high = Math.min(player.money, low + 3);
    if (high > low) moves.push({ type: "bid", amount: high });
  }
  return moves;
}

export function applyMove(
  gameState: MediciGameState,
  move: BotMove,
): ActionResult {
  switch (move.type) {
    case "draw":
      return drawCard(gameState);
    case "offer":
      return offerLot(gameState);
    case "bid":
      return bid(gameState, move.amount);
    case "pass":
      return pass(gameState);
  }
}

// ---------------------------------------------------------------------------
// Valuing a lot
// ---------------------------------------------------------------------------

/** Cards not yet seen this day: the deck and the set-aside cards together. */
function unseenCards(gameState: MediciGameState): Card[] {
  const seen = new Map<Card, number>();
  const note = (c: Card) => seen.set(c, (seen.get(c) || 0) + 1);
  for (const p of gameState.public.players)
    for (const c of p.ship || []) note(c);
  for (const c of gameState.public.lot || []) note(c);
  for (const c of gameState.private.discard || []) note(c);
  const out: Card[] = [];
  for (const c of fullDeck()) {
    const n = seen.get(c) || 0;
    if (n > 0) seen.set(c, n - 1);
    else out.push(c);
  }
  return out;
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** A smoothed guess at a ship's payment given everyone's projected value. */
function expectedShipPay(
  values: { email: string; value: number }[],
  email: string,
) {
  const mine = values.find((v) => v.email === email);
  if (!mine) return 0;
  const table = PAYMENTS[values.length] || PAYMENTS[6];
  let rank = 1;
  for (const v of values) {
    if (v.email === email) continue;
    const p = 1 / (1 + Math.exp(-(mine.value - v.value) / 3));
    rank += 1 - p;
  }
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const at = (r: number) => table[Math.min(table.length, r) - 1] || 0;
  return at(lo) + (rank - lo) * (at(hi) - at(lo));
}

type Outlook = {
  meanUnseen: number;
  /** Share of a free slot that will still be filled this day. */
  fill: number;
};

function outlook(gameState: MediciGameState): Outlook {
  const pub = gameState.public;
  const unseen = unseenCards(gameState);
  const free = pub.players.reduce((s, p) => s + freeSpace(gameState, p), 0);
  const left = pub.deckCount + (pub.lot || []).length;
  return {
    meanUnseen: mean(unseen.map(valueOf)),
    fill: free ? Math.min(1, left / free) * 0.85 : 0,
  };
}

/** Florins the lot is worth to the player, over what average cards would bring. */
export function lotValue(
  gameState: MediciGameState,
  email: string,
  lot: Card[],
  look: Outlook = outlook(gameState),
  tuning: Tuning = TUNING,
): number {
  const pub = gameState.public;
  const me = pub.players.find((p) => p.email === email);
  if (!me || !lot.length) return 0;
  const free = freeSpace(gameState, me);
  if (lot.length > free) return 0;

  // The ship: its projected value with and without the lot, against the others'.
  const projected = (p: MediciPlayerState, extra: Card[]) =>
    shipValue([...(p.ship || []), ...extra]) +
    (freeSpace(gameState, p) - extra.length) * look.fill * look.meanUnseen;
  const others = pub.players
    .filter((p) => p.email !== email)
    .map((p) => ({ email: p.email, value: projected(p, []) }));
  const withLot = [...others, { email, value: projected(me, lot) }];
  const without = [...others, { email, value: projected(me, []) }];
  let worth = expectedShipPay(withLot, email) - expectedShipPay(without, email);

  // The tracks: awards today, carried into the days to come, and the climb.
  const daysLeft = DAYS - pub.day;
  const carry =
    1 +
    (daysLeft >= 1 ? tuning.carryNext : 0) +
    (daysLeft >= 2 ? tuning.carryLater : 0);
  for (const commodity of COMMODITIES) {
    const k = countOf(lot, commodity);
    if (!k) continue;
    worth += trackGain(pub.players, me, commodity, k) * carry;
    worth += climbValue(pub.players, me, commodity, k, daysLeft, tuning);
  }
  return Math.max(0, worth);
}

/** What k more cards of a commodity change in that track's payout today. */
function trackGain(
  players: MediciPlayerState[],
  me: MediciPlayerState,
  commodity: Commodity,
  k: number,
) {
  const level = (p: MediciPlayerState, extra: number) =>
    Math.min(
      TOP_LEVEL,
      p.tracks[commodity] + countOf(p.ship || [], commodity) + extra,
    );
  const rows = (extra: number) =>
    players.map((p) => ({
      email: p.email,
      level: level(p, p.email === me.email ? extra : 0),
    }));
  const payout = (extra: number) => {
    const r = rows(extra);
    const mine = r.find((x) => x.email === me.email)?.level || 0;
    return trackPayouts(r)[me.email] + bonusFor(mine);
  };
  return payout(k) - payout(0);
}

/** Steps up a track are worth something before they pay: the bonuses are near. */
function climbValue(
  players: MediciPlayerState[],
  me: MediciPlayerState,
  commodity: Commodity,
  k: number,
  daysLeft: number,
  tuning: Tuning,
) {
  if (!daysLeft) return 0;
  const level = (p: MediciPlayerState) =>
    p.tracks[commodity] + countOf(p.ship || [], commodity);
  const mine = level(me);
  const best = Math.max(0, ...players.filter((p) => p !== me).map(level));
  const competitive = mine + k >= best - 1;
  const perStep = (competitive ? tuning.climb : tuning.climbBehind) * daysLeft;
  const steps = Math.max(0, Math.min(TOP_LEVEL, mine + k) - mine);
  return steps * perStep;
}

// ---------------------------------------------------------------------------
// Choosing
// ---------------------------------------------------------------------------

/** The most a bot will pay: most of the worth, keeping a florin or two to bid with later. */
function maxBid(
  gameState: MediciGameState,
  me: MediciPlayerState,
  worth: number,
  tuning: Tuning,
) {
  const reserve = gameState.public.day < DAYS ? 2 : 0;
  return Math.min(Math.floor(worth * tuning.ceiling), me.money - reserve);
}

export function chooseBotMove(
  gameState: MediciGameState,
  random: () => number = Math.random,
  tuning: Tuning = TUNING,
): BotMove {
  const pub = gameState.public;
  const me = getActivePlayer(gameState);
  if (!me) return { type: "pass" };
  const look = outlook(gameState);

  if (pub.phase === "DRAW") {
    const lot = pub.lot || [];
    if (!lot.length) return { type: "draw" };
    if (!mayDraw(gameState)) return { type: "offer" };
    const rivals = pub.players.filter((p) => p.email !== me.email);
    const edge = (cards: Card[]) =>
      lotValue(gameState, me.email, cards, look, tuning) -
      tuning.rival *
        Math.max(
          0,
          ...rivals.map((r) =>
            lotValue(gameState, r.email, cards, look, tuning),
          ),
        );
    const now = edge(lot);
    const next = mean(unseenCards(gameState).map((c) => edge([...lot, c])));
    return next > now + 0.5 + random() * 0.5
      ? { type: "draw" }
      : { type: "offer" };
  }

  if (!canBid(gameState, me)) return { type: "pass" };
  const lot = pub.lot || [];
  const worth = lotValue(gameState, me.email, lot, look, tuning);
  const ceiling = maxBid(gameState, me, worth, tuning);
  const floor = (pub.highBid || 0) + 1;
  if (ceiling < floor) return { type: "pass" };
  if (me.email === pub.auctioneer) return { type: "bid", amount: floor };
  // Not last to speak: a low bid only invites a florin more, so bid near the worth.
  const amount = Math.max(
    floor,
    Math.min(
      ceiling,
      Math.round(ceiling * (tuning.bidLow + random() * tuning.bidSpread)),
    ),
  );
  return { type: "bid", amount };
}
