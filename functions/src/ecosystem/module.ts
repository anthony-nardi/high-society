import { GameModule } from "../shared/game";
import { EcosystemGameState } from "./types";
import {
  buildEcosystemGameState,
  choose,
  isGameOver,
  mayAct,
  scoreAll,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const ecosystem: GameModule<EcosystemGameState> = {
  name: "ecosystem",
  createState: (lobbyUID, players) =>
    buildEcosystemGameState(lobbyUID, players),
  actions: {
    placeEcosystemCard: (
      state,
      payload: {
        card?: number;
        row?: number;
        col?: number;
        swap?: [string, string];
        callerEmail?: string;
      },
    ) =>
      choose(state, String(payload?.callerEmail ?? ""), {
        card: Number(payload?.card),
        row: Number(payload?.row),
        col: Number(payload?.col),
        ...(Array.isArray(payload?.swap) && payload.swap.length === 2
          ? {
              swap: [String(payload.swap[0]), String(payload.swap[1])] as [
                string,
                string,
              ],
            }
          : {}),
      }),
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

export default ecosystem;
