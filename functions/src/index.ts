import admin from "firebase-admin";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import {
  awardPlayerWithCurrentStatusCard,
  createGame,
  getActivePlayer,
  getActivePlayerIndex,
  getDoesBiddingRoundEndOnFirstPass,
  getEmailFromRequest,
  getGameState,
  getPlayersActivelyBidding,
  giveCurrentStatusCardToPlayer,
  isActivePlayerTakingAction,
  isGameOver,
  maybeUseMinusCard,
  returnPlayersBidToHand,
  revealNewStatusCard,
  setActivePlayerPass,
  updateGameState,
  updateNextActivePlayer,
  updatePlayerLastAction,
  updatePlayersBid,
  verifyRequestAuthentication,
} from "./helpers";

admin.initializeApp();

exports.bid = onCall(async (request) => {
  verifyRequestAuthentication(request);

  const { lobbyUID, bid } = request.data;
  const requestEmail = getEmailFromRequest(request);
  const gameState = await getGameState(lobbyUID);
  const players = gameState.public.players;

  if (!isActivePlayerTakingAction(gameState, requestEmail)) {
    return;
  }

  const indexOfCurrentPlayer = getActivePlayerIndex(gameState);
  const activePlayer = players[indexOfCurrentPlayer];

  updatePlayerLastAction(activePlayer);
  updatePlayersBid(activePlayer, bid);
  updateNextActivePlayer(gameState);

  return updateGameState(
    gameState,
    `Player ${requestEmail} bid ${bid.join(",")}`
  );
});

exports.passturn = onCall(async (request) => {
  verifyRequestAuthentication(request);

  const requestEmail = getEmailFromRequest(request);
  const { lobbyUID } = request.data;

  const gameState = await getGameState(lobbyUID);
  const players = gameState.public.players;

  if (!isActivePlayerTakingAction(gameState, requestEmail)) {
    return;
  }

  const doesBiddingRoundEndOnFirstPass =
    getDoesBiddingRoundEndOnFirstPass(gameState);

  if (doesBiddingRoundEndOnFirstPass) {
    // The active player is the one who passed.

    // Award the player who passed the currentStatusCard
    // The player who passed current bid is returned to their moneyCards
    // Reset all players current bids
    // Flip a new card from the deck

    players.forEach((player) => {
      if (player.email === requestEmail) {
        updatePlayerLastAction(player);
        giveCurrentStatusCardToPlayer(player, gameState);
        returnPlayersBidToHand(player);
        maybeUseMinusCard(player, gameState);
      } else {
        player.currentBid = [];
      }
    });

    revealNewStatusCard(gameState);

    if (isGameOver(gameState)) {
      gameState.public.status = "GAME_OVER";
    }

    return updateGameState(gameState, `${requestEmail} is the first to pass.`);
  }

  const activePlayer = getActivePlayer(gameState);

  updatePlayerLastAction(activePlayer);
  setActivePlayerPass(gameState);
  returnPlayersBidToHand(activePlayer);

  const playersWithActiveBids = getPlayersActivelyBidding(gameState);

  if (playersWithActiveBids === 1) {
    // Award the player with the only remaining bid the currentStatusCard
    // All players who passed return their currentBid to their moneyCard
    // Set all players hasPassed flags to false
    // Flip a new card from the deck

    let auctionWinner = "";

    players.forEach((player) => {
      if (player.hasPassed === false) {
        awardPlayerWithCurrentStatusCard(player, gameState);
        auctionWinner = player.email;
      }

      player.hasPassed = false;
    });

    revealNewStatusCard(gameState);

    if (isGameOver(gameState)) {
      gameState.public.status = "GAME_OVER";
    }

    gameState.public.activePlayer = auctionWinner;

    return updateGameState(gameState, `Player ${auctionWinner} won auction.`);
  } else {
    // Update the next player
    // Player who passed has their bid returned to their hand
    updateNextActivePlayer(gameState);
    return updateGameState(gameState, `${requestEmail} has passed.`);
  }
});

exports.createlobby = onCall((request) => {
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
        },
      ],
    })
    .then(() => {
      logger.info("New lobby created.");
      return { lobbyUID };
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
});

exports.joinlobby = onCall(async (request) => {
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

  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

  const playersSnapshotValue = players.val();

  console.log(playersSnapshotValue);

  const doesPlayerExist = playersSnapshotValue.find(
    (player: any) => player.email === email
  );

  console.log("doesPlayerExist:", doesPlayerExist ? "true" : "false");

  if (doesPlayerExist) return;

  console.log(`Attempting to add ${email} to the lobby.`);

  playersSnapshotValue.push({
    email,
    ready: false,
    joinedAt: Date.now().toString(),
  });

  console.log(`New players: ${playersSnapshotValue}`);

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
});

exports.readyup = onCall(async (request) => {
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

  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

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
    try {
      await createGame(lobbyUID);
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
});
