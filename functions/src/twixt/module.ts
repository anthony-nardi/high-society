import { GameModule } from "../shared/game";
import { Link, TwixtGameState } from "./types";
import {
  buildTwixtGameState,
  isGameOver,
  placePeg,
  removeLink,
  swapSides,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const twixt: GameModule<TwixtGameState> = {
  name: "twixt",
  createState: (lobbyUID, players) => buildTwixtGameState(lobbyUID, players),
  actions: {
    placeTwixtPeg: (state, payload: { hole?: number }) =>
      placePeg(state, Number(payload?.hole)),
    swapTwixtSides: (state) => swapSides(state),
    removeTwixtLink: (state, payload: { link?: Link }) =>
      removeLink(
        state,
        Array.isArray(payload?.link)
          ? ([Number(payload.link[0]), Number(payload.link[1])] as Link)
          : ([-1, -1] as Link),
      ),
  },
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1000,
};

export default twixt;
