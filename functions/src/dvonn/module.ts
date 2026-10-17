import { GameModule } from "../shared/game";
import { Coord, DvonnGameState } from "./types";
import {
  buildDvonnGameState,
  isGameOver,
  moveStack,
  placePiece,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const dvonn: GameModule<DvonnGameState> = {
  name: "dvonn",
  createState: (lobbyUID, players) => buildDvonnGameState(lobbyUID, players),
  actions: {
    placeDvonnPiece: (state, payload: { coord?: Coord }) =>
      placePiece(state, String(payload?.coord ?? "")),
    moveDvonnStack: (state, payload: { from?: Coord; to?: Coord }) =>
      moveStack(state, String(payload?.from ?? ""), String(payload?.to ?? "")),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** Placements are quick and there are many of them. */
  botPauseMs: 700,
};

export default dvonn;
