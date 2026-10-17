import { HighSocietyGameState } from "../types";
import {
  applyBid,
  applyPass,
  getActivePlayer,
  getBidValue,
  getHighestCurrentBid,
  wait,
} from ".";
import { updateGameState } from "../../shared/helpers";
import { BotMove, chooseBotMove, SearchOptions } from "./botSearch";

/** Minimum time a bot "thinks" so its moves are readable at the table. */
export const BOT_TURN_MIN_MS = 1500;

export function isValidSuggestedBid(
  gameState: HighSocietyGameState,
  suggestedAction: string[],
) {
  const activePlayer = getActivePlayer(gameState);
  const highestBid = getHighestCurrentBid(gameState);
  const activePlayersCurrentBid = getBidValue(activePlayer.currentBid || []);
  const bidToAdd = getBidValue(suggestedAction);

  if (activePlayersCurrentBid + bidToAdd <= highestBid) {
    console.log("Suggested bid that was not higher than highest bid.");
    return false;
  }

  const moneyCards = activePlayer.moneyCards || [];

  for (const card of suggestedAction) {
    if (!moneyCards.includes(card)) {
      console.log(
        `${card} is not in ${JSON.stringify(activePlayer.moneyCards)}`,
      );
      return false;
    }
  }

  return true;
}

export type BotTurnOptions = {
  /** Lower bound on the turn's duration; 0 skips the pause (tests). */
  minimumTurnMs?: number;
  search?: SearchOptions;
};

/** Chooses and applies the active bot's move in place. Pure. */
export function takeBotTurn(
  gameState: HighSocietyGameState,
  search?: SearchOptions,
) {
  const activePlayer = getActivePlayer(gameState);
  if (!activePlayer?.isBot) return;

  let move: BotMove = "pass";
  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, passing instead.", e);
  }

  if (move !== "pass" && !isValidSuggestedBid(gameState, move)) {
    move = "pass";
  }
  if (move !== "pass" && !applyBid(gameState, move).ok) {
    move = "pass";
  }
  if (move === "pass") applyPass(gameState, activePlayer);
}

export async function maybeTakeBotTurn(
  gameState: HighSocietyGameState,
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

export function isActivePlayerBot(gameState: HighSocietyGameState) {
  return getActivePlayer(gameState).isBot;
}
