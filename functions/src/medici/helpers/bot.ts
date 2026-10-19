import { MediciGameState } from "../types";
import { drawCard, getActivePlayer, offerLot, pass } from "./rules";
import { applyMove, chooseBotMove } from "./botSearch";

/** Plays the active bot's move in place: a draw, an offer, a bid or a pass. Pure. */
export function takeBotTurn(
  gameState: MediciGameState,
  random: () => number = Math.random,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  try {
    if (applyMove(gameState, chooseBotMove(gameState, random)).ok) return;
  } catch (e) {
    console.log("Bot judgement failed, playing the safe move.", e);
  }
  if (gameState.public.phase === "DRAW") {
    if ((gameState.public.lot || []).length) offerLot(gameState);
    else drawCard(gameState);
  } else {
    pass(gameState);
  }
}
