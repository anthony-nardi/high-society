import { Maxn, MaxnOpts, Node } from "minimaxer";
import type { NodeType, SearchMethod } from "minimaxer";
import { HighSocietyGameState } from "../types";
import {
  LUXURY_CARDS_DESC,
  MINUS_CARD,
  STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS,
} from ".";

/*
 * Bot decision making for High Society using minimaxer's Maxn search
 * (multiplayer minimax: every player maximises their own score).
 *
 * The search covers the current auction only. The deck is face down and
 * shuffled, so nothing beyond the revealed card is looked at: once an
 * auction resolves the node is a leaf and the position is scored with a
 * heuristic that values status cards, money in hand and the risk of ending
 * the game with the least money.
 */

/** Either a pass, or the money cards to add to the player's current bid. */
export type BotMove = "pass" | string[];

export type SimPlayer = {
  money: string[];
  bid: string[];
  status: string[];
  passed: boolean;
};

export type AuctionState = {
  players: SimPlayer[];
  /** Index into `players`. */
  activePlayer: number;
  card: string;
  /** Cards still face down after the current one, used for valuing money. */
  remainingCards: number;
  /** True once the card has been awarded; nothing further is searched. */
  resolved: boolean;
};

// minimaxer declares its enums as `const enum`s, which cannot be referenced
// at runtime from compiled JavaScript, so the values are written out here.
const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const METHOD_TIME = 2 as SearchMethod;

/** Maximum distinct bid totals offered per turn, besides passing. */
export const MAX_BID_CANDIDATES = 4;
/** Largest number of money cards combined into a single bid candidate. */
const MAX_CARDS_PER_BID = 3;

/** Heuristic weights, in "status points". */
const MONEY_WEIGHT = 0.3;
const FUTURE_LUXURY_DISCOUNT = 0.6;
const THIEF_PENALTY = 3;
const ELIMINATION_PENALTY = 30;
/** Rough market rate used to guess how much money others still have to spend. */
const MONEY_PER_LUXURY_POINT = 2.5;
const TOTAL_LUXURY_POINTS = 55;
const DECK_SIZE = 16;

/** Raises offered above the minimum, so bidding wars move in real steps. */
const RAISE_STEPS = [0, 3, 8, 15];

export const DEFAULT_SEARCH_TIMEOUT_MS = 600;
/**
 * Every node keeps a copy of the auction, so depth is what bounds memory:
 * with five candidate moves depth 7 is roughly 70k nodes.
 */
export const DEFAULT_SEARCH_DEPTH = 7;

const sum = (cards: string[]) =>
  cards.reduce((total, card) => total + Number(card), 0);

const isLuxury = (card: string) => LUXURY_CARDS_DESC.includes(card);

export function toAuctionState(gameState: HighSocietyGameState): AuctionState {
  const players = gameState.public.players.map((player) => ({
    money: [...(player.moneyCards || [])],
    bid: [...(player.currentBid || [])],
    status: [...(player.statusCards || [])],
    passed: !!player.hasPassed,
  }));
  const activePlayer = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer,
  );

  return {
    players,
    activePlayer: Math.max(activePlayer, 0),
    card: gameState.public.currentStatusCard,
    remainingCards: gameState.public.remainingCards,
    resolved: false,
  };
}

function cloneState(state: AuctionState): AuctionState {
  return {
    ...state,
    players: state.players.map((player) => ({
      money: [...player.money],
      bid: [...player.bid],
      status: [...player.status],
      passed: player.passed,
    })),
  };
}

export function highestBid(state: AuctionState) {
  return Math.max(0, ...state.players.map((player) => sum(player.bid)));
}

function nextActivePlayer(state: AuctionState) {
  const count = state.players.length;
  let index = (state.activePlayer + 1) % count;
  while (state.players[index].passed) {
    index = (index + 1) % count;
  }
  return index;
}

/** Mirrors `giveCurrentStatusCardToPlayer` + `maybeUseMinusCard`. */
function takeMisfortuneCard(player: SimPlayer, card: string) {
  player.status.push(card);
  if (card !== MINUS_CARD) return;

  let lowestLuxury = "";
  for (const luxury of LUXURY_CARDS_DESC) {
    if (player.status.includes(luxury)) lowestLuxury = luxury;
  }
  if (lowestLuxury) {
    player.status.splice(player.status.indexOf(lowestLuxury), 1);
    player.status.splice(player.status.indexOf(MINUS_CARD), 1);
  }
}

/** Mirrors `awardPlayerWithCurrentStatusCard`: the bid is spent. */
function winCard(player: SimPlayer, card: string) {
  if (player.status.includes(MINUS_CARD) && isLuxury(card)) {
    player.status.splice(player.status.indexOf(MINUS_CARD), 1);
  } else {
    player.status.push(card);
  }
  player.bid = [];
}

/** Returns a new state with the move applied; the input is left untouched. */
export function applyMove(state: AuctionState, move: BotMove): AuctionState {
  const next = cloneState(state);
  const player = next.players[next.activePlayer];

  if (move !== "pass") {
    player.bid.push(...move);
    player.money = player.money.filter((card) => !move.includes(card));
    next.activePlayer = nextActivePlayer(next);
    return next;
  }

  if (STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS.includes(next.card)) {
    // First to pass takes the card and keeps their money; every other bid
    // on the table is lost.
    next.players.forEach((other, index) => {
      if (index === next.activePlayer) {
        other.money.push(...other.bid);
        other.bid = [];
        takeMisfortuneCard(other, next.card);
      } else {
        other.bid = [];
      }
    });
    next.resolved = true;
    return next;
  }

  player.passed = true;
  player.money.push(...player.bid);
  player.bid = [];

  const stillBidding = next.players.filter((other) => !other.passed);
  if (stillBidding.length === 1) {
    winCard(stillBidding[0], next.card);
    next.activePlayer = next.players.indexOf(stillBidding[0]);
    next.resolved = true;
    return next;
  }

  next.activePlayer = nextActivePlayer(next);
  return next;
}

/**
 * A handful of bids that beat the table, then pass. Bids are grouped by
 * total so the search only sees a few raises, each paid with as few cards
 * as possible (large cards first, keeping small change for later).
 *
 * Maxn keeps the first of equally valued moves. Being outbid later is worth
 * exactly the same as passing now, so bids are listed first (smallest raise
 * first) to make the bot probe the auction instead of folding on a tie.
 */
export function candidateMoves(state: AuctionState): BotMove[] {
  const player = state.players[state.activePlayer];
  const needed = highestBid(state) - sum(player.bid) + 1;
  const cards = [...player.money].sort((a, b) => Number(b) - Number(a));
  const bestByTotal = new Map<number, string[]>();

  const consider = (combo: string[]) => {
    const total = sum(combo);
    if (total < needed) return;
    const existing = bestByTotal.get(total);
    if (!existing || combo.length < existing.length) {
      bestByTotal.set(total, combo);
    }
  };

  const walk = (start: number, combo: string[]) => {
    if (combo.length) consider(combo);
    if (combo.length === MAX_CARDS_PER_BID) return;
    for (let i = start; i < cards.length; i++) {
      walk(i + 1, [...combo, cards[i]]);
    }
  };
  walk(0, []);

  const totals = [...bestByTotal.keys()].sort((a, b) => a - b);
  const bids: string[][] = [];
  for (const step of RAISE_STEPS) {
    const total = totals.find((t) => t >= needed + step);
    if (total === undefined) break;
    const combo = bestByTotal.get(total) as string[];
    if (!bids.includes(combo)) bids.push(combo);
    if (bids.length === MAX_BID_CANDIDATES) break;
  }

  return [...bids, "pass"];
}

function statusPoints(status: string[], futureLuxury: number) {
  let points = futureLuxury;
  for (const card of status) {
    if (isLuxury(card)) points += Number(card);
    else if (card === "-5") points -= 5;
    else if (card === MINUS_CARD) points -= THIEF_PENALTY;
  }
  let multiplier = 1;
  for (const card of status) {
    if (card === "2x") multiplier *= 2;
    else if (card === "1/2") multiplier /= 2;
  }
  return points * multiplier;
}

/**
 * One score per player, higher is better for that player.
 *
 * Unresolved positions (search depth reached mid-auction) are scored as if
 * every remaining bidder passed now, so money on the table is treated as
 * spent by the leader and returned to everyone else.
 */
export function evaluate(state: AuctionState): number[] {
  let settled = state;
  if (!state.resolved) {
    settled = cloneState(state);
    const leaderBid = highestBid(settled);
    const leader =
      leaderBid > 0
        ? settled.players.find((p) => !p.passed && sum(p.bid) === leaderBid)
        : undefined;
    for (const player of settled.players) {
      if (player === leader) {
        winCard(player, settled.card);
      } else {
        player.money.push(...player.bid);
        player.bid = [];
      }
    }
  }

  const luxuryOut =
    settled.players.reduce(
      (total, p) => total + sum(p.status.filter(isLuxury)),
      0,
    ) +
    (isLuxury(settled.card) &&
    !settled.players.some((p) => p.status.includes(settled.card))
      ? Number(settled.card)
      : 0);
  const luxuryLeft = Math.max(0, TOTAL_LUXURY_POINTS - luxuryOut);
  const moneyTotals = settled.players.map((p) => sum(p.money));
  const moneyInPlay = moneyTotals.reduce((a, b) => a + b, 0);
  const sortedMoney = [...moneyTotals].sort((a, b) => a - b);
  const lowestMoney = sortedMoney[0];
  const nextLowestMoney = sortedMoney[1] ?? lowestMoney;
  const progress = 1 - Math.min(settled.remainingCards, DECK_SIZE) / DECK_SIZE;
  // Being the poorest player at the end means elimination. The penalty grows
  // as the game nears its end, and with the gap to the next poorest player
  // measured against what the others can still be expected to spend, so
  // trailing by a little early on costs almost nothing.
  const expectedSpend = Math.max(
    2,
    ((luxuryLeft * MONEY_PER_LUXURY_POINT) / settled.players.length) *
      (1 - progress),
  );
  const eliminationPenalty =
    ELIMINATION_PENALTY *
    progress *
    progress *
    Math.min(1, (nextLowestMoney - lowestMoney) / expectedSpend);

  return settled.players.map((player, index) => {
    const money = moneyTotals[index];
    const share = moneyInPlay > 0 ? money / moneyInPlay : 0;
    const futureLuxury = luxuryLeft * share * FUTURE_LUXURY_DISCOUNT;

    let score = statusPoints(player.status, futureLuxury);
    score += money * MONEY_WEIGHT;

    if (money === lowestMoney) {
      score -= eliminationPenalty;
    }
    return score;
  });
}

export type SearchOptions = {
  timeoutMs?: number;
  depth?: number;
};

type SearchNode = Node<AuctionState, BotMove, number>;

/** Runs a Maxn search from the state and returns the active player's best move. */
export function searchBestMove(
  state: AuctionState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BotMove {
  const moves = candidateMoves(state);
  if (moves.length === 1) {
    return "pass";
  }

  const root: SearchNode = new Node(NODE_ROOT, state, "pass", 0);
  root.activePlayer = state.activePlayer;

  const opts = new MaxnOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;

  const tree = new Maxn<AuctionState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => candidateMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyMove(parent.gamestate, move);
    const child: SearchNode = new Node(
      next.resolved ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
    );
    child.activePlayer = next.activePlayer;
    return child;
  };
  tree.getScores = (node) => {
    node.scores = evaluate(node.gamestate);
  };

  const result = tree.evaluate();
  return result.move ?? "pass";
}

/** Convenience wrapper working directly on the stored game state. */
export function chooseBotMove(
  gameState: HighSocietyGameState,
  options?: SearchOptions,
): BotMove {
  return searchBestMove(toAuctionState(gameState), options);
}
