import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getActivePlayer,
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { NoThanksGameState, NoThanksPlayerState } from "../types";
import { updateGameState, updatePlayerLastAction } from "../../shared/helpers";
import { Notification } from "../../shared/types";

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

function updatePlayersGameStateWithTakeActiveCard(
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

export const takeActiveCard = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<NoThanksGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activeCard = gameState.public.activeCard;
    const chipsPlaced = gameState.public.chipsPlaced;

    const activePlayer = getActivePlayer(gameState);

    await updatePlayersGameStateWithTakeActiveCard(gameState, activePlayer);

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${activePlayer.email} has taken the ${activeCard} along with ${chipsPlaced} chips.`,
    };

    gameState.public.notification = notification;

    await updateGameState(gameState, notification.title);
  }
);
