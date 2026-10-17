import { getFunctions, httpsCallable } from "firebase/functions";
import { CreateLobbyResponse } from "../../shared/lobby/types";

import type { GameName } from "@games/shared/types";
export type { GameName };

export default async function createLobby(
  gameName: GameName,
  options: { rematchOf?: string } = {},
) {
  const functions = getFunctions();

  const createLobby = httpsCallable<
    { gameName: GameName; rematchOf?: string },
    CreateLobbyResponse
  >(functions, "createlobby");
  const lobby = await createLobby({ gameName, ...options });

  return lobby;
}
