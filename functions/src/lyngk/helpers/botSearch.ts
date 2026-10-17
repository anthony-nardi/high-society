import { Negamax, NegamaxOpts, Node } from "minimaxer";
import type { NodeAim, NodeType, SearchMethod } from "minimaxer";
import { Colour, Coord, LyngkGameState } from "../types";
import {
  allPaths,
  claimColour,
  claimerOf,
  CLAIMS_PER_PLAYER,
  getActivePlayer,
  isGameOver,
  moveStack,
  topOf,
  unclaimedColours,
} from "./rules";

/*
 * Bot decision making for LYNGK: two players, perfect information, no
 * chance after the deal, so minimaxer's Negamax with alpha-beta pruning.
 * A turn is an optional claim followed by a move, searched as one node.
 */

export type BotMove = { claim?: Colour; path: Coord[] };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const AIM_MAX = 1 as NodeAim;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 3;
const WIN_VALUE = 10000;

export function cloneForSearch(gameState: LyngkGameState): LyngkGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

export function applyMove(gameState: LyngkGameState, move: BotMove) {
  if (move.claim) {
    const claimed = claimColour(gameState, move.claim);
    if (!claimed.ok) return claimed;
  }
  return moveStack(gameState, move.path);
}

/** How many pieces of a colour sit on top of stacks: a rough measure of its usefulness. */
function colourPresence(gameState: LyngkGameState, colour: Colour) {
  let score = 0;
  for (const stack of Object.values(gameState.public.stacks || {})) {
    if (topOf(stack) === colour) score += stack.length;
  }
  return score;
}

/** Claims worth considering this turn: none, or the best couple of free colours. */
function claimOptions(gameState: LyngkGameState): (Colour | undefined)[] {
  const player = getActivePlayer(gameState);
  if (!player || player.claimedThisTurn) return [undefined];
  if ((player.colours?.length ?? 0) >= CLAIMS_PER_PLAYER) return [undefined];
  const free = unclaimedColours(gameState)
    .map((c) => [c, colourPresence(gameState, c)] as [Colour, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);
  return [undefined, ...free];
}

export function turnMoves(gameState: LyngkGameState): BotMove[] {
  if (isGameOver(gameState)) return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  const moves: BotMove[] = [];
  for (const claim of claimOptions(gameState)) {
    let state = gameState;
    if (claim) {
      state = cloneForSearch(gameState);
      claimColour(state, claim);
    }
    for (const path of allPaths(state, player.email)) {
      moves.push(claim ? { claim, path } : { path });
    }
  }
  return moves;
}

/** Position value from `email`'s point of view. */
export function evaluate(gameState: LyngkGameState, email: string): number {
  const me = gameState.public.players.find((p) => p.email === email);
  const opp = gameState.public.players.find((p) => p.email !== email);
  if (!me || !opp) return 0;
  if (isGameOver(gameState)) {
    if (gameState.public.draw) return 0;
    return gameState.public.winner === email ? WIN_VALUE : -WIN_VALUE;
  }
  const HEIGHT_VALUE = [0, 0.3, 1.2, 3, 8];
  let mine = 0;
  let theirs = 0;
  for (const stack of Object.values(gameState.public.stacks || {})) {
    const owner = claimerOf(gameState, topOf(stack));
    const value = HEIGHT_VALUE[Math.min(stack.length, 4)];
    if (owner === email) mine += value;
    else if (owner === opp.email) theirs += value;
  }
  const claims = (me.colours?.length ?? 0) - (opp.colours?.length ?? 0);
  return 40 * (me.scored - opp.scored) + (mine - theirs) + 2 * claims;
}

export type SearchOptions = { timeoutMs?: number; depth?: number };

type SearchNode = Node<LyngkGameState, BotMove, number>;

export function chooseBotMove(
  gameState: LyngkGameState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BotMove | null {
  const moves = turnMoves(gameState);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const bot = gameState.public.activePlayer;
  const root: SearchNode = new Node(
    NODE_ROOT,
    cloneForSearch(gameState),
    moves[0],
    0,
    AIM_MAX,
    moves,
  );

  const opts = new NegamaxOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;
  opts.pruning = 1;
  opts.presort = true;
  opts.genBased = true;
  opts.optimal = false;
  opts.pruneByPathLength = true;

  const tree = new Negamax<LyngkGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = cloneForSearch(parent.gamestate);
    applyMove(next, move);
    const sameMover =
      next.public.activePlayer === parent.gamestate.public.activePlayer;
    const child: SearchNode = new Node(
      isGameOver(next) ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
      (sameMover ? parent.aim : -parent.aim) as NodeAim,
    );
    return child;
  };
  tree.EvaluateNode = (node) => evaluate(node.gamestate, bot);

  const result = tree.evaluate();
  return result.move ?? moves[0];
}
