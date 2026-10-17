import { RideTheRailsGameState } from "../types";
import { applyMove, chooseBotMove, turnMoves } from "./botSearch";
import { getActivePlayer } from "./rules";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** One bot step: a share, a locomotive, the end of a build turn, or a journey. Pure. */
export function takeBotTurn(gameState: RideTheRailsGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  let move = null;
  try {
    move = chooseBotMove(gameState);
  } catch (e) {
    console.log("Bot judgement failed, taking any legal move instead.", e);
  }
  if (move && applyMove(gameState, move).ok) return;
  // Never stall: walk every legal move until one is accepted.
  for (const fallback of turnMoves(gameState))
    if (applyMove(gameState, fallback).ok) return;
}

export async function maybeTakeBotTurn(
  gameState: RideTheRailsGameState,
  { minimumTurnMs = BOT_TURN_MIN_MS }: { minimumTurnMs?: number } = {},
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  const startedAt = Date.now();
  takeBotTurn(gameState);
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumTurnMs) await wait(minimumTurnMs - elapsed);
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "bot moved",
  );
}
