import { ShangriLaGameState } from "../types";
import { getActivePlayer } from "./rules";
import {
  applyMove,
  BotMove,
  chooseBotMove,
  SearchOptions,
  turnMoves,
} from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** One bot turn: a setup placement, or a place, recruit or journey. Pure. */
export function takeBotTurn(
  gameState: ShangriLaGameState,
  search?: SearchOptions,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;

  let move: BotMove | null = null;
  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, playing the first legal move.", e);
  }
  if (!move) move = turnMoves(gameState)[0] ?? null;
  if (!move) return;

  const result = applyMove(gameState, move);
  if (!result.ok) {
    console.log(`Bot move rejected: ${result.reason}`);
    // Try the rest in order until one is accepted, so a turn never stalls.
    for (const fallback of turnMoves(gameState)) {
      if (applyMove(gameState, fallback).ok) return;
    }
  }
}

export async function maybeTakeBotTurn(
  gameState: ShangriLaGameState,
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
