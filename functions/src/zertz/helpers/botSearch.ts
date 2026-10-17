import { Negamax, NegamaxOpts, Node } from "minimaxer";
import type { NodeAim, NodeType, SearchMethod } from "minimaxer";
import { Colour, COLOURS, Coord, ZertzGameState } from "../types";
import {
  capture,
  captures,
  count,
  getActivePlayer,
  isGameOver,
  jumpsFrom,
  place,
  placeableColours,
  removableRings,
  removeRing,
  vacantRings,
  WIN_OF_EACH,
  WIN_OF_ONE,
} from "./rules";

/*
 * Bot decision making for ZÈRTZ: a deterministic two-player game of perfect
 * information, so minimaxer's Negamax with alpha-beta pruning is the right
 * tool. A search move is a whole turn (a placement with its ring removal, or
 * a full capture chain), simulated with the same rules functions the real
 * game uses.
 */

export type TurnMove =
  | { kind: "place"; colour: Colour; to: Coord; remove: Coord | null }
  | { kind: "capture"; jumps: [Coord, Coord][] };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const AIM_MAX = 1 as NodeAim;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 6;
/** Ring removals considered per placement besides any that isolate marbles. */
const PLAIN_REMOVALS = 2;

const WIN_VALUE = 1000;
const MARBLE_WEIGHT: { [colour in Colour]: number } = {
  WHITE: 1.6,
  GRAY: 1.25,
  BLACK: 1,
};

/** Cheap copy for search: the log is not needed to play out a turn. */
export function cloneForSearch(gameState: ZertzGameState): ZertzGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

/** Applies a whole turn to a fresh copy. */
export function applyTurn(
  gameState: ZertzGameState,
  move: TurnMove,
): ZertzGameState {
  const next = cloneForSearch(gameState);
  if (move.kind === "place") {
    place(next, move.colour, move.to);
    if (move.remove && next.public.phase === "REMOVE_RING")
      removeRing(next, move.remove);
  } else {
    for (const [from, to] of move.jumps) {
      if (!capture(next, from, to).ok) break;
      if (next.public.phase !== "CONTINUE_CAPTURE") break;
    }
  }
  return next;
}

function captureChains(
  gameState: ZertzGameState,
  from: Coord,
  soFar: [Coord, Coord][],
): TurnMove[] {
  const landings = jumpsFrom(gameState, from);
  if (landings.length === 0)
    return soFar.length ? [{ kind: "capture", jumps: soFar }] : [];
  const chains: TurnMove[] = [];
  for (const to of landings) {
    const next = cloneForSearch(gameState);
    capture(next, from, to);
    const jumps: [Coord, Coord][] = [...soFar, [from, to]];
    if (!isGameOver(next) && next.public.phase === "CONTINUE_CAPTURE") {
      chains.push(...captureChains(next, to, jumps));
    } else {
      chains.push({ kind: "capture", jumps });
    }
  }
  return chains;
}

/** Every whole-turn move for the player to move, captures first. */
export function turnMoves(gameState: ZertzGameState): TurnMove[] {
  if (isGameOver(gameState)) return [];
  const phase = gameState.public.phase;

  if (phase === "CONTINUE_CAPTURE" && gameState.public.capturingAt) {
    return captureChains(gameState, gameState.public.capturingAt, []);
  }
  if (phase === "REMOVE_RING") {
    // Only reachable mid-turn; treat each removal as the rest of the turn.
    return removableRings(gameState).map((remove) => ({
      kind: "place" as const,
      colour: "WHITE" as Colour,
      to: "",
      remove,
    }));
  }

  const jumpers = captures(gameState);
  if (jumpers.length) {
    return jumpers.flatMap((j) => captureChains(gameState, j.from, []));
  }

  const moves: TurnMove[] = [];
  const player = getActivePlayer(gameState);
  const before = player ? totalCaptured(player.captured) : 0;
  for (const colour of placeableColours(gameState)) {
    for (const to of vacantRings(gameState)) {
      const placed = cloneForSearch(gameState);
      place(placed, colour, to);
      if (placed.public.phase !== "REMOVE_RING") {
        moves.push({ kind: "place", colour, to, remove: null });
        continue;
      }
      const removals = removableRings(placed);
      let plain = 0;
      for (const remove of removals) {
        const after = cloneForSearch(placed);
        removeRing(after, remove);
        const mover = after.public.players.find(
          (p) => p.email === gameState.public.activePlayer,
        );
        const isolates = mover ? totalCaptured(mover.captured) > before : false;
        if (isolates || plain < PLAIN_REMOVALS) {
          moves.push({ kind: "place", colour, to, remove });
          if (!isolates) plain++;
        }
      }
    }
  }
  return moves;
}

function totalCaptured(captured: { [c in Colour]?: number } | undefined) {
  return COLOURS.reduce((sum, c) => sum + count(captured, c), 0);
}

/** How close a set of captures is to any winning condition, 0 to 1. */
export function winProgress(captured: { [c in Colour]?: number } | undefined) {
  const each = Math.min(
    ...COLOURS.map((c) => count(captured, c) / WIN_OF_EACH),
  );
  const single = Math.max(
    ...COLOURS.map((c) => count(captured, c) / WIN_OF_ONE[c]),
  );
  return Math.min(1, Math.max(each, single));
}

/** Position value from `email`'s point of view. */
export function evaluate(gameState: ZertzGameState, email: string): number {
  const me = gameState.public.players.find((p) => p.email === email);
  const opp = gameState.public.players.find((p) => p.email !== email);
  if (!me || !opp) return 0;
  if (isGameOver(gameState)) {
    return gameState.public.winner === email ? WIN_VALUE : -WIN_VALUE;
  }
  const material = (captured: { [c in Colour]?: number } | undefined) =>
    COLOURS.reduce((sum, c) => sum + count(captured, c) * MARBLE_WEIGHT[c], 0);

  let value =
    120 * (winProgress(me.captured) - winProgress(opp.captured)) +
    4 * (material(me.captured) - material(opp.captured));

  // Marbles the player to move can take next are nearly theirs already.
  const threats = captures(gameState).length;
  if (threats)
    value +=
      gameState.public.activePlayer === email ? 3 * threats : -3 * threats;
  return value;
}

export type SearchOptions = { timeoutMs?: number; depth?: number };

type SearchNode = Node<ZertzGameState, TurnMove, number>;

/** Picks the bot's whole turn with a time-limited, iteratively deepened negamax. */
export function chooseBotMove(
  gameState: ZertzGameState,
  {
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
    depth = DEFAULT_SEARCH_DEPTH,
  }: SearchOptions = {},
): TurnMove | null {
  const moves = turnMoves(gameState);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const bot = gameState.public.activePlayer;
  const rootState = cloneForSearch(gameState);
  const root: SearchNode = new Node(
    NODE_ROOT,
    rootState,
    moves[0],
    0,
    AIM_MAX,
    moves,
  );

  const opts = new NegamaxOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;
  opts.pruning = 1; // alpha-beta
  opts.presort = true;
  opts.genBased = true;
  opts.optimal = false;
  opts.pruneByPathLength = true;

  const tree = new Negamax<ZertzGameState, TurnMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = applyTurn(parent.gamestate, move);
    const child: SearchNode = new Node(
      isGameOver(next) ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
      -parent.aim as NodeAim,
    );
    return child;
  };
  tree.EvaluateNode = (node) => evaluate(node.gamestate, bot);

  const result = tree.evaluate();
  return result.move ?? moves[0];
}
