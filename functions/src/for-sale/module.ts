import { totalOf } from "./helpers/rules";
import { GameModule } from "../shared/game";
import { ForSaleGameState } from "./types";
import {
  bid,
  buildForSaleGameState,
  isGameOver,
  pass,
  sell,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const forSale: GameModule<ForSaleGameState> = {
  name: "for-sale",
  createState: (lobbyUID, players) => buildForSaleGameState(lobbyUID, players),
  actions: {
    bidForSale: (state, payload: { amount?: number }) =>
      bid(state, Number(payload?.amount)),
    passForSale: (state) => pass(state),
    sellForSale: (
      state,
      payload: { property?: number; callerEmail?: string },
    ) =>
      sell(
        state,
        String(payload?.callerEmail ?? ""),
        Number(payload?.property),
      ),
  },
  /** Selling is simultaneous: anyone who has not chosen yet may act. */
  mayAct: (state, email) =>
    state.public.phase === "SELLING"
      ? !(state.public.chosen || []).includes(email) &&
        state.public.players.some((p) => p.email === email)
      : state.public.activePlayer === email,
  standings: (state) =>
    state.public.players.map((p) => ({
      email: p.email,
      score: totalOf(p) * 1000 + p.money,
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1200,
};

export default forSale;
