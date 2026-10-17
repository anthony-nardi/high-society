import {
  ChipCounts,
  ChipValue,
  CHIP_VALUES,
  FamilyIncGameState,
} from "../types";
import {
  chipPoints,
  count,
  DIAMOND_SCORE,
  DIAMONDS_TO_SCORE,
  getActivePlayer,
  heldValues,
  pileSize,
  WIN_SCORE,
} from "./rules";

/*
 * Bot decision making for Family Inc.
 *
 * A turn is a push-your-luck decision against a face-down pile, so the
 * right search is expectimax: at each step the bot compares stopping with
 * the expected value of one more draw, where the draw is a chance node
 * weighted by what is still in the pile. The pile's composition is public
 * knowledge (every chip ever drawn is on the table or gone), so the bot
 * knows exactly what a counting player knows and nothing more. Opponents
 * enter through the value of a stop: chips stolen now, and the risk that
 * what the bot keeps is stolen before it can bank them.
 */

export type BotMove = "draw" | "stop";

export const DEFAULT_SEARCH_DEPTH = 5;

/** Marginal value of one more diamond, by how many are already held. */
const DIAMOND_VALUE = [12, 20, DIAMOND_SCORE];
const WIN_BONUS = 100;
/** Roughly how many chips an opponent draws in a turn and how often they stop. */
const OPPONENT_DRAWS = 3;
const OPPONENT_STOP_RATE = 0.7;

type Search = {
  pile: ChipCounts;
  opponentsHeld: ChipCounts[];
  score: number;
  diamonds: number;
  opponents: number;
};

/** Chance a chip of this value survives in front of the bot until its next turn. */
function survival(value: ChipValue, ctx: Search) {
  const total = pileSize(ctx.pile);
  if (total === 0) return 1;
  const p = count(ctx.pile, value) / total;
  const perOpponent =
    (1 - Math.pow(1 - p, OPPONENT_DRAWS)) * OPPONENT_STOP_RATE;
  return Math.pow(1 - perOpponent, ctx.opponents);
}

/**
 * What stopping now is worth: kept chips and steals, discounted by the
 * chance they are stolen before banking, plus the win if banking them
 * would reach 100 (discounted the same way).
 */
function stopValue(held: ChipValue[], ctx: Search) {
  let nominal = 0;
  let expected = 0;
  for (const chip of held) {
    let n = 1;
    for (const other of ctx.opponentsHeld) n += count(other, chip);
    const points = n * Number(chip);
    nominal += points;
    expected += points * survival(chip, ctx);
  }
  if (nominal > 0 && ctx.score + nominal >= WIN_SCORE) {
    expected += WIN_BONUS * (expected / nominal);
  }
  return expected;
}

function bustValue(draws: number, ctx: Search) {
  if (draws > 3) return 0;
  const gained = DIAMOND_VALUE[Math.min(ctx.diamonds, DIAMONDS_TO_SCORE - 1)];
  if (
    ctx.diamonds === DIAMONDS_TO_SCORE - 1 &&
    ctx.score + DIAMOND_SCORE >= WIN_SCORE
  ) {
    return gained + WIN_BONUS;
  }
  return gained;
}

/** Best achievable value from here, with `held` drawn so far this turn. */
function search(
  held: ChipValue[],
  pile: ChipCounts,
  depth: number,
  ctx: Search,
  memo: Map<string, number>,
): number {
  const key = `${held.join(",")}|${depth}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const stop = held.length === 0 ? -Infinity : stopValue(held, ctx);
  const total = pileSize(pile);
  let result = stop;

  if (depth > 0 && total > 0) {
    let drawValue = 0;
    for (const value of CHIP_VALUES) {
      const n = count(pile, value);
      if (!n) continue;
      const p = n / total;
      if (held.includes(value)) {
        drawValue += p * bustValue(held.length + 1, ctx);
      } else {
        const nextPile = { ...pile, [value]: n - 1 };
        drawValue +=
          p * search([...held, value], nextPile, depth - 1, ctx, memo);
      }
    }
    result = Math.max(stop, drawValue);
  }

  memo.set(key, result);
  return result;
}

export function expectedValues(
  gameState: FamilyIncGameState,
  depth = DEFAULT_SEARCH_DEPTH,
) {
  const player = getActivePlayer(gameState);
  if (!player) return { stop: 0, draw: 0 };
  const ctx: Search = {
    pile: gameState.public.pile,
    opponentsHeld: gameState.public.players
      .filter((p) => p.email !== player.email)
      .map((p) => p.held || {}),
    score: player.score + 0,
    diamonds: player.diamonds,
    opponents: gameState.public.players.length - 1,
  };
  const held = heldValues(player.held);
  const memo = new Map<string, number>();
  const stop = held.length === 0 ? -Infinity : stopValue(held, ctx);

  // Value of exactly one more draw, then playing on optimally.
  const total = pileSize(ctx.pile);
  let draw = 0;
  for (const value of CHIP_VALUES) {
    const n = count(ctx.pile, value);
    if (!n) continue;
    const p = n / total;
    if (held.includes(value)) {
      draw += p * bustValue(held.length + 1, ctx);
    } else {
      const nextPile = { ...ctx.pile, [value]: n - 1 };
      draw += p * search([...held, value], nextPile, depth - 1, ctx, memo);
    }
  }
  return { stop, draw, kept: chipPoints(player.held) };
}

export function chooseBotMove(
  gameState: FamilyIncGameState,
  depth = DEFAULT_SEARCH_DEPTH,
): BotMove {
  const { stop, draw } = expectedValues(gameState, depth);
  return stop >= draw ? "stop" : "draw";
}
