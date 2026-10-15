import { GameName } from "../../high-society/client/createLobby";

export const MIN_PLAYERS = 3;

export const getMaxPlayers = (gameName: GameName): number => {
  switch (gameName) {
    case "high-society":
      return 5;
    case "no-thanks":
      return 7;
    case "razzia":
      return 5;
    default:
      return 0; // Default case, should never happen
  }
};
