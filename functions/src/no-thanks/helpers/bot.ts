import { NoThanksGameState } from "../types";
import {
  getActivePlayer,
  updateGameStateWithPlacingChipAction,
  updateGameStateWithTakingCardAction,
} from ".";
import { wait } from "../../high-society/helpers";
import { BotMove, chooseBotMove, SearchOptions } from "./botSearch";

/** Minimum time a bot "thinks" so its moves are readable at the table. */
export const BOT_TURN_MIN_MS = 3000;

export type BotTurnOptions = {
  /** Lower bound on the turn's duration; 0 skips the pause (tests). */
  minimumTurnMs?: number;
  search?: SearchOptions;
};

export async function maybeTakeBotTurn(
  gameState: NoThanksGameState,
  { minimumTurnMs = BOT_TURN_MIN_MS, search }: BotTurnOptions = {}
) {
  const activePlayer = getActivePlayer(gameState);

  if (!activePlayer?.isBot) {
    return;
  }

  const startedAt = Date.now();

  let move: BotMove = "take";

  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, taking the card instead.", e);
  }

  if (move === "chip" && (activePlayer.chips || 0) < 1) {
    move = "take";
  }

  const timeElapsed = Date.now() - startedAt;

  if (timeElapsed < minimumTurnMs) {
    await wait(minimumTurnMs - timeElapsed);
  }

  if (move === "take") {
    await updateGameStateWithTakingCardAction(gameState, activePlayer);
  } else {
    await updateGameStateWithPlacingChipAction(gameState, activePlayer);
  }
}

export function isActivePlayerBot(gameState: NoThanksGameState) {
  return getActivePlayer(gameState)?.isBot;
}
