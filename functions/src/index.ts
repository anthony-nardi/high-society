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
  statusCards: string[];
  currentBid: string[];
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

exports.passturn = onCall(async (request) => {
  verifyRequestAuthentication(request);

  const requestEmail = request.auth?.token.email;
  const { lobbyUID } = request.data;

  const gameState = await getGameState(lobbyUID);

  const playersVal = gameState.public.players;

  const doesBiddingRoundEndOnFirstPass =
    STATUS_CARDS_THAT_END_ROUND_ON_FIRST_PASS.includes(
      gameState.public.currentStatusCard
    );
  const updatedPlayersState: PlayerState[] = [];

  if (doesBiddingRoundEndOnFirstPass) {
    // Award the player who passed the currentStatusCard
    // The player who passed current bid is returned to their moneyCards
    // Reset all players current bids
    // Flip a new card from the deck

    playersVal.forEach((player) => {
      if (player.email === requestEmail) {
        player.lastActionAt = Date.now();
        player.statusCards.push(gameState.public.currentStatusCard);
        returnPlayersBidToHand(player);
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

  let playersWithActiveBids = playersVal.length;

  playersVal.forEach((player) => {
    if (player.hasPassed) {
      playersWithActiveBids--;
    }

    if (player.email === requestEmail) {
      playersWithActiveBids--;
    }
  });

  if (!doesBiddingRoundEndOnFirstPass && playersWithActiveBids === 1) {
    // Award the player with the only remaining bid the currentStatusCard
    // All players who passed return their currentBid to their moneyCard
    // Set all players hasPassed flags to false
    // Flip a new card from the deck

    playersVal.forEach((player) => {
      if (player.email === requestEmail) {
        player.lastActionAt = Date.now();
        player.statusCards.push(gameState.public.currentStatusCard);
        player.currentBid = [];
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

    playersVal.forEach((player, index) => {
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
