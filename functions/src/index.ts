import admin from "firebase-admin";

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";

export type PlayerState = {
  email: string;
  lastActionAt: number;
  moneyCards: string[];
  statusCards?: string[]; // Realtime Database doesnt like arrays, they dont exist unless they contain values
  currentBid?: string[]; // Realtime Database doesnt like arrays, they dont exist unless they contain values
  hasPassed: boolean;
};

export type PublicGameState = {
  id: string;
  game: string;
  players: PlayerState[];
  activePlayer: string;
  startAt: string;
  status: string;
  currentStatusCard: string;
  remainingCards: number;
};

export type PrivateGameState = {
  deck: string[];
};

type GameState = {
  public: PublicGameState;
  private: PrivateGameState;
};

const STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS = ["-5", "1/2", "-"];
const GREEN_CARDS = ["2x", "1/2"];
const MINUS_CARD = "-";

admin.initializeApp();

function verifyRequestAuthentication(request: CallableRequest) {
  // Checking that the user is authenticated.
  if (!request.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new HttpsError(
      "failed-precondition",
      "The function must be " + "called while authenticated."
    );
  }
}

async function getGameState(lobbyUID: string) {
  const gameState = await getDatabase().ref(`games/${lobbyUID}`).get();
  return gameState.val() as GameState;
}

function revealNewStatusCard(gameState: GameState) {
  gameState.private.deck.shift();
  gameState.public.currentStatusCard = gameState.private.deck[0];
  gameState.public.remainingCards = gameState.private.deck.length;
}

function returnPlayersBidToHand(player: PlayerState) {
  player.currentBid = player.currentBid || [];

  for (const bid in player.currentBid) {
    player.moneyCards.push(bid);
  }

  player.currentBid = [];
}

function isGameOver(gameState: GameState) {
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

function getDoesBiddingRoundEndOnFirstPass(gameState: GameState) {
  return STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS.includes(
    gameState.public.currentStatusCard
  );
}

function getEmailFromRequest(request: CallableRequest) {
  return request.auth?.token.email as string;
}

function isActivePlayerTakingAction(
  gameState: GameState,
  requestEmail: string
) {
  return gameState.public.activePlayer === requestEmail;
}

function getActivePlayerIndex(gameState: GameState) {
  return gameState.public.players.findIndex(
    (player) => player.email === gameState.public.activePlayer
  );
}

function getNextPlayerIndex(gameState: GameState) {
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

function updatePlayerLastAction(player: PlayerState) {
  player.lastActionAt = Date.now();
}

function updatePlayersBid(player: PlayerState, bid: string[]) {
  player.currentBid = (player.currentBid || []).concat(bid);
  const updatedMoneyCards = player.moneyCards.filter(
    (card) => !bid.includes(card)
  );
  player.moneyCards = updatedMoneyCards;
}

function updateNextActivePlayer(gameState: GameState) {
  const indexOfNextPlayer = getNextPlayerIndex(gameState);

  gameState.public.activePlayer =
    gameState.public.players[indexOfNextPlayer].email;
}

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

  return getDatabase()
    .ref("/games/" + lobbyUID)
    .set(gameState)
    .then(() => {
      logger.info("Updated game state after player bid.");
      return {};
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
});

exports.passturn = onCall(async (request) => {
  verifyRequestAuthentication(request);

  const requestEmail = request.auth?.token.email;
  const { lobbyUID } = request.data;

  const gameState = await getGameState(lobbyUID);
  const players = gameState.public.players;

  if (gameState.public.activePlayer !== requestEmail) {
    return;
  }

  const doesBiddingRoundEndOnFirstPass =
    getDoesBiddingRoundEndOnFirstPass(gameState);

  const updatedPlayersState: PlayerState[] = [];

  if (doesBiddingRoundEndOnFirstPass) {
    // The active player is the one who passed.

    // Award the player who passed the currentStatusCard
    // The player who passed current bid is returned to their moneyCards
    // Reset all players current bids
    // Flip a new card from the deck

    players.forEach((player) => {
      if (player.email === requestEmail) {
        player.lastActionAt = Date.now();
        player.statusCards = player.statusCards || [];
        player.statusCards.push(gameState.public.currentStatusCard);
        returnPlayersBidToHand(player);

        if (gameState.public.currentStatusCard === MINUS_CARD) {
          let cardToRemove = "";
          const cardOrderDesc = [
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
          ].reverse();

          for (let i = 0; i < cardOrderDesc.length; i++) {
            if (player.statusCards.includes(cardOrderDesc[i])) {
              cardToRemove = cardOrderDesc[i];
            }
          }

          // Remove lowest card and - card
          if (cardToRemove) {
            player.statusCards.splice(
              player.statusCards.indexOf(cardToRemove),
              1
            );
            player.statusCards.splice(
              player.statusCards.indexOf(MINUS_CARD),
              1
            );
          }
        }
      } else {
        player.currentBid = [];
      }

      updatedPlayersState.push(player);
    });

    revealNewStatusCard(gameState);

    if (isGameOver(gameState)) {
      gameState.public.status = "GAME_OVER";
    }

    const newGameState: GameState = {
      public: {
        id: gameState.public.id,
        game: gameState.public.game,
        players: updatedPlayersState,
        activePlayer: gameState.public.activePlayer,
        startAt: gameState.public.startAt,
        status: gameState.public.status,
        currentStatusCard: gameState.public.currentStatusCard,
        remainingCards: gameState.public.remainingCards,
      },
      private: {
        deck: gameState.private.deck,
      },
    };

    return getDatabase()
      .ref("/games/" + lobbyUID)
      .set(newGameState)
      .then(() => {
        logger.info(
          "Updated game state after player passed. doesBiddingRoundEndOnFirstPass && playersWithActiveBids === playersVal.length"
        );
        return {};
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }

  let playersWithActiveBids = players.length;

  players.forEach((player) => {
    if (player.email === requestEmail) {
      player.lastActionAt = Date.now();
      player.hasPassed = true;
    }

    if (player.hasPassed) {
      playersWithActiveBids--;
    }
  });

  if (!doesBiddingRoundEndOnFirstPass && playersWithActiveBids === 1) {
    // Award the player with the only remaining bid the currentStatusCard
    // All players who passed return their currentBid to their moneyCard
    // Set all players hasPassed flags to false
    // Flip a new card from the deck

    let activePlayer = "";

    players.forEach((player) => {
      if (player.hasPassed === false) {
        player.statusCards = player.statusCards || [];

        if (!player.statusCards.includes(MINUS_CARD)) {
          player.statusCards.push(gameState.public.currentStatusCard);
        } else {
          player.statusCards.splice(player.statusCards.indexOf(MINUS_CARD), 1);
        }
        player.currentBid = [];
        activePlayer = player.email;
      } else {
        returnPlayersBidToHand(player);
      }

      player.hasPassed = false;

      updatedPlayersState.push(player);
    });

    revealNewStatusCard(gameState);

    if (isGameOver(gameState)) {
      gameState.public.status = "GAME_OVER";
    }

    const newGameState: GameState = {
      public: {
        id: gameState.public.id,
        game: gameState.public.game,
        players: updatedPlayersState,
        activePlayer,
        startAt: gameState.public.startAt,
        status: gameState.public.status,
        currentStatusCard: gameState.public.currentStatusCard,
        remainingCards: gameState.public.remainingCards,
      },
      private: {
        deck: gameState.private.deck,
      },
    };

    return getDatabase()
      .ref("/games/" + lobbyUID)
      .set(newGameState)
      .then(() => {
        logger.info(
          "Updated game state after player passed. !doesBiddingRoundEndOnFirstPass && playersWithActiveBids === 1"
        );
        return {};
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }

  if (!doesBiddingRoundEndOnFirstPass && playersWithActiveBids > 1) {
    // Update the next player
    // Player who passed has their bid returned to their hand

    let indexOfCurrentPlayer: number = 0;

    players.forEach((player, index) => {
      if (player.email === requestEmail) {
        player.lastActionAt = Date.now();
        player.hasPassed = true;
        returnPlayersBidToHand(player);

        indexOfCurrentPlayer = index;
      }

      updatedPlayersState.push(player);
    });

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
      hasNextPlayerPassed =
        gameState.public.players[indexOfNextPlayer].hasPassed;
    }

    gameState.public.activePlayer =
      gameState.public.players[indexOfNextPlayer].email;

    const newGameState: GameState = {
      public: {
        id: gameState.public.id,
        game: gameState.public.game,
        players: updatedPlayersState,
        activePlayer: gameState.public.activePlayer,
        startAt: gameState.public.startAt,
        status: gameState.public.status,
        currentStatusCard: gameState.public.currentStatusCard,
        remainingCards: gameState.public.remainingCards,
      },
      private: {
        deck: gameState.private.deck,
      },
    };

    return getDatabase()
      .ref("/games/" + lobbyUID)
      .set(newGameState)
      .then(() => {
        logger.info(
          "Updated game state after player passed. !doesBiddingRoundEndOnFirstPass && playersWithActiveBids > 1"
        );
        return {};
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }

  throw new Error("This should never happen");
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

function shuffle(array: string[]) {
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
