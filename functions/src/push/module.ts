import { GameModule } from "../shared/game";
import { PushGameState } from "./types";
import {
  bankColour,
  buildPushGameState,
  cardCount,
  drawCard,
  isGameOver,
  placeCard,
  scoreOf,
  takeColumn,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";
import type { Colour } from "./types";

const push: GameModule<PushGameState> = {
  name: "push",
  createState: (lobbyUID, players) => buildPushGameState(lobbyUID, players),
  actions: {
    drawPushCard: (state) => drawCard(state),
    placePushCard: (state, payload: { column?: number }) =>
      placeCard(state, Number(payload?.column)),
    takePushColumn: (state, payload: { column?: number }) =>
      takeColumn(state, Number(payload?.column)),
    bankPushColour: (state, payload: { colour?: string }) =>
      bankColour(state, String(payload?.colour ?? "") as Colour),
  },
  /** Points, then cards, as the rulebook breaks ties. */
  standings: (state) =>
    state.public.players.map((p) => ({
      email: p.email,
      score: scoreOf(p) * 1000 + cardCount(p),
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** A die roll deserves a moment; a card a glance. */
  botPauseMs: (state) => {
    const pub = state.public;
    if (pub.lastRoll && pub.lastRoll.turn === pub.turn) {
      const fresh =
        pub.notification?.title.includes("The die shows") ||
        pub.notification?.title.includes("pushes too far");
      if (fresh) return 4000;
    }
    if (pub.phase === "CHOOSE") return 1400;
    return pub.pending ? 900 : 1100;
  },
};

export default push;
