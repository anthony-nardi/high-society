import { getFunctions, httpsCallable } from "firebase/functions";

export type RevealCardRequest = {
  lobbyUID: string;
};

export default async function revealCard(revealCardRequest: RevealCardRequest) {
  const functions = getFunctions();
  const revealCardApi = httpsCallable<RevealCardRequest, void>(
    functions,
    "revealCard"
  );

  try {
    await revealCardApi(revealCardRequest);
  } catch (e) {
    console.error(e);
  }
}
