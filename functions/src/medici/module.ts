import { GameModule } from "../shared/game";
import { MediciGameState } from "./types";
import {
  bid,
  buildMediciGameState,
  drawCard,
  isGameOver,
  offerLot,
  pass,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const medici: GameModule<MediciGameState> = {
  name: "medici",
  createState: (lobbyUID, players) => buildMediciGameState(lobbyUID, players),
  actions: {
    drawMediciCard: (state) => drawCard(state),
    offerMediciLot: (state) => offerLot(state),
    bidMedici: (state, payload: { amount?: number }) =>
      bid(state, Number(payload?.amount)),
    passMedici: (state) => pass(state),
  },
  /** Florins are the score. */
  standings: (state) =>
    state.public.players.map((p) => ({ email: p.email, score: p.money })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** A day's ledger deserves a long look; a sale a short one; a card a glance. */
  botPauseMs: (state) => {
    const pub = state.public;
    if (pub.dayScoring && pub.dayScoring.turn === pub.turn && !pub.lot)
      return 7000;
    if (pub.lastAuction?.turn === pub.turn - 1 && !pub.lot) return 2200;
    return pub.phase === "DRAW" ? 900 : 1200;
  },
};

export default medici;
