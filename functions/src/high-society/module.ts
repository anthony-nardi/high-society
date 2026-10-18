import scoreGame from "./helpers/scoring";
import { GameModule } from "../shared/game";
import { HighSocietyGameState } from "./types";
import {
  applyBid,
  applyPass,
  buildHighSocietyGameState,
  getActivePlayer,
  isGameOver,
} from "./helpers";
import { takeBotTurn } from "./helpers/bot";

const highSociety: GameModule<HighSocietyGameState> = {
  name: "high-society",
  createState: (lobbyUID, players) =>
    buildHighSocietyGameState(lobbyUID, players),
  actions: {
    bid: (state, payload: { bid?: string[] }) =>
      applyBid(state, payload?.bid || []),
    passturn: (state) => {
      const player = getActivePlayer(state);
      if (!player) return { ok: false, reason: "Active player not found." };
      applyPass(state, player);
      return { ok: true };
    },
  },
  standings: (state) =>
    scoreGame(state.public.players).map((p) => ({
      email: p.email,
      score: -p.rank,
    })),
  isGameOver: (state) =>
    state.public.status === "GAME_OVER" || isGameOver(state),
  botTurn: (state) => takeBotTurn(state),
};

export default highSociety;
