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
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1100,
};

export default condottiere;
