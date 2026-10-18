import { Link, Side, TwixtGameState } from "../types";
import {
  borders,
  colOf,
  crosses,
  HOLES,
  inBorder,
  isHole,
  linkOf,
  other,
  reach,
  rowOf,
  SIZE,
} from "./board";
import {
  getActivePlayer,
  linksOf,
  pegAt,
  placePeg,
  placementProblem,
  swapSides,
} from "./rules";

/*
 * The bot's judgement: how many more pegs each side needs to join its
 * borders, found by a shortest path over knight's moves that honours
 * existing links and the crossings they forbid. A move is scored by the
 * gap between the two, two plies deep over the most promising holes.
 */

export type BotMove = { kind: "peg"; hole: number } | { kind: "swap" };

export function turnMoves(gameState: TwixtGameState): BotMove[] {
  if (gameState.public.status !== "IN_PROGRESS") return [];
  const player = getActivePlayer(gameState);
  if (!player) return [];
  const out: BotMove[] = [];
  if (gameState.public.moves === 1 && !gameState.public.swapOffered)
    out.push({ kind: "swap" });
  for (let h = 0; h < HOLES; h++)
    if (!placementProblem(gameState, player.side, h))
      out.push({ kind: "peg", hole: h });
  return out;
}

export function applyMove(gameState: TwixtGameState, move: BotMove) {
  return move.kind === "swap"
    ? swapSides(gameState)
    : placePeg(gameState, move.hole);
}

/** Knight's-move edges a set of links forbids, as "a-b" keys with a < b. */
function blockedEdges(links: Link[]): Set<string> {
  const blocked = new Set<string>();
  for (const link of links) {
    const [a, b] = link;
    const c0 = Math.min(colOf(a), colOf(b)) - 2;
    const c1 = Math.max(colOf(a), colOf(b)) + 2;
    const r0 = Math.min(rowOf(a), rowOf(b)) - 2;
    const r1 = Math.max(rowOf(a), rowOf(b)) + 2;
    for (let r = Math.max(0, r0); r <= Math.min(SIZE - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(SIZE - 1, c1); c++) {
        const h = r * SIZE + c;
        if (!isHole(h)) continue;
        for (const n of reach(h)) {
          if (n < h) continue;
          const edge: Link = [h, n];
          if (crosses(link, edge)) blocked.add(`${h}-${n}`);
        }
      }
  }
  return blocked;
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/**
 * Pegs a side still needs to join its borders: a shortest path where own
 * pegs cost nothing, empty holes one, and the other side's pegs, their
 * borders and crossed links are impassable. Infinity when cut off.
 */
export function distance(
  gameState: TwixtGameState,
  side: Side,
  blocked: Set<string> = blockedEdges(linksOf(gameState)),
): number {
  const pegs = gameState.public.pegs || {};
  const linked = new Set(linksOf(gameState).map(([a, b]) => `${a}-${b}`));
  const cost = (h: number) => {
    const p = pegs[String(h)];
    if (p === side) return 0;
    if (p) return Infinity;
    if (inBorder(h, other(side))) return Infinity;
    return 1;
  };
  const [from, to] = borders(side);
  const goal = new Set(to);
  const dist = new Map<number, number>();
  // A tiny bucket queue: costs are 0 or 1.
  const buckets: number[][] = [[]];
  for (const h of from) {
    const c = cost(h);
    if (c === Infinity) continue;
    dist.set(h, c);
    (buckets[c] ||= []).push(h);
  }
  for (let d = 0; d < buckets.length; d++) {
    const bucket = buckets[d] || [];
    for (let i = 0; i < bucket.length; i++) {
      const h = bucket[i];
      if (dist.get(h) !== d) continue;
      if (goal.has(h)) return d;
      const here = pegs[String(h)] === side;
      for (const n of reach(h)) {
        const c = cost(n);
        if (c === Infinity) continue;
        const key = edgeKey(h, n);
        // An edge between two own pegs is free only if already linked; others must not cross a link.
        if (!linked.has(key) && blocked.has(key)) continue;
        if (!linked.has(key) && here && pegs[String(n)] === side) continue;
        const nd = d + c;
        if (nd < (dist.get(n) ?? Infinity)) {
          dist.set(n, nd);
          (buckets[nd] ||= []).push(n);
        }
      }
    }
  }
  return Infinity;
}

function evaluate(gameState: TwixtGameState, me: Side) {
  if (gameState.public.status === "GAME_OVER") {
    const winner = gameState.public.players.find(
      (p) => p.email === gameState.public.winner,
    );
    if (!winner) return 0;
    return winner.side === me ? 1000 : -1000;
  }
  const blocked = blockedEdges(linksOf(gameState));
  const mine = distance(gameState, me, blocked);
  const theirs = distance(gameState, other(me), blocked);
  if (mine === Infinity && theirs === Infinity) return 0;
  if (mine === Infinity) return -500;
  if (theirs === Infinity) return 500;
  return (theirs - mine) * 10;
}

function clone(gameState: TwixtGameState): TwixtGameState {
  return JSON.parse(JSON.stringify(gameState)) as TwixtGameState;
}

/** Holes worth considering: near any peg, or in the middle when the board is bare. */
function candidates(gameState: TwixtGameState, side: Side): number[] {
  const pegs = gameState.public.pegs || {};
  const near = new Set<number>();
  for (const key of Object.keys(pegs)) {
    const h = Number(key);
    for (const n of reach(h)) {
      near.add(n);
      for (const m of reach(n)) near.add(m);
    }
  }
  if (!near.size) {
    const mid = SIZE / 2;
    for (let r = mid - 3; r < mid + 3; r++)
      for (let c = mid - 3; c < mid + 3; c++) near.add(r * SIZE + c);
  }
  return [...near].filter((h) => !placementProblem(gameState, side, h));
}

function scored(
  gameState: TwixtGameState,
  side: Side,
  me: Side,
  limit: number,
) {
  const trials = candidates(gameState, side).map((hole) => {
    const trial = clone(gameState);
    placePeg(trial, hole);
    return { hole, trial, value: evaluate(trial, me) };
  });
  // The mover wants the value high when they are me, low otherwise.
  trials.sort((a, b) => (side === me ? b.value - a.value : a.value - b.value));
  return trials.slice(0, limit);
}

/** The best move for the active bot. */
export function chooseBotMove(gameState: TwixtGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  const me = player.side;
  const pub = gameState.public;
  // The swap: take Red when the first peg sits near the middle.
  if (pub.moves === 1 && !pub.swapOffered) {
    const first = Number(Object.keys(pub.pegs || {})[0]);
    const dc = Math.abs(colOf(first) - (SIZE - 1) / 2);
    const dr = Math.abs(rowOf(first) - (SIZE - 1) / 2);
    if (dc + dr < 9) return { kind: "swap" };
  }
  const mine = scored(gameState, me, me, 10);
  if (!mine.length) return null;
  let best = mine[0];
  let bestValue = -Infinity;
  for (const candidate of mine) {
    if (candidate.trial.public.status === "GAME_OVER")
      return { kind: "peg", hole: candidate.hole };
    const replies = scored(candidate.trial, other(me), me, 8);
    const value = replies.length ? replies[0].value : candidate.value;
    if (value > bestValue) {
      bestValue = value;
      best = candidate;
    }
  }
  return { kind: "peg", hole: best.hole };
}

export { pegAt, linkOf };
