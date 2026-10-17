import { ForSaleGameState } from "../types";
import { bid, getActivePlayer, pass, sell } from "./rules";
import { chooseBuyMove, chooseSale, SearchOptions } from "./botSearch";
import { updateGameState } from "../../shared/helpers";
import { wait } from "../../high-society/helpers";

export const BOT_TURN_MIN_MS = 1500;

/** One bot step: a bid or pass in an auction, or a face-down choice when selling. Pure. */
export function takeBotTurn(
  gameState: ForSaleGameState,
  search?: SearchOptions,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;

  if (gameState.public.phase === "SELLING") {
    const property =
      chooseSale(gameState, player.email) ?? (player.properties || [])[0];
    if (property !== undefined) sell(gameState, player.email, property);
    return;
  }

  let move: ReturnType<typeof chooseBuyMove> = { type: "pass" };
  try {
    move = chooseBuyMove(gameState, search);
  } catch (e) {
    console.log("Bot search failed, passing instead.", e);
  }
  if (move.type === "bid" && bid(gameState, move.amount).ok) return;
  pass(gameState);
}

export async function maybeTakeBotTurn(
  gameState: ForSaleGameState,
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
