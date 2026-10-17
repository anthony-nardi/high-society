import { CondottiereGameState } from "../types";
import { chooseBattlefield, getActivePlayer, pass, playCard } from "./rules";
import { BotMove, chooseBotMove } from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

function apply(gameState: CondottiereGameState, move: BotMove) {
  switch (move.kind) {
    case "choose":
      return chooseBattlefield(gameState, move.region);
    case "play":
      return playCard(gameState, move.index, move.target);
    case "pass":
      return pass(gameState);
  }
}

/** One bot step: a battlefield, a card, or a pass. Pure. */
export function takeBotTurn(gameState: CondottiereGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  let move: BotMove | null = null;
  try {
    move = chooseBotMove(gameState);
  } catch (e) {
    console.log("Bot judgement failed, passing instead.", e);
  }
  if (move && apply(gameState, move).ok) return;
  if (gameState.public.phase === "BATTLE") pass(gameState);
}

export async function maybeTakeBotTurn(
  gameState: CondottiereGameState,
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
