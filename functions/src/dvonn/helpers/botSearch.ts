import { Negamax, NegamaxOpts, Node } from "minimaxer";
import type { NodeAim, NodeType, SearchMethod } from "minimaxer";
import { Coord, DvonnGameState, Side } from "../types";
import { ALL_SPACES, neighbours, parse } from "./board";
import {
  allMoves,
  getActivePlayer,
  hasDvonn,
  isEmpty,
  isGameOver,
  moveStack,
  placePiece,
  scores,
  stackAt,
  topOf,
} from "./rules";

/*
 * Bot decision making for DVONN: two players, perfect information, no
 * chance, so minimaxer's Negamax with alpha-beta pruning over stack moves.
 * The placement phase is played by a heuristic: 49 placements are too many
 * to search and the position only starts to matter once stacks move.
 */

export type BotMove =
  { kind: "place"; coord: Coord } | { kind: "move"; from: Coord; to: Coord };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const AIM_MAX = 1 as NodeAim;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 5;
const WIN_VALUE = 10000;

export function cloneForSearch(gameState: DvonnGameState): DvonnGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

export function applyMove(gameState: DvonnGameState, move: BotMove) {
  switch (move.kind) {
    case "place":
      return placePiece(gameState, move.coord);
    case "move":
      return moveStack(gameState, move.from, move.to);
  }
}

export function turnMoves(gameState: DvonnGameState): BotMove[] {
  if (isGameOver(gameState)) return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  if (gameState.public.phase === "PLACE") {
    return ALL_SPACES.filter((c) => isEmpty(gameState, c)).map((coord) => ({
      kind: "place",
      coord,
    }));
  }
  return allMoves(gameState, player.side).map(([from, to]) => ({
    kind: "move",
    from,
    to,
  }));
}

const CENTRE: [number, number] = [5, 2];

export function centrality(coord: Coord) {
  const [x, y] = parse(coord);
  const dx = x + y / 2 - (CENTRE[0] + CENTRE[1] / 2);
  const dy = (y - CENTRE[1]) * 0.866;
  return -Math.sqrt(dx * dx + dy * dy);
}

function dvonnSpaces(gameState: DvonnGameState): Coord[] {
  return Object.keys(gameState.public.stacks || {}).filter((c) =>
    hasDvonn(stackAt(gameState, c)),
  );
}

/**
 * Placement policy. DVONN pieces go near the middle but apart from each
 * other; own pieces hug the DVONN pieces and each other, because what is
 * next to a DVONN piece is the last thing to be cut off.
 */
export function placementScore(
  gameState: DvonnGameState,
  coord: Coord,
  side: Side,
  placingDvonn: boolean,
): number {
  const reds = dvonnSpaces(gameState);
  if (placingDvonn) {
    const spread = reds.reduce((s, r) => {
      const [ax, ay] = parse(r);
      const [bx, by] = parse(coord);
      return s + Math.hypot(ax + ay / 2 - (bx + by / 2), (ay - by) * 0.866);
    }, 0);
    return centrality(coord) * 1.5 + spread;
  }
  let score = centrality(coord) * 0.3;
  for (const n of neighbours(coord)) {
    const top = topOf(gameState, n);
    if (top === "DVONN") score += 3;
    else if (top === side) score += 1;
    else if (top) score -= 0.4;
  }
  return score;
}

/** Position value from `email`'s point of view. */
export function evaluate(gameState: DvonnGameState, email: string): number {
  const me = gameState.public.players.find((p) => p.email === email);
  const opp = gameState.public.players.find((p) => p.email !== email);
  if (!me || !opp) return 0;
  if (isGameOver(gameState)) {
    if (gameState.public.draw) return 0;
    return gameState.public.winner === email ? WIN_VALUE : -WIN_VALUE;
  }
  const totals = scores(gameState);
  const material = totals[me.side] - totals[opp.side];
  const myMobility = allMoves(gameState, me.side).length;
  const theirMobility = allMoves(gameState, opp.side).length;
  // Stacks that hold a DVONN piece can never be cut off: a safe bank.
  let safe = 0;
  for (const [coord, stack] of Object.entries(gameState.public.stacks || {})) {
    if (!hasDvonn(stack)) continue;
    const top = topOf(gameState, coord);
    if (top === me.side) safe += stack.length;
    else if (top === opp.side) safe -= stack.length;
  }
  return 3 * material + 0.6 * (myMobility - theirMobility) + 1.5 * safe;
}

export type SearchOptions = { timeoutMs?: number; depth?: number };

type SearchNode = Node<DvonnGameState, BotMove, number>;

export function chooseBotMove(
  gameState: DvonnGameState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BotMove | null {
  const moves = turnMoves(gameState);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const player = getActivePlayer(gameState);
  if (!player) return moves[0];

  if (gameState.public.phase === "PLACE") {
    const placingDvonn = player.dvonn > 0;
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      if (m.kind !== "place") continue;
      const s = placementScore(gameState, m.coord, player.side, placingDvonn);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

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

  const tree = new Negamax<DvonnGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = cloneForSearch(parent.gamestate);
    applyMove(next, move);
    // A forced pass keeps the same player to move, and so the same aim.
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
