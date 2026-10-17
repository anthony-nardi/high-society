import { ZertzGameState } from "../types";
import { capture, getActivePlayer, place, removeRing } from "./rules";
import { chooseBotMove, SearchOptions, TurnMove, turnMoves } from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** Applies a whole-turn move to the real state. */
export function applyBotMove(gameState: ZertzGameState, move: TurnMove) {
  if (move.kind === "place") {
    if (gameState.public.phase === "MOVE") {
      const result = place(gameState, move.colour, move.to);
      if (!result.ok) return result;
    }
    if (gameState.public.phase === "REMOVE_RING" && move.remove) {
      return removeRing(gameState, move.remove);
    }
    return { ok: true as const };
  }
  for (const [from, to] of move.jumps) {
    const result = capture(gameState, from, to);
    if (!result.ok) return result;
    if (gameState.public.phase !== "CONTINUE_CAPTURE") break;
  }
  return { ok: true as const };
}

/** Chooses and plays the active bot's whole turn in place. Pure. */
export function takeBotTurn(gameState: ZertzGameState, search?: SearchOptions) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;

  let move: TurnMove | null = null;
  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, playing the first legal move.", e);
  }
  if (!move) move = turnMoves(gameState)[0] ?? null;
  if (!move) return;

  const result = applyBotMove(gameState, move);
  if (!result.ok) {
    console.log(`Bot move rejected: ${result.reason}`);
    const fallback = turnMoves(gameState)[0];
    if (fallback) applyBotMove(gameState, fallback);
  }
}

export async function maybeTakeBotTurn(
  gameState: ZertzGameState,
  {
    minimumTurnMs = BOT_TURN_MIN_MS,
    search,
  }: { minimumTurnMs?: number; search?: SearchOptions } = {},
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  const startedAt = Date.now();
  takeBotTurn(gameState, search);
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumTurnMs) await wait(minimumTurnMs - elapsed);
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "bot moved",
  );
}
