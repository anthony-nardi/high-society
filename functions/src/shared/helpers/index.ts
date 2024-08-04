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

export async function createGame(lobbyUID: string, gameName: GameName) {
  if (gameName === "high-society") {
    await createHighSocietyGameState(lobbyUID);
  }

  if (gameName === "no-thanks") {
    await createNoThanksGameState(lobbyUID);
  }
}

export function shuffle(array: string[] | number[]) {
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
      return {};
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
}
