import { GameModule } from "../shared/game";
import { Coord, YinshGameState } from "./types";
import {
  buildYinshGameState,
  isGameOver,
  moveRing,
  placeRing,
  removeRing,
  removeRow,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const yinsh: GameModule<YinshGameState> = {
  name: "yinsh",
  createState: (lobbyUID, players) => buildYinshGameState(lobbyUID, players),
  actions: {
    placeYinshRing: (state, payload: { coord?: Coord }) =>
      placeRing(state, String(payload?.coord ?? "")),
    moveYinshRing: (state, payload: { from?: Coord; to?: Coord }) =>
      moveRing(state, String(payload?.from ?? ""), String(payload?.to ?? "")),
    removeYinshRow: (state, payload: { from?: Coord; to?: Coord }) =>
      removeRow(state, String(payload?.from ?? ""), String(payload?.to ?? "")),
    removeYinshRing: (state, payload: { coord?: Coord }) =>
      removeRing(state, String(payload?.coord ?? "")),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** Removal steps are quick; the search itself takes the time. */
  botPauseMs: 1000,
};

export default yinsh;
