import { FamilyIncGameState } from "../types";
import { draw, getActivePlayer, stop } from "./rules";
import { BotMove, chooseBotMove } from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** Chooses and applies one bot step (a draw or a stop) in place. Pure apart from the draw. */
export function takeBotTurn(
  gameState: FamilyIncGameState,
  random: () => number = Math.random,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;

  let move: BotMove = "draw";
  try {
    move = chooseBotMove(gameState);
  } catch (e) {
    console.log("Bot search failed, drawing instead.", e);
  }

  const result = move === "stop" ? stop(gameState) : draw(gameState, random);
  if (!result.ok) draw(gameState, random);
}

export async function maybeTakeBotTurn(
  gameState: FamilyIncGameState,
  { minimumTurnMs = BOT_TURN_MIN_MS, random = Math.random } = {},
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  const startedAt = Date.now();
  takeBotTurn(gameState, random);
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumTurnMs) await wait(minimumTurnMs - elapsed);
  await updateGameState(
    gameState,
    gameState.public.notification?.title || "bot moved",
  );
}
