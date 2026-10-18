import { getFunctions, httpsCallable } from "firebase/functions";
import { CreateLobbyResponse } from "../../shared/lobby/types";

import type { GameName } from "@games/shared/types";
export type { GameName };

export default async function createLobby(
  gameName: GameName,
  options: { rematchOf?: string; mode?: string } = {},
) {
  const functions = getFunctions();

  const createLobby = httpsCallable<
    { gameName: GameName; rematchOf?: string; options?: { mode?: string } },
    CreateLobbyResponse
  >(functions, "createlobby");
  const { mode, ...rest } = options;
  const lobby = await createLobby({
    gameName,
    ...rest,
    ...(mode ? { options: { mode } } : {}),
  });

  return lobby;
}
