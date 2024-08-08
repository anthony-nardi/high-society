import {
  GameName,
  GenericGameState,
  GenericPlayerState,
  PlayerInLobby,
} from "../types";
import { createHighSocietyGameState } from "../../high-society/helpers";
import { createNoThanksGameState } from "../../no-thanks/helpers";
import { getDatabase } from "firebase-admin/database";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";

export function getGameName(playersInLobby: PlayerInLobby[]) {
  return playersInLobby[0].gameName;
}

async function createSpecificGameState(lobbyUID: string, gameName: GameName) {
  switch (gameName) {
    case "high-society":
      await createHighSocietyGameState(lobbyUID);
      break;
    case "no-thanks":
      await createNoThanksGameState(lobbyUID);
      break;
    default:
      throw new Error(`Unknown game name: ${gameName}`);
  }
}

export async function createGame(lobbyUID: string, gameName: GameName) {
  try {
    await createSpecificGameState(lobbyUID, gameName);
  } catch (error: any) {
    logger.error(`Failed to create game: ${error.message}`);
    throw new HttpsError("unknown", `Failed to create game: ${error.message}`);
  }
}

export function shuffle(array: string[] | number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function updatePlayerLastAction(player: GenericPlayerState) {
  player.lastActionAt = Date.now();
}

export function updateGameState<T extends GenericPlayerState>(
  gameState: GenericGameState<T>,
  message: string
) {
  return getDatabase()
    .ref("/games/" + gameState.public.id)
    .set(gameState)
    .then(() => {
      logger.info(message);
    })
    .catch((error: any) => {
      throw new HttpsError("unknown", error.message, error);
    });
}
