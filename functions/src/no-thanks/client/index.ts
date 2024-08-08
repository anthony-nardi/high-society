import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getActivePlayer,
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { NoThanksGameState } from "../types";
import { updateGameState } from "../../shared/helpers";
import { Notification } from "../../shared/types";
import {
  isGameOver,
  updateActivePlayer,
  updatePlayersGameStateWithPlaceChip,
  updatePlayersGameStateWithTakeActiveCard,
} from "../helpers";

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

    if (isGameOver(gameState)) {
      gameState.public.status = "GAME_OVER";
    }

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${activePlayer.email} has taken the ${activeCard} along with ${chipsPlaced} chips.`,
    };

    gameState.public.notification = notification;

    await updateGameState(gameState, notification.title);
  }
);

export const placeChipOnActiveCard = onCall(
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

    const activePlayer = getActivePlayer(gameState);

    await updatePlayersGameStateWithPlaceChip(gameState, activePlayer);

    updateActivePlayer(gameState);

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${activePlayer.email} has placed a chip on ${activeCard}.`,
    };

    gameState.public.notification = notification;

    await updateGameState(gameState, notification.title);
  }
);
