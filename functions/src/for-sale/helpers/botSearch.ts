import { Maxn, MaxnOpts, Node } from "minimaxer";
import type { NodeType, SearchMethod } from "minimaxer";
import { ForSaleGameState } from "../types";
import { CHEQUE_VALUES } from "./rules";

/*
 * Bot decision making for For Sale.
 *
 * Buying is a sequential auction, so minimaxer's Maxn search (every player
 * maximises their own total) over the current round: raise a little or
 * pass. Selling is simultaneous, so a heuristic: play a property as high
 * in your hand as this round's cheques are among those still to come.
 */

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 900;
export const DEFAULT_SEARCH_DEPTH = 12;
/** How far above the standing bid a bot considers raising, in thousands. */
const RAISES = [1, 2, 3];

/**
 * What a property is worth, in thousands: roughly the cheque a property of
 * that rank fetches, since cheques are paired off against ranks.
 */
export function propertyValue(property: number) {
  return property <= 2 ? 0 : Math.floor((property - 1) / 2) + 1;
}

export type BuyMove = { type: "pass" } | { type: "bid"; amount: number };

export type SimPlayer = {
  money: number;
  bid: number;
  passed: boolean;
  /** Value of properties already owned. */
  assets: number;
};

export type AuctionState = {
  players: SimPlayer[];
  active: number;
  onOffer: number[];
  highBid: number;
  resolved: boolean;
};

export function toAuctionState(gameState: ForSaleGameState): AuctionState {
  const players = gameState.public.players.map((p) => ({
    money: p.money,
    bid: p.bid,
    passed: !!p.passed,
    assets: (p.properties || []).reduce((s, x) => s + propertyValue(x), 0),
  }));
  return {
    players,
    active: Math.max(
      0,
      gameState.public.players.findIndex(
        (p) => p.email === gameState.public.activePlayer,
      ),
    ),
    onOffer: [...(gameState.public.onOffer || [])],
    highBid: gameState.public.highBid,
    resolved: false,
  };
}

function clone(state: AuctionState): AuctionState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    onOffer: [...state.onOffer],
  };
}

function advance(state: AuctionState) {
  for (let step = 0; step < state.players.length; step++) {
    state.active = (state.active + 1) % state.players.length;
    if (!state.players[state.active].passed) return;
  }
}

export function candidateMoves(state: AuctionState): BuyMove[] {
  const player = state.players[state.active];
  const moves: BuyMove[] = [{ type: "pass" }];
  for (const raise of RAISES) {
    const amount = state.highBid + raise;
    if (amount <= player.money) moves.push({ type: "bid", amount });
  }
  return moves;
}

export function applyMove(state: AuctionState, move: BuyMove): AuctionState {
  const next = clone(state);
  const player = next.players[next.active];
  if (move.type === "bid") {
    player.bid = move.amount;
    next.highBid = move.amount;
    advance(next);
    return next;
  }
  player.passed = true;
  player.assets += propertyValue(next.onOffer.shift() ?? 0);
  player.money -= Math.ceil(player.bid / 2);
  const remaining = next.players.filter((p) => !p.passed);
  if (remaining.length === 1) {
    const winner = remaining[0];
    winner.assets += propertyValue(next.onOffer.pop() ?? 0);
    winner.money -= winner.bid;
    winner.passed = true;
    next.resolved = true;
    return next;
  }
  advance(next);
  return next;
}

/** Finish an unresolved round as if everyone still in passed from here. */
function settle(state: AuctionState): AuctionState {
  let current = state;
  let guard = state.players.length + 1;
  while (!current.resolved && guard-- > 0)
    current = applyMove(current, { type: "pass" });
  return current;
}

export function evaluate(state: AuctionState): number[] {
  const settled = state.resolved ? state : settle(state);
  return settled.players.map((p) => p.money + p.assets);
}

export type SearchOptions = { timeoutMs?: number; depth?: number };
type SearchNode = Node<AuctionState, BuyMove, number>;

export function searchBuyMove(
  state: AuctionState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BuyMove {
  const moves = candidateMoves(state);
  if (moves.length === 1) return moves[0];

  const root: SearchNode = new Node(NODE_ROOT, state, moves[0], 0);
  root.activePlayer = state.active;

  const opts = new MaxnOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;

  const tree = new Maxn<AuctionState, BuyMove, number>(root, opts);
  tree.GetMoves = (node) => candidateMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyMove(parent.gamestate, move);
    const child: SearchNode = new Node(
      next.resolved ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
    );
    child.activePlayer = next.active;
    return child;
  };
  tree.getScores = (node) => {
    node.scores = evaluate(node.gamestate);
  };
  const result = tree.evaluate();
  return result.move ?? { type: "pass" };
}

export function chooseBuyMove(
  gameState: ForSaleGameState,
  options?: SearchOptions,
): BuyMove {
  return searchBuyMove(toAuctionState(gameState), options);
}

/**
 * Which property to sell: the cheques on offer are placed among every
 * cheque not yet seen, and the property at the same height in the hand is
 * played, nudged by how the other players' remaining properties compare.
 */
export function chooseSale(
  gameState: ForSaleGameState,
  email: string,
): number | null {
  const me = gameState.public.players.find((p) => p.email === email);
  const hand = [...(me?.properties || [])].sort((a, b) => a - b);
  if (!hand.length) return null;
  if (hand.length === 1) return hand[0];

  const offered = [...(gameState.public.cheques || [])];
  const seen = gameState.public.players.flatMap((p) => p.cheques || []);
  const pool = [...CHEQUE_VALUES];
  for (const c of seen) {
    const i = pool.indexOf(c);
    if (i >= 0) pool.splice(i, 1);
  }
  const mean = offered.reduce((s, c) => s + c, 0) / Math.max(1, offered.length);
  const below = pool.filter((c) => c < mean).length;
  const quality = pool.length ? below / pool.length : 0.5;
  const index = Math.round(quality * (hand.length - 1));

  // Among the neighbours of that pick, prefer what the others are unlikely to beat for the top cheque.
  const others = gameState.public.players.filter((p) => p.email !== email);
  const beatChance = (property: number) =>
    others.reduce((s, p) => {
      const theirs = p.properties || [];
      return (
        s +
        (theirs.length
          ? theirs.filter((x) => x > property).length / theirs.length
          : 0)
      );
    }, 0);
  const top = offered[offered.length - 1] ?? 0;
  let best = hand[index];
  let bestScore = -Infinity;
  for (const i of [index - 1, index, index + 1]) {
    if (i < 0 || i >= hand.length) continue;
    const property = hand[i];
    const expectedRank = beatChance(property);
    const sortedDesc = [...offered].sort((a, b) => b - a);
    const expected =
      sortedDesc[Math.min(sortedDesc.length - 1, Math.round(expectedRank))] ??
      0;
    const score =
      expected -
      0.55 * propertyValue(property) +
      (expectedRank < 0.5 ? top * 0.1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = property;
    }
  }
  return best;
}
