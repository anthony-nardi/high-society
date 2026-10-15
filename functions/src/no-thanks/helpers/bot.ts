import { NoThanksGameState, NoThanksPlayerState } from "../types";
import {
  getActivePlayer,
  isGameOver,
  updateActivePlayer,
  updatePlayersGameStateWithPlaceChip,
  updatePlayersGameStateWithTakeActiveCard,
} from ".";
import { wait } from "../../high-society/helpers";
import { Notification } from "../../shared/types";
import { updateGameState } from "../../shared/helpers";
import { makeBestMoveForActivePlayer } from "./simpleBot";

export function isValidAction(
  gameState: NoThanksGameState,
  suggestedAction: 1 | 0
) {
  const activePlayer = getActivePlayer(gameState);
  const activePlayerChips = activePlayer?.chips || 0;

  if (suggestedAction === 1 && activePlayerChips < 1) {
    return false;
  }
  return true;
}

export async function maybeTakeBotTurn(gameState: NoThanksGameState) {
  const activePlayer = getActivePlayer(gameState);

  if (!activePlayer?.isBot) {
    return;
  }

  const currentTimestamp = Date.now();

  let suggestedAction: 0 | 1 = 0;

  try {
    suggestedAction = makeBestMoveForActivePlayer(gameState);
  } catch (e) {
    console.log(e);
  }

  const timeElapsed = Date.now() - currentTimestamp;

  if (timeElapsed < 3000) {
    await wait(Math.max(3000 - timeElapsed, 0));
  }

  if (!isValidAction(gameState, suggestedAction)) {
    suggestedAction = 0;
  }

  if (suggestedAction === 0) {
    await updateGameStateWithTakingCardAction(gameState, activePlayer);
  } else {
    await updateGameStateWithPlacingChipAction(gameState, activePlayer);
  }
}

export function isActivePlayerBot(gameState: NoThanksGameState) {
  return getActivePlayer(gameState)?.isBot;
}

export async function updateGameStateWithTakingCardAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const activeCard = gameState.public.activeCard;
  const chipsPlaced = gameState.public.chipsPlaced;

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

export async function updateGameStateWithPlacingChipAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const activeCard = gameState.public.activeCard;

  await updatePlayersGameStateWithPlaceChip(gameState, activePlayer);

  updateActivePlayer(gameState);

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has placed a chip on the ${activeCard}.`,
  };

  gameState.public.notification = notification;

  await updateGameState(gameState, notification.title);
}
