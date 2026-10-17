import { RazziaGameState } from "../types";
import { wait } from "../../high-society/helpers";
import { saveGameState } from ".";
import {
  ActionResult,
  bid,
  getActivePlayer,
  initiateAuction,
  pass,
  revealCard,
  useThief,
} from "./rules";
import { BotMove, chooseBotMove, SearchOptions } from "./botSearch";

/** Minimum time a bot "thinks" so its moves are readable at the table. */
export const BOT_TURN_MIN_MS = 1500;

export type BotTurnOptions = {
  minimumTurnMs?: number;
  search?: SearchOptions;
};

export function applyBotMove(
  gameState: RazziaGameState,
  move: BotMove,
): ActionResult {
  switch (move.type) {
    case "reveal":
      return revealCard(gameState);
    case "auction":
      return initiateAuction(gameState);
    case "thief":
      return useThief(gameState, move.cards);
    case "bid":
      return bid(gameState, move.amount);
    case "pass":
      return pass(gameState);
  }
}

/** Chooses and applies the active bot's move in place, with legal fallbacks. Pure. */
export function takeBotTurn(
  gameState: RazziaGameState,
  search?: SearchOptions,
) {
  const activePlayer = getActivePlayer(gameState);
  if (!activePlayer?.isBot) return;

  let move: BotMove = { type: "reveal" };
  try {
    move = chooseBotMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, revealing instead.", e);
  }

  const result = applyBotMove(gameState, move);
  if (!result.ok) {
    console.log(`Bot move ${move.type} rejected: ${result.reason}`);
    for (const fallback of [pass, revealCard, initiateAuction]) {
      if (fallback(gameState).ok) break;
    }
  }
}

export async function maybeTakeBotTurn(
  gameState: RazziaGameState,
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
  await saveGameState(gameState);
}

export function isActivePlayerBot(gameState: RazziaGameState) {
  return !!getActivePlayer(gameState)?.isBot;
}
