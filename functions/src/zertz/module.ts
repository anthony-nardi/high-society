import { GameModule } from "../shared/game";
import { Colour, Coord, ZertzGameState } from "./types";
import {
  buildZertzGameState,
  capture,
  isGameOver,
  place,
  removeRing,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const zertz: GameModule<ZertzGameState> = {
  name: "zertz",
  createState: (lobbyUID, players) => buildZertzGameState(lobbyUID, players),
  actions: {
    placeMarble: (state, payload: { colour?: Colour; to?: Coord }) =>
      place(state, payload?.colour as Colour, String(payload?.to ?? "")),
    removeRing: (state, payload: { coord?: Coord }) =>
      removeRing(state, String(payload?.coord ?? "")),
    captureMarble: (state, payload: { from?: Coord; to?: Coord }) =>
      capture(state, String(payload?.from ?? ""), String(payload?.to ?? "")),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
};

export default zertz;
