import { GameModule } from "../shared/game";
import { CondottiereGameState } from "./types";
import {
  buildCondottiereGameState,
  chooseBattlefield,
  isGameOver,
  pass,
  playCard,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const condottiere: GameModule<CondottiereGameState> = {
  name: "condottiere",
  createState: (lobbyUID, players) =>
    buildCondottiereGameState(lobbyUID, players),
  actions: {
    chooseCondottiereBattlefield: (state, payload: { region?: number }) =>
      chooseBattlefield(state, Number(payload?.region)),
    playCondottiereCard: (
      state,
      payload: { index?: number; target?: number },
    ) =>
      playCard(
        state,
        Number(payload?.index),
        payload?.target === undefined || payload?.target === null
          ? undefined
          : Number(payload.target),
      ),
    passCondottiere: (state) => pass(state),
  },
  standings: (state) =>
    state.public.players.map((p) => ({
      email: p.email,
      score:
        (state.public.winner === p.email ? 100 : 0) + (p.regions || []).length,
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  // A Surrender deserves its moment before the next battlefield is called.
  botPauseMs: (state) =>
    state.public.lastMove?.type === "play" &&
    state.public.lastMove.card === "SURRENDER"
      ? 4500
      : 1100,
};

export default condottiere;
