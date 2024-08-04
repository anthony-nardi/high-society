import { GameName, PlayerInLobby } from "../types";
import { createHighSocietyGameState } from "../../high-society/helpers";
import { createNoThanksGameState } from "../../no-thanks/helpers";

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
