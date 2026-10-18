import { GameModule } from "../shared/game";
import { Master, ShangriLaGameState } from "./types";
import {
  buildShangriLaGameState,
  isGameOver,
  journey,
  placeMaster,
  placeSetupMaster,
  recruit,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const asPicks = (raw: unknown): [number, Master][] =>
  Array.isArray(raw)
    ? raw
        .filter((p) => Array.isArray(p) && p.length === 2)
        .map((p) => [Number(p[0]), String(p[1]) as Master])
    : [];

const shangriLa: GameModule<ShangriLaGameState> = {
  name: "shangri-la",
  createState: (lobbyUID, players) =>
    buildShangriLaGameState(lobbyUID, players),
  actions: {
    placeShangriLaMaster: (
      state,
      payload: { village?: number; type?: Master },
    ) =>
      state.public.phase === "SETUP"
        ? placeSetupMaster(
            state,
            Number(payload?.village),
            String(payload?.type) as Master,
          )
        : placeMaster(
            state,
            Number(payload?.village),
            String(payload?.type) as Master,
          ),
    recruitShangriLaStudents: (state, payload: { picks?: unknown }) =>
      recruit(state, asPicks(payload?.picks)),
    journeyShangriLa: (state, payload: { from?: number; to?: number }) =>
      journey(state, Number(payload?.from), Number(payload?.to)),
  },
  standings: (state) =>
    (state.public.scores || []).map((s) => ({
      email: s.email,
      score: s.masters * 1000 + s.villages,
    })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 1200,
};

export default shangriLa;
