import { Maxn, MaxnOpts, Node } from "minimaxer";
import type { NodeType, SearchMethod } from "minimaxer";
import { NoThanksGameState } from "../types";

/*
 * Bot decision making for No Thanks! using minimaxer's Maxn search
 * (multiplayer minimax: every player maximises their own score).
 *
 * The search covers the current card only: chips go round the table until
 * somebody takes it, which is a leaf. The face-down deck is never read;
 * positions are scored by the real scoring rule plus a small bonus for
 * cards that could still extend a run.
 */

export type BotMove = "take" | "chip";

export type SimPlayer = {
  cards: number[];
  chips: number;
};

export type CardState = {
  players: SimPlayer[];
  /** Index into `players`. */
  activePlayer: number;
  card: number;
  chipsPlaced: number;
  /** Cards still to come after this one, used to value open run ends. */
  remainingCards: number;
  /** True once the card has been taken; nothing further is searched. */
  resolved: boolean;
};

// minimaxer declares its enums as `const enum`s, which cannot be referenced
// at runtime from compiled JavaScript, so the values are written out here.
const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const METHOD_TIME = 2 as SearchMethod;

export const LOWEST_CARD = 3;
export const HIGHEST_CARD = 35;
/** Cards dealt in a game: 33 minus the 9 removed. */
const CARDS_IN_PLAY = 24;

/** Heuristic weights, in points. */
const OPEN_END_BONUS = 2;
const CHIP_FLEXIBILITY = 0.15;

export const DEFAULT_SEARCH_TIMEOUT_MS = 600;
export const DEFAULT_SEARCH_DEPTH = 14;

/** Official scoring: each run counts its lowest card; chips are −1 each. */
export function cardPoints(cards: number[]) {
  const sorted = [...cards].sort((a, b) => a - b);
  let points = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i - 1] !== sorted[i] - 1) {
      points += sorted[i];
    }
  }
  return points;
}

export function toCardState(gameState: NoThanksGameState): CardState {
  const players = gameState.public.players.map((player) => ({
    cards: [...(player.cards || [])],
    chips: player.chips || 0,
  }));
  const activePlayer = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );

  return {
    players,
    activePlayer: Math.max(activePlayer, 0),
    card: gameState.public.activeCard || 0,
    chipsPlaced: gameState.public.chipsPlaced || 0,
    remainingCards: gameState.public.remainingCards,
    resolved: false,
  };
}

function cloneState(state: CardState): CardState {
  return {
    ...state,
    players: state.players.map((player) => ({
      cards: [...player.cards],
      chips: player.chips,
    })),
  };
}

/** Returns a new state with the move applied; the input is left untouched. */
export function applyMove(state: CardState, move: BotMove): CardState {
  const next = cloneState(state);
  const player = next.players[next.activePlayer];

  if (move === "chip") {
    player.chips -= 1;
    next.chipsPlaced += 1;
    next.activePlayer = (next.activePlayer + 1) % next.players.length;
    return next;
  }

  player.cards.push(next.card);
  player.chips += next.chipsPlaced;
  next.chipsPlaced = 0;
  next.resolved = true;
  return next;
}

/** Taking is always allowed; a chip needs a chip. Take is listed first. */
export function candidateMoves(state: CardState): BotMove[] {
  const player = state.players[state.activePlayer];
  return player.chips > 0 ? ["take", "chip"] : ["take"];
}

/**
 * One score per player, higher is better: the negative of the official
 * score, a small bonus for each run end that a card still in the deck
 * could extend, and a little extra for chips beyond their face value.
 *
 * Unresolved positions (search depth reached mid-round) are scored as if
 * the player to move takes the card now.
 */
export function evaluate(state: CardState): number[] {
  const settled = state.resolved ? state : applyMove(state, "take");
  const seen = new Set<number>();
  for (const player of settled.players) {
    for (const card of player.cards) seen.add(card);
  }
  if (!settled.resolved) seen.add(settled.card);
  const remainingFraction = Math.min(1, settled.remainingCards / CARDS_IN_PLAY);

  return settled.players.map((player) => {
    const held = new Set(player.cards);
    let openEnds = 0;
    for (const card of player.cards) {
      for (const neighbour of [card - 1, card + 1]) {
        if (
          neighbour >= LOWEST_CARD &&
          neighbour <= HIGHEST_CARD &&
          !seen.has(neighbour) &&
          !held.has(neighbour)
        ) {
          openEnds += 1;
        }
      }
    }
    const points = cardPoints(player.cards) - player.chips;
    return (
      -points +
      openEnds * OPEN_END_BONUS * remainingFraction +
      player.chips * CHIP_FLEXIBILITY
    );
  });
}

export type SearchOptions = {
  timeoutMs?: number;
  depth?: number;
};

type SearchNode = Node<CardState, BotMove, number>;

/** Runs a Maxn search from the state and returns the active player's best move. */
export function searchBestMove(
  state: CardState,
  { timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS, depth = DEFAULT_SEARCH_DEPTH }: SearchOptions = {}
): BotMove {
  if (candidateMoves(state).length === 1) {
    return "take";
  }

  const root: SearchNode = new Node(NODE_ROOT, state, "take", 0);
  root.activePlayer = state.activePlayer;

  const opts = new MaxnOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;

  const tree = new Maxn<CardState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => candidateMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyMove(parent.gamestate, move);
    const child: SearchNode = new Node(
      next.resolved ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0
    );
    child.activePlayer = next.activePlayer;
    return child;
  };
  tree.getScores = (node) => {
    node.scores = evaluate(node.gamestate);
  };

  const result = tree.evaluate();
  return result.move ?? "take";
}

/** Convenience wrapper working directly on the stored game state. */
export function chooseBotMove(
  gameState: NoThanksGameState,
  options?: SearchOptions
): BotMove {
  return searchBestMove(toCardState(gameState), options);
}
