import { Maxn, MaxnOpts, Node } from "minimaxer";
import type { NodeType, SearchMethod } from "minimaxer";
import { LootCards, RazziaGameState, RazziaPlayerState } from "../types";
import {
  bid,
  biddableMoney,
  canCallAuction,
  canPass,
  canReveal,
  canUseThief,
  finalPoints,
  getActivePlayer,
  getPlayerIndex,
  isAuction,
  pass,
  roundPoints,
} from "./rules";

/*
 * Bot decision making for Razzia!.
 *
 * Auctions are searched with minimaxer's Maxn (multiplayer minimax): each
 * node is a bid or a pass, and the auction resolving is a leaf. The rules
 * module itself drives the simulation, so the search cannot drift from the
 * real game. The action phase (reveal, call an auction, use a thief) hides
 * a shuffled deck behind every reveal, so it is decided by a heuristic
 * built on the same evaluation.
 */

export type BotMove =
  | { type: "reveal" }
  | { type: "auction" }
  | { type: "thief"; cards: LootCards[] }
  | { type: "bid"; amount: string }
  | { type: "pass" };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 600;
export const DEFAULT_SEARCH_DEPTH = 8;
/** Money cards considered per bid decision: the lowest few that beat the table. */
const MAX_BID_CANDIDATES = 3;

/** Heuristic weights, in points. */
const AVAILABLE_MONEY_WEIGHT = 0.35;
const TOTAL_MONEY_WEIGHT = 0.15;
const BUSINESS_FUTURE_WEIGHT = 0.6;
/** Loot worth at least this much makes the bot call an auction early in the round. */
const CALL_THRESHOLD = 7;
/** Police cards in the full deck; the bot counts them like a player would. */
const POLICE_IN_DECK = 21;

/**
 * What a card-counting player knows about the next card: nothing about its
 * order, only the deck's composition minus everything revealed so far.
 */
export function policeOdds(gameState: RazziaGameState) {
  const revealed = (gameState.public.revealedCounts || {}).POLICE_RAIDS || 0;
  const policeLeft = Math.max(0, POLICE_IN_DECK - revealed);
  const cardsLeft = gameState.public.remainingCards;
  return {
    policeLeft,
    cardsLeft,
    probability: cardsLeft > 0 ? policeLeft / cardsLeft : 0,
  };
}

const sum = (money: string[] | undefined) =>
  (money || []).reduce((total, m) => total + Number(m), 0);

/** Cheap copy for search: the deck and log are not needed to play out an auction. */
export function cloneForSearch(gameState: RazziaGameState): RazziaGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { deck: [], log: [] },
  };
}

/** One score per player, higher is better. */
export function evaluate(gameState: RazziaGameState): number[] {
  const players = gameState.public.players;
  return players.map((player) => {
    const round = Object.values(roundPoints(player, players)).reduce(
      (a, b) => a + b,
      0,
    );
    const business = finalPoints(player, players).businesses || 0;
    return (
      (player.score || 0) +
      round +
      business * BUSINESS_FUTURE_WEIGHT +
      sum(player.availableMoney) * AVAILABLE_MONEY_WEIGHT +
      sum(player.money) * TOTAL_MONEY_WEIGHT
    );
  });
}

/** How much more the player would be worth if they won the table now. */
export function lootValueFor(gameState: RazziaGameState, email: string) {
  const index = getPlayerIndex(gameState, email);
  const before = evaluate(gameState)[index];
  const after = cloneForSearch(gameState);
  const player = after.public.players[index];
  for (const card of after.public.revealedCards || []) {
    // Mirrors addCardToPlayer without importing the DB-aware helpers.
    const category = categoryFor(card);
    if (category) {
      player.cards[category] = [...(player.cards[category] || []), card];
    }
  }
  return evaluate(after)[index] - before;
}

function categoryFor(card: LootCards) {
  switch (card) {
    case "SCARAB":
    case "CROSS":
    case "BRACELET":
    case "TIARA":
    case "RING":
      return "jewels" as const;
    case "BODYGUARDS":
      return "bodyguards" as const;
    case "COINS":
      return "coins" as const;
    case "THIEF":
      return "theives" as const;
    case "CARS":
      return "cars" as const;
    case "DRIVERS":
      return "drivers" as const;
    case "POLICE_RAIDS":
      return null;
    default:
      return "businesses" as const;
  }
}

/** Bids and passes available to the player to move, cheapest bids first. */
export function auctionMoves(gameState: RazziaGameState): BotMove[] {
  const player = getActivePlayer(gameState);
  if (!player) return [{ type: "pass" }];
  const bids = biddableMoney(gameState, player)
    .sort((a, b) => Number(a) - Number(b))
    .slice(0, MAX_BID_CANDIDATES)
    .map((amount): BotMove => ({ type: "bid", amount }));
  const moves: BotMove[] = [...bids];
  if (canPass(gameState, player)) moves.push({ type: "pass" });
  return moves;
}

export function applyAuctionMove(
  gameState: RazziaGameState,
  move: BotMove,
): RazziaGameState {
  const next = cloneForSearch(gameState);
  if (move.type === "bid") bid(next, move.amount);
  else if (move.type === "pass") pass(next);
  return next;
}

type SearchNode = Node<RazziaGameState, BotMove, number>;

export type SearchOptions = { timeoutMs?: number; depth?: number };

/** Maxn over the current auction from the active player's point of view. */
export function searchAuctionMove(
  gameState: RazziaGameState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BotMove {
  const moves = auctionMoves(gameState);
  if (moves.length === 1) return moves[0];

  const rootState = cloneForSearch(gameState);
  const root: SearchNode = new Node(NODE_ROOT, rootState, { type: "pass" }, 0);
  root.activePlayer = getPlayerIndex(rootState, rootState.public.activePlayer);

  const opts = new MaxnOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;

  const tree = new Maxn<RazziaGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => auctionMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyAuctionMove(parent.gamestate, move);
    const resolved = !isAuction(next) || next.public.status === "GAME_OVER";
    const child: SearchNode = new Node(
      resolved ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
    );
    child.activePlayer = Math.max(
      0,
      getPlayerIndex(next, next.public.activePlayer),
    );
    return child;
  };
  tree.getScores = (node) => {
    node.scores = evaluate(node.gamestate);
  };

  const result = tree.evaluate();
  return result.move ?? { type: "pass" };
}

/** Best single card to steal with a thief, if any is worth it. */
export function bestThiefTarget(
  gameState: RazziaGameState,
  player: RazziaPlayerState,
): LootCards | null {
  const index = getPlayerIndex(gameState, player.email);
  const before = evaluate(gameState)[index];
  let best: LootCards | null = null;
  // The evaluation already charges the 2 points an unused thief is worth.
  let bestGain = 0.5;
  for (const card of new Set(gameState.public.revealedCards || [])) {
    if (card === "THIEF" || card === "POLICE_RAIDS") continue;
    const after = cloneForSearch(gameState);
    const me = after.public.players[index];
    const category = categoryFor(card);
    if (!category) continue;
    me.cards[category] = [...(me.cards[category] || []), card];
    me.cards.theives = (me.cards.theives || []).slice(1);
    const gain = evaluate(after)[index] - before;
    if (gain > bestGain) {
      bestGain = gain;
      best = card;
    }
  }
  return best;
}

/** Reveal, call an auction, or use a thief. */
export function chooseActionMove(gameState: RazziaGameState): BotMove {
  const player = getActivePlayer(gameState);
  if (!player) return { type: "reveal" };

  if (canUseThief(gameState, player)) {
    const target = bestThiefTarget(gameState, player);
    if (target) return { type: "thief", cards: [target] };
  }

  const reveal = canReveal(gameState);
  const call = canCallAuction(gameState);
  if (!reveal) return { type: "auction" };
  if (!call) return { type: "reveal" };

  // Revealing risks a police raid: a forced auction now, or with the last
  // raid the loss of everything on the table. The likelier that is, and the
  // nearer the round's end, the sooner it is worth cashing in the table.
  const raidsLeft = gameState.public.raidLimit - gameState.public.policeRaids;
  const { probability } = policeOdds(gameState);
  const endRisk = raidsLeft === 1 ? 1 : raidsLeft === 2 ? 0.4 : 0.15;
  const value = lootValueFor(gameState, player.email);
  const threshold = Math.max(
    1.5,
    CALL_THRESHOLD - 10 * probability - 4 * endRisk,
  );
  const canAfford = biddableMoney(gameState, player).length > 0;

  // With the final raid looming, the expected loss from one more reveal is
  // the table's value times the raid chance; call when that outweighs the
  // modest gain of another card.
  const expectedLoss = raidsLeft === 1 ? value * probability : 0;

  return (value >= threshold || expectedLoss > 1.5) && canAfford
    ? { type: "auction" }
    : { type: "reveal" };
}

export function chooseBotMove(
  gameState: RazziaGameState,
  options?: SearchOptions,
): BotMove {
  if (isAuction(gameState)) return searchAuctionMove(gameState, options);
  return chooseActionMove(gameState);
}
