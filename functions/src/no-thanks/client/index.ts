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
import { isActivePlayerBot, maybeTakeBotTurn } from "../helpers/bot";

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

    // Theoretically a bot may be the first to make
    // a move if there are 4 bots and 1 player.
    // If a bot passes on a negative card it goes again.
    // If a bot wins an auction, it goes again.
    // Not gonna bother figuring out the actual highest
    // bot move streak so lets settle for something.
    let attemptsToLetBotMakeMove = 30;

    while (
      !isGameOver(gameState) &&
      isActivePlayerBot(gameState) &&
      attemptsToLetBotMakeMove > 0
    ) {
      attemptsToLetBotMakeMove--;

      await maybeTakeBotTurn(gameState);
    }
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

    // Theoretically a bot may be the first to make
    // a move if there are 4 bots and 1 player.
    // If a bot passes on a negative card it goes again.
    // If a bot wins an auction, it goes again.
    // Not gonna bother figuring out the actual highest
    // bot move streak so lets settle for something.
    let attemptsToLetBotMakeMove = 30;

    while (
      !isGameOver(gameState) &&
      isActivePlayerBot(gameState) &&
      attemptsToLetBotMakeMove > 0
    ) {
      attemptsToLetBotMakeMove--;

      await maybeTakeBotTurn(gameState);
    }
  }
);
