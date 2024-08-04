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

export const createlobby = onCall(
  async (
    request: CallableRequest<{
      gameName: "high-society" | "no-thanks";
    }>
  ) => {
    verifyRequestAuthentication(request);

    const lobbyUID = Date.now().toString();

    return getDatabase()
      .ref("/lobbies/" + lobbyUID)
      .set({
        id: lobbyUID,
        game: "high-society",
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
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
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
    // Checking that the user is authenticated.
    if (!request.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new HttpsError(
        "failed-precondition",
        "The function must be " + "called while authenticated."
      );
    }

    const { lobbyUID, email } = request.data;

    // Add new player to the lobby if they don't already exist

    const players = await getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .get();

    const playersSnapshotValue = players.val();

    const gameName = getGameName(playersSnapshotValue);
    const maxPlayers = gameName === "high-society" ? 5 : 7;

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

    getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .set(playersSnapshotValue)
      .then(() => {
        logger.info("Lobby joined.");
        return { lobbyUID };
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }
);

export const addbot = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    // Checking that the user is authenticated.
    if (!request.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new HttpsError(
        "failed-precondition",
        "The function must be " + "called while authenticated."
      );
    }

    const { lobbyUID } = request.data;

    // Add new player to the lobby if they don't already exist

    const players = await getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .get();

    const playersSnapshotValue = players.val();

    const gameName = getGameName(playersSnapshotValue);
    const maxPlayers = gameName === "high-society" ? 5 : 7;

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

    getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .set(playersSnapshotValue)
      .then(() => {
        logger.info("Lobby joined.");
        return { lobbyUID };
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }
);

export const readyup = onCall(
  async (
    request: CallableRequest<{
      email: string;
      lobbyUID: string;
    }>
  ) => {
    // Checking that the user is authenticated.
    if (!request.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new HttpsError(
        "failed-precondition",
        "The function must be " + "called while authenticated."
      );
    }

    const { lobbyUID, email } = request.data;

    // Add new player to the lobby if they don't already exist

    const players = await getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .get();

    const playersSnapshotValue = players.val();

    let areAllPlayersReady = true;

    playersSnapshotValue.forEach((player: any) => {
      if (player.email === email) {
        player.ready = true;
      }

      if (player.ready === false) {
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

    getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .set(playersSnapshotValue)
      .then(() => {
        logger.info("Lobby joined.");
        return { lobbyUID };
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }
);
