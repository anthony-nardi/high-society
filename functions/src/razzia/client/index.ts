import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { POLICE_RAIDS, RazziaGameState } from "../types";
import { getActivePlayer, updateActivePlayer } from "../helpers";
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

    if (gameState.public.revealedCards.length === 7) {
      gameState.public.revealedCards = [];
    }

    const deck = gameState.private.deck;
    const card = deck.shift();

    if (!card) {
      throw new Error("No more cards in the deck.");
    }

    gameState.public.revealedCards.push(card);
    gameState.public.remainingCards = deck.length;

    if (card !== POLICE_RAIDS) {
      updateActivePlayer(gameState);

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${activePlayer?.email} has revealed the ${card}.`,
      };

      gameState.public.notification = notification;

      await updateGameState(gameState, notification.title);
    } else {
      // police raid
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
