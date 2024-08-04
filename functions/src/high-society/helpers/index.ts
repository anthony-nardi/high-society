import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import { HighSocietyGameState, Notification, PlayerState } from "../types";
import { shuffle } from "../../shared/helpers";
import { NoThanksGameState } from "../../no-thanks/types";
import { GenericGameState, GenericPlayerState } from "../../shared/types";

export const STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS = ["-5", "1/2", "-"];
export const GREEN_CARDS = ["2x", "1/2"];
export const MINUS_CARD = "-";
export const LUXURY_CARDS_DESC = [
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "1",
];

export function verifyRequestAuthentication(request: CallableRequest) {
  // Checking that the user is authenticated.
  if (!request.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new HttpsError(
      "failed-precondition",
      "The function must be " + "called while authenticated."
    );
  }
}

export function isHighSocietyGameState(
  gameStateSnapshot: any
): gameStateSnapshot is HighSocietyGameState {
  return gameStateSnapshot.public.gameName === "high-society";
}

export function isNoThanksGameState(
  gameStateSnapshot: any
): gameStateSnapshot is NoThanksGameState {
  return gameStateSnapshot.public.gameName === "no-thanks";
}

export async function getGameState<T>(lobbyUID: string): Promise<T> {
  const gameState = await getDatabase().ref(`games/${lobbyUID}`).get();
  return gameState.val();
}

export function revealNewStatusCard(gameState: HighSocietyGameState) {
  gameState.private.deck.shift();
  gameState.public.currentStatusCard = gameState.private.deck[0];
  gameState.public.remainingCards = gameState.private.deck.length;
}

export function returnPlayersBidToHand(player: PlayerState) {
  player.currentBid = player.currentBid || [];

  for (const bid of player.currentBid) {
    player.moneyCards.push(bid);
  }

  player.currentBid = [];
}

export function isGameOver(gameState: HighSocietyGameState) {
  const deck = gameState.private.deck;
  const currentStatusCard = gameState.public.currentStatusCard;

  const greenCardsRemaining = deck.filter((card) => {
    return GREEN_CARDS.includes(card);
  });

  if (
    greenCardsRemaining.length === 1 &&
    GREEN_CARDS.includes(currentStatusCard)
  ) {
    return true;
  }

  return false;
}

export function getDoesBiddingRoundEndOnFirstPass(
  gameState: HighSocietyGameState
) {
  return STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS.includes(
    gameState.public.currentStatusCard
  );
}

export function getEmailFromRequest(request: CallableRequest) {
  return request.auth?.token.email as string;
}

export function isActivePlayerTakingAction(
  gameState: GenericGameState,
  requestEmail: string
) {
  return gameState.public.activePlayer === requestEmail;
}

export function getActivePlayerIndex(gameState: HighSocietyGameState) {
  return gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );
}

export function getActivePlayer(gameState: GenericGameState) {
  const activePlayerIndex = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );

  return gameState.public.players[activePlayerIndex];
}

export function getNextPlayerIndex(gameState: HighSocietyGameState) {
  const indexOfCurrentPlayer = getActivePlayerIndex(gameState);

  let indexOfNextPlayer = indexOfCurrentPlayer + 1;

  // Game is 3 players:
  // Lets say active player is index 2, which means they are 3rd
  // Next player should be index 0
  // So, if index + 1 >= 3, nextIndex is 0
  if (indexOfNextPlayer >= gameState.public.players.length) {
    indexOfNextPlayer = 0;
  }

  let hasNextPlayerPassed =
    gameState.public.players[indexOfNextPlayer].hasPassed;

  while (hasNextPlayerPassed) {
    indexOfNextPlayer++;
    if (indexOfNextPlayer >= gameState.public.players.length) {
      indexOfNextPlayer = 0;
    }
    hasNextPlayerPassed = gameState.public.players[indexOfNextPlayer].hasPassed;
  }

  return indexOfNextPlayer;
}

export function updatePlayerLastAction(player: GenericPlayerState) {
  player.lastActionAt = Date.now();
}

export function updatePlayersBid(player: PlayerState, bid: string[]) {
  player.currentBid = (player.currentBid || []).concat(bid);
  const updatedMoneyCards = player.moneyCards.filter(
    (card) => !bid.includes(card)
  );
  player.moneyCards = updatedMoneyCards;
}

export function updateNextActivePlayer(gameState: HighSocietyGameState) {
  const indexOfNextPlayer = getNextPlayerIndex(gameState);

  gameState.public.activePlayer =
    gameState.public.players[indexOfNextPlayer].email;
}

export function updateGameState(
  gameState: HighSocietyGameState,
  message: string
) {
  return getDatabase()
    .ref("/games/" + gameState.public.id)
    .set(gameState)
    .then(() => {
      logger.info(message);
      return {};
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
}

export function giveCurrentStatusCardToPlayer(
  player: PlayerState,
  gameState: HighSocietyGameState
) {
  player.statusCards = player.statusCards || [];
  player.statusCards.push(gameState.public.currentStatusCard);
}

export function maybeUseMinusCard(
  player: PlayerState,
  gameState: HighSocietyGameState
) {
  player.statusCards = player.statusCards || [];

  if (gameState.public.currentStatusCard === MINUS_CARD) {
    let cardToRemove = "";

    for (let i = 0; i < LUXURY_CARDS_DESC.length; i++) {
      if (player.statusCards.includes(LUXURY_CARDS_DESC[i])) {
        cardToRemove = LUXURY_CARDS_DESC[i];
      }
    }

    // Remove lowest card and - card
    if (cardToRemove) {
      player.statusCards.splice(player.statusCards.indexOf(cardToRemove), 1);
      player.statusCards.splice(player.statusCards.indexOf(MINUS_CARD), 1);
    }
  }
}

export function setActivePlayerPass(gameState: HighSocietyGameState) {
  const activePlayer = getActivePlayer(gameState);
  activePlayer.hasPassed = true;
}

export function getPlayersActivelyBidding(gameState: HighSocietyGameState) {
  const players = gameState.public.players;
  let playersWithActiveBids = 0;

  players.forEach((player) => {
    if (!player.hasPassed) {
      playersWithActiveBids++;
    }
  });

  return playersWithActiveBids;
}

export function awardPlayerWithCurrentStatusCard(
  player: PlayerState,
  gameState: HighSocietyGameState
) {
  player.statusCards = player.statusCards || [];

  // If the player is holding a MINUS_CARD and
  // is being awarded their first LUXURY_CARD
  // then remove the MINUS_CARD

  // Otherwise, they get the card
  if (
    player.statusCards.includes(MINUS_CARD) &&
    LUXURY_CARDS_DESC.includes(gameState.public.currentStatusCard)
  ) {
    player.statusCards.splice(player.statusCards.indexOf(MINUS_CARD), 1);
  } else {
    player.statusCards.push(gameState.public.currentStatusCard);
  }

  player.currentBid = [];
}

export async function createHighSocietyGameState(lobbyUID: string) {
  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

  const playersMetadata = players.val().map((player: any) => {
    return {
      email: player.email,
      lastActionAt: 0,
      moneyCards: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25"],
      statusCards: [],
      currentBid: [],
      hasPassed: false,
      isBot: !!player.isBot,
    };
  });

  const deck = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "2x",
    "2x",
    "2x",
    "-5",
    "1/2",
    "-",
  ];

  shuffle(deck);

  return getDatabase()
    .ref("/games/" + lobbyUID)
    .set({
      public: {
        id: lobbyUID,
        game: "high-society",
        players: playersMetadata,
        activePlayer: playersMetadata[0].email,
        startAt: Date.now().toString(),
        status: "IN_PROGRESS",
        currentStatusCard: deck[0],
        remainingCards: deck.length - 1,
      },
      private: {
        deck,
      },
    })
    .then(() => {
      logger.info("New game created.");
      return { lobbyUID, message: "New game created." };
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
}

export function getHighestCurrentBid(gameState: HighSocietyGameState) {
  let highestBid = 0;

  gameState.public.players.forEach((player) => {
    const playersBid = (player.currentBid || []).reduce(
      (sum, current) => Number(sum) + Number(current),
      0
    );

    if (playersBid > highestBid) {
      highestBid = playersBid;
    }
  });

  return highestBid;
}

export function getBidValue(bid: string[]) {
  return bid.reduce((sum, current) => Number(sum) + Number(current), 0);
}

export async function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function updateGameStateWithBid(
  gameState: HighSocietyGameState,
  activePlayer: PlayerState,
  bid: string[]
) {
  updatePlayerLastAction(activePlayer);
  updatePlayersBid(activePlayer, bid);
  updateNextActivePlayer(gameState);

  const totalBid = bid.reduce(
    (sum: number, current) => Number(sum) + Number(current),
    0
  );

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has highest bid of ${totalBid}.`,
  };

  gameState.public.notification = notification;

  await updateGameState(
    gameState,
    `Player ${activePlayer.email} bid ${bid.join(",")}`
  );
}

export async function updateGameStateWithPass(
  gameState: HighSocietyGameState,
  activePlayer: PlayerState
) {
  const doesBiddingRoundEndOnFirstPass =
    getDoesBiddingRoundEndOnFirstPass(gameState);

  if (doesBiddingRoundEndOnFirstPass) {
    // The active player is the one who passed.

    // Award the player who passed the currentStatusCard
    // The player who passed current bid is returned to their moneyCards
    // Reset all players current bids
    // Flip a new card from the deck

    const cardAwarded = gameState.public.currentStatusCard;
    const players = gameState.public.players;

    players.forEach((player) => {
      if (player.email === activePlayer.email) {
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
      title: `${activePlayer.email} passes and receives ${cardAwarded}.`,
      message,
    };

    gameState.public.notification = notification;

    return updateGameState(
      gameState,
      `${activePlayer.email} is the first to pass and receives ${cardAwarded}.`
    );
  }

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

    const players = gameState.public.players;

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
      title: `${activePlayer.email} passed.`,
    };

    gameState.public.notification = notification;

    await updateGameState(gameState, `${activePlayer.email} has passed.`);
    return true;
  }
}
