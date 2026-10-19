import { SavannaGameState } from "../types";
import { applyMove, chooseBotMove, turnMoves } from "./botSearch";
import { getActivePlayer } from "./rules";

/** One bot pick. Pure. */
export function takeBotTurn(gameState: SavannaGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
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
