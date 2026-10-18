import { ClansGameState, Colour } from "../types";
import {
  COLOURS,
  countHuts,
  EPOCHS,
  epochOf,
  FROZEN_AT,
  neighbours,
  terrainOf,
} from "./board";
import {
  appraise,
  getActivePlayer,
  hutsAt,
  isIsolated,
  legalMoves,
  Move,
  moveHuts,
  sizeAt,
  villagesFounded,
} from "./rules";

/*
 * The bot's judgement. Clans are secret, so the bot values a move by what
 * its own clan gains, what the other clans gain, and how well placed its
 * huts are afterwards, then looks one reply ahead with the strongest
 * replies the others could make against it.
 */

export type BotMove = Move;

export function turnMoves(gameState: ClansGameState): BotMove[] {
  if (gameState.public.status !== "IN_PROGRESS") return [];
  return legalMoves(gameState);
}

export function applyMove(gameState: ClansGameState, move: BotMove) {
  return moveHuts(gameState, move.from, move.to);
}

function clone(gameState: ClansGameState): ClansGameState {
  return JSON.parse(JSON.stringify(gameState)) as ClansGameState;
}

/** Points each colour would take from the villages a move founds. */
function villageGains(
  gameState: ClansGameState,
  move: Move,
): { [colour in Colour]?: number } {
  const gains: { [colour in Colour]?: number } = {};
  const trial = clone(gameState);
  const player = getActivePlayer(trial);
  if (!player) return gains;
  // Simulate without logging cost: apply the move and read the villages.
  const before = villagesFounded(trial);
  if (!moveHuts(trial, move.from, move.to).ok) return gains;
  for (const v of (trial.public.villages || []).slice(before))
    for (const c of v.colours) gains[c] = (gains[c] ?? 0) + v.points;
  return gains;
}

/** How promising the board is for a colour: huts in groups that can still be isolated on good ground. */
function placement(gameState: ClansGameState, colour: Colour) {
  const epoch = EPOCHS[epochOf(villagesFounded(gameState))];
  let score = 0;
  for (const key of Object.keys(gameState.public.huts || {})) {
    const t = Number(key);
    const huts = hutsAt(gameState, t);
    const mine = huts[colour] ?? 0;
    if (!mine) continue;
    const size = countHuts(huts);
    const terrain = terrainOf(t);
    const ground =
      epoch.forbidden === terrain ? 0.15 : epoch.favoured === terrain ? 1.3 : 1;
    const occupiedAround = neighbours(t).filter(
      (n) => sizeAt(gameState, n) > 0,
    ).length;
    const closeness = 1 / (1 + occupiedAround);
    const frozen = size >= FROZEN_AT ? 0.6 : 1;
    score += size * ground * closeness * frozen;
  }
  return score;
}

function evaluate(gameState: ClansGameState, me: Colour) {
  const others = COLOURS.filter((c) => c !== me);
  const track = gameState.public.scores;
  const rivals = Math.max(...others.map((c) => track[c]));
  return (
    track[me] -
    0.7 * rivals +
    0.8 * placement(gameState, me) -
    (0.25 * others.reduce((s, c) => s + placement(gameState, c), 0)) /
      others.length
  );
}

/** The best move for the active bot, or nothing when none is legal. */
export function chooseBotMove(gameState: ClansGameState): BotMove | null {
  const player = getActivePlayer(gameState);
  if (!player) return null;
  const me = player.colour;
  const moves = turnMoves(gameState);
  if (!moves.length) return null;

  // First pass: every move by its immediate outcome.
  const scored = moves.map((move) => {
    const trial = clone(gameState);
    moveHuts(trial, move.from, move.to);
    return { move, trial, value: evaluate(trial, me) };
  });
  scored.sort((a, b) => b.value - a.value);

  // Second pass: the strongest few, less the best reply against them.
  const top = scored.slice(0, 8);
  let best = top[0];
  let bestValue = -Infinity;
  for (const candidate of top) {
    const trial = candidate.trial;
    let worst = 0;
    if (trial.public.status === "IN_PROGRESS") {
      const replies = turnMoves(trial);
      // Only replies that found villages can hurt at once; rank by what they hand the other clans.
      for (const reply of replies.slice(0, 120)) {
        const gains = villageGains(trial, reply);
        const theirs = COLOURS.filter((c) => c !== me).reduce(
          (s, c) => Math.max(s, gains[c] ?? 0),
          0,
        );
        const mine = gains[me] ?? 0;
        worst = Math.max(worst, theirs - mine);
      }
    }
    const value = candidate.value - 0.6 * worst;
    if (value > bestValue) {
      bestValue = value;
      best = candidate;
    }
  }
  return best.move;
}

/** For tests: whether a move founds a village straight away. */
export function foundsVillage(gameState: ClansGameState, move: Move) {
  const trial = clone(gameState);
  const before = villagesFounded(trial);
  moveHuts(trial, move.from, move.to);
  return villagesFounded(trial) > before;
}

export { appraise, isIsolated };
