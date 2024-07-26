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

/*
Simplified Game Rules:
Goal: Be the player with the most "status" points and more money than at least one other player at the end of the game.
Setup:
Deck: The deck contains the following cards:
Luxury Cards: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
Recognition Cards: 2x, 2x, 2x (double your score)
Misfortune Cards: -5 (Scandal), 1/2 (Mansion Fire), - (Thief)
Money: Each player starts with the following money cards: 1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25
Gameplay:
Bidding: Players take turns bidding on cards by playing money cards from their hand. The highest bidder wins the card.
Winning a Card: The winner pays for the card by removing their bid from the game and adds the card to their pile (face up or down, depending on the variation).
Misfortune Cards: Players bid to avoid taking these cards. The first player to pass takes the Misfortune card and loses their bid.
Game End: The game ends when the 4th card with a red edge (2x Recognition cards and Mansion Fire) is revealed. Any remaining cards are not used.
Scoring:
Money: The player with the least money loses immediately.
Status Points:
Luxury Cards: Add the value of all Luxury cards.
Scandal: Subtract 5 points for each "Scandal" Misfortune card.
Recognition Cards: Double the score for each Recognition card.
Mansion Fire: Subtract half the value of the "Mansion Fire" Misfortune card.
Winning: The player with the most status points wins. If tied, the player with the highest single Luxury card wins.
Important Notes:
Passing: Players can pass on a bid and keep their money cards.
No Change: Players cannot take back money cards once played.
Misfortune Cards: Misfortune cards can be costly, so be strategic in avoiding them.
Thief: You must discard a Luxury card. If you don't have one, you discard the 1st one you purchase. Both are removed from the game.
Strategies:
Save Money: Don't waste money on unnecessary bids.
Be Patient: Wait for opportunities to bid on valuable cards.
Watch Opponents: Keep track of what money cards others have played.
Manage Misfortune Cards: Have enough money to avoid taking Misfortune cards.
Analyze Luxury Cards: Pay attention to the Luxury cards already purchased.
Remember: The game can end quickly, so be prepared to react to the red-edged cards.
*/

/*
## The Card Game:

**Goal:** Maximize your score at the end of the game.

**Setup:**

* **Deck:**  The deck contains 16 cards:
    * 10 Luxury Cards: Values 1 through 10
    * 3 Recognition Cards: 2x (Doubles your score)
    * 3 Misfortune Cards: - (Thief), 1/2 (Mansion Fire), -5 (Scandal) 
* **Money:** Each player starts with 11 money cards: 1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25

**Gameplay:**

1. **Bidding:** Players take turns bidding on cards, using their money cards. **Players can use multiple money cards in a single turn to increase their bid.**  The highest bidder wins the card. 
2. **Winning a Card:**  The winning player removes their bid from the game and adds the card to their hand.
3. **Misfortune Cards:**  Players bid to *avoid* taking Misfortune cards. The first player to pass on a Misfortune card takes the card and loses their bid.
4. **Game End:** The game ends when the 4th red-edged card (2x Recognition, Mansion Fire) is revealed. Any remaining cards are not used.

**Scoring:**

1. **Base Score:** Sum the values of all your Luxury cards.
2. **Thief Penalty:**  Subtract 5 points if you hold the "-" (Thief) card.
3. **Recognition Bonus:** Multiply your score by 2 for each "2x" (Recognition) card you hold. 
4. **Mansion Fire Penalty:** Halve your score if you hold the "1/2" (Mansion Fire) card.

**Winning:** The player with the highest final score wins.

**Strategies:**

* **Luxury Card Value:** Consider using larger denominations for high-value Luxury cards, aiming for the most efficient use of your money. 
* **Recognition Card Priority:** Prioritize acquiring at least one Recognition card (2x) for a significant score boost.
* **Misfortune Card Management:**  Avoid taking Misfortune cards if possible, especially the "Scandal" (-5).
* **Money Management:**  Preserve smaller denominations for flexibility and future bids, but don't be afraid to use larger denominations when necessary for strategic advantage.
* **Adaptability:** Analyze the bidding patterns of other players and adjust your strategy accordingly.

**Decision Scenario:**

* **Current Card:** "8" (Luxury Card)
* **Player Hand:**  [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25]
* **Opponent Actions:** [Player 2 bid 6]

**Action:** 
* **"Bid X":** (where X is the bid amount) 
* **"Pass":**  (Do not bid)

**Reasoning:** 
* Explain your decision-making process. 
* What are the potential risks and rewards of each action?

**Example Reasoning:**

* "I would bid 8 using my 8 card. This secures the valuable '8' Luxury card and keeps my larger denominations for future bids. Using the 8 card directly is more efficient and preserves more flexibility for later in the game."

**Note:** Your responses should reflect a deep understanding of the game rules, the scoring system, and the strategies involved. Make strategic decisions that are in the best interest of maximizing your score.
*/
