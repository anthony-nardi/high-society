import { Maxn, MaxnOpts, Node } from "minimaxer";
import type { NodeType, SearchMethod } from "minimaxer";
import { Master, ShangriLaGameState } from "../types";
import { MASTERS, neighbours, VILLAGES } from "./board";
import {
  getActivePlayer,
  isGameOver,
  journey,
  journeys,
  mastersOf,
  placeMaster,
  placements,
  placeSetupMaster,
  recruit,
  recruitable,
  scoreOf,
  strengthOf,
  tilesOf,
} from "./rules";

/*
 * Bot decision making for The Bridges of Shangri-La: three or four players,
 * perfect information, so minimaxer's Maxn search over whole turns. The
 * setup is played by a heuristic (spread out, prefer well-connected
 * villages), since the search gains little there.
 */

export type BotMove =
  | { kind: "setup"; village: number; type: Master }
  | { kind: "place"; village: number; type: Master }
  | { kind: "recruit"; picks: [number, Master][] }
  | { kind: "journey"; from: number; to: number };

const NODE_ROOT = 0 as NodeType;
const NODE_INNER = 1 as NodeType;
const NODE_LEAF = 2 as NodeType;
const METHOD_TIME = 2 as SearchMethod;

export const DEFAULT_SEARCH_TIMEOUT_MS = 1200;
export const DEFAULT_SEARCH_DEPTH = 3;

export function cloneForSearch(
  gameState: ShangriLaGameState,
): ShangriLaGameState {
  return {
    public: JSON.parse(JSON.stringify(gameState.public)),
    private: { log: [] },
  };
}

export function applyMove(gameState: ShangriLaGameState, move: BotMove) {
  switch (move.kind) {
    case "setup":
      return placeSetupMaster(gameState, move.village, move.type);
    case "place":
      return placeMaster(gameState, move.village, move.type);
    case "recruit":
      return recruit(gameState, move.picks);
    case "journey":
      return journey(gameState, move.from, move.to);
  }
}

function connectivity(gameState: ShangriLaGameState, village: number) {
  return neighbours(gameState.public.bridges || [], village).length;
}

/** Setup policy: well-connected villages, spread across the board, away from crowds. */
export function setupScore(
  gameState: ShangriLaGameState,
  email: string,
  village: number,
) {
  const v = gameState.public.villages[village];
  const centre =
    Math.hypot(VILLAGES[village].x - 50, VILLAGES[village].y - 50) / 50;
  return (
    connectivity(gameState, village) * 1.2 +
    (tilesOf(v, email) === 0 ? 2.5 : 0) -
    strengthOf(v) * 0.6 -
    centre * 1.5
  );
}

export function turnMoves(gameState: ShangriLaGameState): BotMove[] {
  if (isGameOver(gameState)) return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  const email = player.email;
  if (gameState.public.phase === "SETUP") {
    return placements(gameState, email).map(([village, type]) => ({
      kind: "setup",
      village,
      type,
    }));
  }
  const moves: BotMove[] = [];
  for (const [village, type] of placements(gameState, email))
    moves.push({ kind: "place", village, type });
  // Recruiting: up to two in one village, taking the disciplines in a fixed order.
  const byVillage = new Map<number, Master[]>();
  for (const [village, type] of recruitable(gameState, email)) {
    byVillage.set(village, [...(byVillage.get(village) || []), type]);
  }
  const singles: [number, Master][] = [];
  for (const [village, types] of byVillage) {
    if (types.length >= 2)
      moves.push({
        kind: "recruit",
        picks: [
          [village, types[0]],
          [village, types[1]],
        ],
      });
    else singles.push([village, types[0]]);
    if (types.length === 1) continue;
  }
  // Two lone masters in different villages can share a recruit action,
  // as long as the supply covers both when they are the same discipline.
  const canPair = (x: [number, Master], y: [number, Master]) =>
    x[1] !== y[1] || player.supply[x[1]] >= 2;
  if (singles.length >= 2 && canPair(singles[0], singles[1]))
    moves.push({ kind: "recruit", picks: [singles[0], singles[1]] });
  else if (singles.length >= 1)
    moves.push({ kind: "recruit", picks: [singles[0]] });
  for (const [from, to] of journeys(gameState, email))
    moves.push({ kind: "journey", from, to });
  return moves;
}

/** One score per player: masters above all, then villages held, then students ready to travel. */
export function evaluate(gameState: ShangriLaGameState): number[] {
  return gameState.public.players.map((p) => {
    const score = scoreOf(gameState, p.email);
    let students = 0;
    let threatened = 0;
    for (const village of gameState.public.villages) {
      if (village.stone) continue;
      for (const type of MASTERS) {
        const space = village.spaces?.[type];
        if (space?.owner !== p.email) continue;
        if (space.student) students += 1;
      }
      // Masters in a weak village next to a strong one are at risk.
      const mine = mastersOf(village, p.email);
      if (mine > 0) {
        const index = gameState.public.villages.indexOf(village);
        for (const n of neighbours(gameState.public.bridges || [], index)) {
          if (strengthOf(gameState.public.villages[n]) > strengthOf(village))
            threatened += 0.3 * mine;
        }
      }
    }
    return (
      10 * score.masters + 3 * score.villages + 1.5 * students - threatened
    );
  });
}

export type SearchOptions = { timeoutMs?: number; depth?: number };
type SearchNode = Node<ShangriLaGameState, BotMove, number>;

export function chooseBotMove(
  gameState: ShangriLaGameState,
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

  if (gameState.public.phase === "SETUP") {
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      if (m.kind !== "setup") continue;
      const s = setupScore(gameState, player.email, m.village);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  const activeIndex = gameState.public.players.findIndex(
    (p) => p.email === player.email,
  );
  const root: SearchNode = new Node(
    NODE_ROOT,
    cloneForSearch(gameState),
    moves[0],
    0,
  );
  root.activePlayer = activeIndex;

  const opts = new MaxnOpts();
  opts.method = METHOD_TIME;
  opts.timeout = timeoutMs;
  opts.depth = depth;

  const tree = new Maxn<ShangriLaGameState, BotMove, number>(root, opts);
  tree.GetMoves = (node) => turnMoves(node.gamestate);
  tree.CreateChildNode = (parent, move) => {
    const next = cloneForSearch(parent.gamestate);
    applyMove(next, move);
    const child: SearchNode = new Node(
      isGameOver(next) ? NODE_LEAF : NODE_INNER,
      next,
      move,
      0,
    );
    child.activePlayer = Math.max(
      0,
      next.public.players.findIndex(
        (p) => p.email === next.public.activePlayer,
      ),
    );
    return child;
  };
  tree.getScores = (node) => {
    node.scores = evaluate(node.gamestate);
  };
  const result = tree.evaluate();
  return result.move ?? moves[0];
}
