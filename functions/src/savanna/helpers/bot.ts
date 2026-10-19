import { SavannaGameState } from "../types";
import { applyMove, chooseBotMove, turnMoves } from "./botSearch";
import { flipPrey, getActivePlayer } from "./rules";
import { bestLionFlips } from "./board";

/** One bot pick. Pure. */
export function takeBotTurn(gameState: SavannaGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  if (gameState.public.phase === "FLIP") {
    flipPrey(gameState, player.email, bestLionFlips(player.grid || {}));
    return;
  }
  let move = null;
  try {
    move = chooseBotMove(gameState);
  } catch (e) {
    console.log("Bot judgement failed, taking any legal move instead.", e);
  }
  if (move && applyMove(gameState, move).ok) return;
  for (const fallback of turnMoves(gameState))
    if (applyMove(gameState, fallback).ok) return;
}
