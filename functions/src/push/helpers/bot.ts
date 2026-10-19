import { PushGameState } from "../types";
import { drawCard, getActivePlayer, placeCard, takeColumn } from "./rules";
import { applyMove, chooseBotMove } from "./botSearch";
import { placements } from "./board";

/** Plays the active bot's move in place: a draw, a placement, a take or a protection. Pure. */
export function takeBotTurn(
  gameState: PushGameState,
  random: () => number = Math.random,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  try {
    if (applyMove(gameState, chooseBotMove(gameState, random)).ok) return;
  } catch (e) {
    console.log("Bot judgement failed, playing the safe move.", e);
  }
  const pub = gameState.public;
  if (pub.pending) {
    placeCard(gameState, placements(pub.columns || [], pub.pending)[0]);
  } else if ((pub.columns || []).length) {
    takeColumn(gameState, 0);
  } else {
    drawCard(gameState);
  }
}
