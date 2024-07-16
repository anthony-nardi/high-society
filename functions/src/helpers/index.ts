import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import { GameState, PlayerState } from "../types";

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

export async function getGameState(lobbyUID: string) {
  const gameState = await getDatabase().ref(`games/${lobbyUID}`).get();
  return gameState.val() as GameState;
}

export function revealNewStatusCard(gameState: GameState) {
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

export function isGameOver(gameState: GameState) {
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

export function getDoesBiddingRoundEndOnFirstPass(gameState: GameState) {
  return STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS.includes(
    gameState.public.currentStatusCard
  );
}

export function getEmailFromRequest(request: CallableRequest) {
  return request.auth?.token.email as string;
}

export function isActivePlayerTakingAction(
  gameState: GameState,
  requestEmail: string
) {
  return gameState.public.activePlayer === requestEmail;
}

export function getActivePlayerIndex(gameState: GameState) {
  return gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );
}

export function getActivePlayer(gameState: GameState) {
  const activePlayerIndex = gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );

  return gameState.public.players[activePlayerIndex];
}

export function getNextPlayerIndex(gameState: GameState) {
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

export function updatePlayerLastAction(player: PlayerState) {
  player.lastActionAt = Date.now();
}

export function updatePlayersBid(player: PlayerState, bid: string[]) {
  player.currentBid = (player.currentBid || []).concat(bid);
  const updatedMoneyCards = player.moneyCards.filter(
    (card) => !bid.includes(card)
  );
  player.moneyCards = updatedMoneyCards;
}

export function updateNextActivePlayer(gameState: GameState) {
  const indexOfNextPlayer = getNextPlayerIndex(gameState);

  gameState.public.activePlayer =
    gameState.public.players[indexOfNextPlayer].email;
}

export function updateGameState(gameState: GameState, message: string) {
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
  gameState: GameState
) {
  player.statusCards = player.statusCards || [];
  player.statusCards.push(gameState.public.currentStatusCard);
}

export function maybeUseMinusCard(player: PlayerState, gameState: GameState) {
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

export function setActivePlayerPass(gameState: GameState) {
  const activePlayer = getActivePlayer(gameState);
  activePlayer.hasPassed = true;
}

export function getPlayersActivelyBidding(gameState: GameState) {
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
  gameState: GameState
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

export function shuffle(array: string[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
}

export async function createGame(lobbyUID: string) {
  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

  const playersMetadata = players.val().map((player: any) => {
    return {
      email: player.email,
      lastActionAt: 0,
      moneyCards: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25"],
      statusCards: [],
      currentBid: [],
      hasPassed: false,
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
        remainingCards: deck.length,
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
