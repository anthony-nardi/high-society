import { GameModule } from "../shared/game";
import { CoralReefGameState } from "./types";
import {
  buildCoralReefGameState,
  choose,
  isGameOver,
  mayAct,
  scoreAll,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const pair = (raw: unknown): [string, string] | undefined =>
  Array.isArray(raw) && raw.length === 2
    ? [String(raw[0]), String(raw[1])]
    : undefined;

const coralReef: GameModule<CoralReefGameState> = {
  name: "coral-reef",
  createState: (lobbyUID, players) =>
    buildCoralReefGameState(lobbyUID, players),
  actions: {
    placeCoralReefCard: (
      state,
      payload: {
        card?: number;
        row?: number;
        col?: number;
        swap?: unknown;
        move?: unknown;
        callerEmail?: string;
      },
    ) => {
      const swap = pair(payload?.swap);
      const move = pair(payload?.move);
      return choose(state, String(payload?.callerEmail ?? ""), {
        card: Number(payload?.card),
        row: Number(payload?.row),
        col: Number(payload?.col),
        ...(swap ? { swap } : {}),
        ...(move ? { move } : {}),
      });
    },
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

export default coralReef;
