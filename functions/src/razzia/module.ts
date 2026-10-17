import { GameModule } from "../shared/game";
import { LootCards, RazziaGameState } from "./types";
import { buildDeck, buildGameState } from "./helpers";
import { shuffle } from "../shared/helpers";
import {
  bid,
  initiateAuction,
  pass,
  revealCard,
  useThief,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const razzia: GameModule<RazziaGameState> = {
  name: "razzia",
  createState(lobbyUID, players) {
    const deck = buildDeck();
    shuffle(deck);
    const setOrder = players.map((_, i) => i);
    shuffle(setOrder);
    return buildGameState(lobbyUID, players, deck, setOrder);
  },
  actions: {
    revealCard: (state) => revealCard(state),
    initiateAuction: (state) => initiateAuction(state),
    useThief: (state, payload: { cardToSteal?: LootCards[] }) =>
      useThief(state, payload?.cardToSteal || []),
    passOnLoot: (state) => pass(state),
    bidOnLoot: (state, payload: { amount?: string | number }) =>
      bid(state, String(payload?.amount ?? "")),
  },
  isGameOver: (state) => state.public.status === "GAME_OVER",
  botTurn: (state) => takeBotTurn(state),
};

export default razzia;
