import { getFunctions, httpsCallable } from "firebase/functions";
import { CreateLobbyResponse } from "../../shared/lobby/types";

export type GameName = "high-society" | "no-thanks";

export default async function createLobby(gameName: GameName) {
  const functions = getFunctions();

  const createLobby = httpsCallable<
    { gameName: GameName },
    CreateLobbyResponse
  >(functions, "createlobby");
  const lobby = await createLobby({ gameName });

  return lobby;
}
