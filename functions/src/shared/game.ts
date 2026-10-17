import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import { GameName, GenericGameState, PlayerInLobby } from "./types";
import { updateGameState } from "./helpers";

/*
 * The one shape every game implements. A game is pure rules over a state
 * object plus a bot; this file supplies everything around them: auth, the
 * active-player check, persistence, the bot loop and its pacing.
 */

export type ActionResult = { ok: true } | { ok: false; reason: string };

export const ok: ActionResult = { ok: true };
export const fail = (reason: string): ActionResult => ({ ok: false, reason });

export type GameAction<State> = (state: State, payload: any) => ActionResult;

export interface GameModule<State extends GenericGameState = GenericGameState> {
  name: GameName;
  /** Builds the initial state for the lobby's players. Pure apart from shuffling. */
  createState(lobbyUID: string, players: PlayerInLobby[]): State;
  /** Callable name to rule. Each mutates the state and reports legality. */
  actions: { [callableName: string]: GameAction<State> };
  isGameOver(state: State): boolean;
  /** Plays the active bot's move in place. Must always make progress. */
  botTurn(state: State): void;
  /** Minimum time a bot visibly "thinks" between moves. */
  botPauseMs?: number;
}

/** A human move may be followed by a chain of bot moves, each paused so it can be read. */
export const MOVE_TIMEOUT_SECONDS = 300;
export const DEFAULT_BOT_PAUSE_MS = 1500;
/** Upper bound on consecutive bot moves per request, as a safety net. */
const MAX_BOT_MOVES_PER_REQUEST = 40;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadGameState<State>(lobbyUID: string) {
  const snapshot = await getDatabase().ref(`games/${lobbyUID}`).get();
  return snapshot.val() as State | null;
}

function activePlayerOf<State extends GenericGameState>(state: State) {
  return state.public.players.find(
    (player) => player.email === state.public.activePlayer,
  );
}

/** Lets bots play on after a human move until a human is up again. */
export async function playBots<State extends GenericGameState>(
  module: GameModule<State>,
  state: State,
) {
  const pause = module.botPauseMs ?? DEFAULT_BOT_PAUSE_MS;
  let moves = 0;
  while (
    moves < MAX_BOT_MOVES_PER_REQUEST &&
    !module.isGameOver(state) &&
    activePlayerOf(state)?.isBot
  ) {
    moves++;
    const startedAt = Date.now();
    module.botTurn(state);
    const elapsed = Date.now() - startedAt;
    if (elapsed < pause) await wait(pause - elapsed);
    await updateGameState(
      state,
      state.public.notification?.title || `${module.name}: bot moved`,
    );
  }
}

/** Creates one callable per action, all sharing the same pipeline. */
export function defineGameFunctions<State extends GenericGameState>(
  module: GameModule<State>,
) {
  const functions: { [name: string]: ReturnType<typeof onCall> } = {};

  for (const [callableName, action] of Object.entries(module.actions)) {
    functions[callableName] = onCall(
      { timeoutSeconds: MOVE_TIMEOUT_SECONDS },
      async (
        request: CallableRequest<
          { lobbyUID: string } & Record<string, unknown>
        >,
      ) => {
        if (!request.auth) {
          throw new HttpsError(
            "failed-precondition",
            "The function must be called while authenticated.",
          );
        }
        const email = request.auth.token.email as string;
        const lobbyUID = String(request.data?.lobbyUID ?? "");
        const state = await loadGameState<State>(lobbyUID);

        if (!state || state.public.game !== module.name) {
          throw new HttpsError("not-found", "No such game.");
        }
        if (state.public.status === "GAME_OVER") {
          throw new HttpsError("failed-precondition", "The game is over.");
        }
        if (state.public.activePlayer !== email) {
          // Out-of-turn calls are ignored rather than failed: a stale screen
          // may send one just as the turn moves on.
          logger.info(`${email} tried ${callableName} out of turn.`);
          return {};
        }

        const result = action(state, request.data);
        if (!result.ok) {
          throw new HttpsError("failed-precondition", result.reason);
        }

        await updateGameState(
          state,
          state.public.notification?.title || `${module.name}: ${callableName}`,
        );
        await playBots(module, state);
        return {};
      },
    );
  }

  return functions;
}
