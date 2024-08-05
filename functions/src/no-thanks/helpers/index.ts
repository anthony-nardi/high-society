import { getDatabase } from "firebase-admin/database";
import { PlayerInLobby } from "../../shared/types";
import { shuffle, updatePlayerLastAction } from "../../shared/helpers";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { NoThanksGameState, NoThanksPlayerState } from "../types";

export async function createNoThanksGameState(lobbyUID: string) {
  const players = await getDatabase().ref(`lobbies/${lobbyUID}/players`).get();

  const playersSnapshotValue = players.val() as PlayerInLobby[];

  let chips = 11;

  if (playersSnapshotValue.length === 6) {
    chips = 9;
  }

  if (playersSnapshotValue.length === 7) {
    chips = 7;
  }

  const playersMetadata = playersSnapshotValue.map((player: any) => {
    return {
      email: player.email,
      lastActionAt: 0,
      cards: [],
      chips,
      isBot: !!player.isBot,
    };
  });

  const deck = Array.from(Array(36).keys()).slice(3); // 3 to 35

  shuffle(deck);

  const deckWith9CardsRemoved = deck.slice(0, deck.length - 9);

  return getDatabase()
    .ref("/games/" + lobbyUID)
    .set({
      public: {
        id: lobbyUID,
        game: "no-thanks",
        players: playersMetadata,
        activePlayer: playersMetadata[0].email,
        startAt: Date.now().toString(),
        status: "IN_PROGRESS",
        activeCard: deckWith9CardsRemoved[0],
        chipsPlaced: 0,
        remainingCards: deckWith9CardsRemoved.length - 1,
      },
      private: {
        deck: deckWith9CardsRemoved,
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

function revealNewActiveCard(gameState: NoThanksGameState) {
  gameState.private.deck.shift();
  gameState.public.activeCard = gameState.private.deck[0];
  gameState.public.remainingCards = gameState.private.deck.length;
}

function giveActiveCardToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState
) {
  player.cards = player.cards || [];
  player.cards.push(gameState.public.activeCard);

  revealNewActiveCard(gameState);
}

function givePlacedChipsToPlayer(
  gameState: NoThanksGameState,
  player: NoThanksPlayerState
) {
  player.chips += gameState.public.chipsPlaced;
  gameState.public.chipsPlaced = 0;
}

export function updatePlayersGameStateWithTakeActiveCard(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const players = gameState.public.players;

  players.forEach((player) => {
    if (player.email === activePlayer.email) {
      updatePlayerLastAction(player);
      giveActiveCardToPlayer(gameState, player);
      givePlacedChipsToPlayer(gameState, player);
    }
  });
}

export function updatePlayersGameStateWithPlaceChip(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const players = gameState.public.players;

  players.forEach((player) => {
    if (player.email === activePlayer.email) {
      updatePlayerLastAction(player);
      player.chips--;
      gameState.public.chipsPlaced++;
    }
  });
}
