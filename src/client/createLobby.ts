import { getFunctions, httpsCallable } from "firebase/functions";
import { CreateLobbyResponse } from "../lobby/types";

export default async function createLobby() {
  const functions = getFunctions();

  const createLobby = httpsCallable<undefined, CreateLobbyResponse>(
    functions,
    "createlobby"
  );
  const lobby = await createLobby();

  return lobby;
}
