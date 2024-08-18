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
import { createGame, getGameName } from "../helpers";
import { GameName } from "../types";

const checkAuthentication = (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
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

const getMaxPlayers = (gameName: GameName): number => {
  switch (gameName) {
    case "high-society":
      return 5;
    case "no-thanks":
      return 7;
    case "razzia":
      return 5;
    default:
      return 0 as never;
  }
};

export const createlobby = onCall(
  async (
    request: CallableRequest<{
      gameName: GameName;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const lobbyUID = Date.now().toString();

    return getDatabase()
      .ref("/lobbies/" + lobbyUID)
      .set({
        id: lobbyUID,
        game: request.data.gameName,
        players: [
          {
            email: request?.auth?.token.email || request?.auth?.token.uid,
            ready: false,
            joinedAt: Date.now().toString(),
            isBot: false,
            gameName: request.data.gameName,
          },
        ],
      })
      .then(() => {
        logger.info(`New lobby created for ${request.data.gameName}`);
        return { lobbyUID };
      })
      .catch((error: Error) => {
        throw new HttpsError("unknown", error.message, error);
      });
  }
);

export const joinlobby = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      email: string;
    }>
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
      (player: any) => player.email === email
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
  }
);

export const addbot = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
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

    playersSnapshotValue.push({
      email: `Bot #${playersSnapshotValue.length}`,
      ready: true,
      joinedAt: Date.now().toString(),
      isBot: true,
      gameName,
    });

    await updatePlayers(lobbyUID, playersSnapshotValue);
    logger.info("Lobby joined.");
    return { lobbyUID };
  }
);

export const readyup = onCall(
  async (
    request: CallableRequest<{
      email: string;
      lobbyUID: string;
    }>
  ) => {
    checkAuthentication(request);

    const { lobbyUID, email } = request.data;
    const playersSnapshotValue = await getPlayers(lobbyUID);

    let areAllPlayersReady = true;

    playersSnapshotValue.forEach((player: any) => {
      if (player.email === email) {
        player.ready = true;
      }

      if (!player.ready) {
        areAllPlayersReady = false;
      }
    });

    if (playersSnapshotValue.length >= 3 && areAllPlayersReady) {
      const gameName = getGameName(playersSnapshotValue);

      try {
        await createGame(lobbyUID, gameName);
      } catch (e) {
        console.log(e);
      }
    }

    await updatePlayers(lobbyUID, playersSnapshotValue);
    logger.info("Lobby joined.");
    return { lobbyUID };
  }
);
