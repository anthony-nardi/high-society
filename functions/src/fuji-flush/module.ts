import { GameModule } from "../shared/game";
import { FujiFlushGameState } from "./types";
import {
  buildFujiFlushGameState,
  cardsLeft,
  isGameOver,
  playCard,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const fujiFlush: GameModule<FujiFlushGameState> = {
  name: "fuji-flush",
  createState: (lobbyUID, players) =>
    buildFujiFlushGameState(lobbyUID, players),
  actions: {
    playFujiCard: (state, payload: { card?: number }) =>
      playCard(state, Number(payload?.card)),
  },
  /** Winners first, then whoever has the fewest cards left. */
  standings: (state) =>
    state.public.players.map((p) => ({
      email: p.email,
      score: (state.public.winners || []).includes(p.email)
        ? 100
        : -cardsLeft(p),
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** A flush or a push is worth a moment's look. */
  botPauseMs: (state) =>
    state.public.lastPlay?.flushed?.length || state.public.lastPush
      ? 1900
      : 1200,
};

export default fujiFlush;
