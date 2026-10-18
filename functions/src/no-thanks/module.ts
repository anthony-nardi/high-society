import scoreGame from "./helpers/scoring";
import { GameModule } from "../shared/game";
import { NoThanksGameState } from "./types";
import {
  applyChip,
  applyTake,
  buildNoThanksGameState,
  getActivePlayer,
  isGameOver,
} from "./helpers";
import { takeBotTurn } from "./helpers/bot";

const noThanks: GameModule<NoThanksGameState> = {
  name: "no-thanks",
  createState: (lobbyUID, players) => buildNoThanksGameState(lobbyUID, players),
  actions: {
    takeActiveCard: (state) => {
      const player = getActivePlayer(state);
      if (!player) return { ok: false, reason: "Active player not found." };
      return applyTake(state, player);
    },
    placeChipOnActiveCard: (state) => {
      const player = getActivePlayer(state);
      if (!player) return { ok: false, reason: "Active player not found." };
      return applyChip(state, player);
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

export default noThanks;
