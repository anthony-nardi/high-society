import { personaById, pickPersona } from "../personas";
import type { PlayerInLobby } from "../types";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import {
  getGameState,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { createGame, getGameName, isLobbyReady } from "../helpers";
import { GameName, LobbyOptions } from "../types";
import { GAME_INFO } from "../gameInfo";
import { GenericGameState } from "../types";
import { loadGameState, playBots } from "../game";
import { getGameModule } from "../registry";

const checkAuthentication = (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError(
      "failed-precondition",
      "The function must be called while authenticated.",
    );
  }
};

const getPlayers = async (lobbyUID: string) => {
  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();
  return players.val();
};

const updatePlayers = async (lobbyUID: string, players: any) => {
  await getDatabase().ref(`lobbies/${lobbyUID}/players`).set(players);
};

const getMaxPlayers = (gameName: GameName): number =>
  GAME_INFO[gameName]?.maxPlayers ?? 0;

export const createlobby = onCall(
  async (
    request: CallableRequest<{
      gameName: GameName;
      /** A finished game this lobby is a rematch of; its players get a link. */
      rematchOf?: string;
      /** Variant choices, such as Acquire's bonus mode. */
      options?: LobbyOptions;
    }>,
  ) => {
    verifyRequestAuthentication(request);

    const lobbyUID = Date.now().toString();
    const { gameName, rematchOf } = request.data;
    const options: LobbyOptions = { ...(request.data.options || {}) };

    try {
      const players: any[] = [
        {
          email: request?.auth?.token.email || request?.auth?.token.uid,
          ready: false,
          joinedAt: Date.now().toString(),
          isBot: false,
          gameName,
        },
      ];

      // A rematch brings the finished game's bots along, already ready.
      let finished: any = null;
      if (rematchOf) {
        const snapshot = await getDatabase()
          .ref(`games/${rematchOf}/public`)
          .get();
        finished = snapshot.val();
        // A rematch keeps the variant unless the caller chose another.
        if (finished?.mode && !options.mode) options.mode = finished.mode;
        if (finished?.status === "GAME_OVER") {
          for (const player of finished.players || []) {
            if (player.isBot) {
              players.push({
                email: player.email,
                ready: true,
                joinedAt: Date.now().toString(),
                isBot: true,
                gameName,
              });
            }
          }
        }
      }

      await getDatabase()
        .ref("/lobbies/" + lobbyUID)
        .set({
          id: lobbyUID,
          game: gameName,
          players,
          ...(Object.keys(options).length ? { options } : {}),
        });

      if (finished?.status === "GAME_OVER") {
        await getDatabase()
          .ref(`games/${rematchOf}/public/nextLobbyUID`)
          .set(lobbyUID);
      }
    } catch (error: any) {
      throw new HttpsError("unknown", error.message, error);
    }

    logger.info(`New lobby created for ${gameName}`);
    return { lobbyUID };
  },
);

export const joinlobby = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      email: string;
    }>,
  ) => {
    checkAuthentication(request);

    const { lobbyUID, email } = request.data;
    const playersSnapshotValue = await getPlayers(lobbyUID);

    const gameName = getGameName(playersSnapshotValue);
    const maxPlayers = getMaxPlayers(gameName);

    if (playersSnapshotValue.length >= maxPlayers) {
      return;
    }

    const gameState = await getGameState(lobbyUID);
    if (gameState) {
      return;
    }

    const doesPlayerExist = playersSnapshotValue.find(
      (player: any) => player.email === email,
    );

    if (doesPlayerExist) return;

    playersSnapshotValue.push({
      email,
      ready: false,
      joinedAt: Date.now().toString(),
      isBot: false,
      gameName,
    });

    await updatePlayers(lobbyUID, playersSnapshotValue);
    logger.info("Lobby joined.");
    return { lobbyUID };
  },
);

export const addbot = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (
    request: CallableRequest<{
      lobbyUID: string;
      /** A persona id; one not yet at the table is drawn when absent. */
      persona?: string;
    }>,
  ) => {
    checkAuthentication(request);

    const { lobbyUID } = request.data;
    const playersSnapshotValue = await getPlayers(lobbyUID);

    const gameName = getGameName(playersSnapshotValue);
    const maxPlayers = getMaxPlayers(gameName);

    if (playersSnapshotValue.length >= maxPlayers) {
      return;
    }

    const gameState = await getGameState(lobbyUID);
    if (gameState) {
      return;
    }

    const persona =
      personaById(request.data.persona) ??
      pickPersona(playersSnapshotValue.map((p: PlayerInLobby) => p.persona));
    playersSnapshotValue.push({
      email: `Bot #${playersSnapshotValue.length}`,
      ready: true,
      joinedAt: Date.now().toString(),
      isBot: true,
      gameName,
      persona: persona.id,
    });

    await updatePlayers(lobbyUID, playersSnapshotValue);
    logger.info("Bot added to lobby.");
    // The humans may already have readied up; a bot is always ready.
    if (isLobbyReady(playersSnapshotValue)) {
      await createGame(lobbyUID, gameName);
    }
    return { lobbyUID };
  },
);

export const removebot = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      email: string;
    }>,
  ) => {
    checkAuthentication(request);

    const { lobbyUID, email } = request.data;
    const playersSnapshotValue = await getPlayers(lobbyUID);

    const gameState = await getGameState(lobbyUID);
    if (gameState) {
      return;
    }

    const remaining = (playersSnapshotValue || []).filter(
      (player: any) => !(player.isBot && player.email === email),
    );

    if (remaining.length === playersSnapshotValue.length) {
      return;
    }

    await updatePlayers(lobbyUID, remaining);
    logger.info(`Bot ${email} removed from lobby.`);
    return { lobbyUID };
  },
);

/**
 * Lets the bots play on if it is a bot's turn. Clients call this after a
 * bot has been quiet too long: a cut-short chain or a game that opened on
 * a bot's turn would otherwise wait forever.
 */
export const playbots = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request: CallableRequest<{ lobbyUID: string }>) => {
    checkAuthentication(request);
    const state = await loadGameState<GenericGameState>(
      String(request.data.lobbyUID),
    );
    if (!state || state.public.status === "GAME_OVER") return {};
    const module = getGameModule(state.public.game as GameName);
    await playBots(module, state);
    return {};
  },
);

export const readyup = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (
    request: CallableRequest<{
      email: string;
      lobbyUID: string;
    }>,
  ) => {
    checkAuthentication(request);

    const { lobbyUID, email } = request.data;
    const playersSnapshotValue = await getPlayers(lobbyUID);

    playersSnapshotValue.forEach((player: any) => {
      if (player.email === email) {
        player.ready = true;
      }
    });

    const gameName = getGameName(playersSnapshotValue);
    if (isLobbyReady(playersSnapshotValue)) {
      try {
        await createGame(lobbyUID, gameName);
      } catch (e) {
        console.log(e);
      }
    }

    await updatePlayers(lobbyUID, playersSnapshotValue);
    logger.info("Lobby joined.");
    return { lobbyUID };
  },
);
