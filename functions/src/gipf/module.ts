import { GameModule } from "../shared/game";
import { Coord, GipfGameState } from "./types";
import {
  buildGipfGameState,
  isGameOver,
  pushPiece,
  removeRow,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const gipf: GameModule<GipfGameState> = {
  name: "gipf",
  createState: (lobbyUID, players) => buildGipfGameState(lobbyUID, players),
  actions: {
    pushGipfPiece: (state, payload: { from?: Coord; to?: Coord }) =>
      pushPiece(state, String(payload?.from ?? ""), String(payload?.to ?? "")),
    removeGipfRow: (state, payload: { coord?: Coord }) =>
      removeRow(state, String(payload?.coord ?? "")),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1000,
};

export default gipf;
