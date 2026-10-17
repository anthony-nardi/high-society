import { Negamax, NegamaxOpts, Node } from "minimaxer";
import type { NodeAim, NodeType, SearchMethod } from "minimaxer";
import { Coord, Side, YinshGameState } from "../types";
import { ALL_POINTS, LINES, parse } from "./board";
import {
  allMoves,
  getActivePlayer,
  isEmpty,
  isGameOver,
  markerAt,
  moveRing,
  placeRing,
  removeRing,
  removeRow,
  ringsOf,
  rowWindows,
} from "./rules";

/*
 * Bot decision making for YINSH: two players, perfect information, no
 * chance, so minimaxer's Negamax with alpha-beta pruning over ring moves.
 * Row and ring removals inside the search are resolved with a fixed policy
 * (first window, the ring with the fewest moves), which keeps the tree to
 * one node per ring move.
 */

export type BotMove =
  | { kind: "place"; coord: Coord }
  | { kind: "move"; from: Coord; to: Coord }
  | { kind: "row"; from: Coord; to: Coord }
  | { kind: "ring"; coord: Coord };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const AIM_MAX = 1 as NodeAim;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 6;
const WIN_VALUE = 10000;

export function cloneForSearch(gameState: YinshGameState): YinshGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

/** Deterministic choices for the removal phases, used by the search and as the bot's own policy. */
export function removalChoice(gameState: YinshGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  if (gameState.public.phase === "REMOVE_ROW") {
    const [from, to] = rowWindows(gameState, player.side)[0] || [];
    return from ? { kind: "row", from, to } : null;
  }
  if (gameState.public.phase === "REMOVE_RING") {
    // Give up the ring with the least to do.
    const rings = ringsOf(gameState, player.side);
    let best = rings[0];
    let fewest = Infinity;
    for (const coord of rings) {
      const n = allMoves(gameState, player.side).filter(
        ([from]) => from === coord,
      ).length;
      if (n < fewest) {
        fewest = n;
        best = coord;
      }
    }
    return best ? { kind: "ring", coord: best } : null;
  }
  return null;
}

export function applyMove(gameState: YinshGameState, move: BotMove) {
  switch (move.kind) {
    case "place":
      return placeRing(gameState, move.coord);
    case "move":
      return moveRing(gameState, move.from, move.to);
    case "row":
      return removeRow(gameState, move.from, move.to);
    case "ring":
      return removeRing(gameState, move.coord);
  }
}

/** Plays out any pending removals with the fixed policy until someone must move a ring. */
export function settle(gameState: YinshGameState) {
  let guard = 12;
  while (
    !isGameOver(gameState) &&
    gameState.public.phase !== "MOVE_RING" &&
    guard-- > 0
  ) {
    const choice = removalChoice(gameState);
    if (!choice) break;
    applyMove(gameState, choice);
  }
}

/** A ring move followed by all forced removals, on a fresh copy. */
export function applyTurn(
  gameState: YinshGameState,
  move: BotMove,
): YinshGameState {
  const next = cloneForSearch(gameState);
  applyMove(next, move);
  settle(next);
  return next;
}

export function turnMoves(gameState: YinshGameState): BotMove[] {
  if (isGameOver(gameState)) return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  if (gameState.public.phase === "PLACE_RINGS") {
    return ALL_POINTS.filter((c) => isEmpty(gameState, c)).map((coord) => ({
      kind: "place",
      coord,
    }));
  }
  if (gameState.public.phase !== "MOVE_RING") {
    const choice = removalChoice(gameState);
    return choice ? [choice] : [];
  }
  return allMoves(gameState, player.side).map(([from, to]) => ({
    kind: "move",
    from,
    to,
  }));
}

const CENTRE: [number, number] = [5, 5];

function centrality(coord: Coord) {
  const [x, y] = parse(coord);
  // Distance on the skewed grid, roughly.
  const dx = x + y / 2 - (CENTRE[0] + CENTRE[1] / 2);
  const dy = (y - CENTRE[1]) * 0.866;
  return -Math.sqrt(dx * dx + dy * dy);
}

/** Longest runs of a side's markers per line, rewarding fours and threes. */
function rowPotential(gameState: YinshGameState, side: Side) {
  let score = 0;
  for (const line of LINES) {
    let run = 0;
    for (const coord of line) {
      if (markerAt(gameState, coord) === side) {
        run++;
      } else {
        score += run >= 4 ? 12 : run === 3 ? 3 : run === 2 ? 0.5 : 0;
        run = 0;
      }
    }
    score += run >= 4 ? 12 : run === 3 ? 3 : run === 2 ? 0.5 : 0;
  }
  return score;
}

/** Position value from `email`'s point of view. */
export function evaluate(gameState: YinshGameState, email: string): number {
  const me = gameState.public.players.find((p) => p.email === email);
  const opp = gameState.public.players.find((p) => p.email !== email);
  if (!me || !opp) return 0;
  if (isGameOver(gameState)) {
    if (gameState.public.draw) return 0;
    return gameState.public.winner === email ? WIN_VALUE : -WIN_VALUE;
  }
  const markers = Object.values(gameState.public.markers || {});
  const mine = markers.filter((s) => s === me.side).length;
  const theirs = markers.length - mine;
  const myMobility = allMoves(gameState, me.side).length;
  const theirMobility = allMoves(gameState, opp.side).length;
  const myCentre = ringsOf(gameState, me.side).reduce(
    (s, c) => s + centrality(c),
    0,
  );
  const theirCentre = ringsOf(gameState, opp.side).reduce(
    (s, c) => s + centrality(c),
    0,
  );

  return (
    1000 * (me.scored - opp.scored) +
    1.5 * (mine - theirs) +
    (rowPotential(gameState, me.side) - rowPotential(gameState, opp.side)) +
    0.4 * (myMobility - theirMobility) +
    0.6 * (myCentre - theirCentre)
  );
}

export type SearchOptions = { timeoutMs?: number; depth?: number };

type SearchNode = Node<YinshGameState, BotMove, number>;

export function chooseBotMove(
  gameState: YinshGameState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): BotMove | null {
  const moves = turnMoves(gameState);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  if (gameState.public.phase === "PLACE_RINGS") {
    // Rings near the middle have the most lines through them.
    return moves.reduce((best, m) =>
      m.kind === "place" &&
      best.kind === "place" &&
      centrality(m.coord) > centrality(best.coord)
        ? m
        : best,
    );
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

  const tree = new Negamax<YinshGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyTurn(parent.gamestate, move);
    // Whose turn it is after settling decides the aim; a pass keeps it.
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
