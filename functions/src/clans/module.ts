import { GameModule } from "../shared/game";
import { ClansGameState } from "./types";
import { buildClansGameState, isGameOver, moveHuts } from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const clans: GameModule<ClansGameState> = {
  name: "clans",
  createState: (lobbyUID, players) => buildClansGameState(lobbyUID, players),
  actions: {
    moveClansHuts: (state, payload: { from?: number; to?: number }) =>
      moveHuts(state, Number(payload?.from), Number(payload?.to)),
  },
  standings: (state) =>
    state.public.players.map((p) => ({
      email: p.email,
      score: state.public.scores[p.colour] + p.chips,
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1200,
};

export default clans;
