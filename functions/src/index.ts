import admin from "firebase-admin";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import {
  awardPlayerWithCurrentStatusCard,
  createGame,
  getActivePlayer,
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
  wait,
} from "./helpers";
import { Notification } from "./types";
import { generateContent, isValidSuggestedBid } from "./helpers/bot";

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
    const gameState = await getGameState(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const currentTimestamp = Date.now();

    try {
      const suggestedAction = await generateContent(gameState);

      if (suggestedAction && suggestedAction.length) {
        const isValidAction = isValidSuggestedBid(gameState, suggestedAction);
        console.log(`isValidAction: ${isValidAction}`);
      } else {
        // We should simply pass since that is always a valid action but
        // it might not be optimal.
        // Later we can implement some logic to guess... but too lazy
        console.log("passing");
      }
    } catch (e) {
      console.log(e);
    }

    const timeElapsed = Date.now() - currentTimestamp;

    if (timeElapsed < 6000) {
      await wait(6000 - timeElapsed);
    }

    const activePlayer = getActivePlayer(gameState);

    updatePlayerLastAction(activePlayer);
    updatePlayersBid(activePlayer, bid);
    updateNextActivePlayer(gameState);

    const totalBid = bid.reduce(
      (sum: number, current) => Number(sum) + Number(current),
      0
    );

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${requestEmail} has highest bid of ${totalBid}.`,
    };

    gameState.public.notification = notification;

    return updateGameState(
      gameState,
      `Player ${requestEmail} bid ${bid.join(",")}`
    );
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

      const cardAwarded = gameState.public.currentStatusCard;

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

      let message = "";

      if (isGameOver(gameState)) {
        gameState.public.status = "GAME_OVER";
        const { currentStatusCard } = gameState.public;
        message = `${currentStatusCard} was revealed. Game over.`;
      }

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${requestEmail} passes and receives ${cardAwarded}.`,
        message,
      };

      gameState.public.notification = notification;

      return updateGameState(
        gameState,
        `${requestEmail} is the first to pass and receives ${cardAwarded}.`
      );
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
      let totalBid = 0;
      const cardAwarded = gameState.public.currentStatusCard;

      players.forEach((player) => {
        if (player.hasPassed === false) {
          totalBid = (player.currentBid || []).reduce(
            (sum: number, current: string) => Number(sum) + Number(current),
            0
          );

          awardPlayerWithCurrentStatusCard(player, gameState);
          auctionWinner = player.email;
        }

        player.hasPassed = false;
      });

      revealNewStatusCard(gameState);

      let message = "";

      if (isGameOver(gameState)) {
        gameState.public.status = "GAME_OVER";
        const { currentStatusCard } = gameState.public;
        message = `${currentStatusCard} was revealed. Game over.`;
      }

      gameState.public.activePlayer = auctionWinner;

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${auctionWinner} won ${cardAwarded} for a total of ${totalBid}.`,
        message,
      };

      gameState.public.notification = notification;

      return updateGameState(gameState, `Player ${auctionWinner} won auction.`);
    } else {
      // Update the next player
      // Player who passed has their bid returned to their hand
      updateNextActivePlayer(gameState);

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${requestEmail} passed.`,
      };

      gameState.public.notification = notification;

      return updateGameState(gameState, `${requestEmail} has passed.`);
    }
  }
);

exports.createlobby = onCall(async (request) => {
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

    if (playersSnapshotValue.length >= 5) {
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
  }
);
