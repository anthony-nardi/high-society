import { AcquireGameState } from "../types";
import { getActivePlayer } from "./rules";
import { STYLES, takeBotStep } from "./botSearch";
import { temperOf } from "../../shared/personas";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** One bot step: a tile, a founding, a survivor, a settlement, or a purchase. Pure. */
export function takeBotTurn(gameState: AcquireGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  try {
    takeBotStep(
      gameState,
      STYLES[temperOf(gameState.public.players, player.email)],
    );
  } catch (e) {
    console.log("Bot step failed.", e);
  }
}

export async function maybeTakeBotTurn(
  gameState: AcquireGameState,
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
