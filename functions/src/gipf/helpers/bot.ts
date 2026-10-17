import { GipfGameState } from "../types";
import { getActivePlayer } from "./rules";
import {
  applyMove,
  BotMove,
  chooseBotMove,
  rowChoice,
  SearchOptions,
  turnMoves,
} from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** One bot step: a push, or the choice between crossing rows. Pure. */
export function takeBotTurn(gameState: GipfGameState, search?: SearchOptions) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;

  let move: BotMove | null = null;
  if (gameState.public.phase === "REMOVE_ROW") {
    move = rowChoice(gameState);
  } else {
    try {
      move = chooseBotMove(gameState, search);
    } catch (e) {
      console.log("Bot search failed, playing the first legal move.", e);
    }
  }
  if (!move) move = turnMoves(gameState)[0] ?? null;
  if (!move) return;

  const result = applyMove(gameState, move);
  if (!result.ok) {
    console.log(`Bot move rejected: ${result.reason}`);
    const fallback = turnMoves(gameState)[0];
    if (fallback) applyMove(gameState, fallback);
  }
}

export async function maybeTakeBotTurn(
  gameState: GipfGameState,
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
