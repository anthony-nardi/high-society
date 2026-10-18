import { FujiFlushGameState } from "../types";
import { getActivePlayer, playCard } from "./rules";
import { chooseCard } from "./botSearch";

/** Chooses and plays the active bot's card in place. Pure. */
export function takeBotTurn(gameState: FujiFlushGameState) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  let card: number | null = null;
  try {
    card = chooseCard(gameState);
  } catch (e) {
    console.log("Bot judgement failed, playing the lowest card.", e);
  }
  const hand = player.hand || [];
  if (card === null || !playCard(gameState, card).ok) {
    if (hand.length) playCard(gameState, hand[0]);
  }
}
