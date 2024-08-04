import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
  getActivePlayer,
  getEmailFromRequest,
  getGameState,
  isActivePlayerTakingAction,
  isGameOver,
  updateGameStateWithBid,
  updateGameStateWithPass,
  verifyRequestAuthentication,
} from "../helpers";
import { HighSocietyGameState } from "../types";
import { isActivePlayerBot, maybeTakeBotTurn } from "../helpers/bot";

export const bid = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      bid: string[];
    }>
  ) => {
    verifyRequestAuthentication(request);

    const { lobbyUID, bid } = request.data;
    const requestEmail = getEmailFromRequest(request);
    const gameState = await getGameState<HighSocietyGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    await updateGameStateWithBid(gameState, activePlayer, bid);

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

    return {};
  }
);

export const passturn = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState<HighSocietyGameState>(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    await updateGameStateWithPass(gameState, activePlayer);

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
