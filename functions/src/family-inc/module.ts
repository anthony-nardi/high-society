import { GameModule } from "../shared/game";
import { FamilyIncGameState } from "./types";
import {
  buildFamilyIncGameState,
  draw,
  isGameOver,
  stop,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const familyInc: GameModule<FamilyIncGameState> = {
  name: "family-inc",
  createState: (lobbyUID, players) =>
    buildFamilyIncGameState(lobbyUID, players),
  actions: {
    drawChip: (state) => draw(state),
    stopTurn: (state) => stop(state),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** Each draw is one step, so keep the pacing brisk. */
  botPauseMs: 900,
};

export default familyInc;
