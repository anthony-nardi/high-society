import { GameModule } from "../shared/game";
import { SavannaGameState } from "./types";
import {
  buildSavannaGameState,
  choose,
  flipPrey,
  isGameOver,
  mayAct,
  scoreAll,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const savanna: GameModule<SavannaGameState> = {
  name: "savanna",
  createState: (lobbyUID, players) => buildSavannaGameState(lobbyUID, players),
  actions: {
    placeSavannaCard: (
      state,
      payload: {
        card?: number;
        row?: number;
        col?: number;
        callerEmail?: string;
      },
    ) =>
      choose(state, String(payload?.callerEmail ?? ""), {
        card: Number(payload?.card),
        row: Number(payload?.row),
        col: Number(payload?.col),
      }),
    flipSavannaPrey: (
      state,
      payload: { cells?: unknown; callerEmail?: string },
    ) =>
      flipPrey(
        state,
        String(payload?.callerEmail ?? ""),
        Array.isArray(payload?.cells) ? payload.cells.map(String) : [],
      ),
  },
  mayAct: (state, email) => mayAct(state, email),
  standings: (state) =>
    (state.public.results || scoreAll(state)).map((r) => ({
      email: r.email,
      score: r.total,
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 600,
};

export default savanna;
