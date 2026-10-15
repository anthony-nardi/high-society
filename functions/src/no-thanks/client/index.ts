import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getActivePlayer,
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  verifyRequestAuthentication,
} from "../../high-society/helpers";
import { NoThanksGameState } from "../types";
import {
  isGameOver,
  updateGameStateWithPlacingChipAction,
  updateGameStateWithTakingCardAction,
} from "../helpers";
import { isActivePlayerBot, maybeTakeBotTurn } from "../helpers/bot";

// A bot may need several moves in a row (chips go round the table), so
// after a human acts let the bots play on, up to a sensible cap.
async function letBotsPlay(gameState: NoThanksGameState) {
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

    const activePlayer = getActivePlayer(gameState);

    await updateGameStateWithTakingCardAction(gameState, activePlayer);
    await letBotsPlay(gameState);
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

    const activePlayer = getActivePlayer(gameState);

    if ((activePlayer.chips || 0) < 1) {
      return;
    }

    await updateGameStateWithPlacingChipAction(gameState, activePlayer);
    await letBotsPlay(gameState);
  }
);
