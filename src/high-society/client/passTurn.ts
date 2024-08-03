import { getFunctions, httpsCallable } from "firebase/functions";

export type PassTurnRequest = {
  lobbyUID: number;
};

export default async function passTurn(passTurnRequest: PassTurnRequest) {
  const functions = getFunctions();
  const passTurn = httpsCallable<PassTurnRequest, void>(functions, "passturn");

  try {
    await passTurn(passTurnRequest);
  } catch (e) {
    console.error(e);
  }
}
