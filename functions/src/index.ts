import admin from "firebase-admin";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import {
  getActivePlayer,
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  isGameOver,
  isNoThanksGameState,
  updateGameStateWithBid,
  updateGameStateWithPass,
  verifyRequestAuthentication,
} from "./high-society/helpers";
import {
  isActivePlayerBot,
  maybeTakeBotTurn,
} from "./high-society/helpers/bot";
import { getGameName, createGame } from "./shared/helpers";
import { HighSocietyGameState } from "./high-society/types";
import { NoThanksGameState } from "./no-thanks/types";

admin.initializeApp();

exports.bid = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      bid: string[];
    }>
  ) => {
    verifyRequestAuthentication(request);

    const { lobbyUID, bid } = request.data;
    const requestEmail = getEmailFromRequest(request);
    const gameState = (await getGameState(lobbyUID)) as HighSocietyGameState;

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    await updateGameStateWithBid(gameState, activePlayer, bid);

    // Theoretically a bot may be the first to make
    // a move if there are 4 bots and 1 player.
    // If a bot passes on a negative card it goes again.
    // If a bot wins an auction, it goes again.
    // Not gonna bother figuring out the actual highest
    // bot move streak so lets settle for something.
    let attemptsToLetBotMakeMove = 30;

    while (
      !isGameOver(gameState) &&
      isActivePlayerBot(gameState) &&
      attemptsToLetBotMakeMove > 0
    ) {
      attemptsToLetBotMakeMove--;

      await maybeTakeBotTurn(gameState);
    }

    return {};
  }
);

exports.passturn = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    await updateGameStateWithPass(gameState, activePlayer);

    // Theoretically a bot may be the first to make
    // a move if there are 4 bots and 1 player.
    // If a bot passes on a negative card it goes again.
    // If a bot wins an auction, it goes again.
    // Not gonna bother figuring out the actual highest
    // bot move streak so lets settle for something.
    let attemptsToLetBotMakeMove = 30;

    while (
      !isGameOver(gameState) &&
      isActivePlayerBot(gameState) &&
      attemptsToLetBotMakeMove > 0
    ) {
      attemptsToLetBotMakeMove--;
      await maybeTakeBotTurn(gameState);
    }
  }
);

exports.createlobby = onCall(
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

exports.joinlobby = onCall(
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

exports.addbot = onCall(
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

exports.readyup = onCall(
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

exports.takeActiveCard = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<NoThanksGameState>(lobbyUID);

    if (isNoThanksGameState(gameState)) {
      if (!isActivePlayerTakingAction(gameState, requestEmail)) {
        return;
      }

      const activePlayer = getActivePlayer(gameState);

      await updateGameStateWithPass(gameState, activePlayer);

      // Theoretically a bot may be the first to make
      // a move if there are 4 bots and 1 player.
      // If a bot passes on a negative card it goes again.
      // If a bot wins an auction, it goes again.
      // Not gonna bother figuring out the actual highest
      // bot move streak so lets settle for something.
      let attemptsToLetBotMakeMove = 30;

      while (
        !isGameOver(gameState) &&
        isActivePlayerBot(gameState) &&
        attemptsToLetBotMakeMove > 0
      ) {
        attemptsToLetBotMakeMove--;
        await maybeTakeBotTurn(gameState);
      }
    }
  }
);
