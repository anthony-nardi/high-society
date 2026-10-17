import { GAME_INFO } from "@games/shared/gameInfo";
import type { GameName } from "@games/shared/types";

export const MIN_PLAYERS = 3;

export const getMinPlayers = (gameName: GameName) =>
  GAME_INFO[gameName]?.minPlayers ?? MIN_PLAYERS;

export const getMaxPlayers = (gameName: GameName): number =>
  GAME_INFO[gameName]?.maxPlayers ?? 0;
