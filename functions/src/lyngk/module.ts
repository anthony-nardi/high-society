import { GameModule } from "../shared/game";
import { Colour, Coord, LyngkGameState } from "./types";
import {
  buildLyngkGameState,
  claimColour,
  isGameOver,
  moveStack,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const lyngk: GameModule<LyngkGameState> = {
  name: "lyngk",
  createState: (lobbyUID, players) => buildLyngkGameState(lobbyUID, players),
  actions: {
    claimLyngkColour: (state, payload: { colour?: Colour }) =>
      claimColour(state, String(payload?.colour ?? "") as Colour),
    moveLyngkStack: (state, payload: { path?: Coord[] }) =>
      moveStack(
        state,
        Array.isArray(payload?.path) ? payload.path.map(String) : [],
      ),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1000,
};

export default lyngk;
