import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { POLICE_RAIDS, RazziaGameState } from "../types";
import {
  doesAtLeastOnePlayerHaveAvailableMoney,
  getActivePlayer,
  getPlayerWithHighestBid,
  hasHitRaidLimit,
  makeAllPlayersMoneyAvailable,
  transferCategorizedCardsToPlayer,
  updateActivePlayer,
  updateActivePlayerForNewRound,
} from "../helpers";
import { Notification } from "../../shared/types";
import { updateGameState } from "../../shared/helpers";

export const revealCard = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<RazziaGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    gameState.public.revealedCards = gameState.public.revealedCards || [];

    const deck = gameState.private.deck;

    const card = deck.shift();

    gameState.public.remainingCards = deck.length;

    if (!card) {
      throw new Error("No more cards in the deck.");
    }

    if (gameState.public.revealedCards.length === 7) {
      throw new Error("7 cards have been revealed already. Invalid action.");
    }

    if (card !== POLICE_RAIDS) {
      gameState.public.revealedCards.push(card);

      updateActivePlayer(gameState);

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${activePlayer?.email} has revealed the ${card}.`,
      };

      gameState.public.notification = notification;

      await updateGameState(gameState, notification.title);
    } else if (hasHitRaidLimit(gameState)) {
      gameState.public.policeRaids = 0;
      gameState.public.notification = {
        timestamp: Date.now(),
        title: "Police Raids have been reset.",
      };

      gameState.public.revealedCards = [];

      if (gameState.public.round === 3) {
        gameState.public.status = "GAME_OVER";
        gameState.public.notification = {
          timestamp: Date.now(),
          title: "Game Over",
        };
      } else {
        gameState.public.round += 1;
        updateActivePlayerForNewRound(gameState);
        makeAllPlayersMoneyAvailable(gameState);
      }

      await updateGameState(gameState, "Police Raids have been reset.");
    } else {
      gameState.public.policeRaids += 1;
      gameState.public.notification = {
        timestamp: Date.now(),
        title: "Police Raids have been increased.",
      };
      gameState.public.roundState = "FORCED_AUCTION";
      updateActivePlayer(gameState);
      gameState.public.auctionTriggeringPlayer = activePlayer?.email;
      await updateGameState(gameState, "Police Raids have been increased");
    }
  }
);

export const initiateAuction = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<RazziaGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    gameState.public.roundState = "NORMAL_AUCTION";
    gameState.public.auctionTriggeringPlayer = gameState.public.activePlayer;

    updateActivePlayer(gameState);

    gameState.public.notification = {
      timestamp: Date.now(),
      title: `${gameState.public.activePlayer} has initiated an auction.`,
    };

    await updateGameState(gameState, "Auction initiated.");
  }
);

export const useThief = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<RazziaGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }
  }
);

export const passOnLoot = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<RazziaGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    if (!activePlayer) {
      throw new Error("Active player not found.");
    }

    if (activePlayer.email !== gameState.public.auctionTriggeringPlayer) {
      updateActivePlayer(gameState);

      gameState.public.notification = {
        timestamp: Date.now(),
        title: `${gameState.public.activePlayer} has passed.`,
      };

      await updateGameState(gameState, "Player has passed.");
    } else {
      const hasAnyPlayerBid = gameState.public.players.some(
        (player) => player.bid
      );

      if (!hasAnyPlayerBid) {
        // Throw if roundState is not "FORCED_AUCTION"
        if (gameState.public.roundState !== "FORCED_AUCTION") {
          throw new Error("Invalid action.");
        }

        gameState.public.notification = {
          timestamp: Date.now(),
          title: "No player has bid.",
        };

        gameState.public.roundState = "ACTION";

        if (!doesAtLeastOnePlayerHaveAvailableMoney(gameState)) {
          gameState.public.roundState = "SCORING";

          if (gameState.public.round === 3) {
            gameState.public.status = "GAME_OVER";
            gameState.public.notification = {
              timestamp: Date.now(),
              title: "Game Over",
            };
          } else {
            gameState.public.round += 1;
            updateActivePlayerForNewRound(gameState);
            makeAllPlayersMoneyAvailable(gameState);
          }
        }

        await updateGameState(gameState, "No player has bid.");
        return;
      }
      // The activePlayer is the last player to bid.
      // Now we determine who wins the auction, award that
      // player the revealedCards and the money from the auction.
      // Then we set the activePlayer to the player after the
      // forced auction starting player.
      const highestBiddingPlayer = getPlayerWithHighestBid(gameState);

      if (!highestBiddingPlayer) {
        throw new Error("Highest bidding player not found.");
      }

      const highestBid = highestBiddingPlayer.bid;

      // Remove the bid from the player's availableMoney and money.
      highestBiddingPlayer.availableMoney =
        highestBiddingPlayer.availableMoney || [];
      highestBiddingPlayer.availableMoney =
        highestBiddingPlayer.availableMoney.filter(
          (money) => money !== highestBiddingPlayer.bid
        );
      highestBiddingPlayer.money = highestBiddingPlayer.money || [];
      highestBiddingPlayer.money = highestBiddingPlayer.money.filter(
        (money) => money !== highestBiddingPlayer.bid
      );

      // The players bid becomes the next money to be won.
      gameState.public.money = highestBid;

      // Award the player the revealed cards and the money.
      highestBiddingPlayer.money.push(gameState.public.money);
      highestBiddingPlayer.cards = highestBiddingPlayer.cards || [];
      transferCategorizedCardsToPlayer(gameState, highestBiddingPlayer);

      updateActivePlayer(gameState);

      gameState.public.notification = {
        timestamp: Date.now(),
        title: `${highestBiddingPlayer.email} has won the auction with a bid of ${highestBid}.`,
      };

      gameState.public.roundState = "ACTION";

      if (!doesAtLeastOnePlayerHaveAvailableMoney(gameState)) {
        gameState.public.roundState = "SCORING";

        if (gameState.public.round === 3) {
          gameState.public.status = "GAME_OVER";
          gameState.public.notification = {
            timestamp: Date.now(),
            title: "Game Over",
          };
        } else {
          gameState.public.round += 1;
          updateActivePlayerForNewRound(gameState);
          makeAllPlayersMoneyAvailable(gameState);
        }
      }

      await updateGameState(
        gameState,
        `${highestBiddingPlayer.email} has won the auction with a bid of ${highestBid}.`
      );
    }
  }
);

export const bidOnLoot = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      amount: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<RazziaGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    if (!activePlayer) {
      throw new Error("Active player not found.");
    }

    activePlayer.bid = request.data.amount;

    if (
      gameState.public.activePlayer !== gameState.public.auctionTriggeringPlayer
    ) {
      updateActivePlayer(gameState);
      gameState.public.notification = {
        timestamp: Date.now(),
        title: `${activePlayer.email} has bid ${activePlayer.bid}.`,
      };
      await updateGameState(
        gameState,
        `${activePlayer.email} has bid ${activePlayer.bid}.`
      );
      return;
    }

    // The activePlayer is the last player to bid.
    // Now we determine who wins the auction, award that
    // player the revealedCards and the money from the auction.
    // Then we set the activePlayer to the player after the
    // forced auction starting player.
    const highestBiddingPlayer = getPlayerWithHighestBid(gameState);

    if (!highestBiddingPlayer) {
      throw new Error("Highest bidding player not found.");
    }

    const highestBid = highestBiddingPlayer.bid;

    // Remove the bid from the player's availableMoney and money.
    highestBiddingPlayer.availableMoney =
      highestBiddingPlayer.availableMoney || [];
    highestBiddingPlayer.availableMoney =
      highestBiddingPlayer.availableMoney.filter(
        (money) => money !== highestBiddingPlayer.bid
      );
    highestBiddingPlayer.money = highestBiddingPlayer.money || [];
    highestBiddingPlayer.money = highestBiddingPlayer.money.filter(
      (money) => money !== highestBiddingPlayer.bid
    );

    // The players bid becomes the next money to be won.
    gameState.public.money = highestBid;

    // Award the player the revealed cards and the money.
    highestBiddingPlayer.money.push(gameState.public.money);
    highestBiddingPlayer.cards = highestBiddingPlayer.cards || [];
    transferCategorizedCardsToPlayer(gameState, highestBiddingPlayer);

    updateActivePlayer(gameState);

    gameState.public.notification = {
      timestamp: Date.now(),
      title: `${highestBiddingPlayer.email} has won the auction with a bid of ${highestBid}.`,
    };

    gameState.public.roundState = "ACTION";

    if (!doesAtLeastOnePlayerHaveAvailableMoney(gameState)) {
      gameState.public.roundState = "SCORING";

      if (gameState.public.round === 3) {
        gameState.public.status = "GAME_OVER";
        gameState.public.notification = {
          timestamp: Date.now(),
          title: "Game Over",
        };
      } else {
        gameState.public.round += 1;
        updateActivePlayerForNewRound(gameState);
        makeAllPlayersMoneyAvailable(gameState);
      }
    }

    await updateGameState(
      gameState,
      `${highestBiddingPlayer.email} has won the auction with a bid of ${highestBid}.`
    );
  }
);
