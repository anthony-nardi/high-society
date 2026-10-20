import { MediciGameState } from "../types";
import { drawCard, getActivePlayer, offerLot, pass } from "./rules";
import { applyMove, chooseBotMove, Tuning, TUNING } from "./botSearch";
import { temperOf } from "../../shared/personas";

/** How each temper bends the dials: the cautious pay less, the reckless more. */
const BY_TEMPER: { [temper: string]: Partial<Tuning> } = {
  CAUTIOUS: { ceiling: 0.22, bidLow: 0.25, bidSpread: 0.25 },
  STEADY: {},
  RECKLESS: { ceiling: 0.45, bidLow: 0.55, bidSpread: 0.35, climb: 1.0 },
};

export function tuningFor(gameState: MediciGameState, email: string): Tuning {
  return { ...TUNING, ...BY_TEMPER[temperOf(gameState.public.players, email)] };
}

/** Plays the active bot's move in place: a draw, an offer, a bid or a pass. Pure. */
export function takeBotTurn(
  gameState: MediciGameState,
  random: () => number = Math.random,
) {
  const player = getActivePlayer(gameState);
  if (!player?.isBot) return;
  try {
    const tuning = tuningFor(gameState, player.email);
    if (applyMove(gameState, chooseBotMove(gameState, random, tuning)).ok)
      return;
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
