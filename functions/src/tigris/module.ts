import { GameModule } from "../shared/game";
import { Colour, TigrisGameState } from "./types";
import {
  buildMonument,
  buildTigrisGameState,
  chooseWar,
  commitTiles,
  endTurn,
  isGameOver,
  placeTile,
  playCatastrophe,
  positionLeader,
  replaceTiles,
  resultsOf,
  skipMonument,
  takeTreasure,
  withdrawLeader,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const str = (v: unknown) => String(v ?? "");

const tigris: GameModule<TigrisGameState> = {
  name: "tigris",
  createState: (lobbyUID, players) => buildTigrisGameState(lobbyUID, players),
  actions: {
    placeTigrisTile: (state, payload: { cell?: string; colour?: Colour }) =>
      placeTile(state, str(payload?.cell), str(payload?.colour) as Colour),
    positionTigrisLeader: (
      state,
      payload: { colour?: Colour; cell?: string },
    ) =>
      positionLeader(state, str(payload?.colour) as Colour, str(payload?.cell)),
    withdrawTigrisLeader: (state, payload: { colour?: Colour }) =>
      withdrawLeader(state, str(payload?.colour) as Colour),
    playTigrisCatastrophe: (state, payload: { cell?: string }) =>
      playCatastrophe(state, str(payload?.cell)),
    replaceTigrisTiles: (state, payload: { indexes?: unknown }) =>
      replaceTiles(
        state,
        Array.isArray(payload?.indexes)
          ? payload.indexes.map((i) => Number(i))
          : [],
      ),
    endTigrisTurn: (state) => endTurn(state),
    commitTigrisTiles: (
      state,
      payload: { count?: number; callerEmail?: string },
    ) => commitTiles(state, str(payload?.callerEmail), Number(payload?.count)),
    chooseTigrisWar: (state, payload: { colour?: Colour }) =>
      chooseWar(state, str(payload?.colour) as Colour),
    buildTigrisMonument: (
      state,
      payload: { cell?: string; colours?: unknown },
    ) =>
      buildMonument(
        state,
        str(payload?.cell),
        (Array.isArray(payload?.colours) ? payload.colours.map(str) : []) as [
          Colour,
          Colour,
        ],
      ),
    skipTigrisMonument: (state) => skipMonument(state),
    takeTigrisTreasure: (
      state,
      payload: { cell?: string; callerEmail?: string },
    ) => takeTreasure(state, str(payload?.callerEmail), str(payload?.cell)),
  },
  /** Lowest sphere first, then the next, as the rules rank players. */
  standings: (state) =>
    resultsOf(state).map((r) => ({
      email: r.email,
      score:
        r.spheres[0] * 1_000_000 +
        r.spheres[1] * 10_000 +
        r.spheres[2] * 100 +
        r.spheres[3],
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  /** Conflicts deserve a moment; ordinary actions move along. */
  botPauseMs: (state) =>
    state.public.phase === "CONFLICT" ||
    state.public.lastConflict?.turn === state.public.turn
      ? 1900
      : 1200,
};

export default tigris;
