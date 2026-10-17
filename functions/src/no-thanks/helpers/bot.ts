import { NoThanksGameState } from "../types";
import { applyChip, applyTake, getActivePlayer } from ".";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";
import { BotMove, chooseBotMove, SearchOptions } from "./botSearch";

/** Minimum time a bot "thinks" so its moves are readable at the table. */
export const BOT_TURN_MIN_MS = 1500;

export type BotTurnOptions = {
  /** Lower bound on the turn's duration; 0 skips the pause (tests). */
  minimumTurnMs?: number;
  search?: SearchOptions;
};

/** Chooses and applies the active bot's move in place. Pure. */
export function takeBotTurn(
  gameState: NoThanksGameState,
  search?: SearchOptions,
) {
  const activePlayer = getActivePlayer(gameState);
  if (!activePlayer?.isBot) return;

  let move: BotMove = "take";
  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, taking the card instead.", e);
  }

  if (move === "chip" && !applyChip(gameState, activePlayer).ok) {
    move = "take";
  }
  if (move === "take") applyTake(gameState, activePlayer);
}

export async function maybeTakeBotTurn(
  gameState: NoThanksGameState,
  { minimumTurnMs = BOT_TURN_MIN_MS, search }: BotTurnOptions = {},
) {
  const activePlayer = getActivePlayer(gameState);
  if (!activePlayer?.isBot) return;

  const startedAt = Date.now();
  takeBotTurn(gameState, search);
  const timeElapsed = Date.now() - startedAt;
  if (timeElapsed < minimumTurnMs) {
    await wait(minimumTurnMs - timeElapsed);
  }
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "bot moved",
  );
}

export function isActivePlayerBot(gameState: NoThanksGameState) {
  return getActivePlayer(gameState)?.isBot;
}
