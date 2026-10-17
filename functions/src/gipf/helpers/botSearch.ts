import { Negamax, NegamaxOpts, Node } from "minimaxer";
import type { NodeAim, NodeType, SearchMethod } from "minimaxer";
import { Coord, GipfGameState, Side } from "../types";
import { LINES } from "./board";
import {
  getActivePlayer,
  isGameOver,
  legalPushes,
  pieceAt,
  piecesOf,
  pushPiece,
  removeRow,
  rowsFor,
} from "./rules";

/*
 * Bot decision making for GIPF: two players, perfect information, no
 * chance, so minimaxer's Negamax with alpha-beta pruning over pushes. The
 * choice between crossing rows is made by a fixed policy inside the search
 * (the row that captures most), which keeps the tree to one node per push.
 */

export type BotMove =
  { kind: "push"; dot: Coord; to: Coord } | { kind: "row"; coord: Coord };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const AIM_MAX = 1 as NodeAim;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 4;
const WIN_VALUE = 10000;

export function cloneForSearch(gameState: GipfGameState): GipfGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

/** Among crossing rows, the one that captures most (then returns most), named by a cell only it holds. */
export function rowChoice(gameState: GipfGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  const own = rowsFor(gameState, player.side);
  if (!own.length) return null;
  const value = (cells: Coord[]) =>
    cells.reduce(
      (s, c) => s + (pieceAt(gameState, c) === player.side ? 1 : 2.5),
      0,
    );
  const best = own.reduce((a, b) => (value(b.cells) > value(a.cells) ? b : a));
  const others = own.filter((r) => r !== best);
  const unique = best.cells.find(
    (c) => !others.some((r) => r.cells.includes(c)),
  );
  return unique ? { kind: "row", coord: unique } : null;
}

export function applyMove(gameState: GipfGameState, move: BotMove) {
  switch (move.kind) {
    case "push":
      return pushPiece(gameState, move.dot, move.to);
    case "row":
      return removeRow(gameState, move.coord);
  }
}

/** Plays out any pending row choices with the fixed policy until someone must push. */
export function settle(gameState: GipfGameState) {
  let guard = 12;
  while (
    !isGameOver(gameState) &&
    gameState.public.phase === "REMOVE_ROW" &&
    guard-- > 0
  ) {
    const choice = rowChoice(gameState);
    if (!choice) break;
    applyMove(gameState, choice);
  }
}

export function applyTurn(
  gameState: GipfGameState,
  move: BotMove,
): GipfGameState {
  const next = cloneForSearch(gameState);
  applyMove(next, move);
  settle(next);
  return next;
}

export function turnMoves(gameState: GipfGameState): BotMove[] {
  if (isGameOver(gameState)) return [];
  if (gameState.public.phase === "REMOVE_ROW") {
    const choice = rowChoice(gameState);
    return choice ? [choice] : [];
  }
  return legalPushes(gameState).map(([dot, to]) => ({ kind: "push", dot, to }));
}

/** Runs of three of a side with room to grow, per line. */
function threats(gameState: GipfGameState, side: Side) {
  let score = 0;
  for (const line of LINES) {
    let run = 0;
    for (const coord of line) {
      if (pieceAt(gameState, coord) === side) {
        run++;
      } else {
        if (run === 3) score += 1;
        if (run === 2) score += 0.2;
        run = 0;
      }
    }
    if (run === 3) score += 1;
    if (run === 2) score += 0.2;
  }
  return score;
}

/** Position value from `email`'s point of view. */
export function evaluate(gameState: GipfGameState, email: string): number {
  const me = gameState.public.players.find((p) => p.email === email);
  const opp = gameState.public.players.find((p) => p.email !== email);
  if (!me || !opp) return 0;
  if (isGameOver(gameState)) {
    return gameState.public.winner === email ? WIN_VALUE : -WIN_VALUE;
  }
  const myTotal = me.reserve + piecesOf(gameState, me.side);
  const theirTotal = opp.reserve + piecesOf(gameState, opp.side);
  return (
    6 * (me.reserve - opp.reserve) +
    4 * (myTotal - theirTotal) +
    1.5 * (threats(gameState, me.side) - threats(gameState, opp.side))
  );
}

export type SearchOptions = { timeoutMs?: number; depth?: number };

type SearchNode = Node<GipfGameState, BotMove, number>;

export function chooseBotMove(
  gameState: GipfGameState,
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

  const tree = new Negamax<GipfGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyTurn(parent.gamestate, move);
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
